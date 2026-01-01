# Technical Design Document (TDD)
## Lumina Voyage - Hướng dẫn Kỹ thuật cho Developer

---

## 1. KIẾN TRÚC TỔNG QUAN (Architecture Overview)

### 1.1 Tech Stack
```
Frontend/Engine:
├── Three.js (r150+)          # 3D Rendering Engine
├── Cannon.js (0.6.2+)        # Physics Engine
├── Tone.js (14.0+)           # Audio Engine
└── GSAP (3.12+)              # Animation Library

Build Tools:
├── Vite                      # Build Tool & Dev Server
├── TypeScript (Optional)     # Type Safety
└── ESLint                    # Code Quality

Deployment:
└── Static Web Hosting (Vercel/Netlify/GitHub Pages)
```

### 1.2 Folder Structure
```
lumina-voyage/
├── public/
│   ├── assets/
│   │   ├── models/           # .glb, .gltf files
│   │   ├── textures/         # .png, .jpg files
│   │   ├── audio/            # .mp3, .wav files (optional)
│   │   └── shaders/          # Custom GLSL files
│   └── config/
│       └── levels.json       # Level configuration data
├── src/
│   ├── core/
│   │   ├── Engine.js         # Main game loop & initialization
│   │   ├── SceneManager.js   # Scene switching logic
│   │   └── InputManager.js   # Keyboard/Mouse input handler
│   ├── entities/
│   │   ├── Player.js         # Player class (Lumina Orb)
│   │   ├── Meteor.js         # Obstacle class
│   │   ├── EnergyOrb.js      # Collectible class
│   │   └── BlackHole.js      # Special obstacle
│   ├── systems/
│   │   ├── PhysicsSystem.js  # Cannon.js wrapper
│   │   ├── AudioSystem.js    # Tone.js wrapper
│   │   ├── ParticleSystem.js # Particle effects manager
│   │   └── CameraSystem.js   # Camera controller
│   ├── ui/
│   │   ├── HUD.js            # In-game UI (Lumen bar, etc.)
│   │   └── MenuSystem.js     # Main menu, pause, game over
│   ├── levels/
│   │   ├── Level0_TheVoid.js
│   │   ├── Level1_TheAscent.js
│   │   ├── Level2_TwinPaths.js
│   │   └── Level3_SymphonyOrbit.js
│   ├── utils/
│   │   ├── MathUtils.js      # Vector operations, helpers
│   │   ├── ObjectPool.js     # Object pooling for performance
│   │   └── Loader.js         # Asset preloading
│   └── main.js               # Entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## 2. CORE SYSTEMS (Hệ thống cốt lõi)

### 2.1 Engine.js - Game Loop
**Nhiệm vụ:** Quản lý vòng lặp game, khởi tạo các hệ thống

**Class Structure:**
```javascript
class Engine {
  constructor() {
    this.renderer = null;      // THREE.WebGLRenderer
    this.clock = new THREE.Clock();
    this.currentScene = null;  // Scene hiện tại đang chạy
    
    // Các hệ thống
    this.physicsSystem = new PhysicsSystem();
    this.audioSystem = new AudioSystem();
    this.inputManager = new InputManager();
    this.sceneManager = new SceneManager();
  }
  
