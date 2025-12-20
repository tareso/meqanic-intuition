/**
 * QuantumState.js
 * The single source of truth for the quantum system state
 * Maintains the state vector and provides methods to extract quantum properties
 */

import {
    complex,
    normalize,
    densityMatrixFromState,
    partialTrace,
    blochVectorFromDensityMatrix,
    purity,
    generateRandomPureState
} from './quantumMath.js';

export class QuantumState {
    /**
     * Create a new quantum state
     * @param {number} numQubits - Number of qubits (1-6)
     * @param {Array} initialState - Optional initial state vector
     */
    constructor(numQubits, initialState = null) {
        if (numQubits < 1 || numQubits > 6) {
            throw new Error('Number of qubits must be between 1 and 6');
        }

        this.numQubits = numQubits;
        this.dimension = Math.pow(2, numQubits);

        // State vector: array of complex numbers
        if (initialState) {
            if (initialState.length !== this.dimension) {
                throw new Error(`Initial state dimension ${initialState.length} does not match expected dimension ${this.dimension}`);
            }
            this.amplitudes = normalize(initialState);
        } else {
            // Default: random pure state
            this.amplitudes = generateRandomPureState(numQubits);
        }

        // Qubit positions on canvas (will be set by layout manager)
        this.qubitPositions = [];
        for (let i = 0; i < numQubits; i++) {
            this.qubitPositions.push({ x: 0, y: 0 });
        }

        // Cache for expensive calculations
        this._densityMatrixCache = null;
        this._reducedDensityMatrixCache = new Map();
        this._cacheValid = true;
    }

    /**
     * Invalidate caches when state changes
     */
    _invalidateCache() {
        this._cacheValid = false;
        this._densityMatrixCache = null;
        this._reducedDensityMatrixCache.clear();
    }

    /**
     * Get the full density matrix ρ = |ψ⟩⟨ψ|
     * @returns {Array<Array>} Full density matrix
     */
    getDensityMatrix() {
        if (!this._cacheValid || !this._densityMatrixCache) {
            this._densityMatrixCache = densityMatrixFromState(this.amplitudes);
        }
        return this._densityMatrixCache;
    }

    /**
     * Get reduced density matrix for a specific qubit
     * @param {number} qubitIndex - Index of the qubit (0-indexed)
     * @returns {Array<Array>} 2x2 reduced density matrix
     */
    getReducedDensityMatrix(qubitIndex) {
        if (qubitIndex < 0 || qubitIndex >= this.numQubits) {
            throw new Error(`Invalid qubit index ${qubitIndex}`);
        }

        const cacheKey = qubitIndex;

        if (!this._cacheValid || !this._reducedDensityMatrixCache.has(cacheKey)) {
            const fullDM = this.getDensityMatrix();
            const reducedDM = partialTrace(fullDM, qubitIndex, this.numQubits);
            this._reducedDensityMatrixCache.set(cacheKey, reducedDM);
        }

        return this._reducedDensityMatrixCache.get(cacheKey);
    }

    /**
     * Get Bloch vector for a specific qubit
     * @param {number} qubitIndex - Index of the qubit (0-indexed)
     * @returns {{x: number, y: number, z: number}} Bloch vector
     */
    getBlochVector(qubitIndex) {
        const rho = this.getReducedDensityMatrix(qubitIndex);
        return blochVectorFromDensityMatrix(rho);
    }

    /**
     * Get purity of a specific qubit
     * Purity = 1 for pure states, < 1 for mixed/entangled states
     * @param {number} qubitIndex - Index of the qubit (0-indexed)
     * @returns {number} Purity value [0.5, 1]
     */
    getPurity(qubitIndex) {
        const rho = this.getReducedDensityMatrix(qubitIndex);
        return purity(rho);
    }

    /**
     * Get amplitude for a specific basis state
     * @param {number} basisIndex - Index of basis state (0 to 2^N - 1)
     * @returns {Complex} Complex amplitude
     */
    getAmplitude(basisIndex) {
        if (basisIndex < 0 || basisIndex >= this.dimension) {
            throw new Error(`Invalid basis index ${basisIndex}`);
        }
        return this.amplitudes[basisIndex];
    }

    /**
     * Set amplitude for a specific basis state (use with caution!)
     * @param {number} basisIndex - Index of basis state
     * @param {Complex} value - New amplitude value
     */
    setAmplitude(basisIndex, value) {
        if (basisIndex < 0 || basisIndex >= this.dimension) {
            throw new Error(`Invalid basis index ${basisIndex}`);
        }
        this.amplitudes[basisIndex] = value;
        this._invalidateCache();
    }

