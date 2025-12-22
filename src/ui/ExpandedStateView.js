/**
 * ExpandedStateView.js
 * Full-screen overlay for viewing quantum state details
 *
 * Provides two views:
 * 1. Pauli Matrix - Density matrix in Pauli basis
 * 2. State Vector - Amplitude list with magnitudes
 */

import { PauliDome } from '../visualization/PauliDome.js';

export class ExpandedStateView {
    constructor() {
        this.isVisible = false;
        this.currentView = 'pauli'; // 'pauli' or 'vector'
        this.pauliDome = new PauliDome();

        // UI element bounds (set during render)
        this.closeButton = null;
        this.toggleButton = null;
        this.gridBounds = null;

        // Tooltip state
        this.tooltipText = null;
        this.tooltipX = 0;
        this.tooltipY = 0;

        // Animation
        this.fadeIn = 0;
    }

    /**
     * Show the expanded view
     */
    show() {
        this.isVisible = true;
        this.fadeIn = 0;
    }

    /**
     * Hide the expanded view
     */
    hide() {
        this.isVisible = false;
        this.tooltipText = null;
    }

    /**
     * Toggle between views
     */
    toggleView() {
        this.currentView = this.currentView === 'pauli' ? 'vector' : 'pauli';
    }

    /**
     * Update from quantum state
     * @param {QuantumState} state - Current quantum state
     */
    updateFromState(state) {
        this.pauliDome.updateFromState(state);
        this._currentState = state;
    }

    /**
     * Handle click events
     * @param {number} x - Click X coordinate
     * @param {number} y - Click Y coordinate
     * @returns {boolean} True if click was handled
     */
    handleClick(x, y) {
        if (!this.isVisible) return false;

        // Check close button
        if (this.closeButton && this._isInside(x, y, this.closeButton)) {
            this.hide();
            return true;
        }

        // Check toggle button
        if (this.toggleButton && this._isInside(x, y, this.toggleButton)) {
            this.toggleView();
            return true;
        }

        return true; // Consume click to prevent interaction with underlying canvas
    }

    /**
     * Handle mouse move for tooltips
     * @param {number} x - Mouse X coordinate
     * @param {number} y - Mouse Y coordinate
     */
    handleMouseMove(x, y) {
        if (!this.isVisible) return;

        if (this.currentView === 'pauli' && this.gridBounds) {
            this.tooltipText = this.pauliDome.getTooltipAt(x, y, this.gridBounds);
            this.tooltipX = x;
            this.tooltipY = y;
        } else {
            this.tooltipText = null;
        }
    }

    /**
     * Check if point is inside a rectangle
     * @private
     */
    _isInside(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.w &&
               y >= rect.y && y <= rect.y + rect.h;
    }

    /**
     * Draw the expanded view
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {number} timestamp - Animation timestamp
     */
    draw(ctx, canvasWidth, canvasHeight, timestamp) {
        if (!this.isVisible) return;

        // Animate fade in
        this.fadeIn = Math.min(1, this.fadeIn + 0.1);

        ctx.save();
        ctx.globalAlpha = this.fadeIn;

        if (this.currentView === 'pauli') {
            const result = this.pauliDome.drawExpanded(ctx, canvasWidth, canvasHeight, timestamp);
            this.closeButton = result.closeButton;
            this.gridBounds = result.gridBounds;
        } else {
            this._drawStateVector(ctx, canvasWidth, canvasHeight);
        }

        // Draw toggle button
        this._drawToggleButton(ctx, canvasWidth);

        // Draw tooltip
        if (this.tooltipText) {
            this._drawTooltip(ctx);
        }

        ctx.restore();
    }

    /**
     * Draw the state vector view
     * @private
     */
    _drawStateVector(ctx, canvasWidth, canvasHeight) {
        if (!this._currentState) return;

        const state = this._currentState;
        const dim = state.dimension;

        // Draw background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Header
        ctx.fillStyle = '#e8e8e8';
        ctx.font = 'bold 20px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('State Vector', canvasWidth / 2, 30);

        // Close button
        this.closeButton = { x: canvasWidth - 50, y: 15, w: 30, h: 30 };
        ctx.fillStyle = 'rgba(100, 100, 120, 0.5)';
        ctx.beginPath();
        ctx.roundRect(this.closeButton.x, this.closeButton.y, this.closeButton.w, this.closeButton.h, 5);
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.closeButton.x + 8, this.closeButton.y + 8);
        ctx.lineTo(this.closeButton.x + 22, this.closeButton.y + 22);
        ctx.moveTo(this.closeButton.x + 22, this.closeButton.y + 8);
        ctx.lineTo(this.closeButton.x + 8, this.closeButton.y + 22);
        ctx.stroke();

