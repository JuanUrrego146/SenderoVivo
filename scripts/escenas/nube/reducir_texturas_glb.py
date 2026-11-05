"""Reduce las texturas embebidas de un .glb a un lado máximo (por defecto 512 px) sin tocar la geometría.
Decodifica cada imagen PNG/JPEG de su bufferView, la reescala con INTER_AREA, la vuelve a codificar en el mismo
formato y reconstruye el bloque binario recalculando los desplazamientos (alineados a 4 bytes).
uso: reducir_texturas_glb.py <entrada.glb> <salida.glb> [lado_max]"""
import sys, json, struct, numpy as np, cv2

ENT, SAL = sys.argv[1:3]
LADO = int(sys.argv[3]) if len(sys.argv) > 3 else 512
b = open(ENT, 'rb').read()
magic, ver, total = struct.unpack('<4sII', b[:12])
assert magic == b'glTF' and ver == 2
ln, tipo = struct.unpack('<I4s', b[12:20]); assert tipo == b'JSON'
j = json.loads(b[20:20 + ln])
o = 20 + ln
bln, btipo = struct.unpack('<I4s', b[o:o + 8]); assert btipo == b'BIN\x00'
binario = b[o + 8:o + 8 + bln]

nuevas = {}
for im in j.get('images', []):
    if 'bufferView' not in im:
        continue
    bv = j['bufferViews'][im['bufferView']]
    datos = binario[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    img = cv2.imdecode(np.frombuffer(datos, np.uint8), cv2.IMREAD_UNCHANGED)
    h, w = img.shape[:2]
    if max(h, w) <= LADO:
        continue
    k = LADO / max(h, w)
    peq = cv2.resize(img, (max(1, round(w * k)), max(1, round(h * k))), interpolation=cv2.INTER_AREA)
    ext = '.png' if im.get('mimeType', 'image/png') == 'image/png' else '.jpg'
    ok, enc = cv2.imencode(ext, peq, [cv2.IMWRITE_PNG_COMPRESSION, 9] if ext == '.png' else [cv2.IMWRITE_JPEG_QUALITY, 90])
    assert ok
    nuevas[im['bufferView']] = enc.tobytes()

# reconstruir el binario en el orden de los bufferViews
partes, pos = [], 0
for i, bv in enumerate(j['bufferViews']):
    datos = nuevas.get(i, binario[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])
    relleno = (-pos) % 4
    partes.append(b'\x00' * relleno); pos += relleno
    bv['byteOffset'] = pos; bv['byteLength'] = len(datos)
    partes.append(datos); pos += len(datos)
nuevo = b''.join(partes); nuevo += b'\x00' * ((-len(nuevo)) % 4)
j['buffers'][0]['byteLength'] = len(nuevo)
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
salida = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(nuevo)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(nuevo), b'BIN\x00') + nuevo
open(SAL, 'wb').write(salida)
print('%s: %d texturas reducidas a %d px, %d -> %d bytes' % (ENT.split('/')[-1], len(nuevas), LADO, len(b), len(salida)))
