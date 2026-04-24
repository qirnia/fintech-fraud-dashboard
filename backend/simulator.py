import os
import time
import json
import httpx
import pandas as pd

API_URL = "https://aegis-backend-14827361815.asia-southeast1.run.app/ingest"
CSV_FILE = "../paysim.csv"

def run_simulator():
    if not os.path.exists(CSV_FILE):
        print(f"Error: {CSV_FILE} not found.")
        print("Please ensure you have placed a paysim.csv file in the project root.")
        return

    print(f"Loading {CSV_FILE}...")
    try:
        df = pd.read_csv(CSV_FILE)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    print(f"Loaded {len(df)} transactions. Starting simulation...")
    
    for _, row in df.iterrows():
        # Convert row to dictionary safely, handling numpy types and NaNs
        tx_data = json.loads(row.to_json())
        
        print(f"Sending transaction from {tx_data.get('nameOrig')} to {tx_data.get('nameDest')}... Amount: {tx_data.get('amount')}")
        
        try:
            # Using httpx since it's in our requirements.txt
            response = httpx.post(API_URL, json=tx_data, timeout=5.0)
            if response.status_code == 200:
                print(" -> Success")
            else:
                print(f" -> Failed: {response.status_code} - {response.text}")
        except httpx.RequestError as e:
            print(f" -> Error connecting to server: {e}")
            print(" -> Make sure the FastAPI server is running (uvicorn main:app --reload)")
            
        # Wait 1 second before sending the next one
        time.sleep(5)

if __name__ == "__main__":
    run_simulator()
