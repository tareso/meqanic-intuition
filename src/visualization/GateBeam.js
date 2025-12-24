/**
 * GateBeam.js
 * Renders a "transporter beam" style effect for applying single-qubit gates
 *
 * Features:
 * - Metal box "source" at top
 * - Yellow beam with shimmering descending lines
 * - Width matches a qubit (Bloch sphere)
 * - Continuous gate application based on overlap
 */

// Available single-qubit gates
const GATES = ['X', 'Y', 'Z', 'S', 'T'];

// Gate rotation axes and angles
const GATE_INFO = {
    X: { axis: 'x', description: 'Pauli-X (bit flip)' },
    Y: { axis: 'y', description: 'Pauli-Y' },
    Z: { axis: 'z', description: 'Pauli-Z (phase flip)' },
    S: { axis: 'z', description: 'S gate (√Z)' },
    T: { axis: 'z', description: 'T gate (√S)' }
};

// Shimmering line class for the beam effect
class ShimmerLine {
    constructor(beamLeft, beamRight, beamTop, beamBottom) {
        this.reset(beamLeft, beamRight, beamTop, beamBottom);
    }

    reset(beamLeft, beamRight, beamTop, beamBottom) {
        // Random x position within beam
        this.x = beamLeft + Math.random() * (beamRight - beamLeft);
        this.y = beamTop + Math.random() * (beamBottom - beamTop) * 0.2;
        this.speed = 150 + Math.random() * 200; // pixels per second
        this.length = 20 + Math.random() * 40;
        this.opacity = 0.3 + Math.random() * 0.5;
        this.shimmerPhase = Math.random() * Math.PI * 2;
        this.shimmerSpeed = 4 + Math.random() * 6;
        this.width = 1 + Math.random() * 2;
        this.beamTop = beamTop;
        this.beamBottom = beamBottom;
    }

    update(dt, beamLeft, beamRight, beamTop, beamBottom) {
        this.y += this.speed * dt;
        this.shimmerPhase += this.shimmerSpeed * dt;

        // Reset when reaching bottom
        if (this.y > beamBottom) {
            this.reset(beamLeft, beamRight, beamTop, beamBottom);
        }
    }

    draw(ctx) {
        const shimmer = 0.5 + 0.5 * Math.sin(this.shimmerPhase);
        const alpha = this.opacity * shimmer;

        // Draw vertical line
        const gradient = ctx.createLinearGradient(0, this.y, 0, this.y + this.length);
        gradient.addColorStop(0, `rgba(255, 240, 100, 0)`);
        gradient.addColorStop(0.3, `rgba(255, 240, 100, ${alpha})`);
        gradient.addColorStop(0.7, `rgba(255, 220, 80, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 200, 50, 0)`);

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.width;
        ctx.stroke();
    }
}

export class GateBeam {
    constructor() {
        this.isActive = false;
        this.currentGateIndex = 0; // Default to X
        this.shimmerLines = [];
        this.numLines = 25;

        // Beam dimensions (set during draw)
        this.x = 0;
        this.y = 0;
        this.width = 80;
        this.height = 0;

        // Animation
        this.lastTimestamp = 0;
        this.materializeProgress = 0; // 0 to 1

        // Gate selector bounds
        this.selectorBounds = null;
    }

    /**
     * Get current gate name
     */
    getCurrentGate() {
        return GATES[this.currentGateIndex];
    }

    /**
     * Get current gate info
     */
    getCurrentGateInfo() {
        return GATE_INFO[this.getCurrentGate()];
    }

    /**
     * Cycle to next gate
     */
    cycleGate() {
        this.currentGateIndex = (this.currentGateIndex + 1) % GATES.length;
    }

    /**
     * Toggle beam on/off
     */
    toggle() {
        this.isActive = !this.isActive;
        if (this.isActive) {
            this.materializeProgress = 0;
            this.shimmerLines = [];
        }
    }