  init() {
    // Setup renderer, window resize listener
    // Load initial assets
    // Start game loop
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    const deltaTime = this.clock.getDelta();
    
    // Update các hệ thống theo thứ tự
    this.inputManager.update();
    this.physicsSystem.step(deltaTime);
    this.currentScene.update(deltaTime);
    this.audioSystem.update(deltaTime);
    
    // Render
    this.renderer.render(this.currentScene.threeScene, this.currentScene.camera);
  }
}
```

**Chi tiết kỹ thuật:**
- **Fixed Timestep:** Cannon.js yêu cầu `fixedTimeStep = 1/60`. Phải clamp `deltaTime` để tránh spiral of death
- **Renderer Settings:** Enable `antialias: true`, `powerPreference: "high-performance"`
- **Post-processing:** Tích hợp `EffectComposer` với `UnrealBloomPass` ngay trong `animate()`

---

### 2.2 PhysicsSystem.js - Physics Engine Wrapper
**Nhiệm vụ:** Đóng gói Cannon.js, xử lý va chạm, quản lý physics bodies

**Class Structure:**
```javascript
class PhysicsSystem {
  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, 0); // Zero gravity by default
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    
    this.bodies = new Map(); // Map<entityId, CANNON.Body>
  }
  
  step(deltaTime) {
    const fixedTimeStep = 1 / 60;
    const maxSubSteps = 3;
    this.world.step(fixedTimeStep, deltaTime, maxSubSteps);
    
    // Sync Three.js mesh positions with Cannon.js bodies
    this.syncMeshes();
  }
  
  addBody(entity, bodyOptions) {
    const body = new CANNON.Body({
      mass: bodyOptions.mass || 1,
      shape: bodyOptions.shape, // e.g., new CANNON.Sphere(radius)
      position: bodyOptions.position || new CANNON.Vec3(0, 0, 0)
    });
    
    this.world.addBody(body);
    this.bodies.set(entity.id, body);
    
    // Setup collision listener
    body.addEventListener('collide', (e) => {
      entity.onCollide(e.body);
    });
  }
  
  applyForce(entity, forceVector) {
    const body = this.bodies.get(entity.id);
    if (body) {
      body.applyForce(
        new CANNON.Vec3(forceVector.x, forceVector.y, forceVector.z),
        body.position
      );
    }
  }
  
  syncMeshes() {
    this.bodies.forEach((body, entityId) => {
      const entity = entityRegistry.get(entityId); // Global entity registry
      if (entity && entity.mesh) {
        entity.mesh.position.copy(body.position);
        entity.mesh.quaternion.copy(body.quaternion);
      }
    });
  }
}
```

**Quy tắc kỹ thuật:**
- **Damping:** Set `body.linearDamping = 0.1` và `body.angularDamping = 0.5` để mô phỏng low-drag environment
- **Collision Groups:** Dùng `collisionFilterGroup` và `collisionFilterMask` để tối ưu performance
- **Đừng SetPosition:** Luôn dùng `applyForce()` hoặc `velocity` để di chuyển

---

### 2.3 AudioSystem.js - Procedural Music Engine
**Nhiệm vụ:** Quản lý Tone.js, phát nhạc theo context

**Class Structure:**
```javascript
class AudioSystem {
  constructor() {
    this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
    this.currentScale = ['C4', 'E4', 'G4', 'B4']; // Pentatonic
    this.tempo = 120;
    this.volume = -10; // dB
    
    // Background ambient
    this.ambientPad = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 2, decay: 1, sustain: 0.8, release: 3 }
    }).toDestination();
  }
  
  playNote(velocity = 0.5) {
    const randomNote = this.currentScale[Math.floor(Math.random() * this.currentScale.length)];
    this.synth.triggerAttackRelease(randomNote, '8n', Tone.now(), velocity);
  }
  
  setScaleByLevel(levelId) {
    const scales = {
      0: ['C4', 'D4', 'E4', 'G4', 'A4'],        // Pentatonic - Peaceful
      1: ['C4', 'Eb4', 'F4', 'G4', 'Bb4'],      // Minor - Tension
      2: ['C4', 'D4', 'F#4', 'G4', 'A4'],       // Whole Tone - Dreamy
      3: ['C4', 'E4', 'G4', 'B4', 'D5', 'F#5']  // Major 7th - Triumphant
    };
    this.currentScale = scales[levelId] || scales[0];
  }
  
  startAmbient() {
    this.ambientPad.triggerAttack('C2');
  }
  
  stopAmbient() {
    this.ambientPad.triggerRelease();
  }
  
  updateTempo(playerSpeed) {
    // Map speed (0-100) to tempo (80-180 BPM)
    this.tempo = 80 + (playerSpeed / 100) * 100;
    Tone.Transport.bpm.value = this.tempo;
  }
}
```

**Chi tiết kỹ thuật:**
- **Latency:** Gọi `Tone.start()` sau user interaction (click) để tránh autoplay policy
- **Effects:** Có thể chain `new Tone.Reverb()` và `new Tone.Delay()` để tạo không gian âm thanh

---

### 2.4 CameraSystem.js - Dynamic Camera Controller
**Nhiệm vụ:** Quản lý camera, smooth follow, transitions

**Class Structure:**
```javascript
class CameraSystem {
  constructor(renderer) {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    this.target = null;         // Entity to follow
    this.offset = new THREE.Vector3(0, 5, 10); // Default offset
    this.smoothFactor = 0.1;    // Lerp speed
    this.bankAngle = 0;         // Z-axis tilt for banking effect
  }
  
  follow(targetEntity) {
    this.target = targetEntity;
  }
  
