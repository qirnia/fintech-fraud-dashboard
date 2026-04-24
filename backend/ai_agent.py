import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# Configure Google AI Studio
api_key = os.getenv("GEMINI_API_KEY")

try:
    client = genai.Client(api_key=api_key)
    print("Google AI Studio initialized successfully.")
except Exception as e:
    print(f"Warning: Could not initialize Google AI Studio. Please ensure GEMINI_API_KEY is set. Error: {e}")
    client = None

def evaluate_risk(tx_data: dict, graph_context: str) -> dict:
    """
    Calls Gemini 1.5 Flash to evaluate the risk of a transaction based on the transaction data and graph context.
    Returns a dictionary with 'risk_score' (0.0 to 1.0) and 'explanation'.
    """
    if not client:
        # Fallback for local testing without credentials
        return {
            "risk_score": 0.5,
            "explanation": "Google AI Studio not configured. Returning default risk score."
        }

    prompt = f"""
You are a highly advanced Palantir-lite fraud detection AI.
Analyze the following financial transaction and its graph ontology context to determine the risk of fraud.

Transaction Details:
{json.dumps(tx_data, indent=2)}

Graph Ontology Context (Network Analysis):
{graph_context}

Evaluate the transaction based on:
1. Large amounts being transferred to accounts with zero previous history (low in-degree, 0 historical received).
2. Accounts acting as central hubs sending to many other accounts (high out-degree, rapid depletion of funds).
3. The type of transaction (e.g., TRANSFER or CASH_OUT).
4. Whether the origin account is completely drained.

Output ONLY a raw JSON object with the following schema:
{{
  "risk_score": float (from 0.0 to 1.0, where 1.0 is highest risk),
  "explanation": "string (1-2 short sentences explaining the reasoning)"
}}

Do not include markdown blocks or any other text. Only valid JSON.
"""

    generation_config = types.GenerateContentConfig(
        temperature=0.1,
        response_mime_type="application/json"
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=generation_config
        )
        
        result_text = response.text.strip()
        
        # In case the model still outputs markdown despite prompt
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
            
        result_json = json.loads(result_text.strip())
        
        # Ensure correct types
        return {
            "risk_score": float(result_json.get("risk_score", 0.0)),
            "explanation": str(result_json.get("explanation", "No explanation provided."))
        }
    except Exception as e:
        print(f"Error calling Google AI Studio: {e}")
        return {
            "risk_score": 0.0,
            "explanation": f"Error evaluating risk: {str(e)}"
        }
