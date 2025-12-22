import * as THREE from 'three';
import { BaseChapter } from './BaseChapter.js';
import { Player } from '../entities/Player.js';
import { Meteor } from '../entities/Meteor.js';
import { Photon } from '../entities/Photon.js';
import { BlackHole } from '../entities/BlackHole.js';
import { ShadowComet } from '../entities/ShadowComet.js';
import { Portal } from '../entities/Portal.js';

/**
 * Chapter1_TheAscent - High-speed obstacle dodge with 3x3 grid movement
 * Goal: Reach Light Speed by collecting photons and avoiding obstacles
 * 
 * Camera: Normal follow camera like Level 0
 * Core Loop: Move between grid lanes, collect photons, avoid meteors
 * Win Condition: Fill speed bar to 100% (Light Speed Break)
 */
export class Chapter1_TheAscent extends BaseChapter {
  constructor(engine) {
    super(engine);
    this.name = 'The Ascent';
    
    // Speed / Progress system
    this.currentSpeed = 0;
    this.maxSpeed = 100;           // Light speed threshold
    this.baseAcceleration = 2.0;   // Passive acceleration
    this.photonSpeedBoost = 5;     // Speed gained per photon (reduced for difficulty)
    this.meteorSpeedPenalty = 15;  // Speed lost per meteor hit
    
    // === 3x3 GRID SYSTEM ===
    this.gridLaneWidth = 6;        // Width of each lane (narrower map)
    this.gridLaneHeight = 4;       // Height of each lane (narrower map)
    this.currentLaneX = 1;         // 0=left, 1=center, 2=right
    this.currentLaneY = 1;         // 0=bottom, 1=center, 2=top
    this.laneTransitionSpeed = 15; // How fast to move between lanes
    this.isTransitioning = false;
    
    // === MAP BOUNDS ===
    this.mapWidth = this.gridLaneWidth * 1.5;  // Total playable width
    this.mapHeight = this.gridLaneHeight * 1.5; // Total playable height
    
    // === PROCEDURAL GENERATION (OPTIMIZED) ===
    this.spawnAheadDistance = 80;   // Spawn further ahead
    this.despawnBehindDistance = 15;  // Cleanup faster
    this.lastSpawnZ = 0;
    this.spawnInterval = 20;       // Spawn more frequently to avoid gaps
    this.maxActiveEntities = 35;   // Slightly more entities allowed
    
    // === DIFFICULTY SCALING ===
    this.difficultyMultiplier = 1;
    this.maxDifficulty = 2.5;
    this.blackHoleSpawnChance = 0.18;   // More black holes (was 0.08)
    this.blackHoleMinDifficulty = 1.1;  // Black holes appear earlier (was 1.3)
    this.lastBlackHoleZ = 0;
    this.blackHoleMinSpacing = 50;      // Closer together (was 80)
    
    // Gameplay state
    this.gameTime = 0;
    this.invulnerableTime = 0;
    this.screenShakeIntensity = 0;
    this.lightSpeedTriggered = false;
    this.gamePaused = false;  // Set to true when level is complete
    
    // === LIGHT SPEED BREAK STATE ===
    this.isInLightSpeedSequence = false;
    this.lightSpeedSequenceTime = 0;
    this.lightSpeedDuration = 4;   // 4 seconds of epic flight
    this.finalPortal = null;
    this.portalDistance = 200;  // Closer portal for reachable end sequence
    
    // === SLINGSHOT MECHANIC ===
    this.slingshotActive = false;
    this.slingshotCooldown = 0;
    this.slingshotDuration = 0;
    this.slingshotBoostMultiplier = 2.5;
    
    // === BLACK HOLE PULL STATE ===
    this.isBeingPulled = false;
    this.pullIntensity = 0;
    this.nearestBlackHole = null;
    this.canSlingshot = false;  // Only true in the narrow slingshot zone
    
    // Shadow comet tracking
    this.nextCometTime = 20;
    this.cometInterval = 15;
    
    // Slow debuff from comet hits
    this.slowDebuffTime = 0;
    
    // Input cooldowns for grid movement
    this.inputCooldown = 0;
    this.inputCooldownMax = 0.15;
    
    // Win condition - sustained max speed
    this.maxSpeedSustainedTime = 0;
    this.maxSpeedRequiredDuration = 0.5; // Must maintain max speed for 0.5 seconds
  }

  setupEnvironment() {
    // Space environment - SAME as Level 0 for consistency
    this.scene.fog = new THREE.Fog(0x000000, 100, 600); // Same as Level 0
    this.scene.background = new THREE.Color(0x0a0e27); // Same as Level 0
    
    this.createStarfield();
    this.createSpeedLines();  // Create speed trail lines
    this.createNebulaBackground();
    
    // Speed effect overlay
    this.speedOverlay = document.getElementById('speed-overlay');
    this.baseFov = 75;  // Base FOV
    this.targetFov = 75;
  }

  setupLighting() {
    // Brighter ambient for visibility
    const ambient = new THREE.AmbientLight(0x6688aa, 0.6);
    this.scene.add(ambient);
    
    // Main directional light
    const directional = new THREE.DirectionalLight(0xffffee, 0.8);
    directional.position.set(5, 15, 30);
    this.scene.add(directional);
    
    // Back light for depth
    const backLight = new THREE.DirectionalLight(0x88aaff, 0.4);
    backLight.position.set(-5, 10, -50);
    this.scene.add(backLight);
    
    // Rim light from below
    const rimLight = new THREE.DirectionalLight(0xff6644, 0.3);
    rimLight.position.set(0, -10, 0);
    this.scene.add(rimLight);
  }

  spawnPlayer() {
    this.player = new Player(
      this.scene,
      this.engine.physicsSystem,
      this.engine.audioSystem,
      new THREE.Vector3(0, 0, 0)
    );
    
    this.player.currentLumen = 100;
    this.player.energyDecayRate = 0.05; // Very slow decay
    this.player.baseSpeed = 12;
    this.player.speed = 12;
    
    this.engine.cameraSystem.follow(this.player);
    this.setupCamera();
  }

  setupCamera() {
    // VERY CLOSE camera for tight view - fills screen with action
    this.engine.cameraSystem.offset = new THREE.Vector3(0, 3, 8); // Much closer
    this.engine.cameraSystem.lookAheadOffset = new THREE.Vector3(0, 0, 0);
  }