  update(deltaTime, mouseVelocityX) {
    if (!this.target) return;
    
    // Smooth follow with lerp
    const targetPos = this.target.mesh.position.clone().add(this.offset);
    this.camera.position.lerp(targetPos, this.smoothFactor);
    
    // Look at target
    this.camera.lookAt(this.target.mesh.position);
    
    // Banking effect (nghiêng camera khi xoay nhanh)
    if (Math.abs(mouseVelocityX) > 5) {
      this.bankAngle = THREE.MathUtils.clamp(mouseVelocityX * 0.02, -0.2, 0.2);
    } else {
      this.bankAngle *= 0.95; // Decay
    }
    this.camera.rotation.z = this.bankAngle;
  }
  
  transitionTo(newPosition, newTarget, duration = 2) {
    // Use GSAP for smooth cinematic transitions
    gsap.to(this.camera.position, {
      x: newPosition.x,
      y: newPosition.y,
      z: newPosition.z,
      duration: duration,
      ease: 'power2.inOut'
    });
  }
}
```

---

## 3. ENTITIES (Các thực thể game)

### 3.1 Player.js - Nhân vật chính
**Thuộc tính:**
```javascript
class Player {
  constructor(scene, physicsSystem) {
    this.id = 'player';
    this.currentLumen = 100;    // HP/Energy (0-100)
    this.maxLumen = 100;
    this.speed = 20;            // Base movement speed
    this.pulseRadius = 10;      // Detection radius
    this.pulseCooldown = 0;     // Timer (seconds)
    
    // Three.js mesh
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffaa00,
        emissiveIntensity: 2
      })
    );
    scene.add(this.mesh);
    
    // Physics body
    physicsSystem.addBody(this, {
      mass: 1,
      shape: new CANNON.Sphere(0.5),
      position: new CANNON.Vec3(0, 0, 0)
    });
    
    // Particle trail
    this.particleSystem = new ParticleTrail(this.mesh);
  }
  
  update(deltaTime, inputManager, physicsSystem) {
    // Movement
    const moveVector = new THREE.Vector3();
    if (inputManager.keys['w']) moveVector.z -= 1;
    if (inputManager.keys['s']) moveVector.z += 1;
    if (inputManager.keys['a']) moveVector.x -= 1;
    if (inputManager.keys['d']) moveVector.x += 1;
    
    // Apply force in camera direction
    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(this.speed);
      physicsSystem.applyForce(this, moveVector);
    }
    
    // Energy decay
    this.currentLumen -= 0.5 * deltaTime;
    this.currentLumen = Math.max(0, this.currentLumen);
    
    // Visual feedback
    this.updateVisuals();
    
    // Pulse cooldown
    if (this.pulseCooldown > 0) {
      this.pulseCooldown -= deltaTime;
    }
    
    if (inputManager.justPressed('f') && this.pulseCooldown <= 0) {
      this.pulse();
      this.pulseCooldown = 1.0; // 1 second cooldown
    }
  }
  
  pulse() {
    // Create expanding shockwave
    const pulseWave = new PulseWave(this.mesh.position, this.pulseRadius);
    // Trigger audio
    audioSystem.playNote(0.7);
  }
  
  updateVisuals() {
    // Scale intensity based on energy
    const intensity = (this.currentLumen / this.maxLumen) * 2;
    this.mesh.material.emissiveIntensity = intensity;
    
    // Scale size
    const scale = 0.5 + (this.currentLumen / this.maxLumen) * 0.3;
    this.mesh.scale.setScalar(scale);
  }
  
  onCollide(otherBody) {
    // Xử lý va chạm (to be implemented per object type)
  }
  
  takeDamage(amount) {
    this.currentLumen -= amount;
    if (this.currentLumen <= 0) {
      this.die();
    }
  }
  
  heal(amount) {
    this.currentLumen = Math.min(this.maxLumen, this.currentLumen + amount);
  }
  
  die() {
    // Trigger game over or respawn
    eventBus.emit('player-died');
  }
}
```

---

### 3.2 Meteor.js - Chướng ngại vật
**Chi tiết:**
```javascript
class Meteor {
  constructor(scene, physicsSystem, position) {
    this.id = `meteor-${Math.random()}`;
    
    // Random size
    const size = 0.5 + Math.random() * 1.5;
    
    // Low-poly geometry
    const geometry = new THREE.DodecahedronGeometry(size, 0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.8,
      flatShading: true
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    scene.add(this.mesh);
    
    // Physics
    physicsSystem.addBody(this, {
      mass: 0, // Static
      shape: new CANNON.Sphere(size),
      position: new CANNON.Vec3(position.x, position.y, position.z)
    });
    
    // Rotation animation
    this.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5
    );
  }
  
