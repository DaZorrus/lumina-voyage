# Lumina Voyage - Technical Documentation

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Scene Structure](#scene-structure)
3. [Core Systems](#core-systems)
4. [Entity Components](#entity-components)
5. [Lighting System](#lighting-system)
6. [Audio System](#audio-system)
7. [How to Add New Features](#how-to-add-new-features)
8. [File Structure](#file-structure)

---

## 🏗️ Architecture Overview

### Main Components
```
Engine (Core)
├── SceneManager (Level management)
├── InputManager (Keyboard/Mouse)
├── PhysicsSystem (CANNON.js)
├── CameraSystem (Three.js Camera)
├── AudioSystem (Tone.js)
└── Post-Processing (Bloom effects)
```

### Technology Stack
- **3D Rendering**: Three.js (WebGL)
- **Physics**: CANNON-es (3D physics engine)
- **Audio**: Tone.js (Web Audio API)
- **Post-Processing**: Three.js EffectComposer
  - UnrealBloomPass (glow effects)
  - RenderPass (main rendering)

---

## 🎬 Scene Structure

### Chapter 0: The Void (Tutorial)
**Purpose**: Tutorial level - collect 5 energy orbs

**Scene Objects**:
1. **Player** (Lumina Orb)
   - Geometry: IcosahedronGeometry (low poly)
   - Material: MeshStandardMaterial with emissive glow
   - Light: PointLight (dynamic intensity)
   - Components: ParticleTrail, PulseWave system

2. **Energy Orbs** (5 instances)
   - Position: Breadcrumb trail at Z: -15, -35, -60, -85, -115
   - Purpose: Collectibles that unlock music layers
   - Components: Rotation animation, collection detection

3. **Portal** (spawns after collecting all orbs)
   - Main ring: TorusGeometry (radius 12)
   - Inner glow: CircleGeometry
   - Outer rings: 2 additional TorusGeometry
   - Spiral particles: 24 OctahedronGeometry
   - Lights: 2 PointLights (cyan + gold)

4. **Portal Beam** (transition effect)
   - Animated beam particles from player to portal
   - Uses custom particle system

5. **Starfield Background**
   - 3000 star particles
   - BufferGeometry with Points material
   - Radius: 250-500 units

**Lighting Setup**:
```javascript
// Ambient light (low intensity)
AmbientLight: { color: 0x404040, intensity: 0.2 }

// Directional light (dim)
DirectionalLight: { 
  color: 0x8888ff, 
  intensity: 0.3,
  position: (5, 10, 5)
}

// Player light (dynamic)
PointLight: {
  color: 0xffaa00,
  intensity: 0.2 → 3.5 (grows with orbs),
  distance: 4 → 20
}
```

**Fog Settings**:
```javascript
scene.fog = new THREE.Fog(0x000000, 100, 600);
scene.background = new THREE.Color(0x0a0e27);
```

---

### Chapter 1: The Ascent (Speed Challenge)
**Purpose**: High-speed obstacle dodge, reach 100% speed

**Scene Objects**:
1. **Player** (same as Chapter 0)
   - Enhanced physics with grid movement
   - Speed: 0-100 (Light Speed threshold)

2. **Grid Indicators**
   - 3x3 grid visualization
   - RingGeometry for each lane position
   - Shows movement targets

3. **Obstacles** (procedurally spawned):
   - **Photons**: Speed boost collectibles (cyan glow)
   - **Meteors**: Damage obstacles (orange/red)
   - **Black Holes**: Gravity wells with danger zones
   - **Shadow Comets**: Fast horizontal projectiles

4. **Speed Lines** (visual effect)
   - 200 line segments
   - Opacity/intensity scales with speed
   - Creates motion blur effect

5. **Final Portal** (spawns at 100% speed)
   - Same structure as Chapter 0 portal
   - Triggers end sequence

**Lighting Setup**:
```javascript
// Ambient (slightly brighter than Chapter 0)
AmbientLight: { color: 0x404050, intensity: 0.3 }

// Directional (moderate)
DirectionalLight: {
  color: 0x8899ff,
  intensity: 0.4,
  position: (10, 15, 10)
}

// Entity-specific lights:
// - Photons: PointLight (cyan, intensity 2)
// - Meteors: PointLight (orange, intensity 1.5)
// - Black Holes: PointLight (purple, intensity 3-8)
// - Player: PointLight (orange, intensity 0.5-3.5)
```

**Fog Settings**:
```javascript
scene.fog = new THREE.Fog(0x000814, 50, 300);
scene.background = new THREE.Color(0x000814);
```

---

## ⚙️ Core Systems

### 1. Engine (`src/core/Engine.js`)
**Responsibilities**:
- Initialize renderer and Three.js scene
- Manage game loop (60 FPS target)
- Handle window resize
- Coordinate all subsystems

**Key Methods**:
```javascript
init()                    // Setup renderer, camera, systems
start()                   // Begin game loop
stop()                    // Stop game loop
animate()                 // Main update loop
loadLevel(LevelClass)     // Load a chapter
transitionToLevel()       // Transition between chapters
```

**Update Loop Flow**:
```
1. Get deltaTime from clock
2. Update input manager
3. Update current level
4. Update physics system
5. Update camera system
6. Render via composer
```

---

### 2. SceneManager (`src/core/SceneManager.js`)
**Responsibilities**:
- Load/unload levels
- Handle scene transitions
- Update post-processing passes

**Key Methods**:
```javascript
loadLevel(LevelClass)           // Instantiate and load level
unloadCurrentLevel()            // Cleanup current level
transitionToLevel()             // Animated transition
updateComposer()                // Update render passes
```

---

### 3. PhysicsSystem (`src/systems/PhysicsSystem.js`)
**Responsibilities**:
- CANNON.js world management
- Collision detection
- Trigger zones

**Configuration**:
```javascript
gravity: (0, 0, 0)        // Zero gravity (space)
iterations: 3             // Solver iterations
bodies: Map<id, body>     // All physics bodies
```

**Key Methods**:
```javascript
addBody(entity, options)  // Add physics body
removeBody(id)            // Remove body
step(deltaTime)           // Update physics
```

---

### 4. CameraSystem (`src/systems/CameraSystem.js`)
**Responsibilities**:
- Camera positioning and movement
- Follow player with smooth lerp
- FOV adjustments based on speed/orbs

**Camera Settings**:
```javascript
// Initial
FOV: 75
Near: 0.1
Far: 2000
Position: (0, 5, 10)

// Follow parameters
followDistance: 10
followHeight: 5
lerpSpeed: 0.05 (smooth follow)
```

**Key Methods**:
```javascript
follow(player)            // Set follow target
update(deltaTime)         // Update position
setOrbsCollected(count)   // Adjust FOV (62° → 75°)
reset()                   // Reset to default
```

---

### 5. AudioSystem (`src/systems/AudioSystem.js`)
**Responsibilities**:
- Tone.js audio management
- Progressive music layers
- Sound effects

**Music Structure**:
```javascript
// Ambient (always playing in levels)
ambientPad: PolySynth with reverb

// Progressive layers (unlocked by collecting orbs)
Layer 1 (Orb 1): Bass (Synth, 200Hz lowpass)
Layer 2 (Orb 2): Pad (PolySynth, sustained chords)
Layer 3 (Orb 3): Melody (MonoSynth, lead notes)
Layer 4 (Orb 4): Harmony (PolySynth, chord support)
Layer 5 (Orb 5): Rhythm (NoiseSynth, percussive)
```

**Key Methods**:
```javascript
init()                    // Initialize Tone.js
startAmbient()            // Start ambient pad
addMusicLayer(orbCount)   // Add progressive layer
stopAllMusicLayers()      // Stop all layers
playSpecificNote()        // Play sound effect
```

---

## 🎮 Entity Components

### Base Entity Structure
All entities follow this pattern:
```javascript
class Entity {
  constructor(scene, physicsSystem, position)
  
  // Core properties
  id: string              // Unique identifier
  scene: THREE.Scene      // Three.js scene
  mesh: THREE.Group       // Visual representation
  body: CANNON.Body       // Physics body
  destroyed: boolean      // Cleanup flag
  
  // Methods
  update(deltaTime)       // Frame update
  destroy()               // Cleanup
}
```

---

### Player (`src/entities/Player.js`)
**Components**:
- **Mesh**: IcosahedronGeometry (low poly sphere)
- **Light**: PointLight (0.2 → 3.5 intensity)
- **ParticleTrail**: Custom trailing particles
- **PulseWave**: Sonar detection system

**Properties**:
```javascript
currentLumen: 20-100      // Health/energy
maxLumen: 100
speed: 8                  // Movement speed
pulseRadius: 17           // Detection radius
pulseCooldown: 2.0s       // Pulse cooldown
orbsCollected: 0-5        // Progress tracking
```

**Progression System**:
Each orb collected increases:
- Speed: +2 per orb
- Light intensity: +1.5 per orb
- Light distance: +3 units per orb
- Scale: +0.1 per orb
- Pulse radius: +2 per orb

---

### EnergyOrb (`src/entities/EnergyOrb.js`)
**Components**:
- **Mesh**: IcosahedronGeometry (0.8 radius)
- **Light**: PointLight (gold, intensity 2)
- **Outer ring**: TorusGeometry

**States**:
```javascript
hidden → revealed → collected

// Reveal mechanics
revealTimer: 5s           // Stay visible duration
distance trigger: 20 units // Auto-reveal distance
```

---

### Portal (`src/entities/Portal.js`)
**Components** (4 main parts):
1. **Main Ring**: TorusGeometry (radius 12, tube 0.6)
2. **Inner Glow**: CircleGeometry (radius 11)
3. **Outer Ring**: TorusGeometry (radius 14, tube 0.25)
4. **Third Ring**: TorusGeometry (radius 16, tube 0.15)

**Lights**:
```javascript
mainLight: PointLight(cyan, intensity 25, distance 150)
accentLight: PointLight(gold, intensity 10, distance 80)
```

**Animation**:
- Main ring rotates +0.3 rad/s
- Outer ring rotates -0.5 rad/s
- Pulsing light intensity (sin wave)
- 24 spiral particles orbiting

---

### Chapter 1 Entities

#### Photon (`src/entities/Photon.js`)
**Purpose**: Speed boost collectible
```javascript
// Visual
Geometry: SphereGeometry (0.4 radius)
Material: Emissive cyan (0x00ffff)
Light: PointLight (cyan, intensity 2)

// Gameplay
speedBoost: 5             // Speed increase
collected: boolean        // State flag
```

#### Meteor (`src/entities/Meteor.js`)
**Purpose**: Damage obstacle
```javascript
// Visual
Geometry: IcosahedronGeometry (size 1.0-2.5)
Material: Emissive orange (0xff5500)
Light: PointLight (orange, intensity 1.5)

// Gameplay
damage: 5                 // Lumen damage
speedPenalty: 15          // Speed reduction
velocity: 5-15 units/s    // Movement speed
```

#### BlackHole (`src/entities/BlackHole.js`)
**Purpose**: Gravity well hazard
```javascript
// Visual (3 rings)
Inner: Sphere (purple core, radius 2)
Danger: Ring (red, radius 8)
Slingshot: Ring (green, radius 16)

// Lights
coreLight: PointLight (purple, 3-8 intensity pulsing)

// Physics zones
dangerZone: 8 units       // Pull + damage
slingshotZone: 16 units   // Speed boost when exiting
gravityForce: 70 units/s  // Pull strength
```

#### ShadowComet (`src/entities/ShadowComet.js`)
**Purpose**: Fast projectile
```javascript
// Visual
Geometry: ConeGeometry (0.8 radius, 3 height)
Material: Dark purple (0x2a0a4a)
Trail: 20 particle points

// Behavior
speed: 80 units/s         // Very fast
warningTime: 1.5s         // Warning display
direction: 'left' | 'right' // Horizontal movement
speedPenalty: 25          // Collision penalty
```

---

## 💡 Lighting System

### Three.js Light Types Used

#### 1. AmbientLight
**Usage**: Global illumination
```javascript
// Chapter 0
new THREE.AmbientLight(0x404040, 0.2)

// Chapter 1
new THREE.AmbientLight(0x404050, 0.3)
```

#### 2. DirectionalLight
**Usage**: Main scene lighting
```javascript
// Chapter 0
const light = new THREE.DirectionalLight(0x8888ff, 0.3);
light.position.set(5, 10, 5);

// Chapter 1
const light = new THREE.DirectionalLight(0x8899ff, 0.4);
light.position.set(10, 15, 10);
```

#### 3. PointLight (Dynamic)
**Usage**: Entity-specific lighting
```javascript
// Player light (grows with progression)
new THREE.PointLight(0xffaa00, intensity, distance)
// intensity: 0.2 → 3.5
// distance: 4 → 20

// Portal lights
mainLight: new THREE.PointLight(0x00D9FF, 25, 150)
accentLight: new THREE.PointLight(0xFFD700, 10, 80)

// Entity lights (Photons, Meteors, etc)
new THREE.PointLight(color, 1-3, 10-20)
```

### Bloom Post-Processing
```javascript
// UnrealBloomPass configuration
strength: 1.5              // Glow intensity
radius: 0.4                // Blur radius
threshold: 0.85            // Brightness threshold

// Dynamic adjustments
// - Light speed: strength → 5
// - Portal entry: strength → 5
// - Black hole proximity: strength +0.3
```

---

## 🎵 Audio System Architecture

### Tone.js Setup
```javascript
// Master chain
Transport.bpm.value = 95   // Tempo

// Reverb (ambient space)
reverb = new Tone.Reverb({
  decay: 4.0,
  wet: 0.5
})

// Compressor (dynamics)
compressor = new Tone.Compressor({
  threshold: -24,
  ratio: 4,
  attack: 0.003,
  release: 0.25
})
```

### Music Layer System
**Progressive Unlocking**:
1. **Menu/Start**: Ambient pad only
2. **Orb 1**: + Bass layer
3. **Orb 2**: + Pad chords
4. **Orb 3**: + Melody
5. **Orb 4**: + Harmony
6. **Orb 5**: + Rhythm (full music)

**Persistence**:
- Chapter 0: Build progressively
- Chapter 1: Restore all 5 layers if Chapter 0 completed
- Uses localStorage: `luminaVoyage_orbsCollected`

### Sound Effects
```javascript
// Collection sounds
Photon: E5 → G5 (sine wave)
EnergyOrb: E5 → G5 (sine wave)

// Collision sounds
Meteor: C1 → F1 → G1 → C2 (sawtooth, deep)
Comet: C1 → Eb1 → Gb1 (multiple waves)
Black Hole: C2 → C3 (warning alarm)

// UI sounds
Grid move: E4 (subtle)
Slingshot: G4 (triangle wave)
Portal: C5 → E5 → G5 (ascending chord)
```

---

## 🔧 How to Add New Features

### Adding a New Chapter

**Step 1**: Create chapter class
```javascript
// src/chapters/Chapter2_NewName.js
import { BaseChapter } from './BaseChapter.js';

export class Chapter2_NewName extends BaseChapter {
  constructor(engine) {
    super(engine);
    this.name = 'Chapter Name';
  }
  
  setupEnvironment() {
    // Set fog, background color
    this.scene.fog = new THREE.Fog(color, near, far);
    this.scene.background = new THREE.Color(color);
  }
  
  setupLighting() {
    // Add lights to this.scene
    const ambient = new THREE.AmbientLight(color, intensity);
    this.scene.add(ambient);
  }
  
  spawnPlayer() {
    // Create player at starting position
    this.player = new Player(
      this.scene,
      this.engine.physicsSystem,
      this.engine.audioSystem,
      new THREE.Vector3(0, 0, 0)
    );
    this.engine.cameraSystem.follow(this.player);
  }
  
  spawnObjects() {
    // Create and add entities to this.entities array
    const entity = new SomeEntity(/*...*/);
    this.entities.push(entity);
  }
  
  update(deltaTime) {
    super.update(deltaTime); // Updates all entities
    
    // Custom update logic
    // - Check win conditions
    // - Update game state
    // - Spawn new entities
  }
}
```

**Step 2**: Register in main.js
```javascript
// src/main.js
import { Chapter2_NewName } from './chapters/Chapter2_NewName.js';

const chapterClasses = [
  Chapter0_TheVoid,
  Chapter1_TheAscent,
  Chapter2_NewName  // Add here
];
```

**Step 3**: Add to chapter select UI
```html
<!-- index.html -->
<div class="chapter-star" data-chapter="2">
  <div class="star-glow"></div>
  <span class="chapter-number">3</span>
  <span class="chapter-name">Chapter Name</span>
</div>
```

---

### Adding a New Entity Type

**Step 1**: Create entity class
```javascript
// src/entities/NewEntity.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class NewEntity {
  constructor(scene, physicsSystem, position) {
    this.id = `newentity-${Math.random().toString(36).substr(2, 9)}`;
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.destroyed = false;
    
    // Create visual mesh
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    scene.add(this.mesh);
    
    // Add light (optional)
    this.light = new THREE.PointLight(0xff0000, 2, 10);
    this.mesh.add(this.light);
    
    // Add physics body
    this.body = physicsSystem.addBody(this, {
      mass: 0,  // Static (0) or dynamic (>0)
      shape: new CANNON.Sphere(1),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      isTrigger: true  // true for collectibles/triggers
    });
  }
  
  update(deltaTime) {
    if (this.destroyed) return;
    
    // Update visual to match physics
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
    
    // Custom update logic
    // - Animations
    // - State checks
    // - Collision detection
  }
  
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    
    // Remove from scene
    this.scene.remove(this.mesh);
    
    // Remove physics body
    this.physicsSystem.removeBody(this.id);
    
    // Dispose geometries and materials
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
```

**Step 2**: Spawn in chapter
```javascript
// In chapter's spawnObjects() or update()
import { NewEntity } from '../entities/NewEntity.js';

const entity = new NewEntity(
  this.scene,
  this.engine.physicsSystem,
  new THREE.Vector3(x, y, z)
);
this.entities.push(entity);
```

**Step 3**: Handle interactions
```javascript
// In chapter's update()
this.entities.forEach(entity => {
  if (entity instanceof NewEntity) {
    const distance = this.player.mesh.position.distanceTo(
      entity.mesh.position
    );
    
    if (distance < collectionRadius) {
      // Do something
      entity.destroy();
    }
  }
});
```

---

### Adding Post-Processing Effects

**Step 1**: Import pass from Three.js
```javascript
// src/core/Engine.js
import { NewPass } from 'three/examples/jsm/postprocessing/NewPass.js';
```

**Step 2**: Add to composer
```javascript
// In setupPostProcessing()
this.newPass = new NewPass(
  /* parameters */
);
this.composer.addPass(this.newPass);
```

**Step 3**: Control dynamically
```javascript
// In update loop or level
this.engine.newPass.someProperty = value;
```

---

### Adding Sound Effects

**Step 1**: Add to AudioSystem
```javascript
// src/systems/AudioSystem.js
playCustomSound(note, velocity, options) {
  if (!this.initialized) return;
  
  const synth = new Tone.Synth({
    oscillator: { type: options.type || 'sine' },
    envelope: { 
      attack: 0.01, 
      decay: 0.2, 
      sustain: 0.1, 
      release: 0.3 
    }
  }).toDestination();
  
  synth.volume.value = -10;
  synth.triggerAttackRelease(note, '8n', Tone.now(), velocity);
  
  setTimeout(() => synth.dispose(), 1000);
}
```

**Step 2**: Call from entity
```javascript
// In entity
this.audioSystem.playCustomSound('C4', 0.5, { type: 'sine' });
```

---

## 📁 File Structure

```
lumina-voyage/
├── index.html                      # Main HTML entry
├── package.json                    # Dependencies
├── vite.config.js                  # Vite bundler config
│
├── public/                         # Static assets
│   └── assets/
│       ├── audio/                  # (future) Audio files
│       ├── models/                 # (future) 3D models
│       └── textures/               # (future) Textures
│
├── src/                            # Source code
│   ├── main.js                     # Entry point, UI logic
│   │
│   ├── core/                       # Core engine systems
│   │   ├── Engine.js               # Main game engine
│   │   ├── SceneManager.js         # Level management
│   │   └── InputManager.js         # Input handling
│   │
│   ├── systems/                    # Game systems
│   │   ├── AudioSystem.js          # Tone.js audio
│   │   ├── CameraSystem.js         # Camera control
│   │   ├── ParticleSystem.js       # Particle effects
│   │   └── PhysicsSystem.js        # CANNON.js physics
│   │
│   ├── chapters/                   # Game levels
│   │   ├── BaseChapter.js          # Abstract base class
│   │   ├── Chapter0_TheVoid.js     # Tutorial level
│   │   └── Chapter1_TheAscent.js   # Speed challenge
│   │
│   ├── entities/                   # Game objects
│   │   ├── Player.js               # Player character
│   │   ├── EnergyOrb.js            # Collectible
│   │   ├── Portal.js               # Level exit
│   │   ├── PortalBeam.js           # Transition effect
│   │   ├── PulseWave.js            # Detection mechanic
│   │   ├── Photon.js               # Speed boost (Ch1)
│   │   ├── Meteor.js               # Obstacle (Ch1)
│   │   ├── BlackHole.js            # Gravity well (Ch1)
│   │   └── ShadowComet.js          # Projectile (Ch1)
│   │
│   └── utils/                      # Utilities
│       └── ModelManager.js         # (future) 3D model loader
│
└── doc/                            # Documentation
    ├── GameDesignDocument.md       # Game design
    ├── TechnicalDesignDocument.md  # Technical specs
    └── ImplementationRoadmap.md    # Development plan
```

---

## 📊 Component Count Summary

### Chapter 0: The Void
| Category | Count | Details |
|----------|-------|---------|
| **Entities** | 7+ | Player, 5 Orbs, Portal |
| **Lights** | 9+ | 1 Ambient, 1 Directional, 1 Player, 5 Orbs, 2 Portal |
| **Geometries** | 15+ | Player, Orbs, Portal rings, Particles |
| **Physics Bodies** | 7+ | Player, 5 Orbs, Portal |
| **Systems** | 6 | Engine, Scene, Input, Physics, Camera, Audio |

### Chapter 1: The Ascent
| Category | Count | Details |
|----------|-------|---------|
| **Entities** | 35-50 | Player, 20-30 obstacles (procedural), Portal |
| **Lights** | 25-40+ | 2 Scene lights, 1 Player, 20-30+ entity lights |
| **Geometries** | 50-100+ | Player, obstacles, grid, speed lines, particles |
| **Physics Bodies** | 35-50 | All entities with collision |
| **Systems** | 6 | Same as Chapter 0 |

### Global Systems
| System | Components | Purpose |
|--------|------------|---------|
| **Engine** | Renderer, Clock, Composer | Main loop, rendering |
| **Post-Processing** | 2 Passes | Render + Bloom |
| **Audio** | 6 Synths | Ambient + 5 music layers |
| **Physics** | 1 World | Collision detection |
| **Camera** | 1 PerspectiveCamera | View control |
| **Input** | 1 Manager | Keyboard/Mouse |

---

## 🎯 Common Defense Questions & Answers

### Q: "How many objects are in each scene?"
**A**: 
- **Chapter 0**: ~7 main entities (Player + 5 Orbs + Portal), ~3000 background stars
- **Chapter 1**: ~35-50 entities (Player + 20-30 procedural obstacles + Portal + UI elements)
- **Dynamic spawning**: Chapter 1 uses procedural generation with spawn distance of 80 units ahead

### Q: "Explain the lighting system"
**A**: 
We use 3 types of Three.js lights:
1. **AmbientLight**: Base scene illumination (low intensity ~0.2-0.3)
2. **DirectionalLight**: Main scene lighting (positioned at 5-15 units up)
3. **PointLight**: Dynamic entity lighting (20-40 lights active in Chapter 1)
- Player light grows with progression (intensity 0.2 → 3.5)
- UnrealBloomPass for post-processing glow effects (threshold 0.85, strength 1.5)

### Q: "How would you add a new feature?"
**A**: Depends on feature type:
- **New entity**: Create class in `entities/`, inherit update/destroy pattern, add to chapter's spawn
- **New chapter**: Extend BaseChapter, implement 4 methods (setupEnvironment, setupLighting, spawnPlayer, spawnObjects)
- **New mechanic**: Add to player or chapter update loop, integrate with physics system
- **New audio**: Add method to AudioSystem.js, call from entity/chapter

### Q: "Where would you implement [specific feature]?"
**A**: 
- **Gameplay logic**: Chapter class (update loop)
- **Visual effects**: Entity class or post-processing pass
- **Player ability**: Player.js
- **UI elements**: main.js (DOM manipulation)
- **Physics interaction**: PhysicsSystem.js + entity update
- **Audio/Music**: AudioSystem.js

### Q: "Explain the component structure"
**A**: 
Entity-Component pattern:
- **Entity**: Container with mesh, physics body, lights
- **Components**: Geometry, Material, Lights (Three.js), Body (CANNON.js)
- **Systems**: Update all entities via polymorphic update() calls
- **Lifecycle**: constructor → update (each frame) → destroy (cleanup)

---

## 📝 Implementation Examples

### Example: Adding a New Collectible Type

```javascript
// 1. Create entity class
// src/entities/SpeedBoost.js
export class SpeedBoost {
  constructor(scene, physicsSystem, position) {
    this.id = `speedboost-${Math.random().toString(36).substr(2, 9)}`;
    this.scene = scene;
    this.destroyed = false;
    this.collected = false;
    
    // Visual: Glowing cube
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 2
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    scene.add(this.mesh);
    
    // Light
    this.light = new THREE.PointLight(0x00ff00, 2, 8);
    this.mesh.add(this.light);
    
    // Physics (trigger)
    this.body = physicsSystem.addBody(this, {
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(0.4, 0.4, 0.4)),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      isTrigger: true
    });
  }
  
  update(deltaTime) {
    if (this.destroyed) return;
    
    // Rotate animation
    this.mesh.rotation.y += deltaTime * 2;
    
    // Pulse light
    this.light.intensity = 2 + Math.sin(Date.now() * 0.005) * 0.5;
  }
  
  collect() {
    if (this.collected) return 0;
    this.collected = true;
    return 20; // Speed boost amount
  }
  
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.remove(this.mesh);
    this.physicsSystem.removeBody(this.id);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

// 2. Add to chapter
// In Chapter1_TheAscent.js spawnWave()
import { SpeedBoost } from '../entities/SpeedBoost.js';

if (Math.random() < 0.3) { // 30% chance
  const boost = new SpeedBoost(
    this.scene,
    this.engine.physicsSystem,
    new THREE.Vector3(x, y, spawnZ)
  );
  this.entities.push(boost);
}

// 3. Handle collection
// In Chapter1_TheAscent.js update()
this.entities.forEach(entity => {
  if (entity instanceof SpeedBoost && !entity.collected) {
    const distance = this.player.mesh.position.distanceTo(
      entity.mesh.position
    );
    
    if (distance < 1.5) {
      const speedBoost = entity.collect();
      this.currentSpeed = Math.min(
        this.currentSpeed + speedBoost, 
        this.maxSpeed
      );
      // Play sound
      this.engine.audioSystem.playSpecificNote('E5', 0.2, { type: 'sine' });
      entity.destroy();
    }
  }
});
```

---

## 🔍 Debug & Development Tools

### Console Logging
Key logs to monitor:
```javascript
// System initialization
'✅ Engine initialized'
'✅ Level loaded: [Name]'

// Game state
'⭐ Orb collected! Total: X'
'🚀 Speed: X, Light: X, Scale: X'
'⚡ Win condition met!'

// Audio
'🎵 Adding music layer X'
'🔇 Stopped all music layers'

// Errors
'❌ Failed to initialize'
```

### Performance Monitoring
```javascript
// In Engine.animate()
const fps = 1 / deltaTime;
console.log('FPS:', Math.round(fps));

// Entity count
console.log('Active entities:', level.entities.length);

// Physics bodies
console.log('Physics bodies:', physicsSystem.bodies.size);
```

### Quick Testing
```javascript
// Skip to chapter
await startChapter(1); // In console

// Unlock all chapters
window.unlockLevel(1);
window.unlockLevel(2);

// Adjust volume
engine.audioSystem.setVolume('master', 0.5);
```

---

## 📞 Technical Support Info

- **Three.js Version**: Check package.json
- **CANNON-es Version**: Check package.json  
- **Tone.js Version**: Check package.json
- **Build Tool**: Vite 4+
- **Target Browsers**: Modern browsers with WebGL2 support

---

## 📅 Last Updated
December 23, 2025

---

**Note**: This documentation covers the current implementation. Refer to inline code comments for specific implementation details.
