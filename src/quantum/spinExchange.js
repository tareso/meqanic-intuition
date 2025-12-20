/**
 * spinExchange.js
 * Implements Heisenberg exchange interaction between qubits
 * Based on the spin chain Hamiltonian: H = (J/4) * σ⃗_i · σ⃗_{i+1}
 *
 * Reference: Quantum Intuition XR paper (arXiv:2504.08984), Section 3.4.1
 */

import { complex, multiplyComplex, addComplex, conjugate } from './quantumMath.js';
import { QuantumState } from './QuantumState.js';

/**
 * Calculate the exchange coupling strength J based on distance
 * Uses smooth tanh function for natural transition
 *
 * @param {number} distance - Distance between qubits in pixels
 * @param {number} threshold - Cutoff distance for interaction (default 150px)
 * @param {number} Jmax - Maximum coupling strength (default 4.0)
 * @returns {number} Coupling strength J
 */
export function calculateCouplingStrength(distance, threshold = 150, Jmax = 4.0) {
    // J(Δr) = Jmax/2 * (1 + tanh((threshold/2) - distance))
    // This gives smooth transition: ~Jmax when close, ~0 when far
    const x = (threshold / 2) - distance;
    return (Jmax / 2) * (1 + Math.tanh(x / 30)); // Divide by 30 for smoother transition
}

/**
 * Apply Heisenberg exchange interaction between two qubits
 * The exchange gate for two spins is:
 * U(t) = exp(-i * H * t) where H = (J/2) * [[0,0,0,0],[0,-1,1,0],[0,1,-1,0],[0,0,0,0]]
 *
 * This creates entanglement when applied to anti-aligned spins (|01⟩ or |10⟩)
 *
 * @param {QuantumState} state - Current quantum state
 * @param {number} qubitA - First qubit index
 * @param {number} qubitB - Second qubit index
 * @param {number} J - Coupling strength
 * @param {number} dt - Time step in seconds
 * @returns {QuantumState} New quantum state after exchange
 */
export function applyHeisenbergExchange(state, qubitA, qubitB, J, dt) {
    if (J < 0.001) return state; // No interaction if coupling is negligible

    const numQubits = state.numQubits;
    const dim = state.dimension;

    // Ensure qubitA < qubitB for consistent indexing
    if (qubitA > qubitB) {
        [qubitA, qubitB] = [qubitB, qubitA];
    }

    // Calculate the evolution parameter
    // From the paper: U has terms like e^(iJt/2) * cos(Jt/2) and -ie^(iJt/2) * sin(Jt/2)
    const Jt = J * dt;
    const halfJt = Jt / 2;

    // Precompute trig values
    const cosHalfJt = Math.cos(halfJt);
    const sinHalfJt = Math.sin(halfJt);

    // e^(iJt/2) = cos(Jt/2) + i*sin(Jt/2)
    const expPhase = complex(Math.cos(halfJt), Math.sin(halfJt));

    // Create new amplitudes array
    const newAmplitudes = new Array(dim);
    for (let i = 0; i < dim; i++) {
        newAmplitudes[i] = complex(0, 0);
    }

    // Apply the exchange gate to all basis states
    // The gate only mixes states that differ in qubits A and B
    // |...0_A...0_B...⟩ → |...0_A...0_B...⟩ (unchanged)
    // |...1_A...1_B...⟩ → |...1_A...1_B...⟩ (unchanged)
    // |...0_A...1_B...⟩ → e^(iJt/2)[cos(Jt/2)|01⟩ - i*sin(Jt/2)|10⟩]
    // |...1_A...0_B...⟩ → e^(iJt/2)[cos(Jt/2)|10⟩ - i*sin(Jt/2)|01⟩]

    for (let i = 0; i < dim; i++) {
        // Extract bits for qubits A and B
        const bitA = (i >> (numQubits - 1 - qubitA)) & 1;
        const bitB = (i >> (numQubits - 1 - qubitB)) & 1;

        if (bitA === bitB) {
            // Aligned spins: no change (|00⟩ or |11⟩ subspace)
            newAmplitudes[i] = addComplex(newAmplitudes[i], state.amplitudes[i]);
        } else {
            // Anti-aligned spins: apply exchange mixing
            // Find the partner state (with A and B swapped)
            const maskA = 1 << (numQubits - 1 - qubitA);
            const maskB = 1 << (numQubits - 1 - qubitB);
            const partner = i ^ maskA ^ maskB; // XOR to flip both bits

            // Current state amplitude
            const ampCurrent = state.amplitudes[i];
            const ampPartner = state.amplitudes[partner];

            // Apply rotation in the |01⟩, |10⟩ subspace
            // New amplitude = e^(iJt/2) * [cos(Jt/2) * current - i*sin(Jt/2) * partner]

            // cos(Jt/2) * current
            const term1 = complex(
                cosHalfJt * ampCurrent.re,
                cosHalfJt * ampCurrent.im
            );

            // -i * sin(Jt/2) * partner = sin(Jt/2) * (partner.im, -partner.re)
            const term2 = complex(
                sinHalfJt * ampPartner.im,
                -sinHalfJt * ampPartner.re
            );

            // Sum and multiply by e^(iJt/2)
            const sum = addComplex(term1, term2);
            const result = multiplyComplex(expPhase, sum);

            newAmplitudes[i] = addComplex(newAmplitudes[i], result);
        }
    }

    // Create new state with updated amplitudes
    const newState = new QuantumState(numQubits, newAmplitudes);

    // Preserve qubit positions
    for (let i = 0; i < numQubits; i++) {
        const pos = state.getQubitPosition(i);
        newState.setQubitPosition(i, pos.x, pos.y);
    }

    return newState;
}

/**
 * Find all qubit pairs within interaction distance
 * @param {QuantumState} state - Current quantum state
 * @param {number} threshold - Distance threshold for interaction
 * @returns {Array<{qubitA: number, qubitB: number, distance: number, J: number}>}
 */
export function findInteractingPairs(state, threshold = 150) {
    const pairs = [];
    const numQubits = state.numQubits;

    for (let i = 0; i < numQubits; i++) {
        for (let j = i + 1; j < numQubits; j++) {
            const posA = state.getQubitPosition(i);
            const posB = state.getQubitPosition(j);

            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < threshold) {
                const J = calculateCouplingStrength(distance, threshold);
                if (J > 0.01) {
                    pairs.push({
                        qubitA: i,
                        qubitB: j,
                        distance,
                        J
                    });
                }
            }
        }
    }

    return pairs;
}

/**
 * Apply exchange interaction to all interacting pairs
 * @param {QuantumState} state - Current quantum state
 * @param {number} dt - Time step in seconds
 * @param {number} threshold - Distance threshold for interaction
 * @returns {{state: QuantumState, interactingPairs: Array}} Updated state and list of interacting pairs
 */
export function applyAllExchangeInteractions(state, dt, threshold = 150) {
    const interactingPairs = findInteractingPairs(state, threshold);

    let currentState = state;

    for (const pair of interactingPairs) {
        currentState = applyHeisenbergExchange(
            currentState,
            pair.qubitA,
            pair.qubitB,
            pair.J,
            dt
        );
    }

    return {
        state: currentState,
        interactingPairs
    };
}
