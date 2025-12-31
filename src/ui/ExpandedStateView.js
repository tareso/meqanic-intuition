/**
 * ExpandedStateView.js
 * Floating draggable window for viewing quantum state details
 *
 * Provides five views:
 * 1. Pauli Expectation Matrix - Pauli expectation values ⟨P⟩
 * 2. State Vector (bars) - Amplitude list with magnitude bars
 * 3. Correlation Matrix - Pairwise qubit correlations
 * 4. Density Matrix - Hinton diagram showing ρ = |ψ⟩⟨ψ|
 * 5. State Vector (ket) - Mathematical |ψ⟩ = Σ αᵢ|i⟩ notation
 */

import { PauliDome } from '../visualization/PauliDome.js';
import { getPauliLabel } from '../quantum/pauliBasis.js';

export class ExpandedStateView {
    constructor() {
        this.isVisible = false;
        this.currentView = 'pauli';
        this.viewOrder = ['pauli', 'density', 'ket', 'vector', 'correlation'];
        this.pauliDome = new PauliDome();

        // Window position and size
        this.windowX = 100;
        this.windowY = 100;
        this.windowWidth = 500;
        this.windowHeight = 450;
        this.minWidth = 350;
        this.minHeight = 300;

        // Dragging state
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        // Resizing state
        this.isResizing = false;
        this.resizeEdge = null; // 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.resizeStartWidth = 0;
        this.resizeStartHeight = 0;
        this.resizeStartWindowX = 0;
        this.resizeStartWindowY = 0;
        this.resizeHandleSize = 8;

        // Scrolling state for state vector view
        this.scrollOffset = 0;
        this.maxScroll = 0;
        this.scrollBarBounds = null;
        this.isScrollDragging = false;
        this.scrollDragStartY = 0;
        this.scrollDragStartOffset = 0;

        // UI element bounds (set during render)
        this.closeButton = null;
        this.toggleButton = null;
        this.gridBounds = null;
        this.titleBarBounds = null;

        // Tooltip state
        this.tooltipText = null;
        this.tooltipX = 0;
        this.tooltipY = 0;

        // Animation
        this.fadeIn = 0;

        // Background transparency (0-1)
        this.backgroundAlpha = 0.85;
    }

    /**
     * Show the expanded view
     * @param {number} canvasWidth - Canvas width for centering
     * @param {number} canvasHeight - Canvas height for centering
     */
    show(canvasWidth, canvasHeight) {
        this.isVisible = true;
        this.fadeIn = 0;

        // Responsive sizing for mobile - always apply on mobile
        const isMobile = canvasWidth < 500;
        if (isMobile) {
            const padding = 10;
            this.windowWidth = canvasWidth - padding * 2;
            this.windowHeight = Math.min(400, canvasHeight - 150);
            // Always reset position on mobile to ensure it fits
            this.windowX = padding;
            this.windowY = 80; // Below the Pauli dome
        } else {
            // Desktop: use default size
            this.windowWidth = 500;
            this.windowHeight = 450;
            // Center on first show or if window is off-screen
            if (this.windowX < 0 || this.windowX > canvasWidth - 100) {
                this.windowX = (canvasWidth - this.windowWidth) / 2;
                this.windowY = (canvasHeight - this.windowHeight) / 2;
            }
        }

        // Ensure window is within bounds
        this._constrainToBounds(canvasWidth, canvasHeight);
    }

    /**
     * Hide the expanded view
     */
    hide() {
        this.isVisible = false;
        this.tooltipText = null;
        this.isDragging = false;
    }

