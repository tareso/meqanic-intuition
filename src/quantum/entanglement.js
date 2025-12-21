/**
 * entanglement.js
 * Calculates entanglement between qubit pairs using Wootters concurrence
 *
 * For pure 2-qubit states: C = 2|αδ - βγ|
 * For mixed states (from tracing out other qubits): Uses full Wootters formula
 *   C = max(0, λ1 - λ2 - λ3 - λ4) where λi are sqrt of eigenvalues of R = ρ ρ̃
 */

import {
    complex,
    addComplex,
    subtractComplex,
    multiplyComplex,
    conjugate,
    magnitude
} from './quantumMath.js';

// Access math.js from global scope for eigenvalue computation
const math = window.math;

/**
 * Calculate the two-qubit reduced density matrix by tracing out all other qubits
 * @param {Array} stateVector - Full state vector (array of complex numbers)
 * @param {number} qubitA - First qubit index
 * @param {number} qubitB - Second qubit index
 * @param {number} numQubits - Total number of qubits
 * @returns {Array<Array>} 4x4 reduced density matrix for the two-qubit subsystem
 */
function getTwoQubitReducedDensityMatrix(stateVector, qubitA, qubitB, numQubits) {
    const dim = stateVector.length;

    // Initialize 4x4 reduced density matrix
    const rho = [];
    for (let i = 0; i < 4; i++) {
        rho[i] = [];
        for (let j = 0; j < 4; j++) {
            rho[i][j] = complex(0, 0);
        }
    }

    // For each pair of basis states in the full system
    for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
            // Extract bits for qubits A and B
            const bitA_i = (i >> (numQubits - 1 - qubitA)) & 1;
            const bitB_i = (i >> (numQubits - 1 - qubitB)) & 1;
            const bitA_j = (j >> (numQubits - 1 - qubitA)) & 1;
            const bitB_j = (j >> (numQubits - 1 - qubitB)) & 1;

            // Create mask for all OTHER qubits (not A or B)
            let mask = 0;
            for (let k = 0; k < numQubits; k++) {
                if (k !== qubitA && k !== qubitB) {
                    mask |= (1 << (numQubits - 1 - k));
                }
            }

            // Only contribute if all other qubits match (partial trace condition)
            if ((i & mask) === (j & mask)) {
                // Map to 2-qubit basis: |00⟩=0, |01⟩=1, |10⟩=2, |11⟩=3
                const idx_i = bitA_i * 2 + bitB_i;
                const idx_j = bitA_j * 2 + bitB_j;

                // Add contribution: ψ[i] * conj(ψ[j])
                const contribution = multiplyComplex(
                    stateVector[i],
                    conjugate(stateVector[j])
                );

                rho[idx_i][idx_j] = addComplex(rho[idx_i][idx_j], contribution);
            }
        }
    }

    return rho;
}

/**
 * Calculate single-qubit reduced density matrix from two-qubit density matrix
 * Traces out qubit B to get ρ_A
 * @param {Array<Array>} rhoAB - 4x4 two-qubit density matrix
 * @returns {Array<Array>} 2x2 single-qubit density matrix
 */
function getSingleQubitReducedDensityMatrix(rhoAB) {
    // Trace out qubit B
    // ρ_A[i][j] = Σ_k ρ_AB[i*2+k][j*2+k]
    const rhoA = [
        [complex(0, 0), complex(0, 0)],
        [complex(0, 0), complex(0, 0)]
    ];

    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            for (let k = 0; k < 2; k++) {
                rhoA[i][j] = addComplex(rhoA[i][j], rhoAB[i * 2 + k][j * 2 + k]);
            }
        }
    }

    return rhoA;
}

/**
 * Calculate the purity Tr(ρ²) of a 2x2 density matrix
 * @param {Array<Array>} rho - 2x2 density matrix
 * @returns {number} Purity value [0.5, 1]
 */
function calculatePurity2x2(rho) {
    // Tr(ρ²) = Σ_i,j |ρ[i][j]|²
    let purity = 0;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const mag = magnitude(rho[i][j]);
            purity += mag * mag;
        }
    }
    return purity;
}

