/**
 * main.js
 * MEQANIC Intuition - Quantum Computing Visualization
 * Entry point and application orchestration
 */

import { QuantumState } from './quantum/QuantumState.js';
import { BlochSphere } from './visualization/BlochSphere.js';
import { EntanglementLines } from './visualization/EntanglementLines.js';
import { PauliDome } from './visualization/PauliDome.js';
import { ExpandedStateView } from './ui/ExpandedStateView.js';
import { GateBeam } from './visualization/GateBeam.js';
import { DecoherenceBeam } from './visualization/DecoherenceBeam.js';
import { SantaEasterEgg } from './visualization/SantaEasterEgg.js';
import { GATES, applySingleQubitGate, applyContinuousGate } from './quantum/gates.js';
import { applyDecoherence } from './quantum/decoherence.js';
import { complex } from './quantum/quantumMath.js';
import { applyAllExchangeInteractions, findInteractingPairs } from './quantum/spinExchange.js';

// ============================================
// Application State
// ============================================

const state = {
    canvas: null,
    ctx: null,
    quantumState: null,
    blochSpheres: [],
    entanglementLines: null,
    pauliDome: null,
    expandedStateView: null,
    gateBeam: null,
    decoherenceBeam: null,
    santaEasterEgg: null,
    lastTimestamp: 0,
    mode: 'move',  // 'move' or 'measure'
    dragging: {
        active: false,
        qubitIndex: -1,
        offsetX: 0,
        offsetY: 0
    },
    // Heisenberg exchange interaction state
    interactingPairs: [],  // Currently interacting qubit pairs
    exchangeEnabled: true  // Toggle for exchange interaction
};

// Configuration
const CONFIG = {
    QUBIT_RADIUS: 50,
    MIN_QUBITS: 1,
    MAX_QUBITS: 6,
    LAYOUT_PADDING: 100,
    // Heisenberg exchange parameters
    EXCHANGE_THRESHOLD: 150,  // Distance in pixels for exchange interaction
    EXCHANGE_STRENGTH: 4.0,   // Maximum coupling strength J
    // Gate beam parameters
    GATE_ROTATION_SPEED: Math.PI,  // Rotation speed in radians per second
    // Decoherence beam parameters
    DECOHERENCE_STRENGTH: 3.0  // Decoherence rate multiplier
};

// ============================================
// Initialization
// ============================================

function init() {
    // Get canvas and context
    state.canvas = document.getElementById('quantum-canvas');
    if (!state.canvas) {
        console.error('Canvas element not found');
        return;
    }

    state.ctx = state.canvas.getContext('2d');

    // Set up canvas
    resizeCanvas();
    window.addEventListener('resize', debounce(resizeCanvas, 100));

    // Create initial quantum state
    state.quantumState = QuantumState.createRandomState(1);
    updateQubitPositions();
    createBlochSpheres();

    // Create entanglement lines renderer
    state.entanglementLines = new EntanglementLines();

    // Create Pauli dome visualization
    state.pauliDome = new PauliDome();
    state.pauliDome.updateFromState(state.quantumState);

    // Create expanded state view
    state.expandedStateView = new ExpandedStateView();
    state.expandedStateView.updateFromState(state.quantumState);

    // Create gate beam
    state.gateBeam = new GateBeam();

    // Create decoherence beam
    state.decoherenceBeam = new DecoherenceBeam();

    // Create Santa Easter egg (only appears on Christmas)
    state.santaEasterEgg = new SantaEasterEgg();

    // Set up event handlers
    setupEventListeners();
    setupControls();

    // Update displays
    updateStateNotation();
    updateButtonStates();

    // Start render loop
    requestAnimationFrame(animate);
}

// ============================================
// Canvas Management
// ============================================

function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    state.canvas.width = rect.width;
    state.canvas.height = rect.height;

    if (state.quantumState) {
        updateQubitPositions();
        updateBlochSpherePositions();
    }
}

// ============================================
// Qubit Layout
// ============================================

