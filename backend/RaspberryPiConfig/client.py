# pip install websocket-client
import websocket
import json

ws = websocket.WebSocket()
ws.connect("ws://localhost:3001")

data = json.dumps({"device": "Raspberry Pi", "status": "Online"})
ws.send(data)
response = ws.recv()
print(f"Received from server: {response}")

ws.close()
