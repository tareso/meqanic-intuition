/**
 * gates.js
 * Quantum gate definitions and application to quantum states
 */

import { complex, IDENTITY_2, tensorProduct, multiplyComplex, addComplex } from './quantumMath.js';
import { QuantumState } from './QuantumState.js';

// Gate matrices (2x2 complex matrices)
export const GATES = {
    // Pauli-X gate (NOT gate)
    // X = [[0, 1], [1, 0]]
    X: [
        [complex(0, 0), complex(1, 0)],
        [complex(1, 0), complex(0, 0)]
    ],

    // Pauli-Y gate
    // Y = [[0, -i], [i, 0]]
    Y: [
        [complex(0, 0), complex(0, -1)],
        [complex(0, 1), complex(0, 0)]
    ],

    // Pauli-Z gate (phase flip)
    // Z = [[1, 0], [0, -1]]
    Z: [
        [complex(1, 0), complex(0, 0)],
        [complex(0, 0), complex(-1, 0)]
    ],

    // Hadamard gate (creates superposition)
    // H = (1/√2) [[1, 1], [1, -1]]
    H: [
        [complex(1 / Math.sqrt(2), 0), complex(1 / Math.sqrt(2), 0)],
        [complex(1 / Math.sqrt(2), 0), complex(-1 / Math.sqrt(2), 0)]
    ],

    // T gate (π/8 phase gate)
    // T = [[1, 0], [0, exp(iπ/4)]]
    T: [
        [complex(1, 0), complex(0, 0)],
        [complex(0, 0), complex(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))]
    ],

    // Identity gate (no operation)
    I: IDENTITY_2
};

/**
 * Create a rotation gate for continuous application
 * R(θ, axis) for small angle θ around specified axis
 * @param {string} axis - 'X', 'Y', or 'Z'
 * @param {number} angle - Rotation angle in radians
 * @returns {Array<Array>} 2x2 rotation matrix
 */
export function createRotationGate(axis, angle) {
    const halfAngle = angle / 2;
    const c = Math.cos(halfAngle);
    const s = Math.sin(halfAngle);

    switch (axis) {
        case 'X':
            // Rx(θ) = [[cos(θ/2), -i*sin(θ/2)], [-i*sin(θ/2), cos(θ/2)]]
            return [
                [complex(c, 0), complex(0, -s)],
                [complex(0, -s), complex(c, 0)]
            ];

        case 'Y':
            // Ry(θ) = [[cos(θ/2), -sin(θ/2)], [sin(θ/2), cos(θ/2)]]
            return [
                [complex(c, 0), complex(-s, 0)],
                [complex(s, 0), complex(c, 0)]
            ];

        case 'Z':
            // Rz(θ) = [[exp(-iθ/2), 0], [0, exp(iθ/2)]]
            return [
                [complex(Math.cos(-halfAngle), Math.sin(-halfAngle)), complex(0, 0)],
                [complex(0, 0), complex(Math.cos(halfAngle), Math.sin(halfAngle))]
            ];

        default:
            throw new Error(`Unknown rotation axis: ${axis}`);
    }
}

/**
 * Create a Hadamard rotation gate (rotation around (X+Z)/√2 axis)
 * For continuous application
 * @param {number} t - Time parameter (0 to 1, where 1 gives full H gate)
 * @returns {Array<Array>} 2x2 matrix
 */
export function createHadamardRotation(t) {
    // Interpolate between Identity and Hadamard
    // H(t) = (1-t)I + t*H
    const h = 1 / Math.sqrt(2);

    return [
        [complex(1 - t + t * h, 0), complex(t * h, 0)],
        [complex(t * h, 0), complex(1 - t - t * h, 0)]
    ];
}

/**
 * Apply a single-qubit gate to a quantum state
 * @param {QuantumState} state - Input quantum state
 * @param {number} qubitIndex - Index of qubit to apply gate to (0-indexed)
 * @param {Array<Array>} gateMatrix - 2x2 gate matrix
 * @returns {QuantumState} New quantum state after gate application
 */