    /**
     * Check if a point is inside the gate selector
     */
    isInSelector(x, y) {
        if (!this.selectorBounds) return false;
        const { x: sx, y: sy, width, height } = this.selectorBounds;
        return x >= sx && x <= sx + width && y >= sy && y <= sy + height;
    }

    /**
     * Calculate overlap between a qubit and the beam
     * Returns value from 0 to 1
     */
    getQubitOverlap(qubitX, qubitY, qubitRadius) {
        if (!this.isActive || this.materializeProgress < 0.5) return 0;

        const beamLeft = this.x - this.width / 2;
        const beamRight = this.x + this.width / 2;
        const beamTop = this.y;
        const beamBottom = this.y + this.height;

        // Check vertical overlap (qubit center must be in beam vertically)
        if (qubitY < beamTop || qubitY > beamBottom) return 0;

        // Calculate horizontal overlap
        const qubitLeft = qubitX - qubitRadius;
        const qubitRight = qubitX + qubitRadius;

        const overlapLeft = Math.max(beamLeft, qubitLeft);
        const overlapRight = Math.min(beamRight, qubitRight);

        if (overlapLeft >= overlapRight) return 0;

        const overlapWidth = overlapRight - overlapLeft;
        const qubitDiameter = qubitRadius * 2;

        return Math.min(1, overlapWidth / qubitDiameter);
    }

    /**
     * Draw the metal box gate selector
     */
    drawSelector(ctx, x, y, width, height) {
        this.selectorBounds = { x, y, width, height };

        ctx.save();

        // 3D metal box effect
        // Main face - silver gradient
        const mainGradient = ctx.createLinearGradient(x, y, x, y + height);
        mainGradient.addColorStop(0, '#d0d0d8');
        mainGradient.addColorStop(0.1, '#e8e8f0');
        mainGradient.addColorStop(0.3, '#c8c8d0');
        mainGradient.addColorStop(0.5, '#b0b0b8');
        mainGradient.addColorStop(0.7, '#a0a0a8');
        mainGradient.addColorStop(1, '#888890');

        ctx.fillStyle = mainGradient;
        ctx.fillRect(x, y, width, height);

        // Top edge highlight (3D effect)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(x, y, width, 3);

        // Left edge highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x, y, 3, height);

        // Bottom edge shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(x, y + height - 3, width, 3);

        // Right edge shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(x + width - 3, y, 3, height);

        // Inner bevel
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 4, y + 4, width - 8, height - 8);

        // Outer border
        ctx.strokeStyle = '#606068';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Gate label with engraved effect
        const gate = this.getCurrentGate();

        // Shadow for engraved look
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.font = 'bold 24px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gate, x + width / 2 + 1, y + height / 2 + 1);

        // Main text
        ctx.fillStyle = this.isActive ? '#ffdd44' : '#404048';
        ctx.fillText(gate, x + width / 2, y + height / 2);

        // Active indicator - glowing bottom edge
        if (this.isActive) {
            ctx.fillStyle = 'rgba(255, 220, 100, 0.8)';
            ctx.fillRect(x + 4, y + height - 6, width - 8, 3);

            // Glow effect
            ctx.shadowColor = 'rgba(255, 220, 100, 0.6)';
            ctx.shadowBlur = 10;
            ctx.fillRect(x + 4, y + height - 6, width - 8, 3);
            ctx.shadowBlur = 0;
        }

        // Screws/rivets for industrial look
        const screwRadius = 3;
        const screwOffset = 8;
        const screwPositions = [
            [x + screwOffset, y + screwOffset],
            [x + width - screwOffset, y + screwOffset],
            [x + screwOffset, y + height - screwOffset],
            [x + width - screwOffset, y + height - screwOffset]
        ];