function updateQubitPositions() {
    const { quantumState, canvas } = state;
    const numQubits = quantumState.numQubits;
    const centerX = canvas.width / 2;
    // Offset center down to avoid overlap with Pauli dome at top
    // Smaller offset on mobile since dome is smaller
    const isMobile = canvas.width < 500;
    const domeOffset = isMobile ? 40 : 60;
    const centerY = canvas.height / 2 + domeOffset;

    if (numQubits === 1) {
        quantumState.setQubitPosition(0, centerX, centerY);
        return;
    }

    // Arrange in circle
    const maxRadius = Math.min(canvas.width, canvas.height - domeOffset * 2) / 2 - CONFIG.LAYOUT_PADDING;
    const radius = Math.min(maxRadius, 120 + numQubits * 30);

    for (let i = 0; i < numQubits; i++) {
        const angle = (i / numQubits) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        quantumState.setQubitPosition(i, x, y);
    }
}

function createBlochSpheres() {
    state.blochSpheres = [];

    for (let i = 0; i < state.quantumState.numQubits; i++) {
        const pos = state.quantumState.getQubitPosition(i);
        state.blochSpheres.push(new BlochSphere(pos.x, pos.y, CONFIG.QUBIT_RADIUS));
    }
}

function updateBlochSpherePositions() {
    for (let i = 0; i < state.quantumState.numQubits; i++) {
        const pos = state.quantumState.getQubitPosition(i);
        state.blochSpheres[i].setPosition(pos.x, pos.y);
    }
}

// ============================================
// Event Handling
// ============================================

function setupEventListeners() {
    const { canvas } = state;

    // Mouse events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
}

function handleWheel(e) {
    const pos = getEventPosition(e);
    if (state.expandedStateView.handleWheel(pos.x, pos.y, e.deltaY)) {
        e.preventDefault();
    }
}

function getEventPosition(e) {
    const rect = state.canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }

    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function findQubitAtPosition(x, y) {
    for (let i = state.blochSpheres.length - 1; i >= 0; i--) {
        if (state.blochSpheres[i].contains(x, y)) {
            return i;
        }
    }
    return -1;
}

function handleMouseDown(e) {
    const pos = getEventPosition(e);

    // Handle expanded view interactions first (dragging, clicks inside window)
    if (state.expandedStateView.isVisible) {
        // Check if mouse down is inside the window (for dragging or clicking)
        if (state.expandedStateView.handleMouseDown(pos.x, pos.y)) {
            return; // Event consumed by expanded view
        }
        // Click was outside window - fall through to allow qubit interaction
    }

    // Check if clicking on gate selector
    if (state.gateBeam.isInSelector(pos.x, pos.y)) {
        if (!state.gateBeam.isActive) {
            // Turn on beam if it's off
            toggleGateBeam();
        } else {
            // Cycle gate if beam is already on
            state.gateBeam.cycleGate();
        }
        return;
    }

    // Check if clicking on decoherence selector
    if (state.decoherenceBeam.isInSelector(pos.x, pos.y)) {
        if (!state.decoherenceBeam.isActive) {
            // Turn on beam if it's off
            toggleDecoherenceBeam();
        } else {
            // Cycle mode if beam is already on
            state.decoherenceBeam.cycleMode();
        }
        return;
    }

    // Check if clicking on Pauli dome
    if (state.pauliDome.containsPoint(pos.x, pos.y)) {
        state.expandedStateView.show(state.canvas.width, state.canvas.height);
        return;
    }

    const qubitIndex = findQubitAtPosition(pos.x, pos.y);

    if (qubitIndex >= 0) {
        if (state.mode === 'move') {
            startDragging(qubitIndex, pos);
        } else if (state.mode === 'measure') {
            measureQubit(qubitIndex);
        }
    }
}

function handleMouseMove(e) {
    const pos = getEventPosition(e);

    // Handle expanded view mouse move (dragging, resizing, and tooltips)
    if (state.expandedStateView.isVisible) {
        const result = state.expandedStateView.handleMouseMove(pos.x, pos.y, state.canvas.width, state.canvas.height);
        // Update cursor based on resize edge or drag state
        state.canvas.style.cursor = result.cursor;
        if (result.handled) {
            return; // Window is being dragged or resized
        }
        // Not dragging/resizing window - continue to allow qubit dragging
    } else {
        state.canvas.style.cursor = 'default';
    }

    // Update Pauli dome hover state
    state.pauliDome.isHovered = state.pauliDome.containsPoint(pos.x, pos.y);

    if (!state.dragging.active) return;

    updateDragging(pos);
}

