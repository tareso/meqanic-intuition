/**
 * BlochSphere.js
 * Renders a single qubit as a Bloch sphere with enhanced 3D visualization
 */

// Color scheme matching dark theme
const COLORS = {
    wireframe: 'rgba(100, 100, 120, 0.4)',
    wireframeHighlight: 'rgba(150, 150, 170, 0.6)',
    purityGlow: { r: 255, g: 215, b: 0 },      // Golden
    stateVector: '#ff6b6b',                     // Coral red
    stateVectorGlow: 'rgba(255, 107, 107, 0.5)',
    labelPrimary: '#e8e8e8',
    labelSecondary: '#a0a0a0',
    qubitLabel: '#00d4ff'
};

export class BlochSphere {
    /**
     * Create a Bloch sphere renderer
     * @param {number} x - Center X position on canvas
     * @param {number} y - Center Y position on canvas
     * @param {number} radius - Sphere radius in pixels (default 50)
     */
    constructor(x, y, radius = 50) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.rotation = 0;  // For subtle animation
    }

    /**
     * Draw the Bloch sphere with state vector
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {{x: number, y: number, z: number}} blochVector - Bloch vector
     * @param {number} purity - Purity of the state (0.5 to 1.0)
     * @param {number} qubitIndex - Index of this qubit (for label)
     * @param {number} timestamp - Animation timestamp
     */
    draw(ctx, blochVector, purity, qubitIndex = 0, timestamp = 0) {
        ctx.save();

        // Subtle rotation animation
        this.rotation = (timestamp * 0.0001) % (Math.PI * 2);

        // Draw components in order (back to front)
        this._drawBackMeridians(ctx);
        this._drawPuritySphere(ctx, purity, timestamp);
        this._drawEquator(ctx);
        this._drawFrontMeridians(ctx);
        this._drawBlochVector(ctx, blochVector);
        this._drawAxisIndicators(ctx);
        this._drawLabels(ctx, qubitIndex);

        ctx.restore();
    }

    /**
     * Draw back meridians (behind the sphere)
     * @private
     */
    _drawBackMeridians(ctx) {
        ctx.strokeStyle = COLORS.wireframe;
        ctx.lineWidth = 1;

        // Draw back halves of meridians
        const numMeridians = 6;
        for (let i = 0; i < numMeridians; i++) {
            const angle = (i / numMeridians) * Math.PI;
            this._drawMeridianArc(ctx, angle, Math.PI, 2 * Math.PI);  // Back half
        }

        // Draw back latitude lines
        this._drawLatitudeLine(ctx, 0.5, true);   // Upper back
        this._drawLatitudeLine(ctx, -0.5, true);  // Lower back
    }

    /**
     * Draw front meridians (in front of the sphere)
     * @private
     */
    _drawFrontMeridians(ctx) {
        ctx.strokeStyle = COLORS.wireframeHighlight;
        ctx.lineWidth = 1.5;

        // Draw front halves of meridians
        const numMeridians = 6;
        for (let i = 0; i < numMeridians; i++) {
            const angle = (i / numMeridians) * Math.PI;
            this._drawMeridianArc(ctx, angle, 0, Math.PI);  // Front half
        }

        // Draw front latitude lines
        this._drawLatitudeLine(ctx, 0.5, false);   // Upper front
        this._drawLatitudeLine(ctx, -0.5, false);  // Lower front
    }

    /**
     * Draw a meridian arc
     * @private
     */
    _drawMeridianArc(ctx, meridianAngle, startT, endT) {
        ctx.beginPath();

        const steps = 30;
        const tRange = endT - startT;

        for (let i = 0; i <= steps; i++) {
            const t = startT + (i / steps) * tRange;

            // 3D position on sphere
            const x3d = Math.sin(t) * Math.cos(meridianAngle);
            const z3d = Math.sin(t) * Math.sin(meridianAngle);
            const y3d = Math.cos(t);

            // Project to 2D with slight perspective
            const scale = 1 + z3d * 0.1;  // Slight depth effect
            const screenX = this.x + x3d * this.radius * scale;
            const screenY = this.y - y3d * this.radius * scale;

            if (i === 0) {
                ctx.moveTo(screenX, screenY);
            } else {
                ctx.lineTo(screenX, screenY);
            }
        }

        ctx.stroke();
    }

    /**
     * Draw a latitude line
     * @private
     */
    _drawLatitudeLine(ctx, zNorm, isBack) {
        const latRadius = Math.sqrt(1 - zNorm * zNorm) * this.radius;
        const yOffset = -zNorm * this.radius;

        ctx.beginPath();

        if (isBack) {
            ctx.ellipse(
                this.x, this.y + yOffset,
                latRadius, latRadius * 0.3,
                0, Math.PI, 2 * Math.PI
            );
        } else {
            ctx.ellipse(
                this.x, this.y + yOffset,
                latRadius, latRadius * 0.3,
                0, 0, Math.PI
            );
        }

        ctx.stroke();
    }

    /**
     * Draw the equator (main reference circle)
     * @private
     */
    _drawEquator(ctx) {
        ctx.strokeStyle = COLORS.wireframeHighlight;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.3, 0, 0, 2 * Math.PI);
        ctx.stroke();
    }

    /**
     * Draw the inner purity sphere (translucent golden sphere)
     * @private
     */
    _drawPuritySphere(ctx, purity, timestamp) {
        // Normalize purity from [0.5, 1] to [0, 1] for visual effect
        const normalizedPurity = Math.max(0, (purity - 0.5) * 2);
        const innerRadius = (0.3 + normalizedPurity * 0.7) * this.radius;

        // Subtle pulsing effect
        const pulsePhase = Math.sin(timestamp * 0.002) * 0.05 + 0.95;
        const intensity = normalizedPurity * pulsePhase;

        const { r, g, b } = COLORS.purityGlow;

        // Draw solid translucent sphere
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.35 * intensity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, innerRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Draw sphere edge for definition
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.6 * intensity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, innerRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Small highlight for 3D effect (top-left)
        if (normalizedPurity > 0.3) {
            const highlightX = this.x - innerRadius * 0.3;
            const highlightY = this.y - innerRadius * 0.3;
            const highlightRadius = innerRadius * 0.25;

            const highlight = ctx.createRadialGradient(
                highlightX, highlightY, 0,
                highlightX, highlightY, highlightRadius
            );
            highlight.addColorStop(0, `rgba(255, 255, 255, ${0.4 * intensity})`);
            highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = highlight;
            ctx.beginPath();
            ctx.arc(highlightX, highlightY, highlightRadius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    /**
     * Draw the Bloch vector as an arrow
     * @private
     */
    _drawBlochVector(ctx, blochVector) {
        const { x, y, z } = blochVector;
        const magnitude = Math.sqrt(x * x + y * y + z * z);

        if (magnitude < 0.01) return;

        // Normalize and scale to sphere radius
        const scale = magnitude * this.radius;

        // 3D to 2D projection with perspective
        // X maps to screen X, Y maps to screen Y (inverted), Z affects depth
        const perspectiveFactor = 1 + (y * 0.15);  // Slight perspective based on Y (depth)

        const endX = this.x + x * scale * perspectiveFactor;
        const endY = this.y - z * scale * perspectiveFactor;  // Z is up in Bloch sphere

        // Draw glow
        ctx.shadowColor = COLORS.stateVectorGlow;
        ctx.shadowBlur = 15;

        // Draw the arrow shaft
        ctx.strokeStyle = COLORS.stateVector;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw arrowhead
        const arrowLength = 14;
        const arrowAngle = Math.PI / 5;
        const angle = Math.atan2(endY - this.y, endX - this.x);

        ctx.fillStyle = COLORS.stateVector;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowLength * Math.cos(angle - arrowAngle),
            endY - arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.lineTo(
            endX - arrowLength * Math.cos(angle + arrowAngle),
            endY - arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.closePath();
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    /**
     * Draw axis indicators at poles
     * @private
     */
    _drawAxisIndicators(ctx) {
        // North pole (|0⟩) - small dot
        ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.radius, 4, 0, 2 * Math.PI);
        ctx.fill();

        // South pole (|1⟩) - small dot
        ctx.fillStyle = 'rgba(157, 78, 221, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y + this.radius, 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    /**
     * Draw labels
     * @private
     */
    _drawLabels(ctx, qubitIndex) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // |0⟩ label at top
        ctx.fillStyle = COLORS.labelPrimary;
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillText('|0⟩', this.x, this.y - this.radius - 18);

        // |1⟩ label at bottom
        ctx.fillText('|1⟩', this.x, this.y + this.radius + 18);

        // Qubit index label
        ctx.fillStyle = COLORS.qubitLabel;
        ctx.font = '600 12px "Inter", sans-serif';
        ctx.fillText(`q${qubitIndex}`, this.x, this.y + this.radius + 38);
    }

    /**
     * Check if a point is inside the sphere (for hit detection)
     * @param {number} px - Point X coordinate
     * @param {number} py - Point Y coordinate
     * @returns {boolean} True if point is inside sphere
     */
    contains(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        const distanceSquared = dx * dx + dy * dy;
        // Slightly larger hit area for better UX
        return distanceSquared <= (this.radius * 1.2) * (this.radius * 1.2);
    }

    /**
     * Update position
     * @param {number} x - New X position
     * @param {number} y - New Y position
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Get position
     * @returns {{x: number, y: number}} Current position
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }

    /**
     * Get radius
     * @returns {number} Sphere radius
     */
    getRadius() {
        return this.radius;
    }
}
