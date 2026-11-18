"""Puente local para el conector MCP de Blender.

Se carga con:  blender --python puente_mcp.py
Escucha solo en 127.0.0.1:9876 y habla el mismo protocolo que usa el servidor MCP
(blmcp/tools_helpers/connection.py): una peticion JSON terminada en \\0 con
{"type": "execute", "code": ..., "strict_json": bool} y una respuesta JSON terminada en \\0 con
{"status": "ok"|"error", "result": {...}, "message": ..., "stdout": ..., "stderr": ...}.

El codigo se ejecuta en el hilo principal de Blender por medio de un temporizador.
Si el codigo deja una funcion `check_is_finished` en su espacio de nombres, se consulta
hasta que devuelva un dict (respuesta diferida, la usan las herramientas de render).
"""
import contextlib
import io
import json
import queue
import socket
import threading
import traceback

import bpy

HOST = "127.0.0.1"
PORT = 9876

_trabajos: "queue.Queue[dict]" = queue.Queue()
_diferidos: list = []
_estado = {"servidor": None}


def _atender(conn: socket.socket) -> None:
    try:
        conn.settimeout(900.0)
        buf = bytearray()
        while b"\0" not in buf:
            trozo = conn.recv(65536)
            if not trozo:
                break
            buf.extend(trozo)
        linea = bytes(buf).partition(b"\0")[0]
        if not linea:
            return
        peticion = json.loads(linea.decode("utf-8"))
        if peticion.get("type") != "execute":
            respuesta = {"status": "error", "message": "Tipo de peticion no soportado: {!r}".format(peticion.get("type"))}
        else:
            trabajo = {"peticion": peticion, "evento": threading.Event(), "respuesta": None}
            _trabajos.put(trabajo)
            trabajo["evento"].wait()
            respuesta = trabajo["respuesta"]
        try:
            carga = json.dumps(respuesta, default=repr)
        except Exception as ex:  # pylint: disable=broad-except
            carga = json.dumps({"status": "error", "message": "Respuesta no serializable: {}".format(ex)})
        conn.sendall(carga.encode("utf-8") + b"\0")
    except Exception as ex:  # pylint: disable=broad-except
        try:
            conn.sendall(json.dumps({"status": "error", "message": str(ex)}).encode("utf-8") + b"\0")
        except OSError:
            pass
    finally:
        try:
            conn.close()
        except OSError:
            pass


def _servir() -> None:
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((HOST, PORT))
    srv.listen(8)
    _estado["servidor"] = srv
    while True:
        try:
            conn, _dir = srv.accept()
        except OSError:
            break
        threading.Thread(target=_atender, args=(conn,), daemon=True).start()


def _contexto_ventana():
    wm = bpy.context.window_manager
    if not wm.windows:
        return {}
    win = wm.windows[0]
    return {"window": win, "screen": win.screen}


def _ejecutar(trabajo: dict) -> None:
    peticion = trabajo["peticion"]
    espacio = {"__name__": "__main__", "result": {}}
    salida, errores = io.StringIO(), io.StringIO()
    try:
        with contextlib.redirect_stdout(salida), contextlib.redirect_stderr(errores):
            codigo = compile(peticion.get("code", ""), "<mcp>", "exec")
            anulacion = _contexto_ventana()
            if anulacion and not bpy.app.background:
                with bpy.context.temp_override(**anulacion):
                    exec(codigo, espacio)  # pylint: disable=exec-used
            else:
                exec(codigo, espacio)  # pylint: disable=exec-used
        comprobar = espacio.get("check_is_finished")
        if callable(comprobar):
            _diferidos.append((trabajo, comprobar, salida.getvalue(), errores.getvalue()))
            return
        resultado = espacio.get("result", {})
        if not isinstance(resultado, dict):
            raise TypeError("La variable `result` debe ser un dict, no {}".format(type(resultado).__name__))
        if peticion.get("strict_json"):
            json.dumps(resultado)
        trabajo["respuesta"] = {"status": "ok", "result": resultado,
                                "stdout": salida.getvalue()[-20000:], "stderr": errores.getvalue()[-20000:]}
    except Exception:  # pylint: disable=broad-except
        trabajo["respuesta"] = {"status": "error", "message": traceback.format_exc()[-6000:],
                                "stdout": salida.getvalue()[-20000:], "stderr": errores.getvalue()[-20000:]}
    trabajo["evento"].set()


def _latido() -> float:
    for item in list(_diferidos):
        trabajo, comprobar, salida, errores = item
        try:
            rv = comprobar()
        except Exception:  # pylint: disable=broad-except
            trabajo["respuesta"] = {"status": "error", "message": traceback.format_exc()[-6000:]}
            trabajo["evento"].set()
            _diferidos.remove(item)
            continue
        if rv is not None:
            trabajo["respuesta"] = {"status": "ok", "result": rv, "stdout": salida, "stderr": errores}
            trabajo["evento"].set()
            _diferidos.remove(item)
    try:
        trabajo = _trabajos.get_nowait()
    except queue.Empty:
        return 0.05
    _ejecutar(trabajo)
    return 0.01


def iniciar() -> None:
    if _estado["servidor"] is not None:
        return
    threading.Thread(target=_servir, daemon=True).start()
    bpy.app.timers.register(_latido, first_interval=0.2, persistent=True)
    print("[puente_mcp] escuchando en {}:{}".format(HOST, PORT))


iniciar()