  spawnObjects() {
    // Spawn initial waves with grid-based placement
    this.spawnWave(-40);
    this.spawnWave(-65);
    this.spawnWave(-90);
    console.log('🚀 Chapter 1 loaded: Race to Light Speed! Use WASD to move between lanes.');
  }

  createNebulaBackground() {
    // Create colorful nebula clouds in background
    const nebulaGroup = new THREE.Group();
    
    const nebulaColors = [0x4466aa, 0x6644aa, 0x446688, 0x884466];
    
    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.PlaneGeometry(80 + Math.random() * 60, 60 + Math.random() * 40);
      const material = new THREE.MeshBasicMaterial({
        color: nebulaColors[i % nebulaColors.length],
        transparent: true,
        opacity: 0.15 + Math.random() * 0.1,
        side: THREE.DoubleSide
      });
      
      const nebula = new THREE.Mesh(geometry, material);
      nebula.position.set(
        (Math.random() - 0.5) * 150,
        (Math.random() - 0.5) * 80,
        -100 - Math.random() * 150
      );
      nebula.rotation.z = Math.random() * Math.PI;
      nebulaGroup.add(nebula);
    }
    
    this.nebulaBackground = nebulaGroup;
    this.scene.add(nebulaGroup);
  }

  createGridIndicators() {
    // Create subtle grid lane indicators
    this.gridIndicators = new THREE.Group();
    
    // Vertical lane dividers
    for (let i = -1; i <= 1; i += 2) {
      const geometry = new THREE.PlaneGeometry(0.1, 200);
      const material = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
      });
      const line = new THREE.Mesh(geometry, material);
      line.position.x = i * this.gridLaneWidth * 0.5;
      line.position.z = -100;
      line.rotation.x = Math.PI * 0.5;
      this.gridIndicators.add(line);
    }
    
    // Horizontal lane dividers
    for (let i = -1; i <= 1; i += 2) {
      const geometry = new THREE.PlaneGeometry(this.gridLaneWidth * 3, 0.1);
      const material = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
      });
      const line = new THREE.Mesh(geometry, material);
      line.position.y = i * this.gridLaneHeight * 0.5;
      line.position.z = -100;
      line.rotation.x = Math.PI * 0.5;
      this.gridIndicators.add(line);
    }
    
    this.scene.add(this.gridIndicators);
  }

  createStarfield() {
    // Initialize starfield relative to player position (or 0 if no player yet)
    const baseZ = this.player ? this.player.mesh.position.z : 0;
    
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      // Place stars in a cylinder ahead of current position
      const radius = 100 + Math.random() * 400; // 100-500 units from center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius;
      // Place ALL stars ahead of current position, from -100 to -2000 relative
      positions[i * 3 + 2] = baseZ - 100 - Math.random() * 1900;
      
      // Varied star colors (white, blue, yellow) - brighter
      const colorType = Math.random();
      if (colorType < 0.5) {
        // White
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0;
      } else if (colorType < 0.8) {
        // Blue
        colors[i * 3] = 0.7 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 1.0;
      } else {
        // Yellow/orange
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 0.6 + Math.random() * 0.3;
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 2,  // Same as Level 0
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false
    });
    
    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  createSpeedLines() {
    const lineCount = 50;
    const positions = new Float32Array(lineCount * 6);
    
    for (let i = 0; i < lineCount; i++) {
      const x = (Math.random() - 0.5) * this.mapWidth * 3;
      const y = Math.random() * 15 - 5;
      const z = Math.random() * -100;
      
      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z + 5;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.0
    });
    
    this.speedLines = new THREE.LineSegments(geometry, material);
    this.scene.add(this.speedLines);
  }

  /**
   * Spawn wave with 3x3 grid-based placement
   */
  spawnWave(z) {
    if (this.entities.length >= this.maxActiveEntities) return;
    if (this.isInLightSpeedSequence) return;
    
    const difficulty = this.difficultyMultiplier;
    
    // Grid-based spawning: spawn obstacles in specific lanes
    const lanes = [
      { x: -this.gridLaneWidth, y: this.gridLaneHeight },   // Top-left (0)
      { x: 0, y: this.gridLaneHeight },                      // Top-center (1)
      { x: this.gridLaneWidth, y: this.gridLaneHeight },    // Top-right (2)
      { x: -this.gridLaneWidth, y: 0 },                      // Middle-left (3)
      { x: 0, y: 0 },                                         // Middle-center (4)
      { x: this.gridLaneWidth, y: 0 },                       // Middle-right (5)
      { x: -this.gridLaneWidth, y: -this.gridLaneHeight },  // Bottom-left (6)
      { x: 0, y: -this.gridLaneHeight },                     // Bottom-center (7)
      { x: this.gridLaneWidth, y: -this.gridLaneHeight }    // Bottom-right (8)
    ];
    
    // Shuffle lanes array to ensure equal distribution across all rows
    const shuffledLanes = lanes.map((lane, idx) => ({ lane, idx, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(item => item.idx);
    
    // Randomly select lanes to place obstacles (leave some clear)
    const obstacleCount = Math.floor(2 + Math.random() * 3 * difficulty);  // More obstacles
    const usedLanes = new Set();
    
    // Always leave at least 2 lanes clear for player to pass
    const maxObstacles = Math.min(obstacleCount, 7);
    
    for (let i = 0; i < maxObstacles && this.entities.length < this.maxActiveEntities; i++) {
      // Use shuffled order to pick lanes evenly
      let laneIndex = shuffledLanes[i % shuffledLanes.length];
      let attempts = 0;
      while (usedLanes.has(laneIndex) && attempts < lanes.length) {
        laneIndex = shuffledLanes[(i + attempts) % shuffledLanes.length];
        attempts++;
      }
      if (usedLanes.has(laneIndex)) continue;
      usedLanes.add(laneIndex);
      
      const lane = lanes[laneIndex];
      const pos = new THREE.Vector3(
        lane.x + (Math.random() - 0.5) * 2,
        lane.y + (Math.random() - 0.5) * 1.5,
        z + (Math.random() - 0.5) * 10
      );
      
      const size = 1.2 + Math.random() * 1.0;  // Bigger meteors (was 0.8-1.6, now 1.2-2.2)
      // Use procedural meteors (no 3D models) for performance
      const meteor = new Meteor(this.scene, this.engine.physicsSystem, pos, size, null, false);
      this.entities.push(meteor);
    }
    
    // Photons - distribute evenly across ALL lanes (including bottom)
    const clearLanes = lanes.filter((_, idx) => !usedLanes.has(idx));
    const photonCount = Math.min(1 + Math.floor(Math.random() * 2), clearLanes.length);
    
    // Prioritize lanes by row: alternate between top, middle, bottom
    // This ensures photons appear in bottom lanes too
    const lanesByRow = {
      bottom: clearLanes.filter((_, idx) => {
        const originalIdx = lanes.findIndex(l => l.y === -this.gridLaneHeight && clearLanes[idx] === l) !== -1;
        return clearLanes[idx].y === -this.gridLaneHeight;
      }),
      middle: clearLanes.filter((_, idx) => clearLanes[idx].y === 0),
      top: clearLanes.filter((_, idx) => clearLanes[idx].y === this.gridLaneHeight)
    };
    
    // Rotate through rows to ensure even distribution
    const rowOrder = ['bottom', 'middle', 'top'];
    const photonRotation = Math.floor(this.gameTime) % 3;  // Rotate which row gets priority
    
    for (let i = 0; i < photonCount && this.entities.length < this.maxActiveEntities; i++) {
      // Pick row in rotating order
      const rowKey = rowOrder[(photonRotation + i) % 3];
      const rowLanes = lanesByRow[rowKey];
      
      let lane;
      if (rowLanes.length > 0) {
        lane = rowLanes[Math.floor(Math.random() * rowLanes.length)];
      } else {
        // Fallback to any clear lane
        lane = clearLanes[i % clearLanes.length];
      }
      
      if (!lane) continue;
      
      const pos = new THREE.Vector3(
        lane.x + (Math.random() - 0.5) * 2,
        lane.y + (Math.random() - 0.5) * 1,
        z + (Math.random() - 0.5) * 8
      );
      
      const photon = new Photon(this.scene, this.engine.physicsSystem, pos);
      this.entities.push(photon);
    }
    
    // Black hole spawning
    const distanceSinceLastBlackHole = this.lastBlackHoleZ - z;
    if (Math.random() < this.blackHoleSpawnChance && 
        difficulty > this.blackHoleMinDifficulty &&
        distanceSinceLastBlackHole > this.blackHoleMinSpacing &&
        this.entities.length < this.maxActiveEntities - 5) {
      
      // Place black hole between lanes
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * this.gridLaneWidth * 2,
        (Math.random() - 0.5) * this.gridLaneHeight,
        z
      );
      
      const size = 4 + Math.random() * 2;
      const blackHole = new BlackHole(this.scene, this.engine.physicsSystem, pos, size);
      this.entities.push(blackHole);
      this.lastBlackHoleZ = z;
    }
  }

  update(deltaTime) {
    // STOP everything when game is paused (level complete)
    if (this.gamePaused) return;
    
    this.gameTime += deltaTime;
    
    // === LIGHT SPEED SEQUENCE MODE ===
    if (this.isInLightSpeedSequence) {
      this.updateLightSpeedSequence(deltaTime);
      return;
    }
    
    // Normal gameplay
    this.updatePlayer(deltaTime);
    
    // Update entities
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      if (entity.update && !entity.destroyed) {
        entity.update(deltaTime, this.player?.mesh.position);
      }
    }
    
    this.updateProceduralSpawning();
    this.cleanupPassedObjects();
    this.updateSpeedLines(deltaTime);
    this.updateStarfield(deltaTime);
    this.updateGridIndicators(deltaTime);
    this.handleCollisions();
    this.handleBlackHoleGravity(deltaTime);
    this.updateShadowComets(deltaTime);
    this.updateSlingshotEffect(deltaTime);
    this.updateSlowDebuff(deltaTime);  // Handle comet slow effect
    
    // Invulnerability flash
    if (this.invulnerableTime > 0) {
      this.invulnerableTime -= deltaTime;
      this.player.mesh.visible = Math.sin(this.gameTime * 30) > 0;
    } else {
      this.player.mesh.visible = true;
    }
    
    // Speed visual effects (vignette + FOV) - applies when moving fast
    this.updateSpeedEffects(deltaTime);
    
    // Screen shake for impacts/danger only (not from speed)
    if (this.screenShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
      this.engine.cameraSystem.camera.position.x += shakeX;
      this.engine.cameraSystem.camera.position.y += shakeY;
      this.screenShakeIntensity *= 0.92; // Decay
      if (this.screenShakeIntensity < 0.01) this.screenShakeIntensity = 0;
    }
    
    // Win condition - must sustain max speed
    if (this.currentSpeed >= this.maxSpeed) {
      this.maxSpeedSustainedTime += deltaTime;
      if (this.maxSpeedSustainedTime >= this.maxSpeedRequiredDuration && !this.lightSpeedTriggered) {
        this.triggerLightSpeedBreak();
      }
    } else {
      // Reset counter if speed drops below max
      this.maxSpeedSustainedTime = 0;
    }
    
    // Difficulty scaling
    this.difficultyMultiplier = Math.min(
      this.maxDifficulty,
      1 + (this.currentSpeed / this.maxSpeed) * 1.5
    );
    
    // Input cooldown
    if (this.inputCooldown > 0) {
      this.inputCooldown -= deltaTime;
    }
  }

  updateGridIndicators(deltaTime) {
    if (!this.gridIndicators) return;
    
    const playerZ = this.player.mesh.position.z;
    this.gridIndicators.position.z = playerZ - 50;
    
    // Fade based on speed
    const opacity = 0.1 + (1 - this.currentSpeed / this.maxSpeed) * 0.1;
    this.gridIndicators.children.forEach(child => {
      child.material.opacity = opacity;
    });
  }

  updatePlayer(deltaTime) {
    if (!this.player) return;
    
    const inputManager = this.engine.inputManager;
    
    // === GRID-BASED MOVEMENT ===
    if (this.inputCooldown <= 0) {
      let moved = false;
      
      // Left/Right lane change
      if (inputManager.justPressed('a') || inputManager.isPressed('a')) {
        if (this.currentLaneX > 0) {
          this.currentLaneX--;
          moved = true;
        }
      } else if (inputManager.justPressed('d') || inputManager.isPressed('d')) {
        if (this.currentLaneX < 2) {
          this.currentLaneX++;
          moved = true;
        }
      }
      
      // Up/Down lane change
      if (inputManager.justPressed('w') || inputManager.isPressed('w')) {
        if (this.currentLaneY < 2) {
          this.currentLaneY++;
          moved = true;
        }
      } else if (inputManager.justPressed('s') || inputManager.isPressed('s')) {
        if (this.currentLaneY > 0) {
          this.currentLaneY--;
          moved = true;
        }
      }
      
      if (moved) {
        this.inputCooldown = this.inputCooldownMax;
        this.engine.audioSystem?.playNote('E4', 0.05, { type: 'sine' });
      }
    }
    
    // Calculate target position based on current lane
    const targetX = (this.currentLaneX - 1) * this.gridLaneWidth;
    const targetY = (this.currentLaneY - 1) * this.gridLaneHeight;
    
    // Smooth movement to target lane
    const currentX = this.player.body.position.x;
    const currentY = this.player.body.position.y;
    
    const lerpSpeed = this.laneTransitionSpeed * deltaTime;
    this.player.body.position.x += (targetX - currentX) * Math.min(lerpSpeed, 1);
    this.player.body.position.y += (targetY - currentY) * Math.min(lerpSpeed, 1);
    
    // === SLINGSHOT INPUT (F key - only works in the narrow slingshot zone) ===
    if (inputManager.justPressed('f') && this.canSlingshot && this.slingshotCooldown <= 0) {
      this.activateSlingshot();
    }
    
    // Auto-forward with speed boost if slingshot active
    // Higher light speed % = FASTER flying
    const speedPercent = this.currentSpeed / this.maxSpeed;  // 0 to 1
    let forwardSpeed = 8 + speedPercent * 30;  // 8 at 0%, 38 at 100%
    if (this.slingshotDuration > 0) {
      forwardSpeed *= this.slingshotBoostMultiplier;
    }
    this.player.body.position.z -= forwardSpeed * deltaTime;
    
    // Passive acceleration
    const passiveCap = this.maxSpeed * 0.35;
    if (this.currentSpeed < passiveCap) {
      this.currentSpeed += this.baseAcceleration * deltaTime;
    }
    this.currentSpeed = Math.min(this.currentSpeed, this.maxSpeed);
    
    // Sync mesh position
    this.player.mesh.position.copy(this.player.body.position);
    
    // Player rotation - ALWAYS rotate when flying (visible spinning)
    this.player.mesh.rotation.x += deltaTime * 1.2;  // Faster X rotation
    this.player.mesh.rotation.y += deltaTime * 1.8;  // Faster Y rotation  
    this.player.mesh.rotation.z += deltaTime * 0.5;  // Moderate Z rotation
    
    // Particle trail
    if (this.player.particleTrail) {
      this.player.particleTrail.update(deltaTime, this.player.mesh.position);
    }
    
    // Pulse handling (not slingshot, just visual)
    this.player.activePulses.forEach((pulse, index) => {
      if (!pulse.update(deltaTime)) {
        this.player.activePulses.splice(index, 1);
      }
    });
    
    if (this.player.pulseCooldown > 0) {
      this.player.pulseCooldown -= deltaTime;
    }
    
    // Energy decay
    this.player.currentLumen -= (this.player.energyDecayRate || 0.05) * deltaTime;
    this.player.currentLumen = Math.max(0, this.player.currentLumen);
    
    // Visual speed effects
    this.updatePlayerVisuals();
  }

  updatePlayerVisuals() {
    const speedRatio = this.currentSpeed / this.maxSpeed;
    
    // Emissive intensity based on speed - start with good base glow like Level 0
    this.player.mesh.material.emissiveIntensity = 2 + speedRatio * 2;
    this.player.light.intensity = 3 + speedRatio * 4;
    this.player.light.distance = 10 + speedRatio * 10;
    
    // Default: Keep original orange color from Player.js (0xffaa00)
    this.player.mesh.material.emissive.setHex(0xffaa00);
    this.player.light.color.setHex(0xffaa00);
    
    // Slingshot boost visual - override to cyan
    if (this.slingshotDuration > 0) {
      this.player.mesh.material.emissive.setHex(0x00ffaa);
      this.player.light.color.setHex(0x00ffaa);
      this.player.mesh.material.emissiveIntensity = 3;
    }
    // Black hole pull warning - override to red
    else if (this.isBeingPulled) {
      const pullFlash = Math.sin(this.gameTime * 15) * 0.3 + 0.7;
      this.player.mesh.material.emissive.setRGB(1 * pullFlash, 0.3 * pullFlash, 0.3 * pullFlash);
    }
  }

  activateSlingshot() {
    if (!this.nearestBlackHole) return;
    
    console.log('🚀 SLINGSHOT BOOST!');
    
    // Boost speed significantly
    this.currentSpeed = Math.min(this.maxSpeed, this.currentSpeed + 25);
    
    // Activate slingshot effect
    this.slingshotDuration = 1.5; // 1.5 seconds of boost
    this.slingshotCooldown = 3.0; // 3 second cooldown
    this.isBeingPulled = false;
    
    // Visual feedback - no shake, just audio
    this.engine.audioSystem?.playNote('C6', 0.2, { type: 'sine' });
    
    // Flash effect
    if (this.engine.bloomPass) {
      this.engine.bloomPass.strength = 2.5;
    }
  }

  updateSlingshotEffect(deltaTime) {
    if (this.slingshotDuration > 0) {
      this.slingshotDuration -= deltaTime;
      
      // Gradually reduce boost
      if (this.slingshotDuration <= 0) {
        this.slingshotDuration = 0;
      }
    }
    
    if (this.slingshotCooldown > 0) {
      this.slingshotCooldown -= deltaTime;
    }
  }

  updateSlowDebuff(deltaTime) {
    // Handle comet slow debuff
    if (this.slowDebuffTime > 0) {
      this.slowDebuffTime -= deltaTime;
      
      // Keep player slowed
      this.player.speed = this.player.baseSpeed * 0.4;
      
      // Visual feedback - purple tint flicker
      if (Math.sin(this.gameTime * 10) > 0) {
        this.player.mesh.material.emissive.setHex(0x6600aa);
      }
      
      if (this.slowDebuffTime <= 0) {
        // Restore normal speed
        this.player.speed = this.player.baseSpeed;
        this.slowDebuffTime = 0;
        console.log('⚡ Speed restored!');
      }
    }
  }

  /**
   * Light Speed Break sequence - epic flight to portal with screen effects
   */
  updateLightSpeedSequence(deltaTime) {
    this.lightSpeedSequenceTime += deltaTime;
    
    // Hide grid indicators during end sequence
    if (this.gridIndicators && this.gridIndicators.visible) {
      this.gridIndicators.visible = false;
    }
    
    // Keep speed lines visible with max intensity
    if (this.speedLines && !this.speedLines.visible) {
      this.speedLines.visible = true;
      this.speedLines.material.opacity = 1.0;
    }
    
    // Ultra-fast forward movement
    const ultraSpeed = 60;
    this.player.body.position.z -= ultraSpeed * deltaTime;
    this.player.mesh.position.copy(this.player.body.position);
    
    // Gentle screen shake - reduced intensity
    const shakeIntensity = 0.15 + Math.sin(this.lightSpeedSequenceTime * 6) * 0.08;
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;
    this.engine.cameraSystem.camera.position.x += shakeX;
    this.engine.cameraSystem.camera.position.y += shakeY;
    
    // Gentle centering
    this.player.body.position.x *= 0.96;
    this.player.body.position.y *= 0.96;
    
    // Player rotation - continuous spinning during light speed
    this.player.mesh.rotation.x += deltaTime * 2.0;  // Faster during light speed
    this.player.mesh.rotation.y += deltaTime * 3.0;
    this.player.mesh.rotation.z += deltaTime * 1.0;
    
    // Update particle trail
    if (this.player.particleTrail) {
      this.player.particleTrail.update(deltaTime, this.player.mesh.position);
    }
    
    // Update speed lines (max intensity)
    this.updateSpeedLines(deltaTime);
    this.updateStarfield(deltaTime);
    
    // Keep player color consistent - bright cyan/white at max speed
    // No rainbow cycling
    this.player.mesh.material.emissiveIntensity = 3.5;
    this.player.light.intensity = 8;
    this.player.mesh.material.emissive.setRGB(0.5, 0.9, 1.0); // Bright cyan
    this.player.light.color.setRGB(0.5, 0.9, 1.0);
    
    // Keep background consistent - no color shift
    this.scene.background = new THREE.Color(0x0a0e27); // Same as normal gameplay
    
    // Update portal
    if (this.finalPortal) {
      this.finalPortal.update(deltaTime, this.player.mesh.position);
      
      // Portal handles its own collision and transition via Portal.js
    }
    
    // Bloom pulsing
    if (this.engine.bloomPass) {
      this.engine.bloomPass.strength = 2.5 + Math.sin(this.lightSpeedSequenceTime * 4) * 0.8;
    }
    
    // Time limit check - if portal not reached, force portal enter
    if (this.lightSpeedSequenceTime >= this.lightSpeedDuration + 2 && !this.isComplete) {
      this.onPortalEnter();
    }
  }

  triggerLightSpeedBreak() {
    if (this.lightSpeedTriggered) return;
    this.lightSpeedTriggered = true;
    
    console.log('🌟 LIGHT SPEED BREAK! Maximum velocity achieved!');
    
    // Smoothly clear obstacles over time instead of instant
    this.entities.forEach(entity => {
      if (!entity.destroyed) {
        entity.destroy();
      }
    });
    this.entities = [];
    
    // Spawn epic portal
    this.spawnFinalPortal();
    
    // Gradual bloom increase instead of sudden
    if (this.engine.bloomPass) {
      const originalStrength = this.engine.bloomPass.strength;
      this.engine.bloomPass.strength = originalStrength + 2; // Gentler increase
    }
    
    // Keep background consistent - no sudden change
    // this.scene.background stays the same
    
    // Speed lines gradually increase brightness
    if (this.speedLines) {
      this.speedLines.material.opacity = 1.0;
      this.speedLines.material.color.setHex(0xaaeeff);
    }
    
    // Play epic sound
    this.engine.audioSystem?.playNote('C5', 0.5, { type: 'sine' });
    setTimeout(() => {
      this.engine.audioSystem?.playNote('E5', 0.4, { type: 'sine' });
    }, 150);
    setTimeout(() => {
      this.engine.audioSystem?.playNote('G5', 0.3, { type: 'sine' });
    }, 300);
    
    // Create screen edge glow effect
    this.createEdgeGlow();
    
    // Enter light speed sequence
    this.isInLightSpeedSequence = true;
  }

  createEdgeGlow() {
    // Create glowing borders around screen (in 3D space)
    this.edgeGlow = new THREE.Group();
    
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x66aaff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    // Create rectangular frame
    const frameWidth = 50;
    const frameHeight = 30;
    const thickness = 2;
    
    // Top edge
    const topGeo = new THREE.PlaneGeometry(frameWidth, thickness);
    const topEdge = new THREE.Mesh(topGeo, glowMaterial.clone());
    topEdge.position.y = frameHeight / 2;
    this.edgeGlow.add(topEdge);
    
    // Bottom edge
    const bottomEdge = new THREE.Mesh(topGeo, glowMaterial.clone());
    bottomEdge.position.y = -frameHeight / 2;
    this.edgeGlow.add(bottomEdge);
    
    // Left edge
    const sideGeo = new THREE.PlaneGeometry(thickness, frameHeight);
    const leftEdge = new THREE.Mesh(sideGeo, glowMaterial.clone());
    leftEdge.position.x = -frameWidth / 2;
    this.edgeGlow.add(leftEdge);
    
    // Right edge
    const rightEdge = new THREE.Mesh(sideGeo, glowMaterial.clone());
    rightEdge.position.x = frameWidth / 2;
    this.edgeGlow.add(rightEdge);
    
    // Position relative to camera
    this.edgeGlow.position.z = -30;
    this.engine.cameraSystem.camera.add(this.edgeGlow);
  }

  spawnFinalPortal() {
    const portalZ = this.player.mesh.position.z - this.portalDistance;
    
    // Use Portal.js entity - same as Level 0 for consistency
    this.finalPortal = new Portal(
      this.scene,
      this.engine.physicsSystem,
      new THREE.Vector3(0, 0, portalZ),
      this.engine  // Pass engine for level transition
    );
    
    // Override portal's default transition to show Chapter 1 specific message
    this.finalPortal.triggerWhiteFlashTransition = () => {
      this.onPortalEnter();
    };
    
    console.log('🌀 Final portal spawned using Portal.js!');
  }

  onPortalEnter() {
    if (this.isComplete) return;
    this.isComplete = true;
    
    console.log('🌀 Entering portal! Level Complete!');
    
    // Remove edge glow if exists
    if (this.edgeGlow) {
      this.engine.cameraSystem.camera.remove(this.edgeGlow);
    }
    
    // White flash overlay - SAME STYLE AS LEVEL 0 PORTAL
    const overlay = document.createElement('div');
    overlay.id = 'portal-flash';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: white;
      opacity: 0;
      z-index: 9999;
      pointer-events: none;
      transition: opacity 0.5s ease;
    `;
    document.body.appendChild(overlay);
    
    // Fade in white
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 50);
    
    // Show "Chapter Complete" message - matching Chapter 0 style
    setTimeout(() => {
      overlay.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          font-family: 'Courier New', monospace;
          color: #000;
          text-align: center;
        ">
          <h1 style="font-size: 48px; margin-bottom: 20px;">✨ CHAPTER COMPLETE ✨</h1>
          <p style="font-size: 24px; color: #666;">The Ascent has been conquered.</p>
        </div>
      `;
    }, 500);
    
    // Transition after showing message (ready for next chapter when implemented)
    // KEEP the overlay and STOP the game - don't continue flying
    setTimeout(() => {
      // Don't remove overlay - keep the end screen visible
      // Pause the engine so player stops flying
      this.gamePaused = true;  // Flag to stop update loop
      console.log('🎮 Game complete! Next level coming soon...');
    }, 3500);
  }

  updateProceduralSpawning() {
    if (this.isInLightSpeedSequence) return;
    
    const playerZ = this.player.mesh.position.z;
    const targetSpawnZ = playerZ - this.spawnAheadDistance;
    
    while (this.lastSpawnZ > targetSpawnZ) {
      this.lastSpawnZ -= this.spawnInterval;
      this.spawnWave(this.lastSpawnZ);
    }
  }

  cleanupPassedObjects() {
    const playerZ = this.player.mesh.position.z;
    const cleanupZ = playerZ + this.despawnBehindDistance;
    
    // Also check if objects are too far ahead (shouldn't happen but safety check)
    const maxAheadZ = playerZ - this.spawnAheadDistance - 30;
    
    this.entities = this.entities.filter(entity => {
      // Remove if passed behind player
      if (entity.mesh && entity.mesh.position.z > cleanupZ) {
        entity.destroy();
        return false;
      }
      // Remove if somehow too far ahead (edge case)
      if (entity.mesh && entity.mesh.position.z < maxAheadZ) {
        entity.destroy();
        return false;
      }
      return !entity.destroyed;
    });
  }

  updateSpeedLines(deltaTime) {
    if (!this.speedLines) return;
    
    const speedRatio = this.isInLightSpeedSequence ? 1 : this.currentSpeed / this.maxSpeed;
    this.speedLines.material.opacity = speedRatio * 0.6;
    
    const positions = this.speedLines.geometry.attributes.position.array;
    const playerZ = this.player.mesh.position.z;
    
    for (let i = 0; i < positions.length / 6; i++) {
      positions[i * 6 + 2] = playerZ - 15 - Math.random() * 60;
      positions[i * 6 + 5] = positions[i * 6 + 2] + 3 + speedRatio * 12;
    }
    
    this.speedLines.geometry.attributes.position.needsUpdate = true;
  }

  updateSpeedEffects(deltaTime) {
    const speedRatio = this.isInLightSpeedSequence ? 1 : this.currentSpeed / this.maxSpeed;
    
    // Vignette overlay intensity based on speed
    if (this.speedOverlay) {
      if (speedRatio > 0.3) {
        this.speedOverlay.classList.add('active');
        const intensity = (speedRatio - 0.3) / 0.7;  // 0-1 range above 30% speed
        this.speedOverlay.style.opacity = intensity * 0.8;
      } else {
        this.speedOverlay.classList.remove('active');
        this.speedOverlay.style.opacity = 0;
      }
    }
    
    // Dynamic FOV increase with speed
    if (this.targetFov !== undefined) {
      this.targetFov = this.baseFov + speedRatio * 15;  // 75 to 90 FOV
      const currentFov = this.engine.cameraSystem.camera.fov;
      const newFov = currentFov + (this.targetFov - currentFov) * deltaTime * 3;
      this.engine.cameraSystem.camera.fov = newFov;
      this.engine.cameraSystem.camera.updateProjectionMatrix();
    }
  }

  updateStarfield(deltaTime) {
    if (!this.starfield) return;
    
    const playerZ = this.player.mesh.position.z;
    const positions = this.starfield.geometry.attributes.position.array;
    const starCount = positions.length / 3;
    
    // Aggressively recycle stars to maintain continuous field ahead
    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const starZ = positions[idx + 2];
      
      // Recycle if star is more than 300 units behind player
      // OR more than 2000 units ahead (refresh cycling)
      const isBehind = starZ > playerZ + 300;
      const isTooFarAhead = starZ < playerZ - 2000;
      
      if (isBehind || isTooFarAhead) {
        // Place stars in wide zone ahead of player (100-1800 units ahead)
        // This ensures continuous visibility even at high speed
        const radius = 100 + Math.random() * 400;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[idx] = Math.sin(phi) * Math.cos(theta) * radius;
        positions[idx + 1] = Math.sin(phi) * Math.sin(theta) * radius;
        positions[idx + 2] = playerZ - 100 - Math.random() * 1700;  // 100-1800 units ahead
      }
    }
    
    this.starfield.geometry.attributes.position.needsUpdate = true;
  }

  handleCollisions() {
    if (!this.player || this.invulnerableTime > 0) return;
    
    const playerPos = this.player.mesh.position;
    const playerRadius = 0.5;
    
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      if (entity.destroyed || entity.collected) continue;
      
      const entityPos = entity.mesh?.position;
      if (!entityPos) continue;
      
      const distance = playerPos.distanceTo(entityPos);
      
      if (entity instanceof Photon && distance < 1.5) {
        const boost = entity.collect();
        this.currentSpeed = Math.min(this.currentSpeed + boost, this.maxSpeed);
        this.engine.audioSystem.playNote('C5', 0.1, { type: 'sine' });
        this.player.currentLumen = Math.min(this.player.currentLumen + 5, this.player.maxLumen);
      }
      
      if (entity instanceof Meteor && distance < entity.size + playerRadius) {
        this.onMeteorHit(entity);
        break; // One hit per frame
      }
      
      if (entity instanceof ShadowComet && entity.active) {
        // Comet hitbox: Check if player is in same Y lane AND within Z range
        // This makes the whole row dangerous when warning appears
        const yDiff = Math.abs(playerPos.y - entity.mesh.position.y);
        const zDiff = Math.abs(playerPos.z - entity.mesh.position.z);
        
        // Player is hit if:
        // - Same Y lane (within 1.5 units)
        // - Close on Z axis (within 3 units)
        // - Comet is active and crossing screen
        if (yDiff < 1.5 && zDiff < 3) {
          this.onShadowCometHit(entity);
          break;
        }
      }
    }
  }

  handleBlackHoleGravity(deltaTime) {
    if (!this.player) return;
    
    // IF SLINGSHOT IS ACTIVE - PLAYER IS IMMUNE TO ALL BLACK HOLE EFFECTS
    if (this.slingshotDuration > 0) {
      this.isBeingPulled = false;
      this.canSlingshot = false;
      return;  // Skip all black hole gravity while boosting
    }
    
    const playerPos = this.player.mesh.position;
    this.isBeingPulled = false;
    this.nearestBlackHole = null;
    this.canSlingshot = false;  // Reset each frame
    let nearestDist = Infinity;
    
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      if (!(entity instanceof BlackHole) || entity.destroyed) continue;
      
      const bhPos = entity.mesh.position;
      const dist = playerPos.distanceTo(bhPos);
      
      // Track nearest black hole
      if (dist < nearestDist) {
        nearestDist = dist;
        this.nearestBlackHole = entity;
      }
      
      // Zone definitions
      const pullRange = entity.slingshotRadius * 1.3;        // Max pull range
      const greenRingInner = entity.slingshotRadius * 0.85;  // Inner edge of green ring
      const greenRingOuter = entity.slingshotRadius;         // Outer edge of green ring
      const dangerZone = entity.trapRadius;                  // Red ring zone
      
      if (dist < pullRange) {
        // Calculate pull direction toward black hole
        const direction = new THREE.Vector3().subVectors(bhPos, playerPos).normalize();
        
        if (dist < dangerZone) {
          // DANGER ZONE (RED RING) - Very strong pull, massive speed loss
          this.isBeingPulled = true;
          this.pullIntensity = 1.0;
          this.canSlingshot = false;
          
          // Heavy speed penalty
          this.currentSpeed = Math.max(3, this.currentSpeed - 70 * deltaTime);
          
          // Strong pull force
          const pullStrength = 25 * deltaTime;
          this.player.body.position.x += direction.x * pullStrength;
          this.player.body.position.y += direction.y * pullStrength;
          
          // Intense screen shake
          this.screenShakeIntensity = Math.max(this.screenShakeIntensity, 0.5);
          
          // Warning sound
          if (Math.random() < 0.15) {
            this.engine.audioSystem?.playNote('C2', 0.15, { type: 'sawtooth' });
          }
          
          // Flash red - DANGER
          this.player.mesh.material.emissive.setHex(0xff2222);
          
        } else if (dist >= greenRingInner && dist <= greenRingOuter) {
          // IN GREEN RING - Check which half of the ring player is on
          // Player approaching = black hole Z is less than player Z (ahead of player)
          const isApproaching = bhPos.z < playerPos.z;
          
          this.isBeingPulled = true;
          this.pullIntensity = 0.6;
          
          // Allow slingshot anywhere in green ring as long as player is still approaching the black hole
          this.canSlingshot = isApproaching && this.slingshotCooldown <= 0;
          
          // Moderate pull
          const pullStrength = 10 * deltaTime;
          this.player.body.position.x += direction.x * pullStrength;
          this.player.body.position.y += direction.y * pullStrength;
          
          // Some speed reduction
          this.currentSpeed = Math.max(8, this.currentSpeed - 15 * deltaTime);
          
          // Flash GREEN if can slingshot!
          if (isNearHalfOfRing && this.slingshotCooldown <= 0) {
            this.player.mesh.material.emissive.setHex(0x00ff88);
          } else {
            // Yellow/Orange if in green ring but WRONG HALF (far side)
            this.player.mesh.material.emissive.setHex(0xffaa44);
          }
          
        } else if (dist < entity.slingshotRadius) {
          // OUTER ZONES - Gravitational pull but NO slingshot here
          this.isBeingPulled = true;
          this.pullIntensity = 0.4;
          this.canSlingshot = false;
          
          // Moderate pull
          const pullStrength = 8 * deltaTime;
          this.player.body.position.x += direction.x * pullStrength;
          this.player.body.position.y += direction.y * pullStrength;
          
          // Light speed reduction
          this.currentSpeed = Math.max(10, this.currentSpeed - 10 * deltaTime);
          
          // Flash yellow - warning, approaching
          this.player.mesh.material.emissive.setHex(0xffaa44);
          
        } else {
          // FAR OUTER RANGE - Light gravitational influence only
          this.isBeingPulled = true;
          this.pullIntensity = 0.2;
          this.canSlingshot = false;
          
          // Very light pull
          const pullStrength = 4 * deltaTime;
          this.player.body.position.x += direction.x * pullStrength;
          this.player.body.position.y += direction.y * pullStrength;
        }
      }
    }
    
    // Update player mesh position
    this.player.mesh.position.copy(this.player.body.position);
  }

  updateShadowComets(deltaTime) {
    if (this.isInLightSpeedSequence) return;
    
    if (this.gameTime >= this.nextCometTime && this.entities.length < this.maxActiveEntities - 5) {
      // Calculate player's current forward speed
      const speedPercent = this.currentSpeed / this.maxSpeed;
      const playerSpeed = 8 + speedPercent * 30;  // Current forward speed
      
      // Comet mechanics:
      // - Warning time: 1.5s
      // - Comet speed: 80 units/s horizontally
      // - Comet travels from X=50 to X=-50 (or vice versa) = 100 units
      // - Comet travel time: 100/80 = 1.25s
      // 
      // We want: Player arrives at targetZ exactly when comet is crossing (middle of screen)
      // Total time for comet to reach center: warningTime + (50/cometSpeed) = 1.5 + 0.625 = 2.125s
      // Distance player travels in that time: playerSpeed * 2.125
      
      const warningTime = 1.5;
      const cometSpeed = 80;
      const timeToCenter = warningTime + (50 / cometSpeed);  // Time until comet crosses center
      const distanceAhead = playerSpeed * timeToCenter;  // How far ahead to spawn
      
      // Spawn comet zone slightly ahead so player arrives when comets cross
      const targetZ = this.player.mesh.position.z - distanceAhead;
      
      // Spawn 3-4 comets spread across the zone
      const groupSize = 3 + Math.floor(Math.random() * 2);  // 3 or 4 comets
      const zSpacing = 3;  // Space between comets on Z axis
      
      // Random Y lane (one row of comets)
      const yPositions = [-this.gridLaneHeight, 0, this.gridLaneHeight];
      const rowY = yPositions[Math.floor(Math.random() * yPositions.length)];
      const direction = Math.random() > 0.5 ? 'left' : 'right';
      
      for (let i = 0; i < groupSize; i++) {
        // Spread comets along Z so they cross at slightly different times
        const cometZ = targetZ - (i - (groupSize - 1) / 2) * zSpacing;
        const comet = new ShadowComet(this.scene, this.engine.physicsSystem, cometZ, direction, rowY);
        this.entities.push(comet);
      }
      
      // Sound and shake for the wave
      this.engine.audioSystem.playNote('G4', 0.1, { type: 'triangle' });
      this.screenShakeIntensity = Math.max(this.screenShakeIntensity, 0.08);
      
      // Interval between waves - scale with difficulty
      this.nextCometTime = this.gameTime + (this.cometInterval * 1.5) / this.difficultyMultiplier;
    }
  }

  onMeteorHit(meteor) {
    this.currentSpeed = Math.max(0, this.currentSpeed - this.meteorSpeedPenalty);
    
    // Push player away from meteor
    const pushDir = new THREE.Vector3()
      .subVectors(this.player.mesh.position, meteor.mesh.position)
      .normalize();
    
    this.player.body.position.x += pushDir.x * 2;
    this.player.body.position.y += pushDir.y * 2;
    this.player.mesh.position.copy(this.player.body.position);
    
    this.screenShakeIntensity = 0.35;
    this.invulnerableTime = 0.5;
    this.engine.audioSystem?.playNote('C2', 0.2, { type: 'sawtooth' });
    this.player.currentLumen = Math.max(0, this.player.currentLumen - 5);
  }

  onShadowCometHit(comet) {
    // Speed penalty
    this.currentSpeed = Math.max(0, this.currentSpeed - comet.speedPenalty);
    
    // SLOW DEBUFF - reduces player movement speed temporarily
    this.player.speed = this.player.baseSpeed * 0.4;  // 60% slower movement
    this.slowDebuffTime = comet.slowDuration || 1.5;  // Slow for 1.5 seconds
    
    // Strong screen shake - annoying effect
    this.screenShakeIntensity = 0.6;
    this.invulnerableTime = 1.0;
    
    // Deep bass sound
    this.engine.audioSystem?.playNote('C1', 0.5, { type: 'sawtooth' });
    
    // Energy loss
    this.player.currentLumen = Math.max(0, this.player.currentLumen - 20);
    
    // Visual freeze effect - flash purple
    this.player.mesh.material.emissive.setHex(0x6600aa);
    
    console.log('💫 Comet hit! Slowed for ' + this.slowDebuffTime + 's');
  }

  checkWinCondition() {
    // Win requires sustained max speed, not instant
    return this.currentSpeed >= this.maxSpeed && this.maxSpeedSustainedTime >= this.maxSpeedRequiredDuration;
  }

  getSpeedPercentage() {
    return (this.currentSpeed / this.maxSpeed) * 100;
  }

  unload() {
    // Reset FOV to default
    if (this.engine.cameraSystem && this.engine.cameraSystem.camera) {
      this.engine.cameraSystem.camera.fov = 75;
      this.engine.cameraSystem.camera.updateProjectionMatrix();
    }
    
    // Hide speed overlay
    if (this.speedOverlay) {
      this.speedOverlay.classList.remove('active');
      this.speedOverlay.style.opacity = 0;
    }
    
    if (this.starfield) {
      this.scene.remove(this.starfield);
      this.starfield.geometry.dispose();
      this.starfield.material.dispose();
    }
    
    if (this.speedLines) {
      this.scene.remove(this.speedLines);
      this.speedLines.geometry.dispose();
      this.speedLines.material.dispose();
    }
    
    if (this.gridIndicators) {
      this.scene.remove(this.gridIndicators);
      this.gridIndicators.children.forEach(child => {
        child.geometry.dispose();
        child.material.dispose();
      });
    }
    
    if (this.nebulaBackground) {
      this.scene.remove(this.nebulaBackground);
      this.nebulaBackground.children.forEach(child => {
        child.geometry.dispose();
        child.material.dispose();
      });
    }
    
    if (this.edgeGlow) {
      this.engine.cameraSystem.camera.remove(this.edgeGlow);
      this.edgeGlow.children.forEach(child => {
        child.geometry.dispose();
        child.material.dispose();
      });
    }
    
    if (this.finalPortal) {
      // Use Portal.js destroy method
      this.finalPortal.destroy();
    }
    
    super.unload();
  }
}
