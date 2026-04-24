/**
 * Aegis CyberGraph - Main Application Logic
 * Handles dashboard state, UI updates, graph rendering, and WebSocket connectivity
 */

// ======================== GLOBAL STATE ========================
let currentTransaction = null;
let currentGraphData = null;
let isMockMode = true;
let allTransactions = [];
let summaryData = null;
let wsConnection = null;

// ======================== UTILITY FUNCTIONS ========================

/**
 * Updates the live timestamp in the header
 */
function updateTimestamp() {
    const now = new Date();
    const formatted = now.toISOString().replace('T', ' ').slice(0, 19);
    const timestampEl = document.getElementById('liveTimestamp');
    if (timestampEl) timestampEl.textContent = formatted + ' UTC';
}
setInterval(updateTimestamp, 1000);
updateTimestamp();

/**
 * Updates the summary statistic cards with current data
 * @param {Object} summary - Summary statistics object
 */
function updateSummaryCards(summary) {
    const elements = {
        'statTotal': summary.total_transactions,
        'statAlerts': summary.suspicious_alerts,
        'statHighRisk': summary.high_risk_cases,
        'statNodes': summary.active_risky_nodes,
        'statAvgScore': summary.average_risk_score
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

/**
 * Renders the live transaction feed table
 * @param {Array} transactionsList - Array of transaction objects
 */
function renderFeed(transactionsList) {
    const tbody = document.getElementById('feedTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    // Show most recent first (reverse order)
    [...transactionsList].reverse().forEach((txn, idx) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-white/5 cursor-pointer transition-colors animate-row';
        row.style.animationDelay = `${idx * 0.03}s`;
        row.onclick = () => selectTransaction(txn);

        // Determine risk badge styling
        let riskBadgeClass = 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
        if (txn.risk_score >= 75) {
            riskBadgeClass = 'text-rose-400 bg-rose-500/20 border-rose-500/30';
        } else if (txn.risk_score >= 45) {
            riskBadgeClass = 'text-amber-400 bg-amber-500/20 border-amber-500/30';
        }

        row.innerHTML = `
            <td class="px-4 py-2.5 font-mono text-[11px] text-indigo-300">${txn.transaction_id}</td>
            <td class="px-4 py-2.5 font-mono text-[10px] text-zinc-500">${txn.timestamp.slice(5, 16)}</td>
            <td class="px-4 py-2.5 text-[12px]"><span class="text-zinc-300">${txn.sender}</span> <span class="text-zinc-600">→</span> <span class="text-zinc-300">${txn.receiver}</span></td>
            <td class="px-4 py-2.5 font-mono font-bold text-sm">$${txn.amount.toLocaleString()}</td>
            <td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded text-[9px] font-bold border ${riskBadgeClass}">${txn.risk_score} ${txn.risk_level}</span></td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Updates the transaction details panel
 * @param {Object} txn - Selected transaction object
 */
function updateDetailsPanel(txn) {
    const panel = document.getElementById('detailsPanel');
    if (!panel) return;

    const riskColor = txn.risk_score >= 75 ? 'text-rose-400' :
        (txn.risk_score >= 45 ? 'text-amber-400' : 'text-emerald-400');

    panel.innerHTML = `
        <div class="flex justify-between items-center pb-2 border-b border-white/10">
            <span class="text-[10px] text-zinc-500 uppercase tracking-wider">Transaction ID</span>
            <span class="font-mono text-indigo-400 text-sm font-bold">${txn.transaction_id}</span>
        </div>
        <div class="flex justify-between items-center pb-2 border-b border-white/10">
            <span class="text-[10px] text-zinc-500 uppercase tracking-wider">Timestamp</span>
            <span class="text-xs text-zinc-300 font-mono">${txn.timestamp}</span>
        </div>
        <div class="flex justify-between items-center pb-2 border-b border-white/10">
            <span class="text-[10px] text-zinc-500 uppercase tracking-wider">Entity Flow</span>
            <span class="text-xs bg-white/5 px-2 py-1 rounded font-mono">${txn.sender} → ${txn.receiver}</span>
        </div>
        <div class="flex justify-between items-center pb-2 border-b border-white/10">
            <span class="text-[10px] text-zinc-500 uppercase tracking-wider">Amount</span>
            <span class="text-xl font-mono font-bold text-white">$${txn.amount.toLocaleString()}</span>
        </div>
        <div class="flex justify-between items-center pt-1">
            <span class="text-[10px] text-zinc-500 uppercase tracking-wider">Aegis Risk Score</span>
            <span class="text-2xl font-mono font-bold ${riskColor} drop-shadow-[0_0_8px_currentColor]">${txn.risk_score}<span class="text-xs">/100</span></span>
        </div>
    `;
}

/**
 * Updates the AI reasoning panel with pattern tags and explanation
 * @param {Object} txn - Selected transaction object
 */
function updateAIPanel(txn) {
    const panel = document.getElementById('aiPanel');
    if (!panel) return;

    const tagsHtml = txn.pattern_tags.map(tag =>
        `<span class="inline-block px-2 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded text-[9px] font-bold uppercase tracking-wider mr-2 mb-2">${tag}</span>`
    ).join('');

    const severityClass = txn.risk_score >= 75 ? 'border-l-rose-500 bg-rose-500/5' :
        (txn.risk_score >= 45 ? 'border-l-amber-500 bg-amber-500/5' : 'border-l-emerald-500 bg-emerald-500/5');

    panel.innerHTML = `
        <div class="mb-3">
            <div class="flex flex-wrap">${tagsHtml || '<span class="text-zinc-500 text-[10px]">No patterns detected</span>'}</div>
        </div>
        <div class="p-4 rounded-lg border-l-4 ${severityClass} bg-black/30">
            <p class="text-[11px] leading-relaxed text-zinc-200">${txn.explanation}</p>
        </div>
    `;
}

/**
 * Updates the cluster insight panel
 * @param {Object} txn - Selected transaction object
 */
function updateClusterPanel(txn) {
    const panel = document.getElementById('clusterPanel');
    if (!panel) return;

    const flaggedCount = txn.graph.nodes.filter(n => n.flagged).length;
    if (flaggedCount > 0) {
        panel.innerHTML = `⚠️ <span class="text-rose-300 font-bold">${flaggedCount} compromised nodes</span> detected in this transaction cluster. Immediate investigation recommended to prevent chain propagation.`;
    } else {
        panel.innerHTML = `✅ No immediate threats in this entity cluster. Trust scores within operational threshold.`;
    }
}

/**
 * Renders the network graph using SVG
 * @param {Object} graphData - Graph data with nodes and edges
 */
function renderGraph(graphData) {
    const container = document.getElementById('graphContainer');
    const svg = document.getElementById('networkSvg');

    if (!container || !svg || !graphData) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width < 100 || height < 100) {
        // Retry after a short delay if container not ready
        setTimeout(() => renderGraph(graphData), 100);
        return;
    }

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';

    const centerX = width / 2;
    const centerY = height / 2;
    const nodes = graphData.nodes;
    const edges = graphData.edges;

    // Position nodes intelligently based on count
    const positioned = nodes.map((node, idx) => {
        let x, y;
        const nodeCount = nodes.length;

        if (nodeCount === 1) {
            x = centerX;
            y = centerY;
        } else if (nodeCount === 2) {
            x = centerX + (idx === 0 ? -width * 0.2 : width * 0.2);
            y = centerY;
        } else if (nodeCount === 3) {
            const angles = [-0.8, 0.8, 0];
            x = centerX + Math.sin(angles[idx]) * width * 0.22;
            y = centerY + Math.cos(angles[idx]) * height * 0.2;
        } else {
            const angle = (idx / nodeCount) * 2 * Math.PI;
            const radius = Math.min(width, height) * 0.28;
            x = centerX + radius * Math.cos(angle);
            y = centerY + radius * Math.sin(angle);
        }

        // Clamp to container boundaries
        x = Math.min(Math.max(x, 60), width - 60);
        y = Math.min(Math.max(y, 60), height - 60);

        return { ...node, x, y };
    });

    // Draw edges first (so they appear behind nodes)
    edges.forEach(edge => {
        const source = positioned.find(n => n.id === edge.source);
        const target = positioned.find(n => n.id === edge.target);

        if (source && target) {
            // Main edge line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', source.x);
            line.setAttribute('y1', source.y);
            line.setAttribute('x2', target.x);
            line.setAttribute('y2', target.y);
            line.setAttribute('stroke', 'rgba(99, 102, 241, 0.4)');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '4,4');
            svg.appendChild(line);

            // Edge label for amount
            if (edge.amount > 0) {
                const mx = (source.x + target.x) / 2;
                const my = (source.y + target.y) / 2;

                const textBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                textBg.setAttribute('x', mx - 35);
                textBg.setAttribute('y', my - 12);
                textBg.setAttribute('width', '70');
                textBg.setAttribute('height', '18');
                textBg.setAttribute('fill', '#0a0a0f');
                textBg.setAttribute('rx', '4');
                textBg.setAttribute('stroke', 'rgba(255,255,255,0.1)');
                svg.appendChild(textBg);

                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', mx);
                text.setAttribute('y', my + 2);
                text.setAttribute('fill', '#a1a1aa');
                text.setAttribute('font-size', '8');
                text.setAttribute('font-family', 'monospace');
                text.setAttribute('font-weight', 'bold');
                text.setAttribute('text-anchor', 'middle');
                text.textContent = `$${edge.amount.toLocaleString()}`;
                svg.appendChild(text);
            }
        }
    });

    // Draw nodes
    positioned.forEach(node => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'graph-node');

        // Glow effect for flagged nodes
        if (node.flagged) {
            const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            glow.setAttribute('cx', node.x);
            glow.setAttribute('cy', node.y);
            glow.setAttribute('r', '30');
            glow.setAttribute('fill', 'rgba(225, 29, 72, 0.15)');
            group.appendChild(glow);

            const pulseRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            pulseRing.setAttribute('cx', node.x);
            pulseRing.setAttribute('cy', node.y);
            pulseRing.setAttribute('r', '24');
            pulseRing.setAttribute('fill', 'none');
            pulseRing.setAttribute('stroke', 'rgba(225, 29, 72, 0.4)');
            pulseRing.setAttribute('stroke-width', '1.5');
            group.appendChild(pulseRing);
        }

        // Main circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', node.x);
        circle.setAttribute('cy', node.y);
        circle.setAttribute('r', '22');
        circle.setAttribute('fill', '#0f0f13');
        circle.setAttribute('stroke', node.flagged ? '#e11d48' : '#6366f1');
        circle.setAttribute('stroke-width', '3');
        group.appendChild(circle);

        // Node label (short ID)
        const shortLabel = node.id.length > 4 ? node.id.slice(0, 4) : node.id;
        const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textLabel.setAttribute('x', node.x);
        textLabel.setAttribute('y', node.y + 5);
        textLabel.setAttribute('fill', node.flagged ? '#fda4af' : '#c7d2fe');
        textLabel.setAttribute('font-size', '11');
        textLabel.setAttribute('font-weight', 'bold');
        textLabel.setAttribute('font-family', 'monospace');
        textLabel.setAttribute('text-anchor', 'middle');
        textLabel.textContent = shortLabel;
        group.appendChild(textLabel);

        // Full name label below node
        const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameLabel.setAttribute('x', node.x);
        nameLabel.setAttribute('y', node.y + 36);
        nameLabel.setAttribute('fill', '#a1a1aa');
        nameLabel.setAttribute('font-size', '8');
        nameLabel.setAttribute('text-anchor', 'middle');
        const displayLabel = node.label.length > 12 ? node.label.slice(0, 10) + '..' : node.label;
        nameLabel.textContent = displayLabel;
        group.appendChild(nameLabel);

        svg.appendChild(group);
    });
}

/**
 * Selects a transaction and updates all panels
 * @param {Object} txn - Transaction to select
 */
function selectTransaction(txn) {
    if (!txn) return;
    currentTransaction = txn;
    currentGraphData = txn.graph;

    updateDetailsPanel(txn);
    updateAIPanel(txn);
    updateClusterPanel(txn);
    renderGraph(txn.graph);
}

/**
 * Initializes the dashboard
 */
function initializeDashboard() {
    enableLiveMode();
}

/**
 * Connects to backend WebSocket for real-time data
 */
function connectWebSocket() {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.close();
    }

    const wsUrl = 'ws://localhost:8000/ws/dashboard';

    try {
        wsConnection = new WebSocket(wsUrl);

        wsConnection.onopen = () => {
            console.log('WebSocket connected');
            const statusEl = document.querySelector('.text-zinc-600');
            if (statusEl) statusEl.textContent = 'WebSocket: CONNECTED';
        };

        wsConnection.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Live data received:', data);
                
                if (data.transaction && data.ai_analysis) {
                    const txn = data.transaction;
                    const ai = data.ai_analysis;
                    
                    const risk_score = Math.round(ai.risk_score * 100);
                    let risk_level = 'LOW';
                    if (risk_score >= 75) risk_level = 'CRITICAL';
                    else if (risk_score >= 45) risk_level = 'HIGH';

                    const frontendTxn = {
                        transaction_id: txn.nameOrig + '-' + txn.step,
                        timestamp: new Date().toISOString(),
                        sender: txn.nameOrig,
                        receiver: txn.nameDest,
                        amount: txn.amount,
                        risk_score: risk_score,
                        risk_level: risk_level,
                        explanation: ai.explanation,
                        pattern_tags: [txn.type],
                        graph: {
                            nodes: [
                                { id: txn.nameOrig, label: "Sender", flagged: risk_score >= 75 },
                                { id: txn.nameDest, label: "Receiver", flagged: false }
                            ],
                            edges: [
                                { source: txn.nameOrig, target: txn.nameDest, amount: txn.amount }
                            ]
                        }
                    };

                    allTransactions.unshift(frontendTxn);
                    if (allTransactions.length > 50) allTransactions.pop();
                    renderFeed(allTransactions);

                    // Auto-select if critical and not already viewing one
                    if (risk_score >= 75 && (!currentTransaction || currentTransaction.risk_score < 75)) {
                        selectTransaction(frontendTxn);
                    } else if (!currentTransaction) {
                        selectTransaction(frontendTxn);
                    }
                }
            } catch (err) {
                console.error('Error parsing WebSocket message:', err);
            }
        };

        wsConnection.onerror = (error) => {
            console.error('WebSocket error:', error);
            const statusEl = document.querySelector('.text-zinc-600');
            if (statusEl) statusEl.textContent = 'WebSocket: ERROR';
        };

        wsConnection.onclose = () => {
            console.log('WebSocket disconnected');
            const statusEl = document.querySelector('.text-zinc-600');
            if (statusEl) statusEl.textContent = 'WebSocket: DISCONNECTED';

            // Auto-reconnect after 3 seconds if in live mode
            if (!isMockMode) {
                setTimeout(connectWebSocket, 3000);
            }
        };
    } catch (err) {
        console.error('Failed to create WebSocket:', err);
    }
}

/**
 * Switches to mock data mode
 */
function enableMockMode() {
    isMockMode = true;

    // Update button styles
    const mockBtn = document.getElementById('mockModeBtn');
    const liveBtn = document.getElementById('liveModeBtn');
    if (mockBtn && liveBtn) {
        mockBtn.className = 'px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 shadow-sm';
        liveBtn.className = 'px-4 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:text-white transition-all';
    }

    // Disconnect WebSocket if connected
    if (wsConnection) {
        wsConnection.close();
        wsConnection = null;
    }

    // Reload dashboard
    // Mock mode logic is removed; live mode is standard now
    console.warn("Mock mode is disabled. Please connect to the backend.");
}

/**
 * Switches to live WebSocket mode
 */
function enableLiveMode() {
    isMockMode = false;

    // Update button styles
    const mockBtn = document.getElementById('mockModeBtn');
    const liveBtn = document.getElementById('liveModeBtn');
    if (mockBtn && liveBtn) {
        liveBtn.className = 'px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 shadow-sm';
        mockBtn.className = 'px-4 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:text-white transition-all';
    }

    // Connect to WebSocket
    connectWebSocket();
}

// ======================== EVENT LISTENERS & INITIALIZATION ========================

// Set up mode toggle buttons
document.addEventListener('DOMContentLoaded', () => {
    const mockBtn = document.getElementById('mockModeBtn');
    const liveBtn = document.getElementById('liveModeBtn');

    if (mockBtn) mockBtn.addEventListener('click', enableMockMode);
    if (liveBtn) liveBtn.addEventListener('click', enableLiveMode);

    // Initialize with mock data
    initializeDashboard();
});

// Handle window resize for graph redraw
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentGraphData) {
            renderGraph(currentGraphData);
        }
    }, 150);
});

// Observe graph container for size changes (handles initial render and tab switches)
const graphContainer = document.getElementById('graphContainer');
if (graphContainer) {
    const resizeObserver = new ResizeObserver(() => {
        if (currentGraphData) {
            renderGraph(currentGraphData);
        }
    });
    resizeObserver.observe(graphContainer);
}