  update(deltaTime) {
    // Rotate mesh (không ảnh hưởng physics)
    this.mesh.rotation.x += this.rotationSpeed.x * deltaTime;
    this.mesh.rotation.y += this.rotationSpeed.y * deltaTime;
    this.mesh.rotation.z += this.rotationSpeed.z * deltaTime;
  }
  
  destroy(scene, physicsSystem) {
    scene.remove(this.mesh);
    physicsSystem.removeBody(this.id);
  }
}
```

---

## 4. LEVEL DESIGN SYSTEM

### 4.1 Cấu trúc Level Base Class
```javascript
class BaseLevel {
  constructor(engine) {
    this.engine = engine;
    this.threeScene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    this.entities = [];
    this.isComplete = false;
  }
  
  load() {
    // Load assets, setup scene
    this.setupLighting();
    this.spawnPlayer();
    this.spawnObstacles();
  }
  
  update(deltaTime) {
    // Update all entities
    this.entities.forEach(entity => entity.update(deltaTime));
    
    // Check win condition
    if (this.checkWinCondition()) {
      this.complete();
    }
  }
  
  setupLighting() {
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.threeScene.add(ambient);
  }
  
  spawnPlayer() {
    // To be implemented by child class
  }
  
  checkWinCondition() {
    return false; // Override in child
  }
  
  complete() {
    this.isComplete = true;
    this.engine.sceneManager.loadNextLevel();
  }
  
  unload() {
    // Cleanup
    this.entities.forEach(entity => entity.destroy());
    this.threeScene.clear();
  }
}
```

### 4.2 Level Configuration (JSON)
**File:** `public/config/levels.json`
```json
{
  "level_1": {
    "id": 1,
    "name": "The Ascent",
    "environment": {
      "gravity": { "x": 0, "y": 0, "z": 0 },
      "fogDensity": 0.02,
      "ambientLight": 0.5,
      "backgroundColor": "#000510"
    },
    "player": {
      "startPosition": { "x": 0, "y": 0, "z": 0 },
      "initialLumen": 100
    },
    "obstacles": [
      {
        "type": "meteor",
        "spawnRate": 2.0,
        "count": 20,
        "spawnZone": {
          "min": { "x": -10, "y": -5, "z": -50 },
          "max": { "x": 10, "y": 5, "z": -10 }
        }
      },
      {
        "type": "blackhole",
        "positions": [
          { "x": -5, "y": 0, "z": -30 },
          { "x": 8, "y": 3, "z": -60 }
        ],
        "pullForce": 50
      }
    ],
    "collectibles": {
      "type": "energyOrb",
      "count": 15,
      "healAmount": 15
    },
    "audio": {
      "scale": ["C4", "Eb4", "F4", "G4", "Bb4"]
    },
    "winCondition": {
      "type": "reachPosition",
      "targetZ": -100
    }
  }
}
```

---

## 5. PERFORMANCE OPTIMIZATION

### 5.1 Object Pooling
```javascript
class ObjectPool {
  constructor(createFunc, resetFunc, initialSize = 10) {
    this.pool = [];
    this.createFunc = createFunc;
    this.resetFunc = resetFunc;
    
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFunc());
    }
  }
  
  get() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return this.createFunc();
  }
  
  release(obj) {
    this.resetFunc(obj);
    this.pool.push(obj);
  }
}

