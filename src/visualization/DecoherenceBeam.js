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

    /**
     * Draw the microwave horn selector (coming from ceiling)
     */
    drawSelector(ctx, centerX, hornHeight, openingWidth) {
        const topWidth = 30; // Narrow at ceiling
        const bottomWidth = openingWidth; // Wider at opening
        const topY = 0; // Starts at ceiling
        const bottomY = hornHeight;

        // Store bounds for click detection
        this.selectorBounds = {
            x: centerX - bottomWidth / 2,
            y: topY,
            width: bottomWidth,
            height: hornHeight
        };

        ctx.save();

        // Draw the horn shape (trapezoid)
        const leftTop = centerX - topWidth / 2;
        const rightTop = centerX + topWidth / 2;
        const leftBottom = centerX - bottomWidth / 2;
        const rightBottom = centerX + bottomWidth / 2;

        // Main horn body gradient (slightly darker/redder tint for decoherence)
        const mainGradient = ctx.createLinearGradient(leftBottom, topY, rightBottom, topY);
        mainGradient.addColorStop(0, '#807880');
        mainGradient.addColorStop(0.15, '#a8a0a8');
        mainGradient.addColorStop(0.3, '#c8c0c8');
        mainGradient.addColorStop(0.5, '#d8d0d8');
        mainGradient.addColorStop(0.7, '#c8c0c8');
        mainGradient.addColorStop(0.85, '#a8a0a8');
        mainGradient.addColorStop(1, '#807880');

        // Draw horn shape
        ctx.beginPath();
        ctx.moveTo(leftTop, topY);
        ctx.lineTo(rightTop, topY);
        ctx.lineTo(rightBottom, bottomY);
        ctx.lineTo(leftBottom, bottomY);
        ctx.closePath();
        ctx.fillStyle = mainGradient;
        ctx.fill();

        // Left edge highlight (3D effect)
        ctx.beginPath();
        ctx.moveTo(leftTop, topY);
        ctx.lineTo(leftBottom, bottomY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Right edge shadow
        ctx.beginPath();
        ctx.moveTo(rightTop, topY);
        ctx.lineTo(rightBottom, bottomY);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Horn opening rim (bottom edge)
        ctx.beginPath();
        ctx.moveTo(leftBottom, bottomY);
        ctx.lineTo(rightBottom, bottomY);
        ctx.strokeStyle = '#605860';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner rim highlight
        ctx.beginPath();
        ctx.moveTo(leftBottom + 3, bottomY - 2);
        ctx.lineTo(rightBottom - 3, bottomY - 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Ridges on horn for industrial look
        const numRidges = 3;
        for (let i = 1; i <= numRidges; i++) {
            const t = i / (numRidges + 1);
            const ridgeY = topY + t * hornHeight;
            const ridgeLeftX = leftTop + t * (leftBottom - leftTop);
            const ridgeRightX = rightTop + t * (rightBottom - rightTop);

            ctx.beginPath();
            ctx.moveTo(ridgeLeftX, ridgeY);
            ctx.lineTo(ridgeRightX, ridgeY);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(ridgeLeftX, ridgeY + 1);
            ctx.lineTo(ridgeRightX, ridgeY + 1);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Mode label inside horn opening
        const mode = this.getCurrentMode();
        const labelY = bottomY - 15;

        // Shadow for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.font = 'bold 16px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mode, centerX + 1, labelY + 1);

        // Main text
        ctx.fillStyle = this.isActive ? '#ff6666' : '#504850';
        ctx.fillText(mode, centerX, labelY);

        // Active indicator - glowing red rim
        if (this.isActive) {
            ctx.beginPath();
            ctx.moveTo(leftBottom + 5, bottomY);
            ctx.lineTo(rightBottom - 5, bottomY);
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.9)';
            ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(255, 80, 80, 0.8)';
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.shadowBlur = 0;
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
        const hornHeight = 60; // Height of the microwave horn
        const padding = 20;

        // Position horn on right side, centered horizontally over beam
        const hornCenterX = canvasWidth - padding - beamWidth / 2;

        // Draw microwave horn selector (coming from ceiling)
        this.drawSelector(ctx, hornCenterX, hornHeight, beamWidth);

        if (this.isActive) {
            const beamTop = hornHeight;
            const beamBottom = canvasHeight;

            this.drawBeam(ctx, hornCenterX, beamTop, beamBottom, beamWidth, timestamp);
        }
    }
}
