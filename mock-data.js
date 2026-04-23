/**
 * Mock Data for Aegis CyberGraph Dashboard
 * Simulates backend responses for demo and development
 */

// Comprehensive transaction dataset
const transactions = [
    {
        "transaction_id": "T001",
        "sender": "C123",
        "receiver": "C456",
        "amount": 5000,
        "transaction_type": "TRANSFER",
        "timestamp": "2026-04-23T10:30:00Z",
        "risk_score": 86,
        "risk_level": "HIGH",
        "explanation": "High risk of money mule activity due to rapid deposits from multiple sources. Entity exhibits structured withdrawal patterns consistent with layering techniques.",
        "pattern_tags": ["money mule risk", "multi-source deposits", "structuring"],
        "graph": {
            "nodes": [
                { "id": "C123", "label": "C123 (Sender)", "flagged": false },
                { "id": "C456", "label": "C456 (Receiver)", "flagged": true },
                { "id": "IP_99", "label": "Proxy IP", "flagged": true }
            ],
            "edges": [
                { "source": "C123", "target": "C456", "amount": 5000 },
                { "source": "IP_99", "target": "C456", "amount": 0 }
            ]
        }
    },
    {
        "transaction_id": "T002",
        "sender": "C999",
        "receiver": "M_AMZN",
        "amount": 45.20,
        "transaction_type": "PAYMENT",
        "timestamp": "2026-04-23T10:32:15Z",
        "risk_score": 12,
        "risk_level": "LOW",
        "explanation": "Standard payment matching historical user behavior. Location geometry matches previous login sessions. No anomalies detected.",
        "pattern_tags": ["routine payment", "trusted merchant"],
        "graph": {
            "nodes": [
                { "id": "C999", "label": "User C999", "flagged": false },
                { "id": "M_AMZN", "label": "Amazon", "flagged": false }
            ],
            "edges": [
                { "source": "C999", "target": "M_AMZN", "amount": 45.20 }
            ]
        }
    },
    {
        "transaction_id": "T003",
        "sender": "C333",
        "receiver": "C444",
        "amount": 150000,
        "transaction_type": "WIRE",
        "timestamp": "2026-04-23T10:45:22Z",
        "risk_score": 98,
        "risk_level": "CRITICAL",
        "explanation": "Account takeover suspected. Unusually large wire transfer to a previously unseen overseas entity originating from a new device footprint. Immediate intervention required.",
        "pattern_tags": ["velocity spike", "new recipient", "high value", "device anomaly", "account takeover"],
        "graph": {
            "nodes": [
                { "id": "C333", "label": "Victim C333", "flagged": false },
                { "id": "C444", "label": "Offshore C444", "flagged": true },
                { "id": "DEV_X", "label": "Unrecognized Device", "flagged": true },
                { "id": "IP_XX", "label": "VPN Exit Node", "flagged": true }
            ],
            "edges": [
                { "source": "C333", "target": "C444", "amount": 150000 },
                { "source": "DEV_X", "target": "C333", "amount": 0 },
                { "source": "IP_XX", "target": "C333", "amount": 0 }
            ]
        }
    },
    {
        "transaction_id": "T004",
        "sender": "C111",
        "receiver": "C222",
        "amount": 450.00,
        "transaction_type": "TRANSFER",
        "timestamp": "2026-04-23T11:05:10Z",
        "risk_score": 45,
        "risk_level": "MEDIUM",
        "explanation": "Slight anomaly in transaction timing. Velocity is slightly elevated but amounts and recipients are within historical variance. Recommend monitoring.",
        "pattern_tags": ["unusual time", "velocity warning"],
        "graph": {
            "nodes": [
                { "id": "C111", "label": "User C111", "flagged": false },
                { "id": "C222", "label": "User C222", "flagged": false }
            ],
            "edges": [
                { "source": "C111", "target": "C222", "amount": 450 }
            ]
        }
    },
    {
        "transaction_id": "T005",
        "sender": "C555",
        "receiver": "M_CRPT",
        "amount": 8500.00,
        "transaction_type": "PAYMENT",
        "timestamp": "2026-04-23T11:12:05Z",
        "risk_score": 76,
        "risk_level": "HIGH",
        "explanation": "High velocity of purchases towards high-risk merchant category (Cryptocurrency). First time interacting with this merchant. Potential crypto laundering pattern.",
        "pattern_tags": ["high-risk merchant", "first interaction", "crypto exchange", "rapid succession"],
        "graph": {
            "nodes": [
                { "id": "C555", "label": "User C555", "flagged": false },
                { "id": "M_CRPT", "label": "Crypto Exchange", "flagged": true },
                { "id": "WALLET_X", "label": "Hot Wallet", "flagged": true }
            ],
            "edges": [
                { "source": "C555", "target": "M_CRPT", "amount": 8500 },
                { "source": "M_CRPT", "target": "WALLET_X", "amount": 8200 }
            ]
        }
    },
    {
        "transaction_id": "T006",
        "sender": "C777",
        "receiver": "C888",
        "amount": 12500,
        "transaction_type": "TRANSFER",
        "timestamp": "2026-04-23T11:45:33Z",
        "risk_score": 92,
        "risk_level": "CRITICAL",
        "explanation": "Multiple small deposits just below reporting threshold followed by immediate large transfer. Classic smurfing pattern detected across 8 source accounts.",
        "pattern_tags": ["smurfing", "structuring", "threshold avoidance", "layering"],
        "graph": {
            "nodes": [
                { "id": "C777", "label": "Aggregator", "flagged": true },
                { "id": "C888", "label": "Beneficiary", "flagged": true },
                { "id": "ACC_1", "label": "Mule Account A", "flagged": true },
                { "id": "ACC_2", "label": "Mule Account B", "flagged": true }
            ],
            "edges": [
                { "source": "ACC_1", "target": "C777", "amount": 2500 },
                { "source": "ACC_2", "target": "C777", "amount": 3000 },
                { "source": "C777", "target": "C888", "amount": 12500 }
            ]
        }
    }
];

// Global summary statistics
const globalSummary = {
    "total_transactions": 247,
    "suspicious_alerts": 23,
    "active_risky_nodes": 11,
    "high_risk_cases": 7,
    "average_risk_score": 58
};

// Optional: Simulate real-time data stream for demo
function simulateRealTimeData(callback) {
    let index = 0;
    const interval = setInterval(() => {
        if (index < transactions.length) {
            callback(transactions[index]);
            index++;
        } else {
            clearInterval(interval);
        }
    }, 8000);
}

// Export for use in app.js (global scope)
window.transactions = transactions;
window.globalSummary = globalSummary;
window.simulateRealTimeData = simulateRealTimeData;