// Usage
const meteorPool = new ObjectPool(
  () => new Meteor(scene, physicsSystem, new THREE.Vector3()),
  (meteor) => {
    meteor.mesh.visible = false;
    meteor.mesh.position.set(0, 0, 0);
  },
  20
);
```

### 5.2 InstancedMesh cho Particles
```javascript
class ParticleSystem {
  constructor(count = 1000) {
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    this.count = count;
    this.particles = [];
    
    for (let i = 0; i < count; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0
      });
    }
  }
  
  emit(position, velocity) {
    // Find dead particle và reuse
    const particle = this.particles.find(p => p.life <= 0);
    if (particle) {
      particle.position.copy(position);
      particle.velocity.copy(velocity);
      particle.life = 1.0;
    }
  }
  
  update(deltaTime) {
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      if (p.life > 0) {
        p.position.add(p.velocity.clone().multiplyScalar(deltaTime));
        p.life -= deltaTime;
        
        matrix.setPosition(p.position);
        this.instancedMesh.setMatrixAt(i, matrix);
      }
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }
}
```

---

## 6. INPUT SYSTEM

### InputManager.js
```javascript
class InputManager {
  constructor() {
    this.keys = {};
    this.previousKeys = {};
    this.mouse = { x: 0, y: 0, velocityX: 0, velocityY: 0 };
    
    window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    
    document.addEventListener('mousemove', (e) => {
      this.mouse.velocityX = e.movementX;
      this.mouse.velocityY = e.movementY;
    });
  }
  
  update() {
    // Copy current state to previous
    this.previousKeys = { ...this.keys };
    
    // Decay mouse velocity
    this.mouse.velocityX *= 0.8;
    this.mouse.velocityY *= 0.8;
  }
  
  justPressed(key) {
    return this.keys[key] && !this.previousKeys[key];
  }
  
  justReleased(key) {
    return !this.keys[key] && this.previousKeys[key];
  }
}
```

---

## 7. DEBUGGING TOOLS

### dat.GUI Integration
```javascript
class DebugPanel {
  constructor(engine) {
    this.gui = new dat.GUI();
    
    const playerFolder = this.gui.addFolder('Player');
    playerFolder.add(engine.player, 'speed', 0, 100);
    playerFolder.add(engine.player, 'currentLumen', 0, 100).listen();
    playerFolder.open();
    
    const graphicsFolder = this.gui.addFolder('Graphics');
    graphicsFolder.add(engine.bloomPass, 'strength', 0, 3);
    graphicsFolder.add(engine.bloomPass, 'radius', 0, 1);
    graphicsFolder.open();
    
    const physicsFolder = this.gui.addFolder('Physics');
    physicsFolder.add(engine.physicsSystem.world.gravity, 'y', -20, 20);
  }
}
```

---

## 8. STATE MACHINE PATTERN

### GameStateManager.js
```javascript
class GameStateManager {
  constructor() {
    this.states = {
      LOADING: 'loading',
      MENU: 'menu',
      PLAYING: 'playing',
      PAUSED: 'paused',
      GAMEOVER: 'gameover'
    };
    
    this.currentState = this.states.LOADING;
  }
  
  setState(newState) {
    console.log(`State change: ${this.currentState} -> ${newState}`);
    
    // Exit current state
    this.onExitState(this.currentState);
    
    // Enter new state
    this.currentState = newState;
    this.onEnterState(newState);
  }
  
  onEnterState(state) {
    switch(state) {
      case this.states.PLAYING:
        audioSystem.startAmbient();
        Tone.Transport.start();
        break;
      case this.states.PAUSED:
        Tone.Transport.pause();
        break;
      case this.states.GAMEOVER:
        audioSystem.stopAmbient();
        break;
    }
  }
  
