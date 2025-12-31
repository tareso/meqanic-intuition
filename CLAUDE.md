# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MEQANIC Intuition is an interactive quantum state visualizer using Bloch spheres and entanglement arcs. It's a vanilla JavaScript application with no build system—just ES6 modules served directly via a static file server.

**Core principle**: Physics accuracy first, visualization second. The state vector |ψ⟩ (2^N complex amplitudes) is the single source of truth. All visualizations derive from this.

## Running the Application

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

No build step, no npm install required. The app loads math.js from CDN.

## Architecture

### State Management

`QuantumState` (src/quantum/QuantumState.js) is the single source of truth:
- Maintains the full state vector as complex amplitudes
- All qubit properties (Bloch vectors, purity) are computed via partial trace operations
- Caches expensive calculations (density matrices)

### Module Structure

**Quantum math** (src/quantum/):
- `quantumMath.js` - Partial trace, Pauli matrices, Bloch vector extraction
- `gates.js` - Gate matrices (X, Y, Z, H, S, T) and continuous rotation
- `entanglement.js` - Wootters concurrence calculation
- `spinExchange.js` - Heisenberg exchange interaction (proximity-based entanglement)
- `decoherence.js` - T1/T2 Kraus operators
- `pauliBasis.js` - Pauli expectation values ⟨ψ|P|ψ⟩ for all Pauli strings

**Visualization** (src/visualization/):
- `BlochSphere.js` - 3D sphere with perspective projection, shows reduced state per qubit
- `EntanglementLines.js` - Oscillating arcs whose intensity maps to concurrence
- `PauliDome.js` - Collapsed Pauli expectation matrix grid (click to expand)
- `GateBeam.js` / `DecoherenceBeam.js` - Beam effects for applying operations

**UI** (src/ui/):
- `ExpandedStateView.js` - Floating inspector window (Pauli expectations, state vector, correlation views)

**Entry point**: `main.js` orchestrates the animation loop, event handling, and coordinates all components.

### Key Patterns

1. **Immutable state updates**: Gate/decoherence operations return new `QuantumState` instances rather than mutating
2. **Position preservation**: When state changes, qubit positions are copied to the new state
3. **Cache invalidation**: `onStateChanged()` in main.js clears visualization caches when quantum state changes
4. **Continuous operations**: Gates/decoherence apply incrementally each frame based on overlap with beams

### Console API

The app exposes `window.meqanic` for debugging:
- `meqanic.getState()` - Get current QuantumState
- `meqanic.createBellState()` - Create (|00⟩ + |11⟩)/√2
- `meqanic.applyH(qubit)` / `applyX` / `applyY` / `applyZ` - Apply gates
- `meqanic.setAntiAligned()` - Set |01⟩ state for testing exchange interaction
- `meqanic.toggleExchange()` - Enable/disable Heisenberg exchange

## Physics Implementation Notes

- **Bloch vector from reduced density matrix**: x = 2·Re(ρ₀₁), y = -2·Im(ρ₀₁), z = ρ₀₀ - ρ₁₁
- **Entanglement via exchange**: When qubits are close (< 150px), Heisenberg Hamiltonian mixes |01⟩ ↔ |10⟩
- **Concurrence**: C = 2|αδ - βγ| for pure two-qubit states; full Wootters formula for mixed states
- **T1 relaxation**: Kraus operators drive state toward |0⟩
- **T2 dephasing**: Off-diagonal elements decay exponentially; tracked separately via `dephasingFactors` array