        // Calculate layout
        const padding = 60;
        const headerHeight = 70;
        const startY = headerHeight + padding;

        // Group amplitudes by significance
        const amplitudes = [];
        for (let i = 0; i < dim; i++) {
            const amp = state.amplitudes[i];
            const mag = Math.sqrt(amp.re * amp.re + amp.im * amp.im);
            amplitudes.push({ index: i, amp, mag });
        }

        // Sort by magnitude
        amplitudes.sort((a, b) => b.mag - a.mag);

        // Find max magnitude for bar scaling
        const maxMag = amplitudes[0]?.mag || 1;

        // Draw amplitude bars
        const barMaxWidth = 300;
        const barHeight = 24;
        const spacing = 4;
        const maxVisible = Math.floor((canvasHeight - startY - 50) / (barHeight + spacing));

        ctx.font = '12px "JetBrains Mono", monospace';

        for (let i = 0; i < Math.min(dim, maxVisible); i++) {
            const { index, amp, mag } = amplitudes[i];
            const y = startY + i * (barHeight + spacing);

            // Basis state label
            const basisLabel = '|' + index.toString(2).padStart(state.numQubits, '0') + '⟩';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(basisLabel, padding + 60, y + barHeight / 2);

            // Magnitude bar
            const barWidth = (mag / maxMag) * barMaxWidth;
            const barX = padding + 80;

            // Bar background
            ctx.fillStyle = 'rgba(100, 100, 120, 0.3)';
            ctx.fillRect(barX, y, barMaxWidth, barHeight);

            // Bar fill with gradient based on phase
            const phase = Math.atan2(amp.im, amp.re);
            const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360;
            ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.8)`;
            ctx.fillRect(barX, y, barWidth, barHeight);

            // Probability percentage
            const prob = mag * mag * 100;
            ctx.fillStyle = '#e8e8e8';
            ctx.textAlign = 'left';
            ctx.fillText(`${prob.toFixed(1)}%`, barX + barMaxWidth + 15, y + barHeight / 2);

            // Complex amplitude
            let ampStr;
            if (Math.abs(amp.im) < 0.0001) {
                ampStr = amp.re.toFixed(3);
            } else if (Math.abs(amp.re) < 0.0001) {
                ampStr = `${amp.im.toFixed(3)}i`;
            } else {
                const sign = amp.im >= 0 ? '+' : '';
                ampStr = `${amp.re.toFixed(3)}${sign}${amp.im.toFixed(3)}i`;
            }
            ctx.fillStyle = '#666';
            ctx.fillText(ampStr, barX + barMaxWidth + 80, y + barHeight / 2);
        }

        // Show "... and N more" if truncated
        if (dim > maxVisible) {
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText(
                `... and ${dim - maxVisible} more basis states`,
                canvasWidth / 2,
                canvasHeight - 30
            );
        }

        // Info text
        ctx.fillStyle = '#666';
        ctx.font = '12px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${state.numQubits} qubits • ${dim} basis states • Color = phase`,
            canvasWidth / 2,
            headerHeight + 20
        );
    }

    /**
     * Draw the view toggle button
     * @private
     */
    _drawToggleButton(ctx, canvasWidth) {
        const btnWidth = 140;
        const btnHeight = 32;
        const btnX = canvasWidth / 2 - btnWidth / 2;
        const btnY = 50;

        this.toggleButton = { x: btnX, y: btnY, w: btnWidth, h: btnHeight };

        // Button background
        ctx.fillStyle = 'rgba(100, 100, 120, 0.5)';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 5);
        ctx.fill();

        // Button text
        ctx.fillStyle = '#e8e8e8';
        ctx.font = '12px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const nextView = this.currentView === 'pauli' ? 'State Vector' : 'Pauli Matrix';
        ctx.fillText(`Show ${nextView}`, btnX + btnWidth / 2, btnY + btnHeight / 2);
    }

    /**
     * Draw tooltip
     * @private
     */
    _drawTooltip(ctx) {
        const padding = 8;
        ctx.font = '12px "JetBrains Mono", monospace';
        const textWidth = ctx.measureText(this.tooltipText).width;

        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = 24;
        const tooltipX = this.tooltipX + 15;
        const tooltipY = this.tooltipY - tooltipHeight / 2;

        // Background
        ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Text
        ctx.fillStyle = '#e8e8e8';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.tooltipText, tooltipX + padding, tooltipY + tooltipHeight / 2);
    }
}