function handleMouseUp(e) {
    // Handle expanded view mouse up (stop window dragging/resizing and handle clicks)
    if (state.expandedStateView.isVisible) {
        const wasDragging = state.expandedStateView.isDragging || state.expandedStateView.isResizing;
        state.expandedStateView.handleMouseUp();
        state.canvas.style.cursor = 'default';

        // If we weren't dragging/resizing, handle as a click for buttons
        if (!wasDragging && e) {
            const pos = getEventPosition(e);
            state.expandedStateView.handleClick(pos.x, pos.y);
        }
    }
    stopDragging();
}

function handleTouchStart(e) {
    e.preventDefault();
    handleMouseDown(e);
}

function handleTouchMove(e) {
    e.preventDefault();
    handleMouseMove(e);
}

function handleTouchEnd(e) {
    // Handle click on expanded view (close button, toggle button)
    if (state.expandedStateView.isVisible && e.changedTouches && e.changedTouches.length > 0) {
        const rect = state.canvas.getBoundingClientRect();
        const pos = {
            x: e.changedTouches[0].clientX - rect.left,
            y: e.changedTouches[0].clientY - rect.top
        };
        state.expandedStateView.handleClick(pos.x, pos.y);
    }
    handleMouseUp();
}

function startDragging(qubitIndex, pos) {
    const qubitPos = state.quantumState.getQubitPosition(qubitIndex);

    state.dragging = {
        active: true,
        qubitIndex,
        offsetX: qubitPos.x - pos.x,
        offsetY: qubitPos.y - pos.y
    };

    state.canvas.classList.add('dragging');
}

function updateDragging(pos) {
    const { dragging, quantumState, canvas } = state;

    // Calculate new position with bounds checking
    let newX = pos.x + dragging.offsetX;
    let newY = pos.y + dragging.offsetY;

    // Keep within canvas bounds
    const padding = CONFIG.QUBIT_RADIUS + 20;
    newX = Math.max(padding, Math.min(canvas.width - padding, newX));
    newY = Math.max(padding, Math.min(canvas.height - padding, newY));

    quantumState.setQubitPosition(dragging.qubitIndex, newX, newY);
    state.blochSpheres[dragging.qubitIndex].setPosition(newX, newY);
}

function stopDragging() {
    state.dragging.active = false;
    state.canvas.classList.remove('dragging');
}

// ============================================
// Quantum Operations
// ============================================

function measureQubit(qubitIndex) {
    const { quantumState } = state;

    // Calculate measurement probabilities
    let prob0 = 0;
    const numQubits = quantumState.numQubits;
    const dim = quantumState.dimension;

    for (let i = 0; i < dim; i++) {
        const bit = (i >> (numQubits - 1 - qubitIndex)) & 1;
        if (bit === 0) {
            const amp = quantumState.amplitudes[i];
            prob0 += amp.re * amp.re + amp.im * amp.im;
        }
    }

    // Random measurement outcome
    const outcome = Math.random() < prob0 ? 0 : 1;

    // Collapse the state
    const newAmplitudes = [];
    let norm = 0;

    for (let i = 0; i < dim; i++) {
        const bit = (i >> (numQubits - 1 - qubitIndex)) & 1;
        if (bit === outcome) {
            newAmplitudes[i] = quantumState.amplitudes[i];
            norm += newAmplitudes[i].re * newAmplitudes[i].re +
                    newAmplitudes[i].im * newAmplitudes[i].im;
        } else {
            newAmplitudes[i] = complex(0, 0);
        }
    }

    // Normalize
    norm = Math.sqrt(norm);
    for (let i = 0; i < dim; i++) {
        if (newAmplitudes[i]) {
            newAmplitudes[i] = complex(
                newAmplitudes[i].re / norm,
                newAmplitudes[i].im / norm
            );
        } else {
            newAmplitudes[i] = complex(0, 0);
        }
    }

    // Create new state with collapsed amplitudes
    const positions = quantumState.qubitPositions.map(p => ({ x: p.x, y: p.y }));
    state.quantumState = new QuantumState(numQubits, newAmplitudes);
    positions.forEach((p, i) => state.quantumState.setQubitPosition(i, p.x, p.y));

    onStateChanged();
}

