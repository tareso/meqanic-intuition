/**
 * PauliDome.js
 * Renders a semicircular grid visualization of Pauli expectation values
 *
 * Shows ⟨P⟩ = ⟨ψ|P|ψ⟩ for all Pauli strings P = σ_{i₁}⊗...⊗σ_{iₙ}
 * - Blue = negative expectation values
 * - White = zero
 * - Red = positive expectation values
 */

import {
    computePauliCoefficients,
    getGridDimensions,
    indexToGridPosition,
    getPauliLabel,
    getPauliStats
} from '../quantum/pauliBasis.js';

// Color configuration
const COLORS = {
    negative: { r: 59, g: 130, b: 246 },   // Blue
    zero: { r: 255, g: 255, b: 255 },       // White
    positive: { r: 239, g: 68, b: 68 },     // Red
    border: 'rgba(100, 100, 120, 0.3)',
    background: 'rgba(30, 41, 59, 0.8)',
    text: '#e8e8e8',
    highlight: 'rgba(255, 255, 255, 0.3)'
};

export class PauliDome {
    constructor() {
        // Cached coefficients
        this._coefficients = null;
        this._numQubits = 0;
        this._stats = null;

        // Interaction state
        this.isHovered = false;
        this.hoveredIndex = -1;
        this.bounds = { x: 0, y: 0, width: 0, height: 0 };

        // Animation
        this.pulsePhase = 0;
    }

    /**
     * Update coefficients from quantum state
     * @param {QuantumState} state - Current quantum state
     */
    updateFromState(state) {
        if (state.numQubits !== this._numQubits) {
            this._numQubits = state.numQubits;
        }
        this._coefficients = computePauliCoefficients(state);
        this._stats = getPauliStats(this._coefficients);
    }

    /**
     * Interpolate between two colors based on value
     * @param {number} value - Value from -1 to 1
     * @returns {string} CSS color string
     */
    _getColor(value) {
        // Normalize to [-1, 1] based on max absolute value
        const normalized = this._stats.absMax > 0
            ? value / this._stats.absMax
            : 0;

        let r, g, b;

        if (normalized < 0) {
            // Interpolate from zero (white) to negative (blue)
            const t = -normalized;
            r = Math.round(COLORS.zero.r + t * (COLORS.negative.r - COLORS.zero.r));
            g = Math.round(COLORS.zero.g + t * (COLORS.negative.g - COLORS.zero.g));
            b = Math.round(COLORS.zero.b + t * (COLORS.negative.b - COLORS.zero.b));
        } else {
            // Interpolate from zero (white) to positive (red)
            const t = normalized;
            r = Math.round(COLORS.zero.r + t * (COLORS.positive.r - COLORS.zero.r));
            g = Math.round(COLORS.zero.g + t * (COLORS.positive.g - COLORS.zero.g));
            b = Math.round(COLORS.zero.b + t * (COLORS.positive.b - COLORS.zero.b));
        }

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Draw the collapsed (small) dome view
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} centerX - Center X position
     * @param {number} y - Top Y position
     * @param {number} width - Width of the dome
     * @param {number} height - Height of the dome (semicircle height)
     * @param {number} timestamp - Animation timestamp
     */
    drawCollapsed(ctx, centerX, y, width, height, timestamp) {
        if (!this._coefficients || this._coefficients.length === 0) return;

        this.pulsePhase = (timestamp * 0.001) % (Math.PI * 2);

        // Store bounds for hit detection (flat side at top, curved side down)
        this.bounds = {
            x: centerX - width / 2,
            y: y,
            width: width,
            height: height
        };

        const { rows, cols } = getGridDimensions(this._numQubits);

        // Calculate tile size to fit in semicircle
        const tileWidth = width / cols;
        const tileHeight = height / rows;

        ctx.save();

        // Create semicircle clipping path (flat side at top, arc facing down)
        ctx.beginPath();
        ctx.arc(centerX, y, width / 2, 0, Math.PI, false);
        ctx.lineTo(centerX - width / 2, y);
        ctx.closePath();

        // Draw background
        ctx.fillStyle = COLORS.background;
        ctx.fill();

        // Clip to semicircle
        ctx.clip();

        // Draw grid of coefficients
        const startX = centerX - width / 2;
        const startY = y;

        for (let idx = 0; idx < this._coefficients.length; idx++) {
            const { row, col } = indexToGridPosition(idx, this._numQubits);
            const coeff = this._coefficients[idx];

            const tileX = startX + col * tileWidth;
            const tileY = startY + row * tileHeight;

            // Fill tile with color based on coefficient
            ctx.fillStyle = this._getColor(coeff);
            ctx.fillRect(tileX, tileY, tileWidth + 0.5, tileHeight + 0.5);

            // Draw subtle grid lines for larger grids
            if (cols <= 16) {
                ctx.strokeStyle = COLORS.border;
                ctx.lineWidth = 0.5;
                ctx.strokeRect(tileX, tileY, tileWidth, tileHeight);
            }
        }

        // Draw semicircle border
        ctx.restore();

        ctx.beginPath();
        ctx.arc(centerX, y, width / 2, 0, Math.PI, false);
        ctx.strokeStyle = this.isHovered
            ? 'rgba(100, 200, 255, 0.8)'
            : 'rgba(100, 150, 200, 0.5)';
        ctx.lineWidth = this.isHovered ? 3 : 2;
        ctx.stroke();

        // Draw label below the dome
        ctx.fillStyle = COLORS.text;
        ctx.font = '11px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`⟨P⟩ (${cols}×${rows})`, centerX, y + height + 5);

        // Draw "click to expand" hint if hovered
        if (this.isHovered) {
            ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
            ctx.font = '10px "Inter", sans-serif';
            ctx.fillText('Click to expand', centerX, y + height + 20);
        }
    }