    /**
     * Toggle between views
     */
    toggleView() {
        const currentIndex = this.viewOrder.indexOf(this.currentView);
        this.currentView = this.viewOrder[(currentIndex + 1) % this.viewOrder.length];
        this.scrollOffset = 0; // Reset scroll when switching views
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
     * Constrain window position to canvas bounds
     * @private
     */
    _constrainToBounds(canvasWidth, canvasHeight) {
        const isMobile = canvasWidth < 500;

        if (isMobile) {
            // On mobile, keep window fully visible with small padding
            const padding = 10;
            this.windowX = Math.max(padding, Math.min(canvasWidth - this.windowWidth - padding, this.windowX));
            this.windowY = Math.max(0, Math.min(canvasHeight - 100, this.windowY));
        } else {
            // On desktop, allow partial off-screen for flexibility
            const margin = 50;
            this.windowX = Math.max(-this.windowWidth + margin,
                                    Math.min(canvasWidth - margin, this.windowX));
            this.windowY = Math.max(0,
                                    Math.min(canvasHeight - margin, this.windowY));
        }
    }

    /**
     * Check if point is inside the window
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if inside window
     */
    containsPoint(x, y) {
        if (!this.isVisible) return false;
        return x >= this.windowX && x <= this.windowX + this.windowWidth &&
               y >= this.windowY && y <= this.windowY + this.windowHeight;
    }

    /**
     * Handle mouse down events
     * @param {number} x - Mouse X coordinate
     * @param {number} y - Mouse Y coordinate
     * @returns {boolean} True if event was handled (consumed)
     */
    handleMouseDown(x, y) {
        if (!this.isVisible) return false;

        // Check for resize edge first
        const resizeEdge = this._getResizeEdge(x, y);
        if (resizeEdge) {
            this.isResizing = true;
            this.resizeEdge = resizeEdge;
            this.resizeStartX = x;
            this.resizeStartY = y;
            this.resizeStartWidth = this.windowWidth;
            this.resizeStartHeight = this.windowHeight;
            this.resizeStartWindowX = this.windowX;
            this.resizeStartWindowY = this.windowY;
            return true;
        }

        // Check if clicking on title bar to start dragging
        if (this.titleBarBounds && this._isInside(x, y, this.titleBarBounds)) {
            // Don't start drag if clicking close button
            if (this.closeButton && this._isInside(x, y, this.closeButton)) {
                return true; // Will handle in handleClick
            }
            this.isDragging = true;
            this.dragOffsetX = x - this.windowX;
            this.dragOffsetY = y - this.windowY;
            return true;
        }

        // Check if clicking on scroll bar
        if (this.scrollBarBounds && this._isInside(x, y, this.scrollBarBounds)) {
            this.isScrollDragging = true;
            this.scrollDragStartY = y;
            this.scrollDragStartOffset = this.scrollOffset;
            return true;
        }

        // Check if inside window (consume click but don't drag)
        if (this.containsPoint(x, y)) {
            return true;
        }

        return false;
    }

    /**
     * Handle mouse wheel events for scrolling
     * @param {number} x - Mouse X coordinate
     * @param {number} y - Mouse Y coordinate
     * @param {number} deltaY - Scroll delta
     * @returns {boolean} True if event was handled
     */
    handleWheel(x, y, deltaY) {
        if (!this.isVisible) return false;
        if (!this.containsPoint(x, y)) return false;
        if (this.currentView !== 'vector') return false;

        this.scrollOffset = Math.max(0, Math.min(this.maxScroll, this.scrollOffset + deltaY * 0.5));
        return true;
    }

    /**
     * Handle mouse move events
     * @param {number} x - Mouse X coordinate
     * @param {number} y - Mouse Y coordinate
     * @param {number} canvasWidth - Canvas width for bounds
     * @param {number} canvasHeight - Canvas height for bounds
     * @returns {{handled: boolean, cursor: string}} Result with cursor style
     */
    handleMouseMove(x, y, canvasWidth, canvasHeight) {
        if (!this.isVisible) return { handled: false, cursor: 'default' };

        // Handle resizing
        if (this.isResizing) {
            const deltaX = x - this.resizeStartX;
            const deltaY = y - this.resizeStartY;
            const edge = this.resizeEdge;

            let newX = this.resizeStartWindowX;
            let newY = this.resizeStartWindowY;
            let newW = this.resizeStartWidth;
            let newH = this.resizeStartHeight;

            // Adjust dimensions based on which edge is being dragged
            if (edge.includes('e')) {
                newW = Math.max(this.minWidth, this.resizeStartWidth + deltaX);
            }
            if (edge.includes('w')) {
                const widthDelta = Math.min(deltaX, this.resizeStartWidth - this.minWidth);
                newX = this.resizeStartWindowX + widthDelta;
                newW = this.resizeStartWidth - widthDelta;
            }
            if (edge.includes('s')) {
                newH = Math.max(this.minHeight, this.resizeStartHeight + deltaY);
            }
            if (edge.includes('n')) {
                const heightDelta = Math.min(deltaY, this.resizeStartHeight - this.minHeight);
                newY = this.resizeStartWindowY + heightDelta;
                newH = this.resizeStartHeight - heightDelta;
            }

            this.windowX = newX;
            this.windowY = newY;
            this.windowWidth = newW;
            this.windowHeight = newH;
            this._constrainToBounds(canvasWidth, canvasHeight);

            return { handled: true, cursor: this._getCursorForEdge(edge) };
        }

        if (this.isDragging) {
            this.windowX = x - this.dragOffsetX;
            this.windowY = y - this.dragOffsetY;
            this._constrainToBounds(canvasWidth, canvasHeight);
            return { handled: true, cursor: 'move' };
        }

        // Handle scroll bar dragging
        if (this.isScrollDragging && this.scrollBarBounds) {
            const deltaY = y - this.scrollDragStartY;
            const scrollRange = this.scrollBarBounds.h - this.scrollBarBounds.thumbH;
            if (scrollRange > 0) {
                const scrollRatio = deltaY / scrollRange;
                this.scrollOffset = Math.max(0, Math.min(this.maxScroll,
                    this.scrollDragStartOffset + scrollRatio * this.maxScroll));
            }
            return { handled: true, cursor: 'default' };
        }

        // Check for resize edge hover
        const resizeEdge = this._getResizeEdge(x, y);
        if (resizeEdge) {
            return { handled: false, cursor: this._getCursorForEdge(resizeEdge) };
        }

        // Handle tooltips when inside window
        if (this.containsPoint(x, y)) {
            if (this.currentView === 'pauli' && this.gridBounds) {
                this.tooltipText = this._getPauliTooltip(x, y);
                this.tooltipX = x;
                this.tooltipY = y;
            } else {
                this.tooltipText = null;
            }
            return { handled: false, cursor: 'default' };
        } else {
            this.tooltipText = null;
        }

        return { handled: false, cursor: 'default' };
    }

    /**
     * Handle mouse up events
     * @returns {boolean} True if was dragging or resizing
     */
    handleMouseUp() {
        const wasDragging = this.isDragging || this.isScrollDragging || this.isResizing;
        this.isDragging = false;
        this.isScrollDragging = false;
        this.isResizing = false;
        this.resizeEdge = null;
        return wasDragging;
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

        // Consume click if inside window
        return this.containsPoint(x, y);
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
     * Get the resize edge at a given point
     * @private
     * @returns {string|null} Edge identifier or null
     */
    _getResizeEdge(x, y) {
        const hs = this.resizeHandleSize;
        const wx = this.windowX;
        const wy = this.windowY;
        const ww = this.windowWidth;
        const wh = this.windowHeight;

        const onLeft = x >= wx - hs && x <= wx + hs;
        const onRight = x >= wx + ww - hs && x <= wx + ww + hs;
        const onTop = y >= wy - hs && y <= wy + hs;
        const onBottom = y >= wy + wh - hs && y <= wy + wh + hs;
        const inHorizRange = x >= wx - hs && x <= wx + ww + hs;
        const inVertRange = y >= wy - hs && y <= wy + wh + hs;

        // Corners first (they take priority)
        if (onTop && onLeft) return 'nw';
        if (onTop && onRight) return 'ne';
        if (onBottom && onLeft) return 'sw';
        if (onBottom && onRight) return 'se';

        // Edges
        if (onTop && inHorizRange) return 'n';
        if (onBottom && inHorizRange) return 's';
        if (onLeft && inVertRange) return 'w';
        if (onRight && inVertRange) return 'e';

        return null;
    }

    /**
     * Get cursor style for a resize edge
     * @private
     */
    _getCursorForEdge(edge) {
        const cursors = {
            'n': 'ns-resize',
            's': 'ns-resize',
            'e': 'ew-resize',
            'w': 'ew-resize',
            'ne': 'nesw-resize',
            'sw': 'nesw-resize',
            'nw': 'nwse-resize',
            'se': 'nwse-resize'
        };
        return cursors[edge] || 'default';
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
        this.fadeIn = Math.min(1, this.fadeIn + 0.15);

        ctx.save();
        ctx.globalAlpha = this.fadeIn;

        // Draw window
        this._drawWindow(ctx, canvasWidth, canvasHeight, timestamp);

        // Draw tooltip
        if (this.tooltipText) {
            this._drawTooltip(ctx);
        }

        ctx.restore();
    }

    /**
     * Draw the floating window
     * @private
     */
    _drawWindow(ctx, canvasWidth, canvasHeight, timestamp) {
        // Force mobile layout if canvas is narrow
        const isMobile = canvasWidth < 500;
        if (isMobile) {
            const padding = 10;
            this.windowWidth = canvasWidth - padding * 2;
            this.windowX = padding;
            if (this.windowHeight > canvasHeight - 150) {
                this.windowHeight = canvasHeight - 150;
            }
        }

        const x = this.windowX;
        const y = this.windowY;
        const w = this.windowWidth;
        const h = this.windowHeight;
        const titleBarHeight = 40;
        const cornerRadius = 10;

        // Draw window shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.roundRect(x + 5, y + 5, w, h, cornerRadius);
        ctx.fill();

        // Draw window background (semi-transparent)
        ctx.fillStyle = `rgba(15, 23, 42, ${this.backgroundAlpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, cornerRadius);
        ctx.fill();

        // Draw window border
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw resize handles at corners (only on desktop)
        if (!isMobile) {
            const hs = this.resizeHandleSize;
            ctx.fillStyle = 'rgba(100, 150, 200, 0.4)';

            // Bottom-right corner (most common resize)
            ctx.beginPath();
            ctx.moveTo(x + w, y + h - hs * 2);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x + w - hs * 2, y + h);
            ctx.closePath();
            ctx.fill();

            // Small corner indicators
            ctx.fillStyle = 'rgba(100, 150, 200, 0.3)';
            // Top-left
            ctx.fillRect(x, y, hs, hs);
            // Top-right
            ctx.fillRect(x + w - hs, y, hs, hs);
            // Bottom-left
            ctx.fillRect(x, y + h - hs, hs, hs);
        }

        // Draw title bar background
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, titleBarHeight, [cornerRadius, cornerRadius, 0, 0]);
        ctx.fill();

        // Store title bar bounds for dragging
        this.titleBarBounds = { x, y, w, h: titleBarHeight };

        // Draw title bar bottom border
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
        ctx.beginPath();
        ctx.moveTo(x, y + titleBarHeight);
        ctx.lineTo(x + w, y + titleBarHeight);
        ctx.stroke();

        // Draw title
        const titles = {
            'pauli': 'Pauli Expectation Matrix',
            'density': 'Density Matrix',
            'ket': 'State Vector (Ket)',
            'vector': 'State Vector (Bars)',
            'correlation': 'Correlation Matrix'
        };
        const title = titles[this.currentView] || 'Quantum State';
        ctx.fillStyle = '#e8e8e8';
        ctx.font = 'bold 14px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, x + 15, y + titleBarHeight / 2);

        // Draw drag hint
        ctx.fillStyle = '#666';
        ctx.font = '10px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('drag to move', x + w / 2, y + titleBarHeight / 2 + 12);

        // Draw close button
        this.closeButton = { x: x + w - 35, y: y + 8, w: 24, h: 24 };
        ctx.fillStyle = 'rgba(100, 100, 120, 0.5)';
        ctx.beginPath();
        ctx.roundRect(this.closeButton.x, this.closeButton.y, this.closeButton.w, this.closeButton.h, 4);
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.closeButton.x + 6, this.closeButton.y + 6);
        ctx.lineTo(this.closeButton.x + 18, this.closeButton.y + 18);
        ctx.moveTo(this.closeButton.x + 18, this.closeButton.y + 6);
        ctx.lineTo(this.closeButton.x + 6, this.closeButton.y + 18);
        ctx.stroke();

        // Draw content area
        const contentX = x + 10;
        const contentY = y + titleBarHeight + 10;
        const contentW = w - 20;
        const contentH = h - titleBarHeight - 60; // Leave room for toggle button

        if (this.currentView === 'pauli') {
            this._drawPauliContent(ctx, contentX, contentY, contentW, contentH, timestamp);
        } else if (this.currentView === 'density') {
            this._drawDensityMatrixContent(ctx, contentX, contentY, contentW, contentH);
        } else if (this.currentView === 'ket') {
            this._drawKetNotationContent(ctx, contentX, contentY, contentW, contentH);
        } else if (this.currentView === 'vector') {
            this._drawStateVectorContent(ctx, contentX, contentY, contentW, contentH);
        } else if (this.currentView === 'correlation') {
            this._drawCorrelationContent(ctx, contentX, contentY, contentW, contentH);
        }

        // Draw toggle button at bottom
        this._drawToggleButton(ctx, x, y + h - 45, w);
    }

    /**
     * Get tooltip text for Pauli matrix cell at given coordinates
     * @private
     */
    _getPauliTooltip(x, y) {
        if (!this.gridBounds || !this._currentState) return null;

        const { x: gx, y: gy, w: gw, h: gh } = this.gridBounds;
        if (x < gx || x > gx + gw || y < gy || y > gy + gh) return null;

        const numQubits = this._currentState.numQubits;
        const gridDim = Math.pow(2, numQubits);
        const tileSize = gw / gridDim;

        const col = Math.floor((x - gx) / tileSize);
        const row = Math.floor((y - gy) / tileSize);

        if (row >= 0 && row < gridDim && col >= 0 && col < gridDim) {
            const label = this._getCellLabel(row, col, numQubits);
            const flatIdx = this._gridToFlatIndex(row, col, numQubits);
            const coefficients = this.pauliDome._coefficients;
            if (coefficients && flatIdx < coefficients.length) {
                const value = coefficients[flatIdx];
                return `⟨${label}⟩ = ${value.toFixed(4)}`;
            }
        }
        return null;
    }

    /**
     * Convert (row, col) grid position to flat Pauli index using standard ordering
     * Standard ordering: row bits = bit1 of each qubit's Pauli, col bits = bit0
     * This places Z in bottom-right of each 2×2 sub-block
     * @private
     */
    _gridToFlatIndex(row, col, numQubits) {
        let index = 0;
        for (let i = 0; i < numQubits; i++) {
            const bitPos = numQubits - 1 - i;
            const rowBit = (row >> bitPos) & 1;  // bit 1 of Pauli for qubit i
            const colBit = (col >> bitPos) & 1;  // bit 0 of Pauli for qubit i
            const pauliIdx = 2 * rowBit + colBit;  // 0=I, 1=X, 2=Y, 3=Z
            index |= (pauliIdx << (2 * (numQubits - 1 - i)));
        }
        return index;
    }

    /**
     * Get Pauli label for a grid cell using standard ordering
     * @private
     */
    _getCellLabel(row, col, numQubits) {
        const PAULIS = ['I', 'X', 'Y', 'Z'];
        let label = '';
        for (let i = 0; i < numQubits; i++) {
            const bitPos = numQubits - 1 - i;
            const rowBit = (row >> bitPos) & 1;
            const colBit = (col >> bitPos) & 1;
            const pauliIdx = 2 * rowBit + colBit;
            label += PAULIS[pauliIdx];
        }
        return label;
    }

    /**
     * Draw Pauli expectation matrix content with labels
     * Uses standard Pauli ordering: (0,0)→I, (0,1)→X, (1,0)→Y, (1,1)→Z (Z in bottom-right)
     * Uses tensor product order: Q0⊗Q1⊗... (top qubit leftmost in labels)
     * @private
     */
    _drawPauliContent(ctx, x, y, w, h, timestamp) {
        if (!this._currentState) return;

        const state = this._currentState;
        const numQubits = state.numQubits;
        const gridDim = Math.pow(2, numQubits);
        const PAULIS = ['I', 'X', 'Y', 'Z'];

        const coefficients = this.pauliDome._coefficients;
        if (!coefficients) return;

        const stats = this.pauliDome._stats;

        // Calculate space needed for labels
        const labelSpace = numQubits <= 2 ? 40 : 50;
        const legendHeight = 50;
        const availableW = w - labelSpace - 10;
        const availableH = h - legendHeight - labelSpace - 20;

        // Calculate tile size - fill available space (no max cap)
        const tileSize = Math.min(
            availableW / gridDim,
            availableH / gridDim
        );

        const gridWidth = gridDim * tileSize;
        const gridHeight = gridDim * tileSize;
        const gridX = x + labelSpace + (availableW - gridWidth) / 2;
        const gridY = y + labelSpace + 10;

        // Store grid bounds for tooltips
        this.gridBounds = { x: gridX, y: gridY, w: gridWidth, h: gridHeight };

        // No axis labels for now - cell labels are clearer with standard ordering
        // The grid structure is hierarchical with Z in bottom-right of each 2×2 block

        // Draw grid cells using standard ordering
        for (let row = 0; row < gridDim; row++) {
            for (let col = 0; col < gridDim; col++) {
                // Map (row, col) to flat coefficient index using standard ordering
                const flatIdx = this._gridToFlatIndex(row, col, numQubits);
                const coeff = coefficients[flatIdx];

                const tileX = gridX + col * tileSize;
                const tileY = gridY + row * tileSize;

                // Get color from PauliDome
                ctx.fillStyle = this.pauliDome._getColor(coeff);
                ctx.fillRect(tileX, tileY, tileSize, tileSize);

                // Draw border
                ctx.strokeStyle = 'rgba(50, 50, 70, 0.5)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(tileX, tileY, tileSize, tileSize);

                // Show value inside cell for small grids with large enough cells
                if (gridDim <= 4 && tileSize >= 30) {
                    const label = this._getCellLabel(row, col, numQubits);
                    ctx.fillStyle = Math.abs(coeff) > (stats?.absMax || 1) * 0.5 ? '#000' : '#666';
                    ctx.font = `${Math.min(9, tileSize * 0.25)}px "JetBrains Mono", monospace`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(label, tileX + tileSize / 2, tileY + tileSize / 2 - 5);
                    ctx.fillText(coeff.toFixed(2), tileX + tileSize / 2, tileY + tileSize / 2 + 7);
                }
            }
        }

        // Draw grid border
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(gridX, gridY, gridWidth, gridHeight);

        // Draw color legend
        const legendY = gridY + gridHeight + 20;
        const legendWidth = Math.min(150, w - 40);
        const legendH = 12;
        const legendX = x + (w - legendWidth) / 2;

        const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
        gradient.addColorStop(0, 'rgb(59, 130, 246)');
        gradient.addColorStop(0.5, 'rgb(255, 255, 255)');
        gradient.addColorStop(1, 'rgb(239, 68, 68)');

        ctx.fillStyle = gradient;
        ctx.fillRect(legendX, legendY, legendWidth, legendH);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY, legendWidth, legendH);

        // Legend labels
        ctx.fillStyle = '#888';
        ctx.font = '9px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const maxVal = stats?.absMax?.toFixed(2) || '1.00';
        ctx.fillText(`-${maxVal}`, legendX, legendY + legendH + 3);
        ctx.fillText('0', legendX + legendWidth / 2, legendY + legendH + 3);
        ctx.fillText(`+${maxVal}`, legendX + legendWidth, legendY + legendH + 3);
    }

    /**
     * Draw state vector content with scrolling
     * @private
     */
    _drawStateVectorContent(ctx, x, y, w, h) {
        if (!this._currentState) return;

        const state = this._currentState;
        const dim = state.dimension;

        // Group amplitudes by significance
        const amplitudes = [];
        for (let i = 0; i < dim; i++) {
            const amp = state.amplitudes[i];
            const mag = Math.sqrt(amp.re * amp.re + amp.im * amp.im);
            amplitudes.push({ index: i, amp, mag });
        }

        // Sort by magnitude
        amplitudes.sort((a, b) => b.mag - a.mag);
        const maxMag = amplitudes[0]?.mag || 1;

        // Calculate layout
        const scrollBarWidth = 12;
        const contentWidth = w - scrollBarWidth - 10;
        const barMaxWidth = Math.min(160, contentWidth - 160);
        const barHeight = 20;
        const spacing = 3;
        const rowHeight = barHeight + spacing;
        const totalContentHeight = dim * rowHeight;
        const visibleHeight = h - 10;
        const maxVisible = Math.floor(visibleHeight / rowHeight);

        // Calculate scroll bounds
        this.maxScroll = Math.max(0, totalContentHeight - visibleHeight);
        const needsScroll = totalContentHeight > visibleHeight;

        // Clamp scroll offset
        this.scrollOffset = Math.max(0, Math.min(this.maxScroll, this.scrollOffset));

        // Calculate which rows are visible
        const firstVisibleRow = Math.floor(this.scrollOffset / rowHeight);
        const lastVisibleRow = Math.min(dim - 1, firstVisibleRow + maxVisible + 1);

        // Create clipping region for content
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, contentWidth, visibleHeight);
        ctx.clip();

        ctx.font = '11px "JetBrains Mono", monospace';

        for (let i = firstVisibleRow; i <= lastVisibleRow; i++) {
            const { index, amp, mag } = amplitudes[i];
            const rowY = y + i * rowHeight - this.scrollOffset;

            // Skip if completely outside visible area
            if (rowY + barHeight < y || rowY > y + visibleHeight) continue;

            // Basis state label
            const basisLabel = '|' + index.toString(2).padStart(state.numQubits, '0') + '⟩';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(basisLabel, x + 50, rowY + barHeight / 2);

            // Magnitude bar
            const barWidth = (mag / maxMag) * barMaxWidth;
            const barX = x + 60;

            // Bar background
            ctx.fillStyle = 'rgba(100, 100, 120, 0.3)';
            ctx.fillRect(barX, rowY, barMaxWidth, barHeight);

            // Bar fill with phase color
            const phase = Math.atan2(amp.im, amp.re);
            const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360;
            ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.8)`;
            ctx.fillRect(barX, rowY, barWidth, barHeight);

            // Probability
            const prob = mag * mag * 100;
            ctx.fillStyle = '#e8e8e8';
            ctx.textAlign = 'left';
            ctx.fillText(`${prob.toFixed(1)}%`, barX + barMaxWidth + 10, rowY + barHeight / 2);

            // Complex amplitude (if space allows)
            if (contentWidth > 350) {
                let ampStr;
                if (Math.abs(amp.im) < 0.0001) {
                    ampStr = amp.re.toFixed(3);
                } else if (Math.abs(amp.re) < 0.0001) {
                    ampStr = `${amp.im.toFixed(3)}i`;
                } else {
                    const sign = amp.im >= 0 ? '+' : '';
                    ampStr = `${amp.re.toFixed(2)}${sign}${amp.im.toFixed(2)}i`;
                }
                ctx.fillStyle = '#666';
                ctx.fillText(ampStr, barX + barMaxWidth + 55, rowY + barHeight / 2);
            }
        }

        ctx.restore();

        // Draw scroll bar if needed
        if (needsScroll) {
            const scrollBarX = x + contentWidth + 5;
            const scrollBarY = y;
            const scrollBarHeight = visibleHeight;
            const thumbHeight = Math.max(30, (visibleHeight / totalContentHeight) * scrollBarHeight);
            const thumbY = scrollBarY + (this.scrollOffset / this.maxScroll) * (scrollBarHeight - thumbHeight);

            // Store scroll bar bounds for hit detection
            this.scrollBarBounds = {
                x: scrollBarX,
                y: scrollBarY,
                w: scrollBarWidth,
                h: scrollBarHeight,
                thumbH: thumbHeight
            };

            // Draw scroll track
            ctx.fillStyle = 'rgba(60, 60, 80, 0.5)';
            ctx.beginPath();
            ctx.roundRect(scrollBarX, scrollBarY, scrollBarWidth, scrollBarHeight, 4);
            ctx.fill();

            // Draw scroll thumb
            ctx.fillStyle = this.isScrollDragging ? 'rgba(150, 180, 220, 0.9)' : 'rgba(100, 130, 170, 0.8)';
            ctx.beginPath();
            ctx.roundRect(scrollBarX + 2, thumbY, scrollBarWidth - 4, thumbHeight, 3);
            ctx.fill();

            // Draw scroll indicators
            ctx.fillStyle = '#666';
            ctx.font = '9px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${firstVisibleRow + 1}-${Math.min(lastVisibleRow + 1, dim)}`, scrollBarX + scrollBarWidth / 2, scrollBarY + scrollBarHeight + 12);
            ctx.fillText(`of ${dim}`, scrollBarX + scrollBarWidth / 2, scrollBarY + scrollBarHeight + 22);
        } else {
            this.scrollBarBounds = null;
        }
    }

    /**
     * Draw correlation matrix content
     * Shows pairwise quantum correlations between qubits
     * @private
     */
    _drawCorrelationContent(ctx, x, y, w, h) {
        if (!this._currentState) return;

        const state = this._currentState;
        const n = state.numQubits;

        if (n < 2) {
            // Need at least 2 qubits for correlations
            ctx.fillStyle = '#888';
            ctx.font = '14px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Need at least 2 qubits for correlations', x + w / 2, y + h / 2);
            return;
        }

        // Calculate correlations
        const correlations = this._calculateCorrelations(state);

        // Layout
        const padding = 10;
        const labelWidth = 35;
        const availableSize = Math.min(w - labelWidth - padding * 2, h - labelWidth - padding * 2 - 60);
        const cellSize = Math.min(50, availableSize / n);
        const gridSize = cellSize * n;
        const gridX = x + (w - gridSize - labelWidth) / 2 + labelWidth;
        const gridY = y + padding + labelWidth;

        // Draw title/description
        ctx.fillStyle = '#888';
        ctx.font = '11px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Pairwise ZZ correlations: ⟨ZᵢZⱼ⟩ - ⟨Zᵢ⟩⟨Zⱼ⟩', x + w / 2, y + 5);

