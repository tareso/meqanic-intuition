/**
 * quantumMath.js
 * Core quantum mechanics mathematical operations
 * Provides: complex number helpers, Pauli matrices, partial trace, Bloch vector extraction
 */

// Access math.js from global scope (loaded via CDN)
const math = window.math;

if (!math) {
    console.error('math.js is not loaded! Make sure the CDN script is included in index.html');
    throw new Error('math.js library not found');
}

// Complex number operations (wrappers around math.js)
export function complex(re, im = 0) {
    return math.complex(re, im);
}

export function addComplex(a, b) {
    return math.add(a, b);
}

export function subtractComplex(a, b) {
    return math.subtract(a, b);
}

export function multiplyComplex(a, b) {
    return math.multiply(a, b);
}

export function conjugate(a) {
    return math.conj(a);
}

export function magnitude(a) {
    return math.abs(a);
}

export function magnitudeSquared(a) {
    const mag = math.abs(a);
    return mag * mag;
}

// Pauli matrices (2x2 complex matrices)
export const PAULI = {
    // σ_x = [[0, 1], [1, 0]]
    X: [
        [complex(0, 0), complex(1, 0)],
        [complex(1, 0), complex(0, 0)]
    ],

    // σ_y = [[0, -i], [i, 0]]
    Y: [
        [complex(0, 0), complex(0, -1)],
        [complex(0, 1), complex(0, 0)]
    ],

    // σ_z = [[1, 0], [0, -1]]
    Z: [
        [complex(1, 0), complex(0, 0)],
        [complex(0, 0), complex(-1, 0)]
    ]
};

// Identity matrix 2x2
export const IDENTITY_2 = [
    [complex(1, 0), complex(0, 0)],
    [complex(0, 0), complex(1, 0)]
];

/**
 * Normalize a state vector
 * @param {Array} stateVector - Array of complex numbers
 * @returns {Array} Normalized state vector
 */
export function normalize(stateVector) {
    let normSquared = 0;
    for (const amp of stateVector) {
        normSquared += magnitudeSquared(amp);
    }

    const norm = Math.sqrt(normSquared);

    if (norm < 1e-10) {
        console.warn('Attempting to normalize near-zero vector');
        return stateVector;
    }

    return stateVector.map(amp => math.divide(amp, norm));
}

/**
 * Compute the full density matrix from a state vector
 * ρ = |ψ⟩⟨ψ|
 * @param {Array} stateVector - Array of complex amplitudes
 * @returns {Array<Array>} Density matrix (2D array of complex numbers)
 */
export function densityMatrixFromState(stateVector) {
    const dim = stateVector.length;
    const rho = [];

    for (let i = 0; i < dim; i++) {
        rho[i] = [];
        for (let j = 0; j < dim; j++) {
            // ρ[i][j] = ψ[i] * conj(ψ[j])
            rho[i][j] = multiplyComplex(stateVector[i], conjugate(stateVector[j]));
        }
    }

    return rho;
}

/**
 * Partial trace to obtain reduced density matrix for a single qubit
 * Traces out all qubits except the specified one
 * @param {Array<Array>} densityMatrix - Full density matrix
 * @param {number} qubitIndex - Index of qubit to keep (0-indexed)
 * @param {number} numQubits - Total number of qubits
 * @returns {Array<Array>} 2x2 reduced density matrix
 */
export function partialTrace(densityMatrix, qubitIndex, numQubits) {
    // Initialize 2x2 reduced density matrix
    const reducedDM = [
        [complex(0, 0), complex(0, 0)],
        [complex(0, 0), complex(0, 0)]
    ];

    const dim = Math.pow(2, numQubits);

    for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
            // Extract the bit at position qubitIndex for indices i and j
            // Using big-endian convention: leftmost qubit is index 0
            const bit_i = (i >> (numQubits - 1 - qubitIndex)) & 1;
            const bit_j = (j >> (numQubits - 1 - qubitIndex)) & 1;

            // Create mask to check if all OTHER qubits have matching indices
            const mask = ~(1 << (numQubits - 1 - qubitIndex));

            // Only contribute to reduced density matrix if other qubits match
            if ((i & mask) === (j & mask)) {
                reducedDM[bit_i][bit_j] = addComplex(
                    reducedDM[bit_i][bit_j],
                    densityMatrix[i][j]
                );
            }
        }
    }

    return reducedDM;
}

