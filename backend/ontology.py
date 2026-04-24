import networkx as nx
from typing import Dict, Any, List

class FraudOntology:
    def __init__(self):
        # Directed graph for tracking fund flows
        self.graph = nx.DiGraph()

    def add_transaction(self, tx: Dict[str, Any]):
        """
        Add a transaction to the ontology graph.
        tx expected format: {
            "step": int,
            "type": str,
            "amount": float,
            "nameOrig": str,
            "oldbalanceOrg": float,
            "newbalanceOrig": float,
            "nameDest": str,
            "oldbalanceDest": float,
            "newbalanceDest": float,
            "isFraud": int,
            "isFlaggedFraud": int
        }
        """
        orig = tx.get("nameOrig")
        dest = tx.get("nameDest")
        amount = tx.get("amount", 0.0)
        
        # Add nodes if they don't exist
        if orig not in self.graph:
            self.graph.add_node(orig, type="account")
        if dest not in self.graph:
            self.graph.add_node(dest, type="account")
            
        # Add edge (transaction)
        # In a real app we might use MultiDiGraph to allow multiple transactions between the same pair,
        # but for simplicity, we'll just track the latest or aggregate. We will use a unique edge key or just 
        # add an edge with weight. Let's make it simple and just use DiGraph, summing amounts if they exist.
        if self.graph.has_edge(orig, dest):
            self.graph[orig][dest]['weight'] += amount
            self.graph[orig][dest]['tx_count'] += 1
        else:
            self.graph.add_edge(orig, dest, weight=amount, tx_count=1)
            
    def get_node_context(self, node_id: str) -> Dict[str, Any]:
        """
        Retrieve context for a given node to feed to the AI agent.
        """
        if node_id not in self.graph:
            return {"degree": 0, "in_degree": 0, "out_degree": 0, "total_received": 0.0, "total_sent": 0.0}
            
        in_edges = self.graph.in_edges(node_id, data=True)
        out_edges = self.graph.out_edges(node_id, data=True)
        
        total_received = sum(data.get('weight', 0) for _, _, data in in_edges)
        total_sent = sum(data.get('weight', 0) for _, _, data in out_edges)
        
        return {
            "in_degree": self.graph.in_degree(node_id),
            "out_degree": self.graph.out_degree(node_id),
            "total_received": total_received,
            "total_sent": total_sent,
        }

    def get_transaction_context(self, tx: Dict[str, Any]) -> str:
        """
        Build a textual context description for a transaction to pass to the LLM.
        """
        orig_context = self.get_node_context(tx.get("nameOrig"))
        dest_context = self.get_node_context(tx.get("nameDest"))
        
        context = f"Transaction Analysis Context:\\n"
        context += f"Origin Account ({tx.get('nameOrig')}):\\n"
        context += f"  - Out-Degree (Accounts sent to): {orig_context['out_degree']}\\n"
        context += f"  - Total Sent (Historical): {orig_context['total_sent']}\\n"
        context += f"  - Transaction Amount: {tx.get('amount')}\\n"
        context += f"  - New Balance: {tx.get('newbalanceOrig')}\\n"
        
        context += f"Destination Account ({tx.get('nameDest')}):\\n"
        context += f"  - In-Degree (Accounts received from): {dest_context['in_degree']}\\n"
        context += f"  - Total Received (Historical): {dest_context['total_received']}\\n"
        context += f"  - New Balance: {tx.get('newbalanceDest')}\\n"
        
        return context

# Singleton instance
ontology = FraudOntology()