    /**
     * Draw the expanded (full screen) view
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {number} timestamp - Animation timestamp
     * @param {function} onClose - Callback when close is clicked
     * @returns {{closeButton: {x, y, w, h}, gridBounds: {x, y, w, h}}} Clickable regions
     */
    drawExpanded(ctx, canvasWidth, canvasHeight, timestamp) {
        if (!this._coefficients || this._coefficients.length === 0) {
            return { closeButton: null, gridBounds: null };
        }

        const { rows, cols } = getGridDimensions(this._numQubits);

        // Calculate layout
        const padding = 60;
        const headerHeight = 60;
        const legendSpacing = 40; // Space reserved for legend area
        const labelSpace = 50; // Space for axis labels

        const availableWidth = canvasWidth - 2 * padding - labelSpace;
        const availableHeight = canvasHeight - headerHeight - legendSpacing - 2 * padding - labelSpace;

        const tileSize = Math.min(
            availableWidth / cols,
            availableHeight / rows,
            40 // Maximum tile size
        );

        const gridWidth = cols * tileSize;
        const gridHeight = rows * tileSize;

        const gridX = (canvasWidth - gridWidth) / 2;
        const gridY = headerHeight + padding;

        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw header
        ctx.fillStyle = '#e8e8e8';
        ctx.font = 'bold 20px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Pauli Expectation Matrix', canvasWidth / 2, 30);

        // Draw close button
        const closeBtn = { x: canvasWidth - 50, y: 15, w: 30, h: 30 };
        ctx.fillStyle = 'rgba(100, 100, 120, 0.5)';
        ctx.beginPath();
        ctx.roundRect(closeBtn.x, closeBtn.y, closeBtn.w, closeBtn.h, 5);
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(closeBtn.x + 8, closeBtn.y + 8);
        ctx.lineTo(closeBtn.x + 22, closeBtn.y + 22);
        ctx.moveTo(closeBtn.x + 22, closeBtn.y + 8);
        ctx.lineTo(closeBtn.x + 8, closeBtn.y + 22);
        ctx.stroke();

