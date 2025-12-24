/**
 * DecoherenceBeam.js
 * Renders a decoherence beam for applying T1 (relaxation) and T2 (dephasing)
 *
 * Features:
 * - Metal box "source" at top-right (matching gate beam style)
 * - Red beam with shimmering descending lines
 * - Three modes: T2 (dephasing), T1 (relaxation), T1+T2 (both)
 */

// Decoherence modes
const DECOHERENCE_MODES = ['T2', 'T1', 'T1+T2'];

const MODE_INFO = {
    'T2': { description: 'Dephasing - loses phase coherence' },
    'T1': { description: 'Relaxation - decays to |0⟩' },
    'T1+T2': { description: 'Both dephasing and relaxation' }
};

// Shimmering red line class for the beam effect
class RedLine {
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

        // Draw vertical line with red gradient
        const gradient = ctx.createLinearGradient(0, this.y, 0, this.y + this.length);
        gradient.addColorStop(0, `rgba(255, 80, 80, 0)`);
        gradient.addColorStop(0.3, `rgba(255, 100, 100, ${alpha})`);
        gradient.addColorStop(0.7, `rgba(220, 60, 60, ${alpha})`);
        gradient.addColorStop(1, `rgba(200, 50, 50, 0)`);

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.width;
        ctx.stroke();
    }
}

export class DecoherenceBeam {
    constructor() {
        this.isActive = false;
        this.currentModeIndex = 0; // Default to T2
        this.redLines = [];
        this.numLines = 25;

        // Beam dimensions
        this.x = 0;
        this.y = 0;
        this.width = 80;
        this.height = 0;

        // Animation
        this.lastTimestamp = 0;
        this.materializeProgress = 0;

        // Selector bounds
        this.selectorBounds = null;
    }

    getCurrentMode() {
        return DECOHERENCE_MODES[this.currentModeIndex];
    }

    getCurrentModeInfo() {
        return MODE_INFO[this.getCurrentMode()];
    }

    cycleMode() {
        this.currentModeIndex = (this.currentModeIndex + 1) % DECOHERENCE_MODES.length;
    }

    toggle() {
        this.isActive = !this.isActive;
        if (this.isActive) {
            this.materializeProgress = 0;
            this.redLines = [];
        }
    }

    isInSelector(x, y) {
        if (!this.selectorBounds) return false;
        const { x: sx, y: sy, width, height } = this.selectorBounds;
        return x >= sx && x <= sx + width && y >= sy && y <= sy + height;
    }

    getQubitOverlap(qubitX, qubitY, qubitRadius) {
        if (!this.isActive || this.materializeProgress < 0.5) return 0;

        const beamLeft = this.x - this.width / 2;
        const beamRight = this.x + this.width / 2;
        const beamTop = this.y;
        const beamBottom = this.y + this.height;

        if (qubitY < beamTop || qubitY > beamBottom) return 0;

        const qubitLeft = qubitX - qubitRadius;
        const qubitRight = qubitX + qubitRadius;

        const overlapLeft = Math.max(beamLeft, qubitLeft);
        const overlapRight = Math.min(beamRight, qubitRight);

        if (overlapLeft >= overlapRight) return 0;

        const overlapWidth = overlapRight - overlapLeft;
        const qubitDiameter = qubitRadius * 2;

        return Math.min(1, overlapWidth / qubitDiameter);
    }

    drawSelector(ctx, x, y, width, height) {
        this.selectorBounds = { x, y, width, height };

        ctx.save();

        // 3D metal box - darker/more sinister silver (matching gate beam style)
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

        // Mode label with engraved effect (centered, like gate beam)
        const mode = this.getCurrentMode();

        // Shadow for engraved look
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mode, x + width / 2 + 1, y + height / 2 + 1);

        // Main text
        ctx.fillStyle = this.isActive ? '#ff6666' : '#404048';
        ctx.fillText(mode, x + width / 2, y + height / 2);

        // Active indicator - red glowing bottom edge
        if (this.isActive) {
            ctx.fillStyle = 'rgba(255, 80, 80, 0.8)';
            ctx.fillRect(x + 4, y + height - 6, width - 8, 3);

            ctx.shadowColor = 'rgba(255, 80, 80, 0.6)';
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

    drawBeam(ctx, x, beamTop, beamBottom, width, timestamp) {
        if (!this.isActive) return;

        const dt = this.lastTimestamp ? (timestamp - this.lastTimestamp) / 1000 : 0;
        this.lastTimestamp = timestamp;

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

        // Red beam background gradient
        const gradient = ctx.createLinearGradient(beamLeft, 0, beamRight, 0);
        gradient.addColorStop(0, 'rgba(200, 50, 50, 0)');
        gradient.addColorStop(0.15, 'rgba(200, 60, 60, 0.08)');
        gradient.addColorStop(0.5, 'rgba(220, 80, 80, 0.15)');
        gradient.addColorStop(0.85, 'rgba(200, 60, 60, 0.08)');
        gradient.addColorStop(1, 'rgba(200, 50, 50, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(beamLeft, beamTop, width, beamHeight);

        // Red beam edges
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(beamLeft, beamTop);
        ctx.lineTo(beamLeft, currentBottom);
        ctx.moveTo(beamRight, beamTop);
        ctx.lineTo(beamRight, currentBottom);
        ctx.stroke();

        // Initialize red lines if needed
        if (this.redLines.length === 0 && this.materializeProgress > 0.3) {
            for (let i = 0; i < this.numLines; i++) {
                this.redLines.push(new RedLine(beamLeft, beamRight, beamTop, beamBottom));
            }
        }

        // Update and draw red lines
        for (const line of this.redLines) {
            line.update(dt, beamLeft, beamRight, beamTop, currentBottom);
            if (line.y <= currentBottom) {
                line.draw(ctx);
            }
        }

        // Red glow at emission point
        const glowGradient = ctx.createRadialGradient(
            x, beamTop, 0,
            x, beamTop, width * 0.8
        );
        glowGradient.addColorStop(0, 'rgba(255, 100, 100, 0.5)');
        glowGradient.addColorStop(0.4, 'rgba(200, 60, 60, 0.2)');
        glowGradient.addColorStop(1, 'rgba(150, 50, 50, 0)');

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.ellipse(x, beamTop, width * 0.6, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    draw(ctx, canvasWidth, canvasHeight, timestamp, isMobile = false) {
        const beamWidth = 80;
        const selectorWidth = beamWidth;
        const selectorHeight = 45;
        const padding = 16;

        // Position selector in top-right
        const selectorX = canvasWidth - padding - selectorWidth;
        const selectorY = padding;

        this.drawSelector(ctx, selectorX, selectorY, selectorWidth, selectorHeight);

        if (this.isActive) {
            const beamX = selectorX + selectorWidth / 2;
            const beamTop = selectorY + selectorHeight;
            const beamBottom = canvasHeight;

            this.drawBeam(ctx, beamX, beamTop, beamBottom, beamWidth, timestamp);
        }
    }
}
