/**
 * EntanglementLines.js
 * Renders oscillating colorful arcs between entangled qubits
 * Style inspired by Quantum Intuition XR paper (arXiv:2504.08984)
 * Arc intensity and chaos corresponds to entanglement entropy
 */

import { getEntangledPairs } from '../quantum/entanglement.js';

// Color configuration for entanglement visualization
const COLORS = {
    // Gradient from pink/magenta to purple to blue
    spectrum: [
        { r: 255, g: 100, b: 200 },   // Pink/magenta
        { r: 180, g: 80, b: 255 },    // Purple
        { r: 138, g: 43, b: 226 },    // Blue-violet
        { r: 100, g: 149, b: 237 },   // Cornflower blue
        { r: 147, g: 112, b: 219 },   // Medium purple
    ],
    glow: { r: 180, g: 100, b: 255 }  // Lighter purple for glow
};

export class EntanglementLines {
    constructor() {
        // Cache for entanglement calculations
        this._cachedPairs = [];
        this._lastStateHash = null;

        // Animation parameters
        this.baseWaveSpeed = 2.0;       // Base oscillation speed
        this.arcHeight = 0.4;           // Arc curvature (fraction of distance)
        this.minLines = 3;              // Minimum number of lines at low entanglement
        this.maxLines = 12;             // Maximum lines at full entanglement
        this.baseAmplitude = 8;         // Base wave amplitude in pixels
        this.maxAmplitude = 25;         // Max wave amplitude at full entanglement
        this.glowBlur = 15;             // Glow blur radius
    }

    /**
     * Draw entanglement arcs between all entangled qubit pairs
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {QuantumState} state - Current quantum state
     * @param {number} timestamp - Animation timestamp in milliseconds
     */
    draw(ctx, state, timestamp) {
        if (state.numQubits < 2) return;

        // Get entangled pairs (with caching for performance)
        const pairs = this._getEntangledPairs(state);

        if (pairs.length === 0) return;

        ctx.save();

        // Draw each entangled pair
        for (const pair of pairs) {
            this._drawEntanglementArc(ctx, state, pair, timestamp);
        }

        ctx.restore();
    }

    /**
     * Get entangled pairs with caching
     * @private
     */
    _getEntangledPairs(state) {
        // Simple hash based on first few amplitudes
        const hash = this._computeStateHash(state);

        if (hash !== this._lastStateHash) {
            this._cachedPairs = getEntangledPairs(state, 0.02);
            this._lastStateHash = hash;
        }

        return this._cachedPairs;
    }

    /**
     * Compute a simple hash for state change detection
     * @private
     */
    _computeStateHash(state) {
        let hash = state.numQubits;
        const samples = Math.min(8, state.dimension);

        for (let i = 0; i < samples; i++) {
            const amp = state.amplitudes[i];
            hash += Math.round(amp.re * 1000) + Math.round(amp.im * 1000);
        }

        return hash;
    }

    /**
     * Draw a single entanglement arc between two qubits
     * @private
     */
    _drawEntanglementArc(ctx, state, pair, timestamp) {
        const { qubitA, qubitB, concurrence } = pair;

        const posA = state.getQubitPosition(qubitA);
        const posB = state.getQubitPosition(qubitB);

        // Calculate distance and midpoint
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1) return;

        // Midpoint
        const midX = (posA.x + posB.x) / 2;
        const midY = (posA.y + posB.y) / 2;

        // Perpendicular direction for arc bulge
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Arc control point (curves upward/outward)
        const arcOffset = distance * this.arcHeight;
        const controlX = midX + perpX * arcOffset;
        const controlY = midY + perpY * arcOffset;

        // Number of oscillating lines based on concurrence
        const numLines = Math.floor(this.minLines + concurrence * (this.maxLines - this.minLines));

        // Wave amplitude based on concurrence (more chaotic at higher entanglement)
        const amplitude = this.baseAmplitude + concurrence * (this.maxAmplitude - this.baseAmplitude);

        // Time-based animation
        const time = timestamp / 1000;

        // Draw glow layer first
        this._drawArcGlow(ctx, posA, posB, controlX, controlY, concurrence, time);