        // Draw cells
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const cellX = gridX + j * cellSize;
                const cellY = gridY + i * cellSize;

                let value, color;
                if (i === j) {
                    // Diagonal: show single-qubit purity
                    const purity = state.getPurity(i);
                    value = purity;
                    // Gold color for purity
                    const intensity = Math.pow(purity, 0.5);
                    color = `rgba(255, ${Math.round(200 * intensity)}, ${Math.round(50 * intensity)}, ${0.3 + 0.7 * intensity})`;
                } else {
                    // Off-diagonal: show ZZ correlation
                    const corr = correlations[i][j];
                    value = corr;
                    // Blue-white-red color scale
                    if (corr < 0) {
                        const intensity = Math.min(1, Math.abs(corr));
                        color = `rgba(${Math.round(59 + 196 * (1 - intensity))}, ${Math.round(130 + 125 * (1 - intensity))}, ${Math.round(246 + 9 * (1 - intensity))}, 0.9)`;
                    } else {
                        const intensity = Math.min(1, corr);
                        color = `rgba(${Math.round(255 - 16 * (1 - intensity))}, ${Math.round(255 - 187 * intensity)}, ${Math.round(255 - 187 * intensity)}, 0.9)`;
                    }
                }

                // Draw cell
                ctx.fillStyle = color;
                ctx.fillRect(cellX, cellY, cellSize - 1, cellSize - 1);

