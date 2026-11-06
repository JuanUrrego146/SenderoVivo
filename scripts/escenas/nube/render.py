"""Rasterizador de gaussianas en torch puro (por teselas de 16 px), solo para evaluar: dibuja un splat desde la pose
exacta de una foto COLMAP para compararlo contra la foto real."""
import math, numpy as np, torch

C0 = 0.28209479177387814
C1 = 0.4886025119029199
C2 = [1.0925484305920792, -1.0925484305920792, 0.31539156525252005, -1.0925484305920792, 0.5462742152960396]
C3 = [-0.5900435899266435, 2.890611442640554, -0.4570457994644658, 0.3731763325901154, -0.4570457994644658,
      1.445305721320277, -0.5900435899266435]


def eval_sh(dc, rest, d):
    """dc (N,3); rest (N,3*k) en el orden de 3DGS (canal mayor); d direcciones unitarias (N,3)."""
    c = C0 * dc
    k = rest.shape[1] // 3
    if k == 0: return c + 0.5
    sh = rest.view(-1, 3, k).transpose(1, 2)  # (N,k,3)
    x, y, z = d[:, :1], d[:, 1:2], d[:, 2:]
    c = c - C1 * y * sh[:, 0] + C1 * z * sh[:, 1] - C1 * x * sh[:, 2]
    if k >= 8:
        xx, yy, zz, xy, yz, xz = x * x, y * y, z * z, x * y, y * z, x * z
        c = c + C2[0] * xy * sh[:, 3] + C2[1] * yz * sh[:, 4] + C2[2] * (2 * zz - xx - yy) * sh[:, 5] + \
            C2[3] * xz * sh[:, 6] + C2[4] * (xx - yy) * sh[:, 7]
        if k >= 15:
            c = c + C3[0] * y * (3 * xx - yy) * sh[:, 8] + C3[1] * xy * z * sh[:, 9] + \
                C3[2] * y * (4 * zz - xx - yy) * sh[:, 10] + C3[3] * z * (2 * zz - 3 * xx - 3 * yy) * sh[:, 11] + \
                C3[4] * x * (4 * zz - xx - yy) * sh[:, 12] + C3[5] * z * (xx - yy) * sh[:, 13] + \
                C3[6] * x * (xx - 3 * yy) * sh[:, 14]
    return c + 0.5


def a_gpu(g, dev="cuda"):
    t = lambda x: torch.as_tensor(np.ascontiguousarray(x), dtype=torch.float32, device=dev)
    q = t(g["rot"]); q = q / q.norm(dim=1, keepdim=True)
    w, x, y, z = q.unbind(1)
    Rg = torch.stack([1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
                      2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
                      2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)], 1).view(-1, 3, 3)
    M = Rg * torch.exp(t(g["escala"]))[:, None, :]
    return dict(xyz=t(g["xyz"]), cov=M @ M.transpose(1, 2), dc=t(g["dc"]), rest=t(g["rest"]),
                a=torch.sigmoid(t(g["opacidad"])))