        // Draw multiple oscillating lines
        for (let i = 0; i < numLines; i++) {
            // Each line has different phase and slight offset
            const linePhase = (i / numLines) * Math.PI * 2;
            const lineOffset = (i - (numLines - 1) / 2) * (2 + concurrence * 3);

            // Color from spectrum
            const colorIndex = i % COLORS.spectrum.length;
            const color = COLORS.spectrum[colorIndex];

            // Varying opacity
            const baseOpacity = 0.4 + concurrence * 0.4;
            const phaseOpacity = 0.7 + 0.3 * Math.sin(time * 2 + linePhase);
            const opacity = baseOpacity * phaseOpacity;

            // Line width varies
            const lineWidth = 1.5 + concurrence * 2;

            this._drawOscillatingArcLine(
                ctx, posA, posB, controlX, controlY,
                lineOffset, perpX, perpY,
                amplitude, linePhase, time,
                color, opacity, lineWidth,
                concurrence
            );
        }
    }

    /**
     * Draw the glow effect behind the arc
     * @private
     */
    _drawArcGlow(ctx, posA, posB, controlX, controlY, concurrence, time) {
        const { r, g, b } = COLORS.glow;
        const glowOpacity = 0.2 + concurrence * 0.3;
        const pulseIntensity = 0.8 + 0.2 * Math.sin(time * 3);

        ctx.save();
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${glowOpacity * pulseIntensity})`;
        ctx.shadowBlur = this.glowBlur * (0.5 + concurrence);

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${glowOpacity * 0.3})`;
        ctx.lineWidth = 10 * concurrence;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(posA.x, posA.y);
        ctx.quadraticCurveTo(controlX, controlY, posB.x, posB.y);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Draw a single oscillating line along the arc path
     * @private
     */
    _drawOscillatingArcLine(
        ctx, posA, posB, controlX, controlY,
        lineOffset, perpX, perpY,
        amplitude, phaseOffset, time,
        color, opacity, lineWidth,
        concurrence
    ) {
        const { r, g, b } = color;

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();

        // Number of segments along the arc
        const segments = 60;

        // Frequency increases with concurrence for more chaotic look
        const baseFrequency = 4 + concurrence * 8;
        const waveSpeed = this.baseWaveSpeed * (1 + concurrence);

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;

            // Quadratic bezier point
            const u = 1 - t;
            const baseX = u * u * posA.x + 2 * u * t * controlX + t * t * posB.x;
            const baseY = u * u * posA.y + 2 * u * t * controlY + t * t * posB.y;

            // Calculate tangent for perpendicular oscillation
            const tangentX = 2 * u * (controlX - posA.x) + 2 * t * (posB.x - controlX);
            const tangentY = 2 * u * (controlY - posA.y) + 2 * t * (posB.y - controlY);
            const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY);

            let oscPerpX = -tangentY / tangentLen;
            let oscPerpY = tangentX / tangentLen;

            if (tangentLen < 0.001) {
                oscPerpX = perpX;
                oscPerpY = perpY;
            }

            // Multiple wave components for more organic look
            const wave1 = Math.sin(t * baseFrequency * Math.PI + time * waveSpeed + phaseOffset);
            const wave2 = Math.sin(t * baseFrequency * 1.7 * Math.PI + time * waveSpeed * 0.7 + phaseOffset * 1.3) * 0.5;
            const wave3 = Math.sin(t * baseFrequency * 2.3 * Math.PI + time * waveSpeed * 1.3 + phaseOffset * 0.7) * 0.3 * concurrence;

            // Combined wave with envelope (smaller at endpoints)
            const envelope = Math.sin(t * Math.PI); // 0 at ends, 1 in middle
            const totalWave = (wave1 + wave2 + wave3) * envelope * amplitude;

            // Apply line offset and wave oscillation
            const x = baseX + oscPerpX * (lineOffset + totalWave);
            const y = baseY + oscPerpY * (lineOffset + totalWave);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }

    /**
     * Invalidate cache (call when state changes significantly)
     */
    invalidateCache() {
        this._lastStateHash = null;
        this._cachedPairs = [];
    }
}