// ============================================
// Control Handlers
// ============================================

function setupControls() {
    document.getElementById('btn-add-qubit')?.addEventListener('click', addQubit);
    document.getElementById('btn-remove-qubit')?.addEventListener('click', removeQubit);
    document.getElementById('btn-randomize')?.addEventListener('click', randomizeState);
    document.getElementById('btn-move')?.addEventListener('click', () => setMode('move'));
    document.getElementById('btn-measure')?.addEventListener('click', () => setMode('measure'));
    document.getElementById('btn-operate')?.addEventListener('click', toggleGateBeam);
    document.getElementById('btn-decohere')?.addEventListener('click', toggleDecoherenceBeam);
    document.getElementById('btn-about')?.addEventListener('click', openAbout);
}

function openAbout() {
    window.open('https://github.com/tareso/meqanic-intuition#readme', '_blank');
}

function toggleGateBeam() {
    state.gateBeam.toggle();
    const btn = document.getElementById('btn-operate');
    if (btn) {
        btn.classList.toggle('active', state.gateBeam.isActive);
    }
}

function toggleDecoherenceBeam() {
    state.decoherenceBeam.toggle();
    const btn = document.getElementById('btn-decohere');
    if (btn) {
        btn.classList.toggle('active', state.decoherenceBeam.isActive);
    }
}

function addQubit() {
    if (state.quantumState.numQubits >= CONFIG.MAX_QUBITS) return;

    const oldState = state.quantumState;
    const newNumQubits = oldState.numQubits + 1;
    const newDim = Math.pow(2, newNumQubits);
    const newAmplitudes = new Array(newDim);

    // Initialize to zero
    for (let i = 0; i < newDim; i++) {
        newAmplitudes[i] = complex(0, 0);
    }

    // Tensor product with |0⟩: |ψ⟩ ⊗ |0⟩
    for (let i = 0; i < oldState.dimension; i++) {
        newAmplitudes[i * 2] = oldState.amplitudes[i];
    }

    state.quantumState = new QuantumState(newNumQubits, newAmplitudes);
    updateQubitPositions();
    createBlochSpheres();
    onStateChanged();
    updateButtonStates();
}

function removeQubit() {
    if (state.quantumState.numQubits <= CONFIG.MIN_QUBITS) return;

    // Create new random state with fewer qubits
    const newNumQubits = state.quantumState.numQubits - 1;
    state.quantumState = QuantumState.createRandomState(newNumQubits);

    updateQubitPositions();
    createBlochSpheres();
    onStateChanged();
    updateButtonStates();
}

function randomizeState() {
    const numQubits = state.quantumState.numQubits;
    const positions = state.quantumState.qubitPositions.map(p => ({ x: p.x, y: p.y }));

    state.quantumState = QuantumState.createRandomState(numQubits);
    positions.forEach((p, i) => state.quantumState.setQubitPosition(i, p.x, p.y));

    onStateChanged();
}

function setMode(mode) {
    state.mode = mode;

    // Update UI
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));

    if (mode === 'move') {
        document.getElementById('btn-move')?.classList.add('active');
        state.canvas.classList.remove('measuring');
    } else if (mode === 'measure') {
        document.getElementById('btn-measure')?.classList.add('active');
        state.canvas.classList.add('measuring');
    }
}

function updateButtonStates() {
    const addBtn = document.getElementById('btn-add-qubit');
    const removeBtn = document.getElementById('btn-remove-qubit');

    if (addBtn) addBtn.disabled = state.quantumState.numQubits >= CONFIG.MAX_QUBITS;
    if (removeBtn) removeBtn.disabled = state.quantumState.numQubits <= CONFIG.MIN_QUBITS;
}

function updateStateNotation() {
    // State notation header removed - no longer needed
}

/**
 * Update all state-dependent visualizations
 * Call this whenever the quantum state changes
 */
function onStateChanged() {
    state.entanglementLines.invalidateCache();
    state.pauliDome.updateFromState(state.quantumState);
    state.expandedStateView.updateFromState(state.quantumState);
    updateStateNotation();
}

// ============================================
// Animation Loop
// ============================================

