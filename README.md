# MEQANIC Intuition

**"What it's like to be a qubit"**

An interactive quantum state visualizer using Bloch spheres and entanglement arcs. Manipulate qubits, apply gates, create entanglement, and observe decoherence—all with physics-accurate math under the hood.

**[Live Demo](https://tareso.github.io/meqanic-intuition/)**

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
3. Use the gate beam (top-left) to apply X, Y, Z, H, S, T rotations
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
| **Gate selector** | Click to activate/cycle gates (X→Y→Z→H→S→T) |
| **Decoherence selector** | Click to activate/cycle modes (T2→T1→T1+T2) |
| **Pauli dome** | Click to open floating state inspector |

## Physics

### Bloch Sphere

A single qubit lives in a 2D complex Hilbert space. Any pure state maps to the Bloch sphere surface:

```
|ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
```

- **North pole**: |0⟩ (θ=0)
- **South pole**: |1⟩ (θ=π)
- **Equator**: Equal superpositions like |+⟩ = (|0⟩ + |1⟩)/√2

The Bloch vector (x, y, z) is extracted from the 2×2 reduced density matrix ρ:

```
x = 2·Re(ρ₀₁)      // Coherence (real part)
y = −2·Im(ρ₀₁)     // Coherence (imaginary part)
z = ρ₀₀ − ρ₁₁      // Population difference
```

**Visualization elements:**

| Element | Meaning |
|---------|---------|
| Wireframe sphere | Space of all possible single-qubit pure states |
| Red arrow | Bloch vector direction and magnitude |
| Golden inner sphere | Purity Tr(ρ²) — full size for pure states, shrinks for mixed |
| \|0⟩ / \|1⟩ labels | Computational basis states at poles |

For multi-qubit systems, each Bloch sphere shows the **reduced density matrix** obtained by tracing out all other qubits:

```
ρ_A = Tr_B(|ψ⟩⟨ψ|)
```

### Entanglement

Entanglement occurs when a multi-qubit state cannot be written as a tensor product of individual states. The simplest example is the Bell state:

```
|Φ⁺⟩ = (|00⟩ + |11⟩) / √2
```

#### Creating Entanglement: Heisenberg Exchange

When qubits are brought close together (< 150px), they interact via the Heisenberg exchange Hamiltonian:

```
H = (J/4) · σ⃗_A · σ⃗_B = (J/4)(σ_x⊗σ_x + σ_y⊗σ_y + σ_z⊗σ_z)
```

The coupling strength J depends on distance via a smooth tanh function:

```
J(d) = (J_max/2) · (1 + tanh((threshold/2 − d) / 30))
```

Time evolution under this Hamiltonian transforms basis states:
- |00⟩ → |00⟩ (unchanged)
- |11⟩ → |11⟩ (unchanged)
- |01⟩ → cos(Jt/2)|01⟩ − i·sin(Jt/2)|10⟩
- |10⟩ → cos(Jt/2)|10⟩ − i·sin(Jt/2)|01⟩

**Key insight**: The exchange mixes anti-aligned spins (|01⟩ ↔ |10⟩), creating entanglement. Aligned spins are eigenstates and remain unchanged.

#### Measuring Entanglement: Concurrence

Entanglement is quantified using **Wootters concurrence**. For a two-qubit pure state |ψ⟩ = α|00⟩ + β|01⟩ + γ|10⟩ + δ|11⟩:

```
C = 2|αδ − βγ|
```

- C = 0: Product state (no entanglement)
- C = 1: Maximally entangled (Bell state)

For the Bell state: α = δ = 1/√2, β = γ = 0, so C = 2|(1/√2)(1/√2) − 0| = 1 ✓

For mixed states (qubits embedded in larger systems), MEQANIC uses the full Wootters formula with eigenvalue decomposition of ρ·(σ_y⊗σ_y)·ρ*·(σ_y⊗σ_y).

#### Entanglement Visualization

Entanglement appears as **oscillating colorful arcs** connecting qubit pairs:

| Visual Property | Quantum Meaning |
|-----------------|-----------------|
| Arc presence | Concurrence > threshold |
| Arc opacity/intensity | Proportional to concurrence |
| Number of wavy lines | 3-12, increasing with concurrence |
| Wave amplitude | Higher with more entropy (more mixed individual qubits) |
| Oscillation chaos | Increases with entanglement entropy |
| Colors (pink→purple→blue) | Aesthetic inspired by Quantum Intuition XR |

When qubits are maximally entangled:
- Individual Bloch vectors shrink to zero (maximally mixed reduced states)
- Golden purity spheres shrink to minimum size
- Entanglement arcs reach maximum intensity

### Quantum Gates (Operate Beam)

The yellow **Operate Beam** applies single-qubit gates continuously while a qubit overlaps.

**How it works:**
1. Click **Operate** or the gate selector to activate the beam
2. Drag a qubit into the yellow beam
3. The gate rotates the qubit continuously at π rad/s
4. Partial overlap → proportionally slower rotation
5. Click the selector to cycle gates: X→Y→Z→H→S→T

**Available gates:**

| Gate | Matrix | Rotation |
|------|--------|----------|
| **X** | Pauli-X | π around X-axis (bit flip) |
| **Y** | Pauli-Y | π around Y-axis |
| **Z** | Pauli-Z | π around Z-axis (phase flip) |
| **H** | Hadamard | π around (X+Z)/√2 axis |
| **S** | √Z | π/2 around Z-axis |
| **T** | √S | π/4 around Z-axis |

Gates are applied to the full N-qubit state via tensor product:

```
U_full = I ⊗ ... ⊗ U_gate ⊗ ... ⊗ I
```

For continuous rotation, infinitesimal rotations are applied each frame:

```
R_axis(θ) = cos(θ/2)·I − i·sin(θ/2)·σ_axis
```

### Decoherence (Decohere Beam)

The red **Decohere Beam** simulates environmental noise that destroys quantum coherence.

**Modes:**

#### T2 Dephasing (Pure Dephasing)

Loss of phase coherence without energy loss. The off-diagonal elements of the density matrix decay:

```
ρ(t) = [ ρ₀₀          ρ₀₁·e^(−t/T2) ]
       [ ρ₁₀·e^(−t/T2)     ρ₁₁      ]
```

- **Effect**: x,y Bloch components decay exponentially; z unchanged
- **Physical meaning**: Phase becomes randomized by environment
- **On Bloch sphere**: Vector shrinks toward z-axis

#### T1 Relaxation (Amplitude Damping)

Energy dissipation causing decay toward ground state |0⟩. Implemented via Kraus operators:

```
K₀ = |0⟩⟨0| + √(1−γ)|1⟩⟨1|    (no decay)
K₁ = √γ |0⟩⟨1|                 (decay occurred)

where γ = 1 − e^(−t/T1)
```

- **Effect**: State drifts toward north pole (|0⟩)
- **Physical meaning**: Excited state loses energy to environment
- **Constraint**: In real systems, T2 ≤ 2·T1

#### T1+T2 Combined

Both processes occur simultaneously—dephasing plus relaxation.

**Effect on entanglement**: Decoherence destroys quantum correlations. After sufficient decoherence:
- Entanglement arcs fade and disappear
- Individual qubits may become *more* pure as entanglement breaks
- System approaches classical mixture

### Measurement

Measurement is probabilistic and causes **state collapse**.

**Process:**
1. Calculate probability: P(0) = Σ|αᵢ|² for all basis states where measured qubit = 0
2. Random outcome weighted by probability
3. Collapse: Zero out amplitudes inconsistent with outcome
4. Renormalize: Scale remaining amplitudes so Σ|αᵢ|² = 1

**Effect on entanglement**: Measurement destroys entanglement with the measured qubit. For a Bell state:

| Before | After measuring qubit 0 |
|--------|-------------------------|
| (|00⟩+|11⟩)/√2 | |00⟩ or |11⟩ (random) |
| Purity: 0.5 each | Purity: 1.0 each |
| C = 1 | C = 0 |

The T2 dephasing factor resets to 1.0 for the measured qubit.

### State Inspector (Floating Window)

Click the **Pauli Dome** at top-center to open a draggable floating window with three visualization modes:

#### Pauli Matrix View

Displays the density matrix expanded in the Pauli basis:

```
ρ = (1/2^N) Σᵢ cᵢ Pᵢ
```

- **Grid size**: 2×2 (1 qubit), 4×4 (2 qubits), 8×8 (3 qubits), etc.
- **Colors**: Red = positive, Blue = negative, intensity = magnitude
- **Hover**: Shows exact coefficient values

#### State Vector View

Shows all 2^N basis state amplitudes sorted by probability:

- **Bars**: Length = relative magnitude, color = phase
- **Scrollable**: Mouse wheel or drag scrollbar for large systems (e.g., 64 states for 6 qubits)
- **Details**: Probability percentage and complex amplitude for each basis state

#### Correlation Matrix View

Displays pairwise quantum correlations between all qubits:

```
Correlation(i,j) = ⟨ZᵢZⱼ⟩ - ⟨Zᵢ⟩⟨Zⱼ⟩
```

- **Off-diagonal cells**: ZZ correlations
  - **Red** = Positively correlated (qubits tend to same state)
  - **Blue** = Anti-correlated (qubits tend to opposite states)
  - **White** = Uncorrelated
- **Diagonal cells (gold)**: Single-qubit purity

This reveals entanglement structure: Bell states show strong correlations (±1), while product states show zero correlation.

**Window features:**
- Drag title bar to reposition
- Semi-transparent background lets you see qubits underneath
- Manipulate qubits while window is open to see real-time updates

## Technical Stack

- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas
- math.js for complex number and matrix operations
- No build system required

```
src/
├── main.js                 # Animation loop, events, state management
├── quantum/
│   ├── QuantumState.js     # State vector (source of truth)
│   ├── quantumMath.js      # Partial trace, Pauli matrices, Bloch vectors
│   ├── gates.js            # Gate matrices and continuous application
│   ├── entanglement.js     # Wootters concurrence calculation
│   ├── spinExchange.js     # Heisenberg exchange interaction
│   ├── decoherence.js      # T1/T2 Kraus operators
│   └── pauliBasis.js       # Pauli basis expansion
├── visualization/
│   ├── BlochSphere.js      # 3D Bloch sphere with perspective
│   ├── EntanglementLines.js # Oscillating entanglement arcs
│   ├── PauliDome.js        # Density matrix grid visualization
│   ├── GateBeam.js         # Yellow beam with shimmer effect
│   └── DecoherenceBeam.js  # Red beam with shimmer effect
└── ui/
    └── ExpandedStateView.js # Floating state inspector window
```

## Inspiration

The entanglement visualization—colorful oscillating arcs whose intensity and chaos scale with entanglement entropy—is inspired by:

> **Quantum Intuition XR: Tangible Quantum Mechanics using Interactive XR Experience**
> Jamie Ngoc Dinh, Marven Wong, Matthew Brooks, Charles Tahan, Myungin Lee
> [arXiv:2504.08984](https://arxiv.org/abs/2504.08984) (2025)

The broader vision of making quantum mechanics tangible draws from:

> **A Quantum Wish**
> Charles Tahan, National Quantum Coordination Office, OSTP
> [quantum.gov](https://www.quantum.gov/a-quantum-wish/) (February 2022)

MEQANIC Intuition is part of the MEQANIC project: [meqanic.com](https://meqanic.com)

## License

MIT

---

For more information, connect with me on [LinkedIn](https://www.linkedin.com/in/tahan/).