/**
 * σy ⊗ σy matrix used in Wootters concurrence formula
 * = [[0,0,0,-1], [0,0,1,0], [0,1,0,0], [-1,0,0,0]]
 */
const SIGMA_Y_TENSOR_SIGMA_Y = [
    [0, 0, 0, -1],
    [0, 0, 1, 0],
    [0, 1, 0, 0],
    [-1, 0, 0, 0]
];

/**
 * Multiply two 4x4 complex matrices
 * @param {Array<Array>} A - First matrix
 * @param {Array<Array>} B - Second matrix
 * @returns {Array<Array>} Product A × B
 */
function matMul4x4(A, B) {
    const result = [];
    for (let i = 0; i < 4; i++) {
        result[i] = [];
        for (let j = 0; j < 4; j++) {
            result[i][j] = complex(0, 0);
            for (let k = 0; k < 4; k++) {
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
 * Compute the spin-flipped density matrix: ρ̃ = (σy⊗σy) ρ* (σy⊗σy)
 * @param {Array<Array>} rho - 4x4 density matrix
 * @returns {Array<Array>} Spin-flipped density matrix
 */
function computeSpinFlippedRho(rho) {
    const sysy = SIGMA_Y_TENSOR_SIGMA_Y;

    // First compute (σy⊗σy) × ρ*
    const temp = [];
    for (let i = 0; i < 4; i++) {
        temp[i] = [];
        for (let j = 0; j < 4; j++) {
            temp[i][j] = complex(0, 0);
            for (let k = 0; k < 4; k++) {
                // sysy is real, so just multiply by scalar
                // ρ* is complex conjugate of ρ
                const rhoStarKJ = conjugate(rho[k][j]);
                temp[i][j] = addComplex(
                    temp[i][j],
                    multiplyComplex(complex(sysy[i][k], 0), rhoStarKJ)
                );
            }
        }
    }

    // Then multiply by (σy⊗σy) on the right
    const rhoTilde = [];
    for (let i = 0; i < 4; i++) {
        rhoTilde[i] = [];
        for (let j = 0; j < 4; j++) {
            rhoTilde[i][j] = complex(0, 0);
            for (let k = 0; k < 4; k++) {
                rhoTilde[i][j] = addComplex(
                    rhoTilde[i][j],
                    multiplyComplex(temp[i][k], complex(sysy[k][j], 0))
                );
            }
        }
    }

    return rhoTilde;
}

/**
 * Convert our complex matrix format to math.js matrix format
 * @param {Array<Array>} mat - Our format with {re, im} objects
 * @returns {math.Matrix} math.js complex matrix
 */
function toMathJsMatrix(mat) {
    const rows = [];
    for (let i = 0; i < mat.length; i++) {
        const row = [];
        for (let j = 0; j < mat[i].length; j++) {
            row.push(math.complex(mat[i][j].re, mat[i][j].im));
        }
        rows.push(row);
    }
    return math.matrix(rows);
}

/**
 * Calculate Wootters concurrence for a 4x4 two-qubit density matrix
 * C = max(0, √λ1 - √λ2 - √λ3 - √λ4) where λi are eigenvalues of R = ρ ρ̃
 * sorted in decreasing order
 *
 * @param {Array<Array>} rhoAB - 4x4 two-qubit density matrix
 * @returns {number} Concurrence value [0, 1]
 */
function calculateWoottersConcurrence(rhoAB) {
    // Compute spin-flipped density matrix ρ̃
    const rhoTilde = computeSpinFlippedRho(rhoAB);

    // Compute R = ρ × ρ̃
    const R = matMul4x4(rhoAB, rhoTilde);

    // Convert to math.js format for eigenvalue computation
    const RMatrix = toMathJsMatrix(R);

    try {
        // Compute eigenvalues of R
        const result = math.eigs(RMatrix);
        const eigenvalues = result.values.toArray();

        // Extract real parts (eigenvalues of R should be real and non-negative)
        // Take square root to get λi
        const sqrtEigenvalues = eigenvalues.map(ev => {
            // Handle complex eigenvalues (should be real but numerical noise)
            const realPart = typeof ev === 'object' ? ev.re : ev;
            return Math.sqrt(Math.max(0, realPart));
        });

        // Sort in decreasing order
        sqrtEigenvalues.sort((a, b) => b - a);

        // Wootters formula: C = max(0, λ1 - λ2 - λ3 - λ4)
        const concurrence = sqrtEigenvalues[0] - sqrtEigenvalues[1] -
                           sqrtEigenvalues[2] - sqrtEigenvalues[3];

        return Math.max(0, Math.min(1, concurrence));
    } catch (e) {
        console.warn('Eigenvalue computation failed, falling back to zero:', e);
        return 0;
    }
}

/**
 * Calculate concurrence directly from state vector for 2-qubit pure state
 * C = 2|αδ - βγ| where |ψ⟩ = α|00⟩ + β|01⟩ + γ|10⟩ + δ|11⟩
 *
 * @param {Array} amplitudes - State vector [α, β, γ, δ] for 2 qubits
 * @returns {number} Concurrence value [0, 1]
 */
function calculateConcurrencePure2Qubit(amplitudes) {
    if (amplitudes.length !== 4) {
        return 0;
    }

    const alpha = amplitudes[0]; // |00⟩
    const beta = amplitudes[1];  // |01⟩
    const gamma = amplitudes[2]; // |10⟩
    const delta = amplitudes[3]; // |11⟩

    // C = 2|αδ - βγ|
    const prod1 = multiplyComplex(alpha, delta);
    const prod2 = multiplyComplex(beta, gamma);
    const diff = subtractComplex(prod1, prod2);

    return Math.min(1, 2 * magnitude(diff));
}

/**
 * Calculate concurrence between two qubits in a quantum state
 * Uses different methods depending on system size for accuracy
 *
 * @param {QuantumState} state - Quantum state object
 * @param {number} qubitA - First qubit index
 * @param {number} qubitB - Second qubit index
 * @returns {number} Concurrence value [0, 1]
 */
export function calculateConcurrence(state, qubitA, qubitB) {
    if (state.numQubits < 2) {
        return 0;
    }

    if (qubitA === qubitB) {
        return 0;
    }

    // Ensure qubitA < qubitB for consistency
    if (qubitA > qubitB) {
        [qubitA, qubitB] = [qubitB, qubitA];
    }

    // Special case: exactly 2 qubits - use exact formula
    if (state.numQubits === 2) {
        return calculateConcurrencePure2Qubit(state.amplitudes);
    }

    // For 3+ qubits: get two-qubit reduced density matrix and use Wootters formula
    const rhoAB = getTwoQubitReducedDensityMatrix(
        state.amplitudes,
        qubitA,
        qubitB,
        state.numQubits
    );

    return calculateWoottersConcurrence(rhoAB);
}

/**
 * Calculate entanglement matrix for all qubit pairs
 * @param {QuantumState} state - Quantum state object
 * @returns {Array<Array<number>>} NxN matrix of concurrence values
 */
export function calculateEntanglementMatrix(state) {
    const n = state.numQubits;
    const matrix = [];

    for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = 0;
            } else if (j < i) {
                // Symmetric matrix
                matrix[i][j] = matrix[j][i];
            } else {
                matrix[i][j] = calculateConcurrence(state, i, j);
            }
        }
    }

    return matrix;
}

/**
 * Get list of entangled pairs with their concurrence values
 * @param {QuantumState} state - Quantum state object
 * @param {number} threshold - Minimum concurrence to include (default 0.01)
 * @returns {Array<{qubitA: number, qubitB: number, concurrence: number}>}
 */
export function getEntangledPairs(state, threshold = 0.01) {
    const pairs = [];
    const n = state.numQubits;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const concurrence = calculateConcurrence(state, i, j);
            if (concurrence > threshold) {
                pairs.push({
                    qubitA: i,
                    qubitB: j,
                    concurrence
                });
            }
        }
    }

    return pairs;
}
