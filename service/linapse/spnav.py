import asyncio
from . import state

async def handle_socket_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    state.socket_clients.add(writer)
    print(f"[sock] client connected ({len(state.socket_clients)} total)")
    try:
        while not writer.is_closing():
            data = await reader.read(1024)
            if not data:
                break
    except (asyncio.CancelledError, ConnectionError):
        pass
    except Exception as e:
        print(f"[sock] client error: {e}")
    finally:
        state.socket_clients.discard(writer)
        state.socket_clients_busy.discard(writer)
        try:
            writer.close()
            try:
                loop = asyncio.get_running_loop()
                if loop.is_running():
                    await writer.wait_closed()
            except RuntimeError:
                pass
        except Exception:
            pass
        print(f"[sock] client disconnected ({len(state.socket_clients)} total)")