export function applySingleQubitGate(state, qubitIndex, gateMatrix) {
    if (qubitIndex < 0 || qubitIndex >= state.numQubits) {
        throw new Error(`Invalid qubit index: ${qubitIndex}`);
    }

    const numQubits = state.numQubits;
    const dim = state.dimension;
    const newAmplitudes = new Array(dim);

    // Initialize new amplitudes to zero
    for (let i = 0; i < dim; i++) {
        newAmplitudes[i] = complex(0, 0);
    }

    // Apply gate using tensor product structure
    // The gate acts on qubit at qubitIndex, identity on all others
    for (let i = 0; i < dim; i++) {
        // Extract the bit at position qubitIndex
        const bitMask = 1 << (numQubits - 1 - qubitIndex);
        const bitValue = (i & bitMask) !== 0 ? 1 : 0;

        // For each possible output bit value (0 or 1)
        for (let outBit = 0; outBit < 2; outBit++) {
            // Create output index by setting the bit at qubitIndex to outBit
            let j;
            if (outBit === 0) {
                j = i & ~bitMask;  // Clear bit
            } else {
                j = i | bitMask;   // Set bit
            }

            // Add contribution: gateMatrix[outBit][bitValue] * oldAmplitude[i]
            const contribution = multiplyComplex(
                gateMatrix[outBit][bitValue],
                state.amplitudes[i]
            );

            newAmplitudes[j] = addComplex(newAmplitudes[j], contribution);
        }
    }

    return new QuantumState(numQubits, newAmplitudes);
}

/**
 * Apply a gate with continuous rotation
 * Used for gate zones where qubits experience continuous rotation
 * @param {QuantumState} state - Input state
 * @param {number} qubitIndex - Qubit to rotate
 * @param {string} gateType - 'X', 'Y', 'Z', 'H', or 'T'
 * @param {number} dt - Time step in seconds
 * @param {number} rotationSpeed - Rotation speed in radians per second (default π/2)
 * @returns {QuantumState} New state after small rotation
 */
export function applyContinuousGate(state, qubitIndex, gateType, dt, rotationSpeed = Math.PI / 2) {
    const angle = rotationSpeed * dt;

    let gateMatrix;

    if (gateType === 'H') {
        // For Hadamard, use special continuous rotation
        const t = Math.min(angle / Math.PI, 1.0);  // Normalize to [0, 1]
        gateMatrix = createHadamardRotation(t);
    } else if (gateType === 'T') {
        // T gate is a Z rotation by π/4
        const tAngle = Math.min(angle, Math.PI / 4);
        gateMatrix = createRotationGate('Z', tAngle);
    } else {
        // X, Y, Z gates use rotation around respective axes
        gateMatrix = createRotationGate(gateType, angle);
    }

    return applySingleQubitGate(state, qubitIndex, gateMatrix);
}

/**
 * Build the full gate matrix for multi-qubit system
 * Gate acts on specified qubit, identity on others
 * @param {number} numQubits - Total number of qubits
 * @param {number} targetQubit - Qubit to apply gate to
 * @param {Array<Array>} gate - 2x2 gate matrix
 * @returns {Array<Array>} Full 2^N × 2^N matrix
 */
export function buildFullGateMatrix(numQubits, targetQubit, gate) {
    let result = null;

    for (let i = 0; i < numQubits; i++) {
        const matrix = (i === targetQubit) ? gate : IDENTITY_2;

        if (result === null) {
            result = matrix;
        } else {
            result = tensorProduct(result, matrix);
        }
    }

    return result;
}

/**
 * Get gate name and color for visualization
 * @param {string} gateType - Gate type ('X', 'Y', 'Z', 'H', 'T')
 * @returns {{name: string, color: string, axis: string}} Gate info
 */
export function getGateInfo(gateType) {
    const info = {
        'X': { name: 'X', color: '#e74c3c', axis: 'X' },      // Red
        'Y': { name: 'Y', color: '#2ecc71', axis: 'Y' },      // Green
        'Z': { name: 'Z', color: '#3498db', axis: 'Z' },      // Blue
        'H': { name: 'H', color: '#f39c12', axis: 'XZ' },     // Orange/yellow
        'T': { name: 'T', color: '#9b59b6', axis: 'Z' }       // Purple
    };

    return info[gateType] || { name: '?', color: '#95a5a6', axis: '?' };
}