                // Draw value if cell is large enough
                if (cellSize >= 35) {
                    ctx.fillStyle = Math.abs(value) > 0.5 ? '#fff' : '#333';
                    ctx.font = '10px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(value.toFixed(2), cellX + cellSize / 2, cellY + cellSize / 2);
                }
            }
        }

        // Draw row labels (left)
        ctx.fillStyle = '#888';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < n; i++) {
            ctx.fillText(`q${i}`, gridX - 8, gridY + i * cellSize + cellSize / 2);
        }

        // Draw column labels (top)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        for (let j = 0; j < n; j++) {
            ctx.fillText(`q${j}`, gridX + j * cellSize + cellSize / 2, gridY - 5);
        }

        // Draw grid border
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(gridX, gridY, gridSize - 1, gridSize - 1);

        // Draw legend
        const legendY = gridY + gridSize + 20;
        const legendWidth = Math.min(200, w - 40);
        const legendH = 12;
        const legendX = x + (w - legendWidth) / 2;

        // Correlation gradient (blue to white to red)
        const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
        gradient.addColorStop(0, 'rgb(59, 130, 246)');
        gradient.addColorStop(0.5, 'rgb(255, 255, 255)');
        gradient.addColorStop(1, 'rgb(239, 68, 68)');

        ctx.fillStyle = gradient;
        ctx.fillRect(legendX, legendY, legendWidth, legendH);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY, legendWidth, legendH);

        // Legend labels
        ctx.fillStyle = '#888';
        ctx.font = '9px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('-1', legendX, legendY + legendH + 3);
        ctx.fillText('0', legendX + legendWidth / 2, legendY + legendH + 3);
        ctx.fillText('+1', legendX + legendWidth, legendY + legendH + 3);

        // Legend description
        ctx.fillText('Anti-correlated', legendX + legendWidth * 0.15, legendY + legendH + 16);
        ctx.fillText('Correlated', legendX + legendWidth * 0.85, legendY + legendH + 16);

        // Diagonal legend
        ctx.fillStyle = 'rgba(255, 200, 50, 0.8)';
        ctx.fillRect(legendX + legendWidth / 2 - 30, legendY + legendH + 30, 12, 12);
        ctx.fillStyle = '#888';
        ctx.textAlign = 'left';
        ctx.fillText('= Purity (diagonal)', legendX + legendWidth / 2 - 15, legendY + legendH + 38);
    }

    /**
     * Calculate pairwise ZZ correlations
     * @private
     */
    _calculateCorrelations(state) {
        const n = state.numQubits;
        const correlations = [];

        // First calculate single-qubit Z expectations
        const zExpectations = [];
        for (let i = 0; i < n; i++) {
            zExpectations.push(this._calculateZExpectation(state, i));
        }

        // Calculate pairwise correlations
        for (let i = 0; i < n; i++) {
            correlations[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    correlations[i][j] = 0; // Will use purity for diagonal
                } else {
                    const zzExpectation = this._calculateZZExpectation(state, i, j);
                    // Connected correlation: ⟨ZᵢZⱼ⟩ - ⟨Zᵢ⟩⟨Zⱼ⟩
                    correlations[i][j] = zzExpectation - zExpectations[i] * zExpectations[j];
                }
            }
        }

        return correlations;
    }

    /**
     * Calculate ⟨Z⟩ expectation for a single qubit
     * @private
     */
    _calculateZExpectation(state, qubitIndex) {
        const n = state.numQubits;
        let expectation = 0;

        for (let i = 0; i < state.dimension; i++) {
            const amp = state.amplitudes[i];
            const prob = amp.re * amp.re + amp.im * amp.im;

            // Check if qubit is in |0⟩ or |1⟩ for this basis state
            const bit = (i >> (n - 1 - qubitIndex)) & 1;
            expectation += prob * (bit === 0 ? 1 : -1);
        }

        return expectation;
    }

    /**
     * Calculate ⟨ZᵢZⱼ⟩ expectation for two qubits
     * @private
     */
    _calculateZZExpectation(state, qubitI, qubitJ) {
        const n = state.numQubits;
        let expectation = 0;

        for (let i = 0; i < state.dimension; i++) {
            const amp = state.amplitudes[i];
            const prob = amp.re * amp.re + amp.im * amp.im;

            // Check bits for both qubits
            const bitI = (i >> (n - 1 - qubitI)) & 1;
            const bitJ = (i >> (n - 1 - qubitJ)) & 1;

            // ZᵢZⱼ eigenvalue: +1 if same, -1 if different
            const eigenvalue = (bitI === bitJ) ? 1 : -1;
            expectation += prob * eigenvalue;
        }

        return expectation;
    }

    /**
     * Draw density matrix content as Hinton diagram
     * Shows ρ = |ψ⟩⟨ψ| with square size = magnitude, arrow direction = phase
     * @private
     */
    _drawDensityMatrixContent(ctx, x, y, w, h) {
        if (!this._currentState) return;

        const state = this._currentState;
        const dim = state.dimension;
        const n = state.numQubits;

        // Layout calculations
        const labelSpace = n <= 3 ? 50 : 40;
        const legendHeight = 50;
        const availableW = w - labelSpace - 10;
        const availableH = h - legendHeight - labelSpace - 10;

        // Calculate cell size to fit all states - fill available space (no max cap)
        const cellSize = Math.min(
            availableW / dim,
            availableH / dim
        );

        const gridWidth = dim * cellSize;
        const gridHeight = dim * cellSize;
        const gridX = x + labelSpace + (availableW - gridWidth) / 2;
        const gridY = y + labelSpace;

        // Find max magnitude for scaling
        let maxMag = 0;
        for (let i = 0; i < dim; i++) {
            for (let j = 0; j < dim; j++) {
                // ρᵢⱼ = ψᵢ × conj(ψⱼ)
                const ampI = state.amplitudes[i];
                const ampJ = state.amplitudes[j];
                const re = ampI.re * ampJ.re + ampI.im * ampJ.im;
                const im = ampI.im * ampJ.re - ampI.re * ampJ.im;
                const mag = Math.sqrt(re * re + im * im);
                if (mag > maxMag) maxMag = mag;
            }
        }

        // Draw grid cells as Hinton diagram squares with phase arrows
        for (let row = 0; row < dim; row++) {
            for (let col = 0; col < dim; col++) {
                const cellX = gridX + col * cellSize;
                const cellY = gridY + row * cellSize;

                // ρ_{row,col} = ψ_row × conj(ψ_col)
                const ampRow = state.amplitudes[row];
                const ampCol = state.amplitudes[col];
                const re = ampRow.re * ampCol.re + ampRow.im * ampCol.im;
                const im = ampRow.im * ampCol.re - ampRow.re * ampCol.im;
                const mag = Math.sqrt(re * re + im * im);
                const phase = Math.atan2(im, re);

                // Draw cell background
                ctx.fillStyle = 'rgba(30, 30, 40, 0.5)';
                ctx.fillRect(cellX, cellY, cellSize - 0.5, cellSize - 0.5);

                if (mag > 1e-10) {
                    // Square size proportional to magnitude
                    const scale = maxMag > 0 ? Math.sqrt(mag / maxMag) : 0;
                    const squareSize = scale * (cellSize - 4);

                    // Neutral color for square (light blue-gray)
                    ctx.fillStyle = 'rgba(120, 160, 200, 0.8)';

                    // Draw centered square
                    const centerX = cellX + cellSize / 2;
                    const centerY = cellY + cellSize / 2;
                    const halfSize = squareSize / 2;
                    ctx.fillRect(centerX - halfSize, centerY - halfSize, squareSize, squareSize);

                    // Draw phase arrow if square is large enough
                    if (squareSize > 8) {
                        const arrowLength = squareSize * 0.35;
                        const arrowHeadSize = Math.max(3, squareSize * 0.12);

                        // Arrow points in direction of phase (0 = right, π/2 = up)
                        const endX = centerX + Math.cos(phase) * arrowLength;
                        const endY = centerY - Math.sin(phase) * arrowLength; // Negative because canvas Y is inverted

                        // Draw arrow line
                        ctx.strokeStyle = '#1a1a2e';
                        ctx.lineWidth = Math.max(1.5, squareSize * 0.06);
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(centerX, centerY);
                        ctx.lineTo(endX, endY);
                        ctx.stroke();

                        // Draw arrow head
                        const headAngle = Math.PI / 6; // 30 degrees
                        ctx.beginPath();
                        ctx.moveTo(endX, endY);
                        ctx.lineTo(
                            endX - arrowHeadSize * Math.cos(phase - headAngle),
                            endY + arrowHeadSize * Math.sin(phase - headAngle)
                        );
                        ctx.moveTo(endX, endY);
                        ctx.lineTo(
                            endX - arrowHeadSize * Math.cos(phase + headAngle),
                            endY + arrowHeadSize * Math.sin(phase + headAngle)
                        );
                        ctx.stroke();
                    }
                }
            }
        }

        // Draw grid border
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(gridX, gridY, gridWidth, gridHeight);

        // Draw row labels (left) - binary kets
        ctx.fillStyle = '#888';
        const fontSize = Math.min(10, Math.max(7, cellSize * 0.4));
        ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const labelStep = dim > 16 ? Math.ceil(dim / 8) : 1;
        for (let i = 0; i < dim; i += labelStep) {
            const label = '|' + i.toString(2).padStart(n, '0') + '⟩';
            ctx.fillText(label, gridX - 4, gridY + i * cellSize + cellSize / 2);
        }

        // Draw column labels (top) - binary kets rotated
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (let j = 0; j < dim; j += labelStep) {
            const label = '⟨' + j.toString(2).padStart(n, '0') + '|';
            ctx.save();
            ctx.translate(gridX + j * cellSize + cellSize / 2, gridY - 4);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        }
        ctx.restore();

        // Draw legend - phase arrow compass
        const legendY = gridY + gridHeight + 12;
        const compassRadius = 20;
        const compassX = x + w / 2 - 60;
        const compassY = legendY + compassRadius + 3;

        // Draw compass circle
        ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(compassX, compassY, compassRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw compass arrows with labels
        ctx.strokeStyle = '#888';
        ctx.fillStyle = '#888';
        ctx.lineWidth = 1.5;
        ctx.font = '9px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Right arrow (phase = 0)
        ctx.beginPath();
        ctx.moveTo(compassX, compassY);
        ctx.lineTo(compassX + compassRadius - 2, compassY);
        ctx.stroke();
        ctx.fillText('0', compassX + compassRadius + 10, compassY);

        // Up arrow (phase = π/2)
        ctx.beginPath();
        ctx.moveTo(compassX, compassY);
        ctx.lineTo(compassX, compassY - compassRadius + 2);
        ctx.stroke();
        ctx.fillText('π/2', compassX, compassY - compassRadius - 8);

        // Left arrow (phase = π)
        ctx.beginPath();
        ctx.moveTo(compassX, compassY);
        ctx.lineTo(compassX - compassRadius + 2, compassY);
        ctx.stroke();
        ctx.fillText('±π', compassX - compassRadius - 12, compassY);

        // Down arrow (phase = -π/2)
        ctx.beginPath();
        ctx.moveTo(compassX, compassY);
        ctx.lineTo(compassX, compassY + compassRadius - 2);
        ctx.stroke();
        ctx.fillText('-π/2', compassX, compassY + compassRadius + 8);

        // Size legend
        ctx.fillStyle = '#888';
        ctx.font = '10px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Size ∝ |ρᵢⱼ|', compassX + compassRadius + 30, compassY - 8);
        ctx.fillText('Arrow → phase', compassX + compassRadius + 30, compassY + 8);
    }

    /**
     * Draw state vector in ket notation
     * Shows |ψ⟩ = Σ αᵢ|i⟩ with complex coefficients (a+bi)
     * @private
     */
    _drawKetNotationContent(ctx, x, y, w, h) {
        if (!this._currentState) return;

        const state = this._currentState;
        const dim = state.dimension;
        const n = state.numQubits;

        // Collect non-zero amplitudes
        const terms = [];
        const threshold = 1e-10;
        for (let i = 0; i < dim; i++) {
            const amp = state.amplitudes[i];
            const mag = Math.sqrt(amp.re * amp.re + amp.im * amp.im);
            if (mag > threshold) {
                terms.push({
                    index: i,
                    re: amp.re,
                    im: amp.im,
                    mag: mag
                });
            }
        }

        // Sort by magnitude (descending)
        terms.sort((a, b) => b.mag - a.mag);

        if (terms.length === 0) {
            ctx.fillStyle = '#888';
            ctx.font = '14px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('|ψ⟩ = 0', x + w / 2, y + h / 2);
            return;
        }

        // Calculate font size to fit all terms
        const padding = 10;
        const lineHeight = 24;
        const maxLines = Math.floor((h - padding * 2) / lineHeight);

        // Calculate how many terms per line we can fit
        const avgTermWidth = 120; // Rough estimate
        const termsPerLine = Math.max(1, Math.floor((w - padding * 2) / avgTermWidth));
        const numLines = Math.ceil(terms.length / termsPerLine);

        // Scale font if needed to fit
        let fontSize = 14;
        if (numLines > maxLines) {
            // Need to shrink font and increase terms per line
            fontSize = Math.max(9, Math.floor(14 * maxLines / numLines));
        }

        ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

        // Format complex number as string
        const formatComplex = (re, im) => {
            const reStr = Math.abs(re) < threshold ? '' : re.toFixed(3);
            const imStr = Math.abs(im) < threshold ? '' :
                          (im >= 0 && reStr ? '+' : '') + im.toFixed(3) + 'i';

            if (!reStr && !imStr) return '0';
            if (!imStr) return reStr;
            if (!reStr) return imStr;
            return reStr + imStr;
        };

        // Build the ket expression line by line
        let currentLine = '|ψ⟩ = ';
        const lines = [];
        let isFirstTerm = true;

        for (const term of terms) {
            const ket = '|' + term.index.toString(2).padStart(n, '0') + '⟩';
            const coeff = formatComplex(term.re, term.im);

            // Determine sign/prefix for this term
            let termStr;
            if (isFirstTerm) {
                // Check if coefficient needs parentheses (has both re and im)
                if (Math.abs(term.re) > threshold && Math.abs(term.im) > threshold) {
                    termStr = `(${coeff})${ket}`;
                } else {
                    termStr = `${coeff}${ket}`;
                }
            } else {
                // Add + or - prefix based on the term
                if (Math.abs(term.im) > threshold && Math.abs(term.re) > threshold) {
                    // Complex with both parts - use parentheses
                    termStr = ` + (${coeff})${ket}`;
                } else if (term.re < -threshold || (Math.abs(term.re) < threshold && term.im < -threshold)) {
                    // Negative real or pure negative imaginary
                    const absCoeff = formatComplex(Math.abs(term.re), Math.abs(term.im));
                    termStr = ` - ${absCoeff}${ket}`;
                } else {
                    termStr = ` + ${coeff}${ket}`;
                }
            }

            // Check if adding this term would exceed line width
            const testLine = currentLine + termStr;
            const testWidth = ctx.measureText(testLine).width;

            if (testWidth > w - padding * 2 && currentLine !== '|ψ⟩ = ') {
                lines.push(currentLine);
                currentLine = '  ' + termStr.trim();
                // Remove leading + from continuation
                if (currentLine.startsWith('  +')) {
                    currentLine = '  ' + currentLine.substring(3).trim();
                }
            } else {
                currentLine = testLine;
            }

            isFirstTerm = false;
        }

        // Add final line
        if (currentLine.trim()) {
            lines.push(currentLine);
        }

        // Render lines - scale down further if needed
        const totalNeededHeight = lines.length * lineHeight + padding * 2;
        if (totalNeededHeight > h) {
            const scaleFactor = (h - padding * 2) / (lines.length * lineHeight);
            fontSize = Math.max(8, Math.floor(fontSize * scaleFactor));
            ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
        }

        const actualLineHeight = Math.min(lineHeight, (h - padding * 2) / lines.length);
        const startY = y + padding + actualLineHeight / 2;

        ctx.fillStyle = '#e8e8e8';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < lines.length; i++) {
            const lineY = startY + i * actualLineHeight;
            if (lineY + actualLineHeight / 2 > y + h - padding) break;
            ctx.fillText(lines[i], x + padding, lineY);
        }

        // Show count info at bottom if truncated
        if (terms.length > 0) {
            ctx.fillStyle = '#666';
            ctx.font = '10px "Inter", sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${terms.length} non-zero terms`, x + w - padding, y + h - 5);
        }
    }

    /**
     * Draw the view toggle button
     * @private
     */
    _drawToggleButton(ctx, windowX, y, windowWidth) {
        const btnWidth = 130;
        const btnHeight = 28;
        const btnX = windowX + (windowWidth - btnWidth) / 2;

        this.toggleButton = { x: btnX, y, w: btnWidth, h: btnHeight };

        // Button background
        ctx.fillStyle = 'rgba(100, 100, 120, 0.5)';
        ctx.beginPath();
        ctx.roundRect(btnX, y, btnWidth, btnHeight, 4);
        ctx.fill();

        // Button text
        ctx.fillStyle = '#e8e8e8';
        ctx.font = '11px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const viewNames = {
            'pauli': 'Pauli Matrix',
            'density': 'Density Matrix',
            'ket': 'Ket Notation',
            'vector': 'State Bars',
            'correlation': 'Correlations'
        };
        const currentIndex = this.viewOrder.indexOf(this.currentView);
        const nextViewKey = this.viewOrder[(currentIndex + 1) % this.viewOrder.length];
        ctx.fillText(`Show ${viewNames[nextViewKey]}`, btnX + btnWidth / 2, y + btnHeight / 2);
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
