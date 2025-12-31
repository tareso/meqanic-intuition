/**
 * pauliBasis.js
 * Computes Pauli expectation values for a quantum state
 *
 * OPTIMIZED VERSION: Uses direct Pauli application instead of matrix elements
 * Complexity reduced from O(4^N × 4^N) to O(4^N × 2^N)
 *
 * For N qubits, computes all 4^N Pauli expectation values:
 * ⟨P⟩ = ⟨ψ|P|ψ⟩ where P = σ_{i₁} ⊗ σ_{i₂} ⊗ ... ⊗ σ_{iₙ}
 *
 * These are the coefficients in the Pauli basis expansion of the density matrix:
 * ρ = (1/2^N) Σ ⟨P⟩ P
 */

const PAULI_LABELS = ['I', 'X', 'Y', 'Z'];

/**
 * Get the label for a Pauli basis index
 * Label is in tensor product order: first character = qubit 0's Pauli
 * @param {number} index - Index from 0 to 4^N - 1
 * @param {number} numQubits - Number of qubits
 * @returns {string} Label like "ZI" for Z⊗I (Z on q0, I on q1)
 */
export function getPauliLabel(index, numQubits) {
    let label = '';
    for (let q = numQubits - 1; q >= 0; q--) {
        const pauliIdx = (index >> (2 * q)) & 3;
        label = label + PAULI_LABELS[pauliIdx];
    }
    return label;
}

/**
 * Apply a single-qubit Pauli operator to a state vector (in-place modification of output)
 *
 * @param {Array} amplitudes - Input state vector
 * @param {Float64Array} outRe - Output real parts
 * @param {Float64Array} outIm - Output imaginary parts
 * @param {number} pauliType - 0=I, 1=X, 2=Y, 3=Z
 * @param {number} qubitIndex - Which qubit to apply to (0 = most significant)
 * @param {number} numQubits - Total number of qubits
 */
function applySinglePauli(amplitudes, outRe, outIm, pauliType, qubitIndex, numQubits) {
    const dim = amplitudes.length;
    const bitPosition = numQubits - 1 - qubitIndex;
    const mask = 1 << bitPosition;

    switch (pauliType) {
        case 0: // I - identity, just copy
            for (let i = 0; i < dim; i++) {
                outRe[i] = amplitudes[i].re;
                outIm[i] = amplitudes[i].im;
            }
            break;

        case 1: // X - swap pairs
            for (let i = 0; i < dim; i++) {
                const partner = i ^ mask;
                outRe[i] = amplitudes[partner].re;
                outIm[i] = amplitudes[partner].im;
            }
            break;

        case 2: // Y - swap pairs with ±i multiplication
            // Y|0⟩ = i|1⟩, Y|1⟩ = -i|0⟩
            for (let i = 0; i < dim; i++) {
                const partner = i ^ mask;
                const bit = (i >> bitPosition) & 1;
                if (bit === 0) {
                    // This amplitude came from |1⟩ state, multiply by -i
                    // -i * (a + bi) = b - ai
                    outRe[i] = amplitudes[partner].im;
                    outIm[i] = -amplitudes[partner].re;
                } else {
                    // This amplitude came from |0⟩ state, multiply by i
                    // i * (a + bi) = -b + ai
                    outRe[i] = -amplitudes[partner].im;
                    outIm[i] = amplitudes[partner].re;
                }
            }
            break;

        case 3: // Z - flip sign where qubit is |1⟩
            for (let i = 0; i < dim; i++) {
                const bit = (i >> bitPosition) & 1;
                if (bit === 1) {
                    outRe[i] = -amplitudes[i].re;
                    outIm[i] = -amplitudes[i].im;
                } else {
                    outRe[i] = amplitudes[i].re;
                    outIm[i] = amplitudes[i].im;
                }
            }
            break;
    }
}

/**
 * Apply a single-qubit Pauli to already-transformed arrays (in-place)
 */
function applySinglePauliToArrays(inRe, inIm, outRe, outIm, pauliType, qubitIndex, numQubits) {
    const dim = inRe.length;
    const bitPosition = numQubits - 1 - qubitIndex;
    const mask = 1 << bitPosition;

    switch (pauliType) {
        case 0: // I - identity, just copy
            for (let i = 0; i < dim; i++) {
                outRe[i] = inRe[i];
                outIm[i] = inIm[i];
            }
            break;

        case 1: // X - swap pairs
            for (let i = 0; i < dim; i++) {
                const partner = i ^ mask;
                outRe[i] = inRe[partner];
                outIm[i] = inIm[partner];
            }
            break;

        case 2: // Y - swap pairs with ±i multiplication
            for (let i = 0; i < dim; i++) {
                const partner = i ^ mask;
                const bit = (i >> bitPosition) & 1;
                if (bit === 0) {
                    outRe[i] = inIm[partner];
                    outIm[i] = -inRe[partner];
                } else {
                    outRe[i] = -inIm[partner];
                    outIm[i] = inRe[partner];
                }
            }
            break;

        case 3: // Z - flip sign where qubit is |1⟩
            for (let i = 0; i < dim; i++) {
                const bit = (i >> bitPosition) & 1;
                if (bit === 1) {
                    outRe[i] = -inRe[i];
                    outIm[i] = -inIm[i];
                } else {
                    outRe[i] = inRe[i];
                    outIm[i] = inIm[i];
                }
            }
            break;
    }
}

