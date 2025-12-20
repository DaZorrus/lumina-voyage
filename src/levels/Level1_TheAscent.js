import * as THREE from 'three';
import { BaseLevel } from './BaseLevel.js';
import { Player } from '../entities/Player.js';
import { Meteor } from '../entities/Meteor.js';
import { Photon } from '../entities/Photon.js';
import { BlackHole } from '../entities/BlackHole.js';
import { ShadowComet } from '../entities/ShadowComet.js';

/**
 * Level1_TheAscent - High-speed obstacle dodge with 3x3 grid movement
 * Goal: Reach Light Speed by collecting photons and avoiding obstacles
 * 
 * Camera: Normal follow camera like Level 0
 * Core Loop: Move between grid lanes, collect photons, avoid meteors
 * Win Condition: Fill speed bar to 100% (Light Speed Break)
 */
export class Level1_TheAscent extends BaseLevel {
  constructor(engine) {
    super(engine);
    this.name = 'The Ascent';
    
    // Speed / Progress system
    this.currentSpeed = 0;
    this.maxSpeed = 100;           // Light speed threshold
    this.baseAcceleration = 2.0;   // Passive acceleration
    this.photonSpeedBoost = 8;     // Speed gained per photon
    this.meteorSpeedPenalty = 15;  // Speed lost per meteor hit
    
    // === 3x3 GRID SYSTEM ===
    this.gridLaneWidth = 6;        // Width of each lane
    this.gridLaneHeight = 4;       // Height of each lane
    this.currentLaneX = 1;         // 0=left, 1=center, 2=right
    this.currentLaneY = 1;         // 0=bottom, 1=center, 2=top
    this.laneTransitionSpeed = 15; // How fast to move between lanes
    this.isTransitioning = false;
    
    // === MAP BOUNDS ===
    this.mapWidth = this.gridLaneWidth * 1.5;  // Total playable width
    this.mapHeight = this.gridLaneHeight * 1.5; // Total playable height
    
    // === PROCEDURAL GENERATION ===
    this.spawnAheadDistance = 80;
    this.despawnBehindDistance = 25;
    this.lastSpawnZ = 0;
    this.spawnInterval = 25;       // Spacing between waves
    this.maxActiveEntities = 60;
    
    // === DIFFICULTY SCALING ===
    this.difficultyMultiplier = 1;
    this.maxDifficulty = 2.5;
    this.blackHoleSpawnChance = 0.08;
    this.blackHoleMinDifficulty = 1.3;
    this.lastBlackHoleZ = 0;
    this.blackHoleMinSpacing = 80;
    
    // Gameplay state
    this.gameTime = 0;
    this.invulnerableTime = 0;
    this.screenShakeIntensity = 0;
    this.lightSpeedTriggered = false;
    
    // === LIGHT SPEED BREAK STATE ===
    this.isInLightSpeedSequence = false;
    this.lightSpeedSequenceTime = 0;
    this.lightSpeedDuration = 4;   // 4 seconds of epic flight
    this.finalPortal = null;
    this.portalDistance = 400;
    
    // === SLINGSHOT MECHANIC ===
    this.slingshotActive = false;
    this.slingshotCooldown = 0;
    this.slingshotDuration = 0;
    this.slingshotBoostMultiplier = 2.5;
    
    // === BLACK HOLE PULL STATE ===
    this.isBeingPulled = false;
    this.pullIntensity = 0;
    this.nearestBlackHole = null;
    
    // Shadow comet tracking
    this.nextCometTime = 20;
    this.cometInterval = 15;
    
    // Input cooldowns for grid movement
    this.inputCooldown = 0;
    this.inputCooldownMax = 0.15;
  }

  setupEnvironment() {
    // Brighter space environment - easier to see
    this.scene.fog = new THREE.Fog(0x0a1428, 60, 200);
    this.scene.background = new THREE.Color(0x0a1428);
    
    this.createStarfield();
    this.createSpeedLines();
    this.createGridIndicators();
    this.createNebulaBackground();
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
    // Normal follow camera like Level 0
    this.engine.cameraSystem.offset = new THREE.Vector3(0, 8, 20);
    this.engine.cameraSystem.lookAheadOffset = new THREE.Vector3(0, 0, -15);
  }

