/**
 * decoherence.js
 * Implements T1 (relaxation) and T2 (dephasing) decoherence channels
 *
 * Uses stochastic simulation to apply decoherence to pure state vectors.
 * This approach randomly applies operations that, on average, produce
 * the correct decoherence behavior.
 */

import { QuantumState } from './QuantumState.js';
import { complex } from './quantumMath.js';

/**
 * Apply T2 dephasing to a specific qubit
 * T2 dephasing causes loss of phase coherence (x, y components decay)
 * while preserving populations (z component)
 *
 * This uses the density matrix approach via dephasing factors tracked
 * in QuantumState. The coherences decay as exp(-t/T2).
 *
 * @param {QuantumState} state - Input quantum state (modified in place)
 * @param {number} qubitIndex - Index of qubit to dephase
 * @param {number} dt - Time step
 * @param {number} rate - Dephasing rate (1/T2)
 * @returns {QuantumState} The same state (with updated dephasing factor)
 */
export function applyT2Dephasing(state, qubitIndex, dt, rate = 2.0) {
    // Exponential decay factor for coherences: exp(-t/T2) = exp(-rate * dt)
    const decayFactor = Math.exp(-rate * dt);

    // Apply dephasing via the density matrix approach
    // This properly decays x and y Bloch components while keeping z constant
    state.applyT2Dephasing(qubitIndex, decayFactor);

    return state;
}

/**
 * Apply T1 relaxation (amplitude damping) to a specific qubit
 * T1 relaxation causes decay toward the |0⟩ ground state
 *
 * Implementation: Probabilistically apply amplitude damping
 *
 * @param {QuantumState} state - Input quantum state
 * @param {number} qubitIndex - Index of qubit to relax
 * @param {number} dt - Time step
 * @param {number} rate - Relaxation rate (1/T1)
 * @returns {QuantumState} New state after relaxation
 */
export function applyT1Relaxation(state, qubitIndex, dt, rate = 1.5) {
    const numQubits = state.numQubits;
    const dim = state.dimension;
    const newAmplitudes = new Array(dim);

    // Decay probability for this timestep
    // γ = 1 - exp(-dt/T1) ≈ dt/T1 for small dt
    const gamma = 1 - Math.exp(-rate * dt);
    const sqrtGamma = Math.sqrt(gamma);
    const sqrt1MinusGamma = Math.sqrt(1 - gamma);

    // Initialize to zero
    for (let i = 0; i < dim; i++) {
        newAmplitudes[i] = complex(0, 0);
    }

    const bitMask = 1 << (numQubits - 1 - qubitIndex);

    // Apply amplitude damping Kraus operators:
    // K0 = |0⟩⟨0| + √(1-γ)|1⟩⟨1|  (no decay happened)
    // K1 = √γ |0⟩⟨1|              (decay happened)

    // We stochastically choose which Kraus operator to apply
    // based on the probability of decay

    for (let i = 0; i < dim; i++) {
        const bit = (i & bitMask) !== 0 ? 1 : 0;
        const amp = state.amplitudes[i];

        if (bit === 0) {
            // |0⟩ state - unaffected by K0, receives amplitude from K1
            // K0 contribution: amplitude stays
            newAmplitudes[i] = complex(
                newAmplitudes[i].re + amp.re,
                newAmplitudes[i].im + amp.im
            );
        } else {
            // |1⟩ state - damped by K0, transfers to |0⟩ via K1
            // K0 contribution: √(1-γ) * amplitude stays in |1⟩
            newAmplitudes[i] = complex(
                newAmplitudes[i].re + sqrt1MinusGamma * amp.re,
                newAmplitudes[i].im + sqrt1MinusGamma * amp.im
            );

            // K1 contribution: √γ * amplitude transfers to corresponding |0⟩ state
            const j = i & ~bitMask; // Clear the bit to get |0⟩ state
            newAmplitudes[j] = complex(
                newAmplitudes[j].re + sqrtGamma * amp.re,
                newAmplitudes[j].im + sqrtGamma * amp.im
            );
        }
    }

    // Normalize (amplitude damping should preserve norm, but numerical errors may accumulate)
    let norm = 0;
    for (let i = 0; i < dim; i++) {
        norm += newAmplitudes[i].re * newAmplitudes[i].re +
                newAmplitudes[i].im * newAmplitudes[i].im;
    }
    norm = Math.sqrt(norm);

    if (norm > 1e-10) {
        for (let i = 0; i < dim; i++) {
            newAmplitudes[i] = complex(
                newAmplitudes[i].re / norm,
                newAmplitudes[i].im / norm
            );
        }
    }

    return new QuantumState(numQubits, newAmplitudes);
}

/**
 * Apply combined T1 and T2 decoherence
 *
 * @param {QuantumState} state - Input quantum state
 * @param {number} qubitIndex - Index of qubit
 * @param {number} dt - Time step
 * @param {number} t1Rate - T1 relaxation rate
 * @param {number} t2Rate - T2 dephasing rate
 * @returns {QuantumState} New state after decoherence
 */
export function applyT1T2Decoherence(state, qubitIndex, dt, t1Rate = 1.5, t2Rate = 2.0) {
    // Apply both T1 and T2
    // Note: In real systems, T2 ≤ 2*T1 (T2 includes T1 effects)
    // Here we apply them independently for educational purposes
    let newState = applyT1Relaxation(state, qubitIndex, dt, t1Rate);
    newState = applyT2Dephasing(newState, qubitIndex, dt, t2Rate);
    return newState;
}

/**
 * Apply decoherence based on mode
 *
 * @param {QuantumState} state - Input quantum state
 * @param {number} qubitIndex - Index of qubit
 * @param {string} mode - 'T1', 'T2', or 'T1+T2'
 * @param {number} dt - Time step
 * @param {number} strength - Overall decoherence strength multiplier
 * @returns {QuantumState} New state after decoherence
 */
export function applyDecoherence(state, qubitIndex, mode, dt, strength = 1.0) {
    const t1Rate = 1.5 * strength;
    const t2Rate = 2.0 * strength;

    switch (mode) {
        case 'T1':
            return applyT1Relaxation(state, qubitIndex, dt, t1Rate);
        case 'T2':
            return applyT2Dephasing(state, qubitIndex, dt, t2Rate);
        case 'T1+T2':
            return applyT1T2Decoherence(state, qubitIndex, dt, t1Rate, t2Rate);
        default:
            return state;
    }
}