/**
 * Compute ⟨ψ|P|ψ⟩ where P is a tensor product of Paulis
 *
 * @param {Array} amplitudes - State vector amplitudes
 * @param {number} pauliIndex - Index encoding the Pauli string (0 to 4^N - 1)
 * @param {number} numQubits - Number of qubits
 * @param {Float64Array} tempRe1 - Temporary buffer for real parts
 * @param {Float64Array} tempIm1 - Temporary buffer for imaginary parts
 * @param {Float64Array} tempRe2 - Temporary buffer for real parts
 * @param {Float64Array} tempIm2 - Temporary buffer for imaginary parts
 * @returns {number} Real expectation value
 */
function computePauliExpectation(amplitudes, pauliIndex, numQubits, tempRe1, tempIm1, tempRe2, tempIm2) {
    const dim = amplitudes.length;

    // Apply first Pauli
    const firstPauli = (pauliIndex >> (2 * (numQubits - 1))) & 3;
    applySinglePauli(amplitudes, tempRe1, tempIm1, firstPauli, 0, numQubits);

    // Apply remaining Paulis
    let srcRe = tempRe1, srcIm = tempIm1;
    let dstRe = tempRe2, dstIm = tempIm2;

    for (let q = 1; q < numQubits; q++) {
        const pauliType = (pauliIndex >> (2 * (numQubits - 1 - q))) & 3;
        applySinglePauliToArrays(srcRe, srcIm, dstRe, dstIm, pauliType, q, numQubits);
        // Swap buffers
        [srcRe, dstRe] = [dstRe, srcRe];
        [srcIm, dstIm] = [dstIm, srcIm];
    }

    // Compute inner product ⟨ψ|P|ψ⟩ = Σ conj(ψ_i) * (P|ψ⟩)_i
    let resultRe = 0;
    for (let i = 0; i < dim; i++) {
        // conj(a+bi) * (c+di) = (a-bi)(c+di) = ac+bd + i(ad-bc)
        // We only need real part: ac + bd
        resultRe += amplitudes[i].re * srcRe[i] + amplitudes[i].im * srcIm[i];
    }

    return resultRe;
}

/**
 * Compute all Pauli expectation values for a quantum state
 * OPTIMIZED: O(4^N × N × 2^N) instead of O(4^N × 4^N)
 *
 * @param {QuantumState} state - Quantum state object
 * @returns {Float64Array} Array of 4^N real expectation values ⟨P⟩
 */
export function computePauliCoefficients(state) {
    const numQubits = state.numQubits;
    const numCoeffs = Math.pow(4, numQubits);
    const dim = Math.pow(2, numQubits);
    const coefficients = new Float64Array(numCoeffs);

    // Pre-allocate temporary buffers (reused for all coefficients)
    const tempRe1 = new Float64Array(dim);
    const tempIm1 = new Float64Array(dim);
    const tempRe2 = new Float64Array(dim);
    const tempIm2 = new Float64Array(dim);

    for (let idx = 0; idx < numCoeffs; idx++) {
        coefficients[idx] = computePauliExpectation(
            state.amplitudes, idx, numQubits,
            tempRe1, tempIm1, tempRe2, tempIm2
        );
    }

    return coefficients;
}

/**
 * Get the grid dimensions for displaying coefficients
 * @param {number} numQubits - Number of qubits
 * @returns {{rows: number, cols: number}} Grid dimensions
 */
export function getGridDimensions(numQubits) {
    // For 4^N coefficients, use 2^N × 2^N grid
    const size = Math.pow(2, numQubits);
    return { rows: size, cols: size };
}

/**
 * Convert coefficient index to grid position
 * @param {number} index - Coefficient index (0 to 4^N - 1)
 * @param {number} numQubits - Number of qubits
 * @returns {{row: number, col: number}} Grid position
 */
export function indexToGridPosition(index, numQubits) {
    const gridSize = Math.pow(2, numQubits);
    return {
        row: Math.floor(index / gridSize),
        col: index % gridSize
    };
}

/**
 * Get summary statistics for the Pauli expectation values
 * @param {Float64Array} coefficients - Pauli expectation values
 * @returns {object} Statistics including min, max, and significant values
 */
export function getPauliStats(coefficients) {
    let min = Infinity;
    let max = -Infinity;
    let sumSquared = 0;

    for (let i = 0; i < coefficients.length; i++) {
        const c = coefficients[i];
        if (c < min) min = c;
        if (c > max) max = c;
        sumSquared += c * c;
    }

    return {
        min,
        max,
        absMax: Math.max(Math.abs(min), Math.abs(max)),
        rms: Math.sqrt(sumSquared / coefficients.length),
        numCoefficients: coefficients.length
    };
}