@torch.no_grad()
def render(G, R, tv, fx, fy, cx, cy, W, H, fondo=(0, 0, 0), tope_radio=256):
    dev = G["xyz"].device
    R = torch.as_tensor(R, dtype=torch.float32, device=dev); tv = torch.as_tensor(tv, dtype=torch.float32, device=dev)
    pc = G["xyz"] @ R.T + tv
    z = pc[:, 2]
    vis = z > 0.05
    idx = vis.nonzero().squeeze(1)
    pc, z = pc[idx], z[idx]
    u = fx * pc[:, 0] / z + cx; v = fy * pc[:, 1] / z + cy
    J = torch.zeros(len(idx), 2, 3, device=dev)
    J[:, 0, 0] = fx / z; J[:, 0, 2] = -fx * pc[:, 0] / z ** 2
    J[:, 1, 1] = fy / z; J[:, 1, 2] = -fy * pc[:, 1] / z ** 2
    T = J @ R
    cov2 = T @ G["cov"][idx] @ T.transpose(1, 2)
    cov2[:, 0, 0] += 0.3; cov2[:, 1, 1] += 0.3
    a_, b_, c_ = cov2[:, 0, 0], cov2[:, 0, 1], cov2[:, 1, 1]
    det = a_ * c_ - b_ * b_
    mid = 0.5 * (a_ + c_); lam = mid + torch.sqrt(torch.clamp(mid * mid - det, min=0.1))
    rad = torch.ceil(3 * torch.sqrt(lam)).clamp(max=tope_radio)
    ok = (det > 0) & (u + rad > 0) & (u - rad < W) & (v + rad > 0) & (v - rad < H)
    sel = ok.nonzero().squeeze(1)
    idx, u, v, z, rad = idx[sel], u[sel], v[sel], z[sel], rad[sel]
    a_, b_, c_, det = a_[sel], b_[sel], c_[sel], det[sel]
    con = torch.stack([c_ / det, -b_ / det, a_ / det], 1)
    campos = -R.T @ tv
    d = G["xyz"][idx] - campos; d = d / d.norm(dim=1, keepdim=True)
    col = eval_sh(G["dc"][idx], G["rest"][idx], d).clamp(min=0)
    op = G["a"][idx]
    TS = 16; tw, th = (W + TS - 1) // TS, (H + TS - 1) // TS
    x0 = ((u - rad) / TS).floor().clamp(0, tw - 1).long(); x1 = ((u + rad) / TS).floor().clamp(0, tw - 1).long()
    y0 = ((v - rad) / TS).floor().clamp(0, th - 1).long(); y1 = ((v + rad) / TS).floor().clamp(0, th - 1).long()
    nx, ny = x1 - x0 + 1, y1 - y0 + 1
    cnt = nx * ny
    orden_z = torch.argsort(z)
    rango = torch.empty_like(orden_z); rango[orden_z] = torch.arange(len(z), device=dev)
    gid = torch.repeat_interleave(torch.arange(len(z), device=dev), cnt)
    off = torch.arange(len(gid), device=dev) - torch.repeat_interleave(torch.cumsum(cnt, 0) - cnt, cnt)
    tx = x0[gid] + off % nx[gid]; ty = y0[gid] + off // nx[gid]
    clave = (ty * tw + tx).long() * (1 << 32) + rango[gid]
    clave, perm = torch.sort(clave); gid = gid[perm]
    tile = (clave >> 32)
    limites = torch.searchsorted(tile, torch.arange(tw * th + 1, device=dev))
    img = torch.zeros(H, W, 3, device=dev); alfa = torch.zeros(H, W, device=dev); prof = torch.zeros(H, W, device=dev)
    py, px = torch.meshgrid(torch.arange(TS, device=dev), torch.arange(TS, device=dev), indexing="ij")
    px = px.reshape(-1).float() + 0.5; py = py.reshape(-1).float() + 0.5
    lim = limites.tolist()
    for k in range(tw * th):
        i0, i1 = lim[k], lim[k + 1]
        if i0 == i1: continue
        ty_, tx_ = divmod(k, tw)
        X = px + tx_ * TS; Y = py + ty_ * TS
        trans = torch.ones(TS * TS, device=dev); acc = torch.zeros(TS * TS, 3, device=dev); dep = torch.zeros(TS * TS, device=dev)
        for j0 in range(i0, i1, 4096):
            g = gid[j0:min(i1, j0 + 4096)]
            dx = X[:, None] - u[g][None]; dy = Y[:, None] - v[g][None]
            pw = -0.5 * (con[g, 0] * dx * dx + con[g, 2] * dy * dy) - con[g, 1] * dx * dy
            al = (op[g][None] * torch.exp(pw)).clamp(max=0.99)
            al = torch.where((pw <= 0) & (al >= 1 / 255), al, torch.zeros_like(al))
            Tc = torch.cumprod(torch.cat([torch.ones(TS * TS, 1, device=dev), 1 - al[:, :-1]], 1), 1) * trans[:, None]
            wgt = Tc * al
            acc += wgt @ col[g]; dep += wgt @ z[g]
            trans = trans * torch.prod(1 - al, 1)
            if trans.max() < 1e-4: break
        ys, xs = ty_ * TS, tx_ * TS
        hh, ww = min(TS, H - ys), min(TS, W - xs)
        img[ys:ys + hh, xs:xs + ww] = acc.view(TS, TS, 3)[:hh, :ww]
        alfa[ys:ys + hh, xs:xs + ww] = (1 - trans).view(TS, TS)[:hh, :ww]
        prof[ys:ys + hh, xs:xs + ww] = dep.view(TS, TS)[:hh, :ww]
    fondo = torch.tensor(fondo, dtype=torch.float32, device=dev)
    img = img + (1 - alfa)[..., None] * fondo
    return img.clamp(0, 1).cpu().numpy(), alfa.cpu().numpy(), (prof / alfa.clamp(min=1e-6)).cpu().numpy()