        // Draw grid
        for (let idx = 0; idx < this._coefficients.length; idx++) {
            const { row, col } = indexToGridPosition(idx, this._numQubits);
            const coeff = this._coefficients[idx];

            const tileX = gridX + col * tileSize;
            const tileY = gridY + row * tileSize;

            // Fill tile
            ctx.fillStyle = this._getColor(coeff);
            ctx.fillRect(tileX, tileY, tileSize, tileSize);

            // Draw border
            ctx.strokeStyle = 'rgba(50, 50, 70, 0.5)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(tileX, tileY, tileSize, tileSize);

            // Show value text for small grids
            if (cols <= 8 && tileSize >= 30) {
                ctx.fillStyle = Math.abs(coeff) > this._stats.absMax * 0.5
                    ? 'rgba(0,0,0,0.7)'
                    : 'rgba(0,0,0,0.5)';
                ctx.font = `${Math.min(10, tileSize / 4)}px "JetBrains Mono", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    coeff.toFixed(2),
                    tileX + tileSize / 2,
                    tileY + tileSize / 2
                );
            }
        }

        // Draw grid border
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(gridX, gridY, gridWidth, gridHeight);

        // Draw axis labels (show subset for large grids)
        ctx.fillStyle = '#888';
        ctx.font = '10px "JetBrains Mono", monospace';

        const labelStep = cols > 16 ? Math.ceil(cols / 8) : 1;

        // Column labels (top)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        for (let col = 0; col < cols; col += labelStep) {
            const idx = col; // First row
            const label = getPauliLabel(idx, this._numQubits);
            ctx.fillText(label, gridX + col * tileSize + tileSize / 2, gridY - 5);
        }

        // Row labels (left)
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let row = 0; row < rows; row += labelStep) {
            const idx = row * cols; // First column
            const label = getPauliLabel(idx, this._numQubits);
            ctx.fillText(label, gridX - 8, gridY + row * tileSize + tileSize / 2);
        }

        // Draw color legend
        const legendY = gridY + gridHeight + 30;
        const legendWidth = 200;
        const legendHeight = 15;
        const legendX = (canvasWidth - legendWidth) / 2;

        // Gradient bar
        const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
        gradient.addColorStop(0, `rgb(${COLORS.negative.r}, ${COLORS.negative.g}, ${COLORS.negative.b})`);
        gradient.addColorStop(0.5, `rgb(${COLORS.zero.r}, ${COLORS.zero.g}, ${COLORS.zero.b})`);
        gradient.addColorStop(1, `rgb(${COLORS.positive.r}, ${COLORS.positive.g}, ${COLORS.positive.b})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

        // Legend labels
        ctx.fillStyle = '#888';
        ctx.font = '11px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`-${this._stats.absMax.toFixed(2)}`, legendX, legendY + legendHeight + 5);
        ctx.fillText('0', legendX + legendWidth / 2, legendY + legendHeight + 5);
        ctx.fillText(`+${this._stats.absMax.toFixed(2)}`, legendX + legendWidth, legendY + legendHeight + 5);

        // Info text
        ctx.fillStyle = '#666';
        ctx.font = '12px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${this._numQubits} qubits • ${this._coefficients.length} coefficients (${cols}×${rows} grid)`,
            canvasWidth / 2,
            legendY + legendHeight + 30
        );

        return {
            closeButton: closeBtn,
            gridBounds: { x: gridX, y: gridY, w: gridWidth, h: gridHeight }
        };
    }

    /**
     * Check if a point is inside the collapsed dome
     * (Flat side at top, curved side facing down)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if point is inside
     */
    containsPoint(x, y) {
        const { x: bx, y: by, width, height } = this.bounds;
        const centerX = bx + width / 2;
        const centerY = by; // Center of arc is at top edge

        // Check if inside semicircle (curved part faces down)
        const dx = x - centerX;
        const dy = y - centerY;
        const radius = width / 2;

        return (dx * dx + dy * dy <= radius * radius) && (y >= centerY);
    }

    /**
     * Get tooltip info for a position in the expanded view
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {{x, y, w, h}} gridBounds - Grid bounds from drawExpanded
     * @returns {string|null} Tooltip text or null
     */
    getTooltipAt(x, y, gridBounds) {
        if (!gridBounds || !this._coefficients) return null;

        const { x: gx, y: gy, w: gw, h: gh } = gridBounds;
        if (x < gx || x > gx + gw || y < gy || y > gy + gh) return null;

        const { rows, cols } = getGridDimensions(this._numQubits);
        const tileSize = gw / cols;

        const col = Math.floor((x - gx) / tileSize);
        const row = Math.floor((y - gy) / tileSize);
        const idx = row * cols + col;

        if (idx >= 0 && idx < this._coefficients.length) {
            const label = getPauliLabel(idx, this._numQubits);
            const value = this._coefficients[idx];
            return `${label}: ${value.toFixed(4)}`;
        }

        return null;
    }
}