        for (const [sx, sy] of screwPositions) {
            // Screw hole
            ctx.beginPath();
            ctx.arc(sx, sy, screwRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#707078';
            ctx.fill();

            // Screw highlight
            ctx.beginPath();
            ctx.arc(sx - 1, sy - 1, screwRadius - 1, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Draw the beam with shimmering lines
     */
    drawBeam(ctx, x, beamTop, beamBottom, width, timestamp) {
        if (!this.isActive) return;

        const dt = this.lastTimestamp ? (timestamp - this.lastTimestamp) / 1000 : 0;
        this.lastTimestamp = timestamp;

        // Materialize animation
        if (this.materializeProgress < 1) {
            this.materializeProgress = Math.min(1, this.materializeProgress + dt * 3);
        }

        const beamHeight = (beamBottom - beamTop) * this.materializeProgress;
        const currentBottom = beamTop + beamHeight;

        this.x = x;
        this.y = beamTop;
        this.width = width;
        this.height = beamHeight;

        const beamLeft = x - width / 2;
        const beamRight = x + width / 2;

        ctx.save();

        // Create gradient for beam background
        const gradient = ctx.createLinearGradient(beamLeft, 0, beamRight, 0);
        gradient.addColorStop(0, 'rgba(255, 200, 50, 0)');
        gradient.addColorStop(0.15, 'rgba(255, 220, 100, 0.08)');
        gradient.addColorStop(0.5, 'rgba(255, 240, 150, 0.15)');
        gradient.addColorStop(0.85, 'rgba(255, 220, 100, 0.08)');
        gradient.addColorStop(1, 'rgba(255, 200, 50, 0)');

        // Draw main beam background
        ctx.fillStyle = gradient;
        ctx.fillRect(beamLeft, beamTop, width, beamHeight);

        // Draw beam edges (brighter)
        ctx.strokeStyle = 'rgba(255, 230, 100, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(beamLeft, beamTop);
        ctx.lineTo(beamLeft, currentBottom);
        ctx.moveTo(beamRight, beamTop);
        ctx.lineTo(beamRight, currentBottom);
        ctx.stroke();

        // Initialize shimmer lines if needed
        if (this.shimmerLines.length === 0 && this.materializeProgress > 0.3) {
            for (let i = 0; i < this.numLines; i++) {
                this.shimmerLines.push(new ShimmerLine(beamLeft, beamRight, beamTop, beamBottom));
            }
        }

        // Update and draw shimmer lines
        for (const line of this.shimmerLines) {
            line.update(dt, beamLeft, beamRight, beamTop, currentBottom);
            if (line.y <= currentBottom) {
                line.draw(ctx);
            }
        }

        // Draw glow at emission point (bottom of metal box)
        const glowGradient = ctx.createRadialGradient(
            x, beamTop, 0,
            x, beamTop, width * 0.8
        );
        glowGradient.addColorStop(0, 'rgba(255, 240, 150, 0.5)');
        glowGradient.addColorStop(0.4, 'rgba(255, 220, 100, 0.2)');
        glowGradient.addColorStop(1, 'rgba(255, 200, 50, 0)');

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.ellipse(x, beamTop, width * 0.6, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Draw the complete gate beam UI
     */
    draw(ctx, canvasWidth, canvasHeight, timestamp, isMobile = false) {
        const beamWidth = 80; // Same as qubit diameter
        const selectorWidth = beamWidth; // Match beam width
        const selectorHeight = 45;
        const padding = 16;

        // Position selector in top-left
        const selectorX = padding;
        const selectorY = padding;

        // Draw selector (metal box)
        this.drawSelector(ctx, selectorX, selectorY, selectorWidth, selectorHeight);

        // Draw beam if active - extends to bottom toolbar
        if (this.isActive) {
            const beamX = selectorX + selectorWidth / 2;
            const beamTop = selectorY + selectorHeight;
            const beamBottom = canvasHeight; // Go all the way to bottom

            this.drawBeam(ctx, beamX, beamTop, beamBottom, beamWidth, timestamp);
        }
    }
}