    /**
     * Normalize the state vector
     */
    normalize() {
        this.amplitudes = normalize(this.amplitudes);
        this._invalidateCache();
    }

    /**
     * Set qubit position on canvas
     * @param {number} qubitIndex - Index of qubit
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setQubitPosition(qubitIndex, x, y) {
        if (qubitIndex < 0 || qubitIndex >= this.numQubits) {
            throw new Error(`Invalid qubit index ${qubitIndex}`);
        }
        this.qubitPositions[qubitIndex] = { x, y };
    }

    /**
     * Get qubit position
     * @param {number} qubitIndex - Index of qubit
     * @returns {{x: number, y: number}} Position
     */
    getQubitPosition(qubitIndex) {
        if (qubitIndex < 0 || qubitIndex >= this.numQubits) {
            throw new Error(`Invalid qubit index ${qubitIndex}`);
        }
        return this.qubitPositions[qubitIndex];
    }

    /**
     * Get all qubit positions
     * @returns {Array<{x: number, y: number}>} Array of positions
     */
    getAllQubitPositions() {
        return this.qubitPositions;
    }

    /**
     * Clone the state
     * @returns {QuantumState} Deep copy of this state
     */
    clone() {
        const clonedAmplitudes = this.amplitudes.map(amp => complex(amp.re, amp.im));
        const newState = new QuantumState(this.numQubits, clonedAmplitudes);
        newState.qubitPositions = this.qubitPositions.map(pos => ({ x: pos.x, y: pos.y }));
        return newState;
    }

    /**
     * Get state vector as string in Dirac notation
     * @param {number} threshold - Minimum magnitude to display (default 0.01)
     * @param {number} decimals - Number of decimal places (default 3)
     * @returns {string} String representation like "|ψ⟩ = 0.707|00⟩ + 0.707|11⟩"
     */
    toNotationString(threshold = 0.01, decimals = 3) {
        const terms = [];

        for (let i = 0; i < this.dimension; i++) {
            const amp = this.amplitudes[i];
            const mag = Math.sqrt(amp.re * amp.re + amp.im * amp.im);

            if (mag > threshold) {
                // Convert index to binary basis state
                const basisState = i.toString(2).padStart(this.numQubits, '0');

                // Format amplitude
                let ampStr;
                if (Math.abs(amp.im) < 1e-10) {
                    // Real amplitude
                    ampStr = amp.re.toFixed(decimals);
                } else if (Math.abs(amp.re) < 1e-10) {
                    // Pure imaginary
                    ampStr = `${amp.im.toFixed(decimals)}i`;
                } else {
                    // Complex
                    const sign = amp.im >= 0 ? '+' : '';
                    ampStr = `(${amp.re.toFixed(decimals)}${sign}${amp.im.toFixed(decimals)}i)`;
                }

                terms.push(`${ampStr}|${basisState}⟩`);
            }
        }

        if (terms.length === 0) {
            return '|ψ⟩ = 0';
        }

        // Add plus signs between terms
        let result = '|ψ⟩ = ' + terms[0];
        for (let i = 1; i < terms.length; i++) {
            if (terms[i].startsWith('-')) {
                result += ' ' + terms[i];
            } else {
                result += ' + ' + terms[i];
            }
        }

        return result;
    }

    /**
     * Create a state with all qubits in |0⟩
     * @param {number} numQubits - Number of qubits
     * @returns {QuantumState} State |00...0⟩
     */
    static createZeroState(numQubits) {
        const dim = Math.pow(2, numQubits);
        const amplitudes = new Array(dim).fill(complex(0, 0));
        amplitudes[0] = complex(1, 0);  // |00...0⟩ basis state
        return new QuantumState(numQubits, amplitudes);
    }

    /**
     * Create a state with all qubits in |1⟩
     * @param {number} numQubits - Number of qubits
     * @returns {QuantumState} State |11...1⟩
     */
    static createOneState(numQubits) {
        const dim = Math.pow(2, numQubits);
        const amplitudes = new Array(dim).fill(complex(0, 0));
        amplitudes[dim - 1] = complex(1, 0);  // |11...1⟩ basis state
        return new QuantumState(numQubits, amplitudes);
    }

    /**
     * Create a random pure state
     * @param {number} numQubits - Number of qubits
     * @returns {QuantumState} Random state
     */
    static createRandomState(numQubits) {
        return new QuantumState(numQubits);  // Default constructor creates random state
    }
}