  onExitState(state) {
    // Cleanup logic
  }
}
```

---

## 9. CHECKLIST CHO AI DEVELOPER

### Phase 1: Core Setup
- [ ] Khởi tạo Vite project với Three.js
- [ ] Setup folder structure theo TDD
- [ ] Tạo Engine.js với game loop cơ bản
- [ ] Test render 1 cube quay trên màn hình

### Phase 2: Physics Integration
- [ ] Tích hợp Cannon.js vào PhysicsSystem
- [ ] Tạo Player class với SphereGeometry
- [ ] Implement WASD movement với applyForce
- [ ] Test va chạm với 1 static meteor

### Phase 3: Camera & Input
- [ ] Tạo CameraSystem với smooth follow
- [ ] Implement InputManager
- [ ] Test camera banking effect

### Phase 4: Level 0 (Tutorial)
- [ ] Load Level0_TheVoid.js
- [ ] Spawn 5 EnergyOrb theo breadcrumb trail
- [ ] Implement Pulse mechanic với visual effect
- [ ] Test magnetic collection

### Phase 5: Visual Effects
- [ ] Setup EffectComposer + UnrealBloomPass
- [ ] Tạo ParticleTrail cho player
- [ ] Implement PulseWave effect

### Phase 6: Audio System
- [ ] Tích hợp Tone.js vào AudioSystem
- [ ] Test playNote() khi thu thập orb
- [ ] Implement adaptive tempo dựa vào speed

### Phase 7: Level 1 (The Ascent)
- [ ] Tạo Meteor spawner với ObjectPool
- [ ] Implement auto-scroll camera
- [ ] Test collision damage
- [ ] Implement BlackHole với gravity field

### Phase 8: UI/UX
- [ ] Tạo HUD hiển thị Lumen bar
- [ ] Main menu với nút Start
- [ ] Game Over screen với Restart

### Phase 9: Level 2 & 3
- [ ] Implement Refraction/Reflection logic
- [ ] Tạo Prism objects với collision detection
- [ ] Implement Orbital mechanics cho Level 3

### Phase 10: Polish & Optimization
- [ ] Object pooling cho tất cả dynamic objects
- [ ] InstancedMesh cho particles
- [ ] Frustum culling
- [ ] Performance profiling

---

## 10. COMMON PITFALLS (Lỗi thường gặp)

### ❌ Lỗi: Physics không đồng bộ với Visual
**Nguyên nhân:** Quên gọi `syncMeshes()` trong `PhysicsSystem.step()`
**Giải pháp:** Luôn copy position/quaternion từ Cannon.Body sang Three.Mesh

### ❌ Lỗi: Camera bị giật (Jittery camera)
**Nguyên nhân:** Lerp factor quá cao hoặc không clamp deltaTime
**Giải pháp:** Dùng `smoothFactor = 0.1` và clamp `deltaTime` max 0.1s

### ❌ Lỗi: Âm thanh không phát
**Nguyên nhân:** Chưa gọi `Tone.start()` sau user interaction
**Giải pháp:** Gọi `await Tone.start()` trong event click nút Start

### ❌ Lỗi: Collision không trigger
**Nguyên nhân:** Quên add event listener 'collide' cho Cannon.Body
**Giải pháp:** Add listener ngay sau `world.addBody()`

---

## 11. NAMING CONVENTIONS

### Variables
- `camelCase` cho biến thường: `currentLumen`, `playerSpeed`
- `PascalCase` cho class: `Player`, `AudioSystem`
- `UPPER_SNAKE_CASE` cho constants: `MAX_LUMEN`, `FIXED_TIMESTEP`

### Files
- `PascalCase.js` cho classes: `Player.js`, `PhysicsSystem.js`
- `kebab-case.js` cho utilities: `math-utils.js`, `object-pool.js`

### Comments
```javascript
// Short comment for single line

/**
 * Multi-line documentation comment
 * @param {number} deltaTime - Time elapsed since last frame
 * @returns {void}
 */
function update(deltaTime) {
  // Implementation
}
```

---

## 12. TESTING STRATEGY

### Unit Tests (Optional but recommended)
```javascript
// tests/Player.test.js
import { Player } from '../src/entities/Player.js';

describe('Player', () => {
  test('should lose lumen over time', () => {
    const player = new Player(scene, physicsSystem);
    const initialLumen = player.currentLumen;
    
    player.update(1.0, inputManager, physicsSystem);
    
    expect(player.currentLumen).toBeLessThan(initialLumen);
  });
});
```

### Manual Testing Checklist
- [ ] Player di chuyển mượt mà với WASD
- [ ] Camera follow không bị lag
- [ ] Collision detection hoạt động chính xác
- [ ] Âm thanh phát đúng lúc
- [ ] FPS ổn định trên 60fps
- [ ] Không có memory leak (check với Chrome DevTools)

---

## 13. DEPLOYMENT

### Build Process
```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Vite Config
```javascript
// vite.config.js
export default {
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true
      }
    }
  }
}
```

### Hosting (GitHub Pages example)
```bash
npm run build
cd dist
git init
git add -A
git commit -m "Deploy"
git push -f https://github.com/username/lumina-voyage.git master:gh-pages
```

---

## 14. RESOURCES & REFERENCES

### Official Documentation
- Three.js: https://threejs.org/docs/
- Cannon.js: https://schteppe.github.io/cannon.js/
- Tone.js: https://tonejs.github.io/
- GSAP: https://greensock.com/docs/

### Tutorials
- Three.js Journey: https://threejs-journey.com/
- Physics in Three.js: https://www.youtube.com/watch?v=pRX6xfEUXNU

### Assets
- Free Low-poly Models: Poly Pizza, Quaternius
- Audio Samples: Freesound.org
- Textures: Poly Haven

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-16  
**Author:** Game Designer → Technical Lead
