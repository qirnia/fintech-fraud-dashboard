import asyncio
import json
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ontology import ontology
from ai_agent import evaluate_risk

app = FastAPI(title="Fintech Fraud Detection MVP")

# Allow CORS for local frontend testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory queue for transactions
tx_queue = asyncio.Queue()

# Active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"Client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        # Broadcasts a JSON message to all connected clients
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

async def process_transactions():
    """Background task to process transactions from the queue."""
    print("Background worker started.")
    while True:
        tx_data = await tx_queue.get()
        print(f"Processing transaction: {tx_data.get('nameOrig')} -> {tx_data.get('nameDest')}")
        
        try:
            # 1. Update Ontology
            ontology.add_transaction(tx_data)
            
            # 2. Get Graph Context
            graph_context = ontology.get_transaction_context(tx_data)
            
            # 3. Call AI Agent (This is synchronous, running in thread pool to avoid blocking)
            ai_result = await asyncio.to_thread(evaluate_risk, tx_data, graph_context)
            
            # 4. Broadcast Result
            payload = {
                "transaction": tx_data,
                "ai_analysis": ai_result
            }
            await manager.broadcast(payload)
            
        except Exception as e:
            print(f"Error processing transaction: {e}")
            
        finally:
            tx_queue.task_done()

@app.on_event("startup")
async def startup_event():
    # Start background worker
    asyncio.create_task(process_transactions())

@app.post("/ingest")
async def ingest_transaction(request: Request):
    """
    Endpoint for the simulator to push transactions.
    """
    tx_data = await request.json()
    await tx_queue.put(tx_data)
    return {"status": "queued"}

@app.websocket("/ws/dashboard")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Just keep the connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