/**
 * Extract Bloch vector from a 2x2 reduced density matrix
 * Uses: x = Tr(ρ σ_x), y = Tr(ρ σ_y), z = Tr(ρ σ_z)
 * Alternative formula: x = 2*Re(ρ₀₁), y = -2*Im(ρ₀₁), z = ρ₀₀ - ρ₁₁
 * @param {Array<Array>} rho - 2x2 density matrix
 * @returns {{x: number, y: number, z: number}} Bloch vector
 */
export function blochVectorFromDensityMatrix(rho) {
    // Using the direct formula for efficiency
    const rho01 = rho[0][1];
    const rho00_real = rho[0][0].re;
    const rho11_real = rho[1][1].re;

    const x = 2 * rho01.re;
    const y = -2 * rho01.im;  // Note the negative sign for standard convention
    const z = rho00_real - rho11_real;

    return { x, y, z };
}

/**
 * Calculate purity of a density matrix: Tr(ρ²)
 * Purity = 1 for pure states, < 1 for mixed states
 * @param {Array<Array>} rho - Density matrix (any dimension)
 * @returns {number} Purity value [0.5, 1] for qubits
 */
export function purity(rho) {
    const dim = rho.length;

    // Compute ρ²
    const rhoSquared = matrixMultiply(rho, rho);

    // Compute trace
    let trace = complex(0, 0);
    for (let i = 0; i < dim; i++) {
        trace = addComplex(trace, rhoSquared[i][i]);
    }

    return trace.re;  // Purity is always real
}

/**
 * Matrix multiplication for complex matrices
 * @param {Array<Array>} A - First matrix
 * @param {Array<Array>} B - Second matrix
 * @returns {Array<Array>} Product matrix A × B
 */
export function matrixMultiply(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;

    const result = [];
    for (let i = 0; i < rowsA; i++) {
        result[i] = [];
        for (let j = 0; j < colsB; j++) {
            result[i][j] = complex(0, 0);
            for (let k = 0; k < colsA; k++) {
                result[i][j] = addComplex(
                    result[i][j],
                    multiplyComplex(A[i][k], B[k][j])
                );
            }
        }
    }

    return result;
}

/**
 * Calculate the trace of a matrix
 * @param {Array<Array>} matrix - Square matrix
 * @returns {Complex} Trace (sum of diagonal elements)
 */
export function trace(matrix) {
    let tr = complex(0, 0);
    for (let i = 0; i < matrix.length; i++) {
        tr = addComplex(tr, matrix[i][i]);
    }
    return tr;
}

/**
 * Tensor product (Kronecker product) of two matrices
 * Used for constructing multi-qubit gates
 * @param {Array<Array>} A - First matrix
 * @param {Array<Array>} B - Second matrix
 * @returns {Array<Array>} Tensor product A ⊗ B
 */
export function tensorProduct(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;

    const result = [];
    for (let i = 0; i < rowsA * rowsB; i++) {
        result[i] = [];
        for (let j = 0; j < colsA * colsB; j++) {
            const iA = Math.floor(i / rowsB);
            const iB = i % rowsB;
            const jA = Math.floor(j / colsB);
            const jB = j % colsB;

            result[i][j] = multiplyComplex(A[iA][jA], B[iB][jB]);
        }
    }

    return result;
}

/**
 * Generate a random complex number from Gaussian distribution
 * Uses Box-Muller transform
 * @returns {Complex} Random complex number
 */
export function gaussianRandomComplex() {
    // Box-Muller transform for Gaussian distribution
    const u1 = Math.random();
    const u2 = Math.random();

    const re = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const im = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());

    return complex(re, im);
}

/**
 * Generate a random pure state using the Haar measure
 * @param {number} numQubits - Number of qubits
 * @returns {Array} Random normalized state vector
 */
export function generateRandomPureState(numQubits) {
    const dim = Math.pow(2, numQubits);
    const state = [];

    // Generate random complex amplitudes from Gaussian distribution
    for (let i = 0; i < dim; i++) {
        state.push(gaussianRandomComplex());
    }

    // Normalize to unit vector (projects onto Haar measure)
    return normalize(state);
}