function animate(timestamp) {
    const dt = state.lastTimestamp ? (timestamp - state.lastTimestamp) / 1000 : 0;
    state.lastTimestamp = timestamp;

    update(dt);
    render(timestamp);

    requestAnimationFrame(animate);
}

function update(dt) {
    let stateChanged = false;

    // Apply gate beam rotations when qubits overlap with beam
    if (state.gateBeam.isActive) {
        const gateType = state.gateBeam.getCurrentGate();
        const positions = state.quantumState.qubitPositions;

        for (let i = 0; i < state.quantumState.numQubits; i++) {
            const pos = positions[i];
            const overlap = state.gateBeam.getQubitOverlap(pos.x, pos.y, CONFIG.QUBIT_RADIUS);

            if (overlap > 0) {
                // Apply rotation scaled by overlap amount
                const effectiveDt = dt * overlap;
                const oldPositions = state.quantumState.qubitPositions.map(p => ({ x: p.x, y: p.y }));
                state.quantumState = applyContinuousGate(
                    state.quantumState,
                    i,
                    gateType,
                    effectiveDt,
                    CONFIG.GATE_ROTATION_SPEED
                );
                oldPositions.forEach((p, idx) => state.quantumState.setQubitPosition(idx, p.x, p.y));
                stateChanged = true;
            }
        }
    }

    // Apply decoherence beam effects when qubits overlap with beam
    if (state.decoherenceBeam.isActive) {
        const decoherenceMode = state.decoherenceBeam.getCurrentMode();
        const positions = state.quantumState.qubitPositions;

        for (let i = 0; i < state.quantumState.numQubits; i++) {
            const pos = positions[i];
            const overlap = state.decoherenceBeam.getQubitOverlap(pos.x, pos.y, CONFIG.QUBIT_RADIUS);

            if (overlap > 0) {
                // Apply decoherence scaled by overlap amount
                const effectiveDt = dt * overlap;
                const oldPositions = state.quantumState.qubitPositions.map(p => ({ x: p.x, y: p.y }));
                state.quantumState = applyDecoherence(
                    state.quantumState,
                    i,
                    decoherenceMode,
                    effectiveDt,
                    CONFIG.DECOHERENCE_STRENGTH
                );
                oldPositions.forEach((p, idx) => state.quantumState.setQubitPosition(idx, p.x, p.y));
                stateChanged = true;
            }
        }
    }

    // Apply Heisenberg exchange interaction when qubits are close
    if (state.exchangeEnabled && state.quantumState.numQubits >= 2) {
        // Find interacting pairs and apply exchange
        const result = applyAllExchangeInteractions(
            state.quantumState,
            dt,
            CONFIG.EXCHANGE_THRESHOLD
        );

        // Update state if there were interactions
        if (result.interactingPairs.length > 0) {
            state.quantumState = result.state;
            state.interactingPairs = result.interactingPairs;
            stateChanged = true;
        } else {
            state.interactingPairs = [];
        }
    }

    // Update visualizations if state changed
    if (stateChanged) {
        onStateChanged();
    }

    // Update Santa Easter egg animation
    state.santaEasterEgg.update(dt, state.lastTimestamp, state.canvas.width, state.canvas.height);
}

function render(timestamp) {
    const { ctx, canvas, quantumState, blochSpheres, entanglementLines, interactingPairs, pauliDome, expandedStateView, gateBeam, decoherenceBeam } = state;

    // Clear canvas (transparent for CSS background)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Pauli dome at top of canvas (flat side flush with top)
    // Smaller dome on mobile to avoid overlap
    const isMobile = canvas.width < 500;
    const domeWidth = isMobile
        ? Math.min(120, canvas.width * 0.35)
        : Math.min(200, canvas.width * 0.3);
    const domeHeight = domeWidth * 0.5;
    pauliDome.drawCollapsed(ctx, canvas.width / 2, 0, domeWidth, domeHeight, timestamp);

    // Draw gate beam (behind qubits)
    gateBeam.draw(ctx, canvas.width, canvas.height, timestamp, isMobile);

    // Draw decoherence beam (behind qubits)
    decoherenceBeam.draw(ctx, canvas.width, canvas.height, timestamp, isMobile);

    // Draw interaction zones first (behind everything)
    if (interactingPairs.length > 0) {
        drawInteractionZones(ctx, quantumState, interactingPairs, timestamp);
    }

    // Draw entanglement lines (behind spheres)
    if (quantumState.numQubits >= 2) {
        entanglementLines.draw(ctx, quantumState, timestamp);
    }

    // Draw all Bloch spheres
    for (let i = 0; i < quantumState.numQubits; i++) {
        const blochVector = quantumState.getBlochVector(i);
        const purity = quantumState.getPurity(i);
        blochSpheres[i].draw(ctx, blochVector, purity, i, timestamp);
    }

    // Draw Santa Easter egg (flies over the qubits)
    state.santaEasterEgg.draw(ctx);

    // Draw expanded state view on top (floating window)
    if (expandedStateView.isVisible) {
        expandedStateView.draw(ctx, canvas.width, canvas.height, timestamp);
    }
}

