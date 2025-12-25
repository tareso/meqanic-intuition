# MEQANIC Intuition - Interactive Quantum State Visualizer

**"What it's like to be a qubit"**

MEQANIC is an interactive web-based quantum computing visualization tool that provides intuitive, physics-accurate representations of quantum states using Bloch spheres and entanglement visualizations. Experience quantum mechanics hands-on by manipulating qubits, applying gates, creating entanglement, and observing decoherence.

![Two Qubit Bell State](docs/two-qubit-bell.png)

## Table of Contents

- [Philosophy](#philosophy)
- [Interface Overview](#interface-overview)
- [Single Qubit Physics](#single-qubit-physics)
  - [The Bloch Sphere](#the-bloch-sphere)
  - [State Vector Representation](#state-vector-representation)
  - [Visualization Elements](#visualization-elements)
- [Multi-Qubit Systems](#multi-qubit-systems)
  - [Tensor Product States](#tensor-product-states)
  - [Reduced Density Matrices](#reduced-density-matrices)
- [Entanglement](#entanglement)
  - [What is Entanglement?](#what-is-entanglement)
  - [How Entanglement is Created](#how-entanglement-is-created)
  - [Measuring Entanglement: Concurrence](#measuring-entanglement-concurrence)
  - [Visualization of Entanglement](#visualization-of-entanglement)
- [Heisenberg Exchange Interaction](#heisenberg-exchange-interaction)
- [Quantum Gates (Operate Beam)](#quantum-gates-operate-beam)
- [Decoherence (Decohere Beam)](#decoherence-decohere-beam)
- [Measurement](#measurement)
- [Pauli Basis Visualization](#pauli-basis-visualization)
- [Getting Started](#getting-started)
- [Controls Reference](#controls-reference)
- [Technical Stack](#technical-stack)
- [Acknowledgments](#acknowledgments)

---

## Philosophy

MEQANIC is built on a core principle: **physics accuracy first, visualization second**. Every visual element directly corresponds to a real quantum mechanical quantity:

1. **Single Source of Truth**: The quantum state vector |ψ⟩ with 2^N complex amplitudes is the authoritative representation. All visualizations are derived from it.

2. **Bloch Sphere as Window**: Each qubit's Bloch sphere shows the *reduced* state of that qubit after tracing out all others. This reveals how entanglement manifests as mixed states.

3. **Purity = Knowledge**: The size of the inner golden sphere represents how much we "know" about that qubit in isolation. Pure states fill the sphere; entangled qubits appear mixed.

4. **Entanglement as Correlation**: The colorful oscillating arcs between qubits represent quantum correlations that cannot be explained classically—the defining feature of entanglement.

5. **Interactive Learning**: Drag qubits to create entanglement, apply gates to rotate states, and observe decoherence—all in real time with immediate visual feedback.

---

## Interface Overview

The MEQANIC interface consists of several key elements:

### Screen Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [X]                    Pauli Basis                        [T2] │
│  Gate                   (Density Matrix)              Decohere  │
│  Selector               Visualization                  Selector │
│   │                                                         │   │
│   │ Yellow                                            Red   │   │
│   │ Beam                                              Beam  │   │
│   │ (when                                            (when  │   │
│   │ active)                                         active) │   │
│   ▼                                                       ▼     │
│                                                                 │
│                     ┌───────────────┐                           │
│                     │   |0⟩         │                           │
│                     │    ↑          │                           │
│                     │   ◉──→       │  ← Bloch Sphere            │
│                     │   |1⟩         │                           │
│                     │    q0         │                           │
│                     └───────────────┘                           │
│                                                                 │
│            "Drag qubits to move them | Bring qubits close..."   │
├─────────────────────────────────────────────────────────────────┤
│  [+] [-]   [Move] [Measure]   [Operate] [Decohere]   [Random]   │
└─────────────────────────────────────────────────────────────────┘
```

### UI Elements

| Element | Location | Description |
|---------|----------|-------------|
| **Gate Selector** | Top-left | Metal box showing current gate (X, Y, Z, S, T). Click to activate beam or cycle gates. |
| **Decoherence Selector** | Top-right | Metal box showing current mode (T2, T1, T1+T2). Click to activate beam or cycle modes. |
| **Pauli Basis Dome** | Top-center | Density matrix visualization. Click to expand for detailed view. |
| **Bloch Spheres** | Center | One per qubit showing quantum state. Drag to move. |
| **Entanglement Lines** | Between qubits | Purple shimmering lines showing quantum correlations. |
| **Control Bar** | Bottom | Buttons for all interactions. |

---

## Single Qubit Physics

### The Bloch Sphere

A single qubit exists in a 2-dimensional complex Hilbert space. Any pure state can be written as:

```
|ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
```

This maps to a point on the **Bloch sphere**:
- **North pole (|0⟩)**: θ = 0
- **South pole (|1⟩)**: θ = π
- **Equator**: Equal superpositions like |+⟩ = (|0⟩ + |1⟩)/√2

![Single Qubit in |0⟩ State](docs/single-qubit-zero.png)
*A qubit in the |0⟩ state. The red arrow points straight up to the north pole. The full-size golden sphere indicates maximum purity (pure state).*

![Single Qubit in |1⟩ State](docs/single-qubit-one.png)
*A qubit in the |1⟩ state. The red arrow points straight down to the south pole.*

![Single Qubit Superposition](docs/single-qubit-superposition.png)
*A qubit in the |+⟩ = (|0⟩ + |1⟩)/√2 superposition. The red arrow points along the +X axis on the equator.*

### State Vector Representation

The quantum state is stored as an array of 2^N complex amplitudes:

```javascript
// For N qubits, the state vector has 2^N entries
|ψ⟩ = α₀|00...0⟩ + α₁|00...1⟩ + ... + α_{2^N-1}|11...1⟩

// Each amplitude αᵢ is a complex number
αᵢ = { re: real_part, im: imaginary_part }

// Normalization constraint: Σ|αᵢ|² = 1
```

### Visualization Elements

| Element | Quantum Meaning |
|---------|-----------------|
| **Wireframe sphere** | The space of all possible single-qubit pure states |
| **Red arrow** | The Bloch vector (x, y, z) extracted from the reduced density matrix |
| **Golden inner sphere** | Purity Tr(ρ²) — size indicates how "pure" the single-qubit state is |
| **|0⟩ / |1⟩ labels** | Computational basis states at the poles |
| **qN label** | Qubit index identifier |

#### Extracting the Bloch Vector

From a 2×2 reduced density matrix ρ:

```
x = 2·Re(ρ₀₁)     // Coherence, real part
y = -2·Im(ρ₀₁)    // Coherence, imaginary part
z = ρ₀₀ - ρ₁₁     // Population difference
```

The Bloch vector magnitude equals 1 for pure states and < 1 for mixed states.

---

## Multi-Qubit Systems

### Tensor Product States

When qubits are independent (not entangled), the total state is a tensor product:

```
|ψ_total⟩ = |ψ_A⟩ ⊗ |ψ_B⟩

Example: |0⟩ ⊗ |0⟩ = |00⟩
```

![Two Qubit Product State](docs/two-qubit-product.png)
*Two qubits in the product state |00⟩. Both arrows point up, both have full purity, and there are no entanglement lines.*

### Reduced Density Matrices

To visualize a single qubit within a multi-qubit system, we compute its **reduced density matrix** by performing a **partial trace** over all other qubits:

```
ρ_A = Tr_B(|ψ⟩⟨ψ|)
```

**Algorithm** (for qubit k in an N-qubit system):

```javascript
function partialTrace(stateVector, qubitIndex, numQubits) {
    const reducedDM = [[0, 0], [0, 0]];  // 2×2 matrix

    for (let i = 0; i < 2^N; i++) {
        for (let j = 0; j < 2^N; j++) {
            // Extract bit at qubitIndex
            const bit_i = (i >> (N - 1 - qubitIndex)) & 1;
            const bit_j = (j >> (N - 1 - qubitIndex)) & 1;

            // Mask for all OTHER qubits
            const mask = ~(1 << (N - 1 - qubitIndex));

            // Only contribute if other qubits match
            if ((i & mask) === (j & mask)) {
                reducedDM[bit_i][bit_j] += ψ[i] * conj(ψ[j]);
            }
        }
    }
    return reducedDM;
}
```

---

## Entanglement

### What is Entanglement?

Entanglement occurs when a multi-qubit state **cannot** be written as a tensor product of individual qubit states. The simplest example is the **Bell state**:

```
|Φ⁺⟩ = (|00⟩ + |11⟩) / √2
```

This state has remarkable properties:
- Neither qubit has a definite value on its own
- Measuring one instantly determines the other
- The correlations exceed any classical explanation

### How Entanglement is Created

In MEQANIC, entanglement is created through **Heisenberg exchange interaction**. When two qubits are brought close together, they interact via:

```
H = (J/4) · σ⃗_A · σ⃗_B
```

where J is the coupling strength (depends on distance) and σ⃗ are the Pauli matrices.

![Heisenberg Exchange](docs/two-qubit-exchange.png)
*Two qubits undergoing Heisenberg exchange. The cyan dashed circles indicate the interaction zone. The state notation shows the superposition forming: |ψ⟩ = α|01⟩ + β|10⟩*

**Key insight**: The exchange interaction mixes the |01⟩ and |10⟩ states (anti-aligned spins), creating entanglement. Aligned spins (|00⟩, |11⟩) are unaffected.

### Measuring Entanglement: Concurrence

MEQANIC uses **concurrence** to quantify entanglement between qubit pairs. For a two-qubit pure state:

```
C = 2|αδ - βγ|

where |ψ⟩ = α|00⟩ + β|01⟩ + γ|10⟩ + δ|11⟩
```

- C = 0: No entanglement (product state)
- C = 1: Maximum entanglement (Bell state)

For the Bell state (|00⟩ + |11⟩)/√2:
- α = 1/√2, β = 0, γ = 0, δ = 1/√2
- C = 2|(1/√2)(1/√2) - 0| = 1 ✓

For mixed states (when qubits are part of a larger system), we use the **linear entropy method**:

```
C ≈ √(2(1 - Tr(ρ_A²)))
```

where ρ_A is the single-qubit reduced density matrix.

### Visualization of Entanglement

Entanglement is visualized as **oscillating colorful arcs** between qubit pairs:

![Bell State Entanglement](docs/two-qubit-bell.png)
*The Bell state |Φ⁺⟩ = (|00⟩ + |11⟩)/√2. Notice:*
- *Colorful oscillating arcs connecting the qubits*
- *Small inner spheres (purity ≈ 0.5, maximally mixed)*
- *No visible Bloch vectors (mixed state has zero-length Bloch vector)*

| Visual Property | Quantum Meaning |
|-----------------|-----------------|
| Arc presence | Concurrence > threshold (qubits are entangled) |
| Arc intensity/opacity | Proportional to concurrence |
| Number of wavy lines | More lines = stronger entanglement |
| Wave amplitude | Higher entropy = more chaotic oscillations |
| Colors (pink/purple/blue) | Aesthetic inspired by [Quantum Intuition XR](https://arxiv.org/abs/2504.08984) |

---

## Heisenberg Exchange Interaction

The Heisenberg exchange is the fundamental interaction that creates entanglement between nearby spins:

### Physics

```
H_exchange = (J/4) · (σ_x⊗σ_x + σ_y⊗σ_y + σ_z⊗σ_z)
```

The time evolution operator for two spins is:

```
U(t) = exp(-iHt)
```

This creates the following transformation:
- |00⟩ → |00⟩ (unchanged)
- |11⟩ → |11⟩ (unchanged)
- |01⟩ → cos(Jt/2)|01⟩ - i·sin(Jt/2)|10⟩
- |10⟩ → cos(Jt/2)|10⟩ - i·sin(Jt/2)|01⟩

### Distance Dependence

The coupling strength J decreases with distance:

```javascript
J(distance) = (J_max/2) · (1 + tanh((threshold/2 - distance) / 30))
```

This creates a smooth transition from strong coupling when close to no coupling when far apart.

### Creating Entanglement

1. Start with anti-aligned qubits: |01⟩
2. Bring them close together
3. Exchange mixes |01⟩ ↔ |10⟩, creating superposition
4. Separate them—entanglement persists!

![After Exchange](docs/two-qubit-after-exchange.png)
*After Heisenberg exchange, the qubits remain entangled even when separated. The entanglement lines persist, showing the quantum correlation.*

---

## Quantum Gates (Operate Beam)

The **Operate Beam** allows you to apply single-qubit quantum gates continuously to qubits.

### How It Works

1. Click the **Operate** button or click on the gate selector (top-left metal box) to activate the yellow beam
2. The beam descends from the gate selector with shimmering yellow lines
3. Drag a qubit into the beam to apply the selected gate continuously
4. Click the gate selector to cycle through available gates (when beam is active)

### Available Gates

| Gate | Axis | Description | Matrix |
|------|------|-------------|--------|
| **X** | X-axis | Pauli-X (bit flip) | Rotates around X-axis |
| **Y** | Y-axis | Pauli-Y | Rotates around Y-axis |
| **Z** | Z-axis | Pauli-Z (phase flip) | Rotates around Z-axis |
| **S** | Z-axis | S gate (√Z) | π/2 rotation around Z |
| **T** | Z-axis | T gate (√S) | π/4 rotation around Z |

### Gate Application

Gates are applied continuously while a qubit overlaps with the beam:
- Rotation speed: π radians per second
- Partial overlap results in proportionally slower rotation
- The gate selector shows which gate is currently selected
- Active beam shows yellow glow at the bottom of the selector

### Visual Indicators

- **Inactive**: Gate label (X, Y, Z, S, T) in dark gray
- **Active**: Gate label in yellow, glowing bottom edge, yellow beam with descending lines

---

## Decoherence (Decohere Beam)

The **Decohere Beam** simulates quantum decoherence—the process by which quantum systems lose their quantum properties due to interaction with the environment.

### How It Works

1. Click the **Decohere** button or click on the decoherence selector (top-right metal box) to activate the red beam
2. The beam descends from the selector with shimmering red lines
3. Drag a qubit into the beam to apply decoherence
4. Click the selector to cycle through decoherence modes (when beam is active)

### Decoherence Modes

| Mode | Description | Effect on Bloch Vector |
|------|-------------|------------------------|
| **T2** | Dephasing (pure dephasing) | x, y components decay exponentially; z unchanged |
| **T1** | Relaxation (amplitude damping) | State decays toward \|0⟩ ground state |
| **T1+T2** | Combined | Both dephasing and relaxation occur |

### Physics of Decoherence

#### T2 Dephasing (Transverse Relaxation)

T2 dephasing causes loss of phase coherence without energy loss:

```
ρ(t) = [ ρ₀₀        ρ₀₁·e^(-t/T2) ]
       [ ρ₁₀·e^(-t/T2)    ρ₁₁     ]
```

- **Physical interpretation**: The qubit's phase becomes randomized
- **Bloch sphere effect**: x and y shrink while z stays constant
- **Purity decreases**: The inner golden sphere shrinks

#### T1 Relaxation (Longitudinal Relaxation)

T1 relaxation causes the qubit to decay toward the ground state |0⟩:

```
Kraus operators:
K₀ = |0⟩⟨0| + √(1-γ)|1⟩⟨1|   (no decay)
K₁ = √γ |0⟩⟨1|                (decay occurred)
```

where γ = 1 - e^(-t/T1)

- **Physical interpretation**: Energy dissipation to the environment
- **Bloch sphere effect**: State vector drifts toward north pole (|0⟩)
- **In real systems**: T2 ≤ 2·T1 (dephasing is always at least as fast as relaxation)

### Effects on Entanglement

Decoherence has important effects on entangled qubits:

- **T2 on entangled qubits**: For highly entangled qubits (already near maximally mixed), the effect is subtle since x,y components are already small
- **T1 breaks entanglement**: Amplitude damping is a non-unitary operation that destroys quantum correlations
- **Purity changes**: After decoherence, individual qubits may become *more* pure as entanglement is destroyed

### Implementation Notes

MEQANIC uses simplified models suitable for educational visualization:

**T2 Implementation:**
- Uses per-qubit "dephasing factors" that multiply x,y Bloch components
- Factors decay as e^(-t/T2) providing correct exponential decay
- This approach correctly preserves z while decaying x,y

**T1 Implementation:**
- Applies amplitude damping Kraus operators to the state vector
- **Limitation**: The implementation applies Kraus operators coherently as (K₀ + K₁)|ψ⟩ rather than as a true classical mixture ρ' = K₀ρK₀† + K₁ρK₁†
- This creates small spurious x-coherences in the Bloch vector
- **Qualitative behavior is correct**: decay toward |0⟩, entanglement breaking, purity changes
- For a fully accurate simulation, a density matrix formalism would be required

**For Educational Purposes:**
The visualizations correctly demonstrate:
- T2 causes phase randomization (x,y decay)
- T1 causes energy relaxation (drift to |0⟩)
- Decoherence destroys entanglement
- Mixed states have shorter Bloch vectors

### Visual Indicators

- **Inactive**: Mode label (T2, T1, T1+T2) in dark gray
- **Active**: Mode label in red, glowing bottom edge, red beam with descending lines

---

## Measurement

Measurement in quantum mechanics is probabilistic and causes **state collapse**.

### Process

1. **Calculate probabilities**: P(0) = Σ|α_i|² for all states with measured qubit = 0
2. **Random outcome**: Choose 0 or 1 based on probabilities
3. **Collapse**: Zero out amplitudes inconsistent with outcome
4. **Renormalize**: Scale remaining amplitudes so Σ|α_i|² = 1

### How to Measure

1. Click the **Measure** button to enter measurement mode
2. Click on any qubit to measure it
3. The qubit collapses to either |0⟩ or |1⟩

### Effect on Entanglement

**Measurement destroys entanglement** with the measured qubit:

| Before Measurement | After Measurement |
|--------------------|-------------------|
| Bell state: (|00⟩+|11⟩)/√2 | Either |00⟩ or |11⟩ |
| Purity: 0.5 (mixed) | Purity: 1.0 (pure) |
| Entangled | Not entangled |

This is correct quantum behavior—the correlations that defined the entanglement are "used up" in determining the measurement outcome.

### Effect on Dephasing

Measurement also resets the T2 dephasing factor for the measured qubit back to 1.0, since the qubit is now in a definite computational basis state.

---

## Pauli Basis Visualization

The **Pauli Basis Dome** at the top of the screen provides a visualization of the full density matrix in the Pauli operator basis.

### What It Shows

For an N-qubit system, the density matrix can be expanded in the Pauli basis:

```
ρ = (1/2^N) Σᵢ cᵢ Pᵢ
```

where Pᵢ are tensor products of Pauli matrices {I, X, Y, Z}.

### Visualization

- **Grid cells**: Each cell represents a Pauli basis coefficient
- **Color**: Red = positive, Blue = negative
- **Intensity**: Magnitude of the coefficient
- **Size**: 2×2 for 1 qubit, 4×4 for 2 qubits, 8×8 for 3 qubits, etc.

### Expanded View

Click on the Pauli Basis dome to open an expanded view with:
- Larger visualization
- Tooltips showing exact values
- Detailed coefficient information

---

## Getting Started

### Running Locally

1. Clone the repository
2. Start a local server:
   ```bash
   python3 -m http.server 8080
   ```
3. Open http://localhost:8080 in your browser

### Quick Tutorial

1. **Explore a single qubit**: The app starts with one qubit in a random state. Observe the Bloch sphere and how the red arrow indicates the state.

2. **Apply a gate**: Click **Operate** to activate the gate beam, then drag the qubit into the yellow beam. Watch it rotate around the X-axis. Click the gate selector (metal box) to change to Y, Z, S, or T gates.

3. **Add more qubits**: Click **+** to add qubits (up to 6). Each gets its own Bloch sphere.

4. **Create entanglement**: Drag two qubits close together. The Heisenberg exchange interaction will entangle them—watch the purple lines appear!

5. **Observe decoherence**: Click **Decohere** to activate the red beam. Drag an entangled qubit into it. Watch the Bloch sphere shrink as coherence is lost.

6. **Measure**: Click **Measure**, then click a qubit. The state collapses and entanglement with that qubit is destroyed.

7. **Randomize**: Click **Random** to generate a new random quantum state.

---

## Controls Reference

### Bottom Control Bar

| Button | Icon | Action |
|--------|------|--------|
| **+** | + | Add a qubit (max 6) |
| **-** | − | Remove a qubit (min 1) |
| **Move** | ✋ | Enter move mode—drag qubits to reposition |
| **Measure** | 👁 | Enter measure mode—click qubit to collapse |
| **Operate** | 🕹️ | Toggle the gate beam on/off |
| **Decohere** | 💀 | Toggle the decoherence beam on/off |
| **Random** | 🎲 | Generate a random quantum state |

### Metal Box Selectors

| Selector | Location | Behavior |
|----------|----------|----------|
| **Gate Selector** | Top-left | Click when beam OFF → turns beam ON. Click when beam ON → cycles gate (X→Y→Z→S→T→X...) |
| **Decoherence Selector** | Top-right | Click when beam OFF → turns beam ON. Click when beam ON → cycles mode (T2→T1→T1+T2→T2...) |

### Mouse/Touch Interactions

| Action | Effect |
|--------|--------|
| Drag qubit | Move qubit position (in Move mode) |
| Click qubit | Measure qubit (in Measure mode) |
| Drag qubit into beam | Apply gate or decoherence continuously |
| Bring qubits close | Creates entanglement via Heisenberg exchange |
| Click Pauli dome | Open expanded density matrix view |

---

## Technical Stack

- **Vanilla JavaScript** with ES6 modules
- **HTML5 Canvas** for rendering
- **math.js** for complex number operations
- No build system required—runs directly in browser

### File Structure

```
meqanic/
├── index.html                 # Main HTML structure
├── styles.css                 # UI styling
├── README.md                  # This documentation
└── src/
    ├── main.js               # Entry point, animation loop, event handling
    ├── quantum/
    │   ├── QuantumState.js   # State vector (single source of truth)
    │   ├── quantumMath.js    # Partial trace, Pauli matrices, Bloch vectors
    │   ├── gates.js          # Gate matrices and application
    │   ├── measurement.js    # Measurement and collapse
    │   ├── entanglement.js   # Concurrence calculation
    │   ├── spinExchange.js   # Heisenberg exchange interaction
    │   └── decoherence.js    # T1/T2 decoherence channels
    ├── visualization/
    │   ├── BlochSphere.js    # Single Bloch sphere renderer
    │   ├── QubitRenderer.js  # Multi-sphere manager
    │   ├── EntanglementLines.js  # Purple entanglement arcs
    │   ├── PauliDome.js      # Density matrix visualization
    │   ├── GateBeam.js       # Yellow gate beam effect
    │   └── DecoherenceBeam.js # Red decoherence beam effect
    ├── ui/
    │   └── ExpandedStateView.js  # Expanded Pauli basis view
    └── utils/
        └── geometry.js       # Layout calculations
```

---

## Acknowledgments

The entanglement visualization style in MEQANIC—featuring colorful oscillating arcs that become more chaotic with higher entanglement entropy—is directly inspired by the **Quantum Intuition XR** project:

> **Quantum Intuition XR: Embodied Learning of Quantum Entanglement and Measurement with an XR Serious Game**
>
> Samantha Norris, Charles Tahan, et al.
>
> arXiv:2504.08984 (2025)
>
> https://arxiv.org/abs/2504.08984

The paper presents an immersive XR experience for teaching quantum mechanics concepts. Figure 5 in the paper shows the entanglement visualization that inspired MEQANIC's oscillating arc design, where:
- Multiple wavy lines connect entangled qubits
- Line intensity and chaos increase with entanglement entropy S₂(ρ)
- The visual language makes the abstract concept of entanglement tangible

---

## References

- **Quantum Intuition XR** - Norris, Tahan, et al. [arXiv:2504.08984](https://arxiv.org/abs/2504.08984) (2025) - Primary inspiration for entanglement visualization
- Nielsen & Chuang, *Quantum Computation and Quantum Information* - Theoretical foundations
- Wootters, W. K. "Entanglement of Formation of an Arbitrary State of Two Qubits" - Concurrence formula

---

## License

MIT License - See LICENSE file for details.