  spawnObjects() {
    // Spawn initial waves with grid-based placement
    this.spawnWave(-40);
    this.spawnWave(-65);
    this.spawnWave(-90);
    console.log('🚀 Level 1 loaded: Race to Light Speed! Use WASD to move between lanes.');
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
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 120;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.3) * 100;
      positions[i * 3 + 2] = Math.random() * 400 - 200;
      
      // Varied star colors (white, blue, yellow)
      const colorType = Math.random();
      if (colorType < 0.5) {
        // White
        colors[i * 3] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 1.0;
      } else if (colorType < 0.8) {
        // Blue
        colors[i * 3] = 0.6 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
        colors[i * 3 + 2] = 1.0;
      } else {
        // Yellow/orange
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
      }
      
      sizes[i] = 1 + Math.random() * 2;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
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
      { x: -this.gridLaneWidth, y: this.gridLaneHeight },   // Top-left
      { x: 0, y: this.gridLaneHeight },                      // Top-center
      { x: this.gridLaneWidth, y: this.gridLaneHeight },    // Top-right
      { x: -this.gridLaneWidth, y: 0 },                      // Middle-left
      { x: 0, y: 0 },                                         // Middle-center
      { x: this.gridLaneWidth, y: 0 },                       // Middle-right
      { x: -this.gridLaneWidth, y: -this.gridLaneHeight },  // Bottom-left
      { x: 0, y: -this.gridLaneHeight },                     // Bottom-center
      { x: this.gridLaneWidth, y: -this.gridLaneHeight }    // Bottom-right
    ];
    
    // Randomly select lanes to place obstacles (leave some clear)
    const obstacleCount = Math.floor(2 + Math.random() * 3 * difficulty);
    const usedLanes = new Set();
    
    // Always leave at least 2 lanes clear for player to pass
    const maxObstacles = Math.min(obstacleCount, 7);
    
    for (let i = 0; i < maxObstacles && this.entities.length < this.maxActiveEntities; i++) {
      let laneIndex;
      do {
        laneIndex = Math.floor(Math.random() * lanes.length);
      } while (usedLanes.has(laneIndex));
      usedLanes.add(laneIndex);
      
      const lane = lanes[laneIndex];
      const pos = new THREE.Vector3(
        lane.x + (Math.random() - 0.5) * 2,
        lane.y + (Math.random() - 0.5) * 1.5,
        z + (Math.random() - 0.5) * 10
      );
      
      const size = 0.8 + Math.random() * 1.0;
      const meteor = new Meteor(this.scene, this.engine.physicsSystem, pos, size);
      this.entities.push(meteor);
    }
    
    // Photons - place in clear lanes to guide player
    const clearLanes = lanes.filter((_, idx) => !usedLanes.has(idx));
    const photonCount = Math.min(2 + Math.floor(Math.random() * 2), clearLanes.length);
    
    for (let i = 0; i < photonCount && this.entities.length < this.maxActiveEntities; i++) {
      const lane = clearLanes[i];
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
    
    // Invulnerability flash
    if (this.invulnerableTime > 0) {
      this.invulnerableTime -= deltaTime;
      this.player.mesh.visible = Math.sin(this.gameTime * 30) > 0;
    } else {
      this.player.mesh.visible = true;
    }
    
    // Screen shake decay
    if (this.screenShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
      this.engine.cameraSystem.camera.position.x += shakeX;
      this.engine.cameraSystem.camera.position.y += shakeY;
      this.screenShakeIntensity *= 0.9;
      if (this.screenShakeIntensity < 0.01) this.screenShakeIntensity = 0;
    }
    
    // Win condition
    if (this.checkWinCondition() && !this.lightSpeedTriggered) {
      this.triggerLightSpeedBreak();
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
    
    // === SLINGSHOT INPUT (F key near black hole edge) ===
    if (inputManager.justPressed('f') && this.isBeingPulled && this.slingshotCooldown <= 0) {
      this.activateSlingshot();
    }
    
    // Auto-forward with speed boost if slingshot active
    let forwardSpeed = 8 + (this.currentSpeed / this.maxSpeed) * 20;
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
    
    // Emissive intensity based on speed
    this.player.mesh.material.emissiveIntensity = 1 + speedRatio * 2.5;
    this.player.light.intensity = 2 + speedRatio * 4;
    this.player.light.distance = 8 + speedRatio * 12;
    
    // Blue shift color at high speed
    const r = 1 - speedRatio * 0.4;
    const g = 0.67 + speedRatio * 0.25;
    const b = 0.3 + speedRatio * 0.7;
    this.player.mesh.material.color.setRGB(r, g, b);
    this.player.mesh.material.emissive.setRGB(r, g, b);
    this.player.light.color.setRGB(r, g, b);
    
    // Slingshot boost visual
    if (this.slingshotDuration > 0) {
      this.player.mesh.material.emissive.setHex(0x00ffaa);
      this.player.light.color.setHex(0x00ffaa);
      this.player.mesh.material.emissiveIntensity = 3;
    }
    
    // Black hole pull warning
    if (this.isBeingPulled && this.slingshotDuration <= 0) {
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
    
    // Visual feedback
    this.screenShakeIntensity = 0.3;
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

  /**
   * Light Speed Break sequence - epic flight to portal with screen effects
   */
  updateLightSpeedSequence(deltaTime) {
    this.lightSpeedSequenceTime += deltaTime;
    
    // Ultra-fast forward movement
    const ultraSpeed = 60;
    this.player.body.position.z -= ultraSpeed * deltaTime;
    this.player.mesh.position.copy(this.player.body.position);
    
    // Dramatic edge screen shake
    const shakeIntensity = 0.5 + Math.sin(this.lightSpeedSequenceTime * 8) * 0.2;
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;
    this.engine.cameraSystem.camera.position.x += shakeX;
    this.engine.cameraSystem.camera.position.y += shakeY;
    
    // Gentle centering
    this.player.body.position.x *= 0.96;
    this.player.body.position.y *= 0.96;
    
    // Update particle trail
    if (this.player.particleTrail) {
      this.player.particleTrail.update(deltaTime, this.player.mesh.position);
    }
    
    // Update speed lines (max intensity)
    this.updateSpeedLines(deltaTime);
    this.updateStarfield(deltaTime);
    
    // Pulsing player glow
    const pulseIntensity = 3 + Math.sin(this.lightSpeedSequenceTime * 5) * 1;
    this.player.mesh.material.emissiveIntensity = pulseIntensity;
    this.player.light.intensity = 6 + Math.sin(this.lightSpeedSequenceTime * 5) * 2;
    
    // Rainbow color cycling
    const hue = (this.lightSpeedSequenceTime * 0.3) % 1;
    const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
    this.player.mesh.material.emissive.copy(color);
    this.player.light.color.copy(color);
    
    // Background color shift
    const bgHue = (this.lightSpeedSequenceTime * 0.1) % 1;
    const bgColor = new THREE.Color().setHSL(bgHue, 0.3, 0.08);
    this.scene.background = bgColor;
    
    // Update portal
    if (this.finalPortal) {
      this.finalPortal.update(deltaTime, this.player.mesh.position);
      
      // Check portal collision
      const distToPortal = this.player.mesh.position.distanceTo(this.finalPortal.mesh.position);
      if (distToPortal < 20) {
        this.onPortalEnter();
      }
    }
    
    // Bloom pulsing
    if (this.engine.bloomPass) {
      this.engine.bloomPass.strength = 2.5 + Math.sin(this.lightSpeedSequenceTime * 4) * 0.8;
    }
    
    // Time limit check
    if (this.lightSpeedSequenceTime >= this.lightSpeedDuration + 2) {
      this.onPortalEnter();
    }
  }

  triggerLightSpeedBreak() {
    if (this.lightSpeedTriggered) return;
    this.lightSpeedTriggered = true;
    
    console.log('🌟 LIGHT SPEED BREAK! Maximum velocity achieved!');
    
    // Clear all obstacles
    this.entities.forEach(entity => {
      if (!entity.destroyed) {
        entity.destroy();
      }
    });
    this.entities = [];
    
    // Spawn epic portal
    this.spawnFinalPortal();
    
    // Initial flash effect
    if (this.engine.bloomPass) {
      this.engine.bloomPass.strength = 6;
    }
    
    // Brighter background
    this.scene.background = new THREE.Color(0x1a2244);
    
    // Speed lines at max with bright color
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
    
    // Create epic portal
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, portalZ);
    
    // Main ring - larger and more dramatic
    const ringGeo = new THREE.TorusGeometry(20, 1.2, 32, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 1.0
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    portalGroup.add(ring);
    
    // Secondary spinning ring
    const ring2Geo = new THREE.TorusGeometry(22, 0.5, 16, 48);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI * 0.3;
    portalGroup.add(ring2);
    
    // Third ring
    const ring3Geo = new THREE.TorusGeometry(24, 0.3, 16, 48);
    const ring3Mat = new THREE.MeshBasicMaterial({
      color: 0xff44aa,
      transparent: true,
      opacity: 0.6
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.y = Math.PI * 0.4;
    portalGroup.add(ring3);
    
    // Inner glow - bright center
    const innerGeo = new THREE.CircleGeometry(18, 64);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    portalGroup.add(inner);
    
    // Outer glow particles
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 15 + Math.random() * 10;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x88ffff,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    portalGroup.add(particles);
    
    // Lights
    const centerLight = new THREE.PointLight(0x00ffff, 30, 150);
    portalGroup.add(centerLight);
    
    const accentLight = new THREE.PointLight(0xffaa00, 15, 80);
    accentLight.position.y = 10;
    portalGroup.add(accentLight);
    
    this.scene.add(portalGroup);
    
    this.finalPortal = {
      mesh: portalGroup,
      ring: ring,
      ring2: ring2,
      ring3: ring3,
      particles: particles,
      time: 0,
      update: (dt, playerPos) => {
        this.finalPortal.time += dt;
        
        // Spin all rings at different speeds
        ring.rotation.z += dt * 0.8;
        ring2.rotation.z -= dt * 0.5;
        ring2.rotation.x += dt * 0.3;
        ring3.rotation.z += dt * 0.3;
        ring3.rotation.y += dt * 0.4;
        
        // Rotate particles
        particles.rotation.z -= dt * 0.2;
        
        // Pulse lights
        centerLight.intensity = 30 + Math.sin(this.finalPortal.time * 3) * 10;
        accentLight.intensity = 15 + Math.sin(this.finalPortal.time * 2.5 + 1) * 5;
        
        // Pulse inner glow
        inner.material.opacity = 0.4 + Math.sin(this.finalPortal.time * 2) * 0.2;
        
        // Color shift
        const hue = (this.finalPortal.time * 0.1) % 1;
        const shiftColor = new THREE.Color().setHSL(hue, 0.7, 0.5);
        ring2Mat.color.copy(shiftColor);
      }
    };
  }

  onPortalEnter() {
    if (this.isComplete) return;
    
    console.log('🌀 Entering portal! Level Complete!');
    
    // White flash overlay with epic completion screen
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: radial-gradient(ellipse at center, #ffffff 0%, #88aaff 50%, #1a2244 100%);
      opacity: 0;
      z-index: 9999;
      transition: opacity 0.8s ease;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Courier New', monospace;
      overflow: hidden;
    `;
    document.body.appendChild(overlay);
    
    // Add particle effect to overlay
    const particles = document.createElement('div');
    particles.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.3) 100%);
      animation: pulse 1s ease-in-out infinite;
    `;
    overlay.appendChild(particles);
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
      }
      @keyframes glow {
        0%, 100% { text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff; }
        50% { text-shadow: 0 0 40px #ffaa00, 0 0 80px #ffaa00; }
      }
    `;
    document.head.appendChild(style);
    
    // Fade in
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 50);
    
    // Show epic message
    setTimeout(() => {
      overlay.innerHTML = `
        <div style="text-align: center; color: #fff; animation: float 2s ease-in-out infinite;">
          <h1 style="font-size: 64px; margin-bottom: 30px; animation: glow 2s ease-in-out infinite; letter-spacing: 8px;">
            ✨ LIGHT SPEED ✨
          </h1>
          <p style="font-size: 28px; color: #aaddff; margin-bottom: 20px; letter-spacing: 4px;">
            THE ASCENT COMPLETE
          </p>
          <div style="margin: 40px 0; padding: 30px; background: rgba(0,0,0,0.3); border-radius: 20px; border: 2px solid rgba(255,255,255,0.2);">
            <p style="font-size: 20px; color: #88ff88; margin-bottom: 15px;">
              🚀 Maximum Velocity Achieved
            </p>
            <p style="font-size: 18px; color: #ffaa44;">
              Speed: ${Math.floor(this.currentSpeed)}% Light Speed
            </p>
          </div>
          <p style="margin-top: 50px; font-size: 16px; color: rgba(255,255,255,0.6); letter-spacing: 2px;">
            Preparing next dimension...
          </p>
          <div style="margin-top: 30px; width: 200px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin-left: auto; margin-right: auto; overflow: hidden;">
            <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #00ffff, #ffaa00); animation: loading 3s ease forwards;"></div>
          </div>
        </div>
        <style>
          @keyframes loading {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        </style>
      `;
    }, 600);
    
    this.isComplete = true;
    
    // Remove edge glow if exists
    if (this.edgeGlow) {
      this.engine.cameraSystem.camera.remove(this.edgeGlow);
    }
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
    
    this.entities = this.entities.filter(entity => {
      if (entity.mesh && entity.mesh.position.z > cleanupZ) {
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

  updateStarfield(deltaTime) {
    if (!this.starfield) return;
    const playerZ = this.player.mesh.position.z;
    this.starfield.position.z = playerZ * 0.3;
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
      
      if (entity instanceof ShadowComet && entity.active && distance < 2) {
        this.onShadowCometHit(entity);
        break;
      }
    }
  }

  handleBlackHoleGravity(deltaTime) {
    if (!this.player) return;
    
    const playerPos = this.player.mesh.position;
    this.isBeingPulled = false;
    this.nearestBlackHole = null;
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
      
      // Check if in pull range (outer zone)
      const pullRange = entity.slingshotRadius * 1.5;
      const slingshotZone = entity.slingshotRadius;
      const dangerZone = entity.trapRadius;
      
      if (dist < pullRange) {
        // Calculate pull direction toward black hole
        const direction = new THREE.Vector3().subVectors(bhPos, playerPos).normalize();
        
        if (dist < dangerZone) {
          // DANGER ZONE - Strong pull, massive speed loss
          this.isBeingPulled = true;
          this.pullIntensity = 1.0;
          
          // Heavy speed penalty
          this.currentSpeed = Math.max(5, this.currentSpeed - 50 * deltaTime);
          
          // Strong pull force
          const pullStrength = 15 * deltaTime;
          this.player.body.position.x += direction.x * pullStrength;
          this.player.body.position.y += direction.y * pullStrength;
          
          // Screen shake
          this.screenShakeIntensity = Math.max(this.screenShakeIntensity, 0.3);
          
          // Warning sound
          if (Math.random() < 0.1) {
            this.engine.audioSystem?.playNote('C2', 0.1, { type: 'sawtooth' });
          }
          
        } else if (dist < slingshotZone) {
          // SLINGSHOT ZONE - Player can press F to boost
          this.isBeingPulled = true;
          this.pullIntensity = 0.5;
          
          // Moderate pull
          const pullStrength = 5 * deltaTime;
          this.player.body.position.x += direction.x * pullStrength;
          this.player.body.position.y += direction.y * pullStrength;
          
          // Slight speed reduction
          this.currentSpeed = Math.max(10, this.currentSpeed - 10 * deltaTime);
          
          // Visual indicator - flash green to show slingshot is possible
          if (this.slingshotCooldown <= 0) {
            this.player.mesh.material.emissive.setHex(0x00ff88);
          }
          
        } else {
          // OUTER RANGE - Light gravitational influence
          this.isBeingPulled = true;
          this.pullIntensity = 0.2;
          
          // Very light pull
          const pullStrength = 2 * deltaTime;
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
    
    if (this.gameTime >= this.nextCometTime && this.entities.length < this.maxActiveEntities) {
      const direction = Math.random() > 0.5 ? 'left' : 'right';
      const targetZ = this.player.mesh.position.z - 25 - Math.random() * 15;
      
      const comet = new ShadowComet(this.scene, this.engine.physicsSystem, targetZ, direction);
      this.entities.push(comet);
      this.engine.audioSystem.playNote('G4', 0.1, { type: 'triangle' });
      this.screenShakeIntensity = Math.max(this.screenShakeIntensity, 0.05);
      
      this.nextCometTime = this.gameTime + this.cometInterval / this.difficultyMultiplier;
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
    this.currentSpeed = Math.max(0, this.currentSpeed - comet.speedPenalty);
    this.screenShakeIntensity = 0.4;
    this.invulnerableTime = 1.0;
    this.engine.audioSystem?.playNote('C1', 0.4, { type: 'sawtooth' });
    this.player.currentLumen = Math.max(0, this.player.currentLumen - 15);
  }

  checkWinCondition() {
    return this.currentSpeed >= this.maxSpeed;
  }

  getSpeedPercentage() {
    return (this.currentSpeed / this.maxSpeed) * 100;
  }

  unload() {
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
      this.scene.remove(this.finalPortal.mesh);
    }
    
    super.unload();
  }
}