/**
 * Draw visual indicators for interacting qubit pairs (Heisenberg exchange zones)
 */
function drawInteractionZones(ctx, quantumState, interactingPairs, timestamp) {
    const time = timestamp / 1000;

    for (const pair of interactingPairs) {
        const posA = quantumState.getQubitPosition(pair.qubitA);
        const posB = quantumState.getQubitPosition(pair.qubitB);

        // Calculate midpoint
        const midX = (posA.x + posB.x) / 2;
        const midY = (posA.y + posB.y) / 2;

        // Interaction strength affects visual intensity
        const intensity = Math.min(1, pair.J / CONFIG.EXCHANGE_STRENGTH);

        // Pulsing glow effect
        const pulse = 0.5 + 0.5 * Math.sin(time * 8);
        const glowAlpha = 0.15 + intensity * 0.2 * pulse;

        // Draw glowing interaction zone around the pair
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const zoneRadius = distance / 2 + CONFIG.QUBIT_RADIUS;

        // Radial gradient for interaction zone
        const gradient = ctx.createRadialGradient(
            midX, midY, 0,
            midX, midY, zoneRadius
        );
        gradient.addColorStop(0, `rgba(0, 255, 200, ${glowAlpha * 0.8})`);
        gradient.addColorStop(0.5, `rgba(0, 200, 255, ${glowAlpha * 0.4})`);
        gradient.addColorStop(1, `rgba(100, 150, 255, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(midX, midY, zoneRadius, zoneRadius * 0.7, Math.atan2(dy, dx), 0, Math.PI * 2);
        ctx.fill();

        // Draw spinning energy ring around interacting qubits
        ctx.save();
        ctx.strokeStyle = `rgba(0, 255, 220, ${0.3 + intensity * 0.4})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 10]);
        ctx.lineDashOffset = -time * 50 * intensity;

        // Ring around qubit A
        ctx.beginPath();
        ctx.arc(posA.x, posA.y, CONFIG.QUBIT_RADIUS + 10, 0, Math.PI * 2);
        ctx.stroke();

        // Ring around qubit B
        ctx.beginPath();
        ctx.arc(posB.x, posB.y, CONFIG.QUBIT_RADIUS + 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

// ============================================
// Utilities
// ============================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// Public API (for console testing)
// ============================================

window.meqanic = {
    getState: () => state.quantumState,
    setState0: () => {
        const n = state.quantumState.numQubits;
        const positions = state.quantumState.qubitPositions.map(p => ({ ...p }));
        state.quantumState = QuantumState.createZeroState(n);
        positions.forEach((p, i) => state.quantumState.setQubitPosition(i, p.x, p.y));
        onStateChanged();
    },
    setState1: () => {
        const n = state.quantumState.numQubits;
        const positions = state.quantumState.qubitPositions.map(p => ({ ...p }));
        state.quantumState = QuantumState.createOneState(n);
        positions.forEach((p, i) => state.quantumState.setQubitPosition(i, p.x, p.y));
        onStateChanged();
    },
    // Create Bell state (|00⟩ + |11⟩)/√2 for testing entanglement
    createBellState: () => {
        // Ensure we have at least 2 qubits
        while (state.quantumState.numQubits < 2) {
            addQubit();
        }
        const positions = state.quantumState.qubitPositions.map(p => ({ ...p }));
        const n = state.quantumState.numQubits;
        const dim = Math.pow(2, n);
        const newAmplitudes = new Array(dim).fill(null).map(() => complex(0, 0));

        // Bell state: (|00...0⟩ + |11...1⟩)/√2 for first two qubits
        // For n qubits: |00⟩|rest⟩ + |11⟩|rest⟩ where rest is |0...0⟩
        const sqrt2inv = 1 / Math.sqrt(2);
        newAmplitudes[0] = complex(sqrt2inv, 0);  // |00...0⟩

        // Index where first two qubits are 11: binary 11000...0
        const idx11 = (1 << (n - 1)) | (1 << (n - 2));
        newAmplitudes[idx11] = complex(sqrt2inv, 0);  // |11...0⟩

        state.quantumState = new QuantumState(n, newAmplitudes);
        positions.forEach((p, i) => state.quantumState.setQubitPosition(i, p.x, p.y));
        onStateChanged();
        console.log('Created Bell state (|00⟩ + |11⟩)/√2 on qubits 0 and 1');
    },
    applyH: (qubit = 0) => {
        const positions = state.quantumState.qubitPositions.map(p => ({ ...p }));
        state.quantumState = applySingleQubitGate(state.quantumState, qubit, GATES.H);
        positions.forEach((p, i) => state.quantumState.setQubitPosition(i, p.x, p.y));
        onStateChanged();
    },
    applyX: (qubit = 0) => {
        const positions = state.quantumState.qubitPositions.map(p => ({ ...p }));
        state.quantumState = applySingleQubitGate(state.quantumState, qubit, GATES.X);
        positions.forEach((p, i) => state.quantumState.setQubitPosition(i, p.x, p.y));
        onStateChanged();
    },
    applyY: (qubit = 0) => {
        const positions = state.quantumState.qubitPositions.map(p => ({ ...p }));
        state.quantumState = applySingleQubitGate(state.quantumState, qubit, GATES.Y);
        positions.forEach((p, i) => state.quantumState.setQubitPosition(i, p.x, p.y));
        onStateChanged();
    },
    applyZ: (qubit = 0) => {
        const positions = state.quantumState.qubitPositions.map(p => ({ ...p }));
        state.quantumState = applySingleQubitGate(state.quantumState, qubit, GATES.Z);
        positions.forEach((p, i) => state.quantumState.setQubitPosition(i, p.x, p.y));
        onStateChanged();
    },
    // Toggle Heisenberg exchange interaction
    toggleExchange: () => {
        state.exchangeEnabled = !state.exchangeEnabled;
        console.log(`Heisenberg exchange: ${state.exchangeEnabled ? 'enabled' : 'disabled'}`);
        return state.exchangeEnabled;
    },
    // Get exchange status
    isExchangeEnabled: () => state.exchangeEnabled,
    // Get currently interacting pairs
    getInteractingPairs: () => state.interactingPairs,
    // Create anti-aligned state for testing exchange (|01⟩ or |10⟩)
    setAntiAligned: () => {
        // Ensure we have at least 2 qubits
        while (state.quantumState.numQubits < 2) {
            addQubit();
        }
        const positions = state.quantumState.qubitPositions.map(p => ({ ...p }));
        const n = state.quantumState.numQubits;
        const dim = Math.pow(2, n);
        const newAmplitudes = new Array(dim).fill(null).map(() => complex(0, 0));

        // Set to |01⟩ state (qubit 0 = |0⟩, qubit 1 = |1⟩)
        // Index for |01...0⟩ is 01 in binary for first two qubits = 1 << (n-2)
        const idx01 = 1 << (n - 2);
        newAmplitudes[idx01] = complex(1, 0);

        state.quantumState = new QuantumState(n, newAmplitudes);
        positions.forEach((p, i) => state.quantumState.setQubitPosition(i, p.x, p.y));
        onStateChanged();
        console.log('Set to |01⟩ state - drag qubits close to see exchange create entanglement!');
    },
    // Force Santa to appear (for testing the Easter egg)
    summonSanta: () => {
        state.santaEasterEgg.forceAppear(state.canvas.width, state.canvas.height);
        console.log('🎅 Ho ho ho! Santa is flying by!');
    }
};

// ============================================
// Start Application
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
