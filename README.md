# MEQANIC Intuition

**"What it's like to be a qubit"**

An interactive quantum state visualizer using Bloch spheres and entanglement arcs. Manipulate qubits, apply gates, create entanglement, and observe decoherence—all with physics-accurate math under the hood.

![Two Qubit Bell State](docs/two-qubit-bell.png)

## Philosophy

**Physics accuracy first, visualization second.**

- The state vector |ψ⟩ (2^N complex amplitudes) is the single source of truth
- Each Bloch sphere shows the *reduced* state after tracing out other qubits
- The golden inner sphere represents purity—entangled qubits appear mixed
- Oscillating arcs visualize quantum correlations (concurrence)

## Quick Start

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

1. Drag qubits to move them
2. Bring qubits close together to create entanglement via Heisenberg exchange
3. Use the gate beam (top-left) to apply X, Y, Z, S, T rotations
4. Use the decoherence beam (top-right) for T1/T2 effects
5. Click Measure, then click a qubit to collapse its state

## Interface

```
┌─────────────────────────────────────────────────────────────┐
│  [Gate]              Pauli Dome               [Decoherence] │
│    │                                                   │    │
│    ▼ yellow beam                           red beam ▼       │
│                                                             │
│                    ◉ Bloch Spheres ◉                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│   [+] [-]    [Move] [Measure]    [Operate] [Decohere]  [Random] │
└─────────────────────────────────────────────────────────────┘
```

| Control | Action |
|---------|--------|
| **+/−** | Add/remove qubits (1-6) |
| **Move** | Drag qubits to reposition |
| **Measure** | Click qubit to collapse |
| **Operate** | Toggle gate beam |
| **Decohere** | Toggle decoherence beam |
| **Random** | Generate random state |
| **Gate selector** | Click to activate/cycle gates |
| **Decoherence selector** | Click to activate/cycle modes |
| **Pauli dome** | Click for expanded view |

## Physics

### Bloch Sphere

Pure states map to the sphere surface via |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩. The Bloch vector (x, y, z) is extracted from the reduced density matrix:

```
x = 2·Re(ρ₀₁),  y = −2·Im(ρ₀₁),  z = ρ₀₀ − ρ₁₁
```

### Entanglement

Created via Heisenberg exchange when qubits are close:

```
H = (J/4) · σ⃗_A · σ⃗_B
```

This mixes |01⟩ ↔ |10⟩ states. Aligned spins (|00⟩, |11⟩) are unaffected.

Quantified using **concurrence**: C = 2|αδ − βγ| for |ψ⟩ = α|00⟩ + β|01⟩ + γ|10⟩ + δ|11⟩. C=0 means product state; C=1 means maximally entangled (Bell state).

### Gates

Applied continuously while a qubit overlaps the beam (π rad/s):

| Gate | Effect |
|------|--------|
| X, Y, Z | Pauli rotations |
| S | π/2 around Z |
| T | π/4 around Z |

### Decoherence

| Mode | Effect |
|------|--------|
| **T2** | Dephasing—x,y decay, z preserved |
| **T1** | Relaxation—state drifts toward \|0⟩ |
| **T1+T2** | Combined |

### Measurement

Probabilistic collapse: P(0) = Σ|αᵢ|² for states with measured qubit = 0. Destroys entanglement with the measured qubit.

## Technical Stack

- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas
- math.js for complex operations
- No build system required

```
src/
├── main.js                 # Animation loop, events
├── quantum/
│   ├── QuantumState.js     # State vector (source of truth)
│   ├── quantumMath.js      # Partial trace, Pauli matrices
│   ├── gates.js            # Gate application
│   ├── entanglement.js     # Concurrence calculation
│   ├── spinExchange.js     # Heisenberg exchange
│   └── decoherence.js      # T1/T2 channels
└── visualization/
    ├── BlochSphere.js      # Bloch sphere renderer
    ├── EntanglementLines.js # Oscillating arcs
    ├── PauliDome.js        # Density matrix grid
    ├── GateBeam.js         # Yellow beam effect
    └── DecoherenceBeam.js  # Red beam effect
```

## Inspiration

The entanglement visualization—colorful oscillating arcs that become more chaotic with higher entropy—is inspired by:

> **Quantum Intuition XR: Tangible Quantum Mechanics using Interactive XR Experience**
> Jamie Ngoc Dinh, Marven Wong, Matthew Brooks, Charles Tahan, Myungin Lee
> [arXiv:2504.08984](https://arxiv.org/abs/2504.08984) (2025)

The broader vision of making quantum mechanics tangible draws from:

> **A Quantum Wish**
> Charles Tahan, National Quantum Coordination Office, OSTP
> [quantum.gov](https://www.quantum.gov/a-quantum-wish/) (February 2022)

## License

MIT
