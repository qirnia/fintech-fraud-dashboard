# Fintech Fraud Dashboard

A real-time "Palantir-lite" fraud detection dashboard built for hackathons. This project ingests transaction data, builds an in-memory graph ontology to detect fraud networks using `NetworkX`, evaluates risk using the `google-genai` SDK with Gemini 2.5 Flash, and streams insights via WebSockets to a modern frontend.

## Architecture
- **Backend:** FastAPI, Uvicorn, NetworkX (Graph Ontology), Google GenAI SDK (Gemini)
- **Frontend:** Vanilla HTML/JS styled with Tailwind CSS
- **Data Source:** Simulated transaction ingest via a local CSV file (`paysim.csv`)

## Prerequisites
- Python 3.10+
- A Google Gemini API Key

## Setup & Installation

### 1. Environment Setup

From the root directory, navigate to the `backend` folder and set up a virtual environment:

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. API Key Configuration
Create a `.env` file inside the `backend/` directory and add your API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Data Setup
Ensure you have the dataset file named `paysim.csv` placed at the root of the project (outside the `backend/` directory). This is used by the simulator to stream mock transactions.

## Running the Application

This project requires running three separate processes: the backend server, the frontend server, and the transaction simulator.

### Step 1: Start the Backend Server
Open a terminal, activate your virtual environment, and start the FastAPI application:

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```
The backend will run on `http://localhost:8000`.

### Step 2: Start the Frontend
Open a new terminal and start a static file server in the frontend directory. You can use Python's built-in HTTP server:

```bash
cd frontend
python3 -m http.server 3000
```
Open your browser and navigate to `http://localhost:3000` to view the dashboard.

### Step 3: Run the Transaction Simulator
Open a third terminal, activate the virtual environment, and run the simulator to start streaming transactions to the backend:

```bash
cd backend
source venv/bin/activate
python simulator.py
```

The simulator will read rows from `paysim.csv` and send them to the backend API, which will process them through the fraud ontology and Gemini API, before streaming the results to the live dashboard.
