import * as THREE from 'three';
import { BaseLevel } from './BaseLevel.js';
import { Player } from '../entities/Player.js';
import { Meteor } from '../entities/Meteor.js';
import { Photon } from '../entities/Photon.js';
import { BlackHole } from '../entities/BlackHole.js';
import { ShadowComet } from '../entities/ShadowComet.js';

/**
 * Level1_TheAscent - High-speed obstacle dodge
 * Goal: Reach Light Speed by collecting photons and avoiding obstacles
 * 
 * Camera: Top-down tilted 15-20 degrees, auto-scroll following player
 * Core Loop: Auto-accelerate, collect photons for speed, avoid meteors
 * Win Condition: Fill speed bar to 100% (Light Speed Break)
 */
export class Level1_TheAscent extends BaseLevel {
  constructor(engine) {
    super(engine);
    this.name = 'The Ascent';
    
    // Speed / Progress system
    this.currentSpeed = 0;
    this.maxSpeed = 100;           // Light speed threshold
    this.baseAcceleration = 1.5;   // Slow passive acceleration
    this.photonSpeedBoost = 5;     // Speed gained per photon
    this.meteorSpeedPenalty = 12;  // Speed lost per meteor hit
    
    // === MAP BOUNDS (NARROWER) ===
    this.mapWidth = 15;            // Half-width (was 25)
    this.mapHeight = 8;            // Half-height (was 10)
    
    // === PROCEDURAL GENERATION (OPTIMIZED) ===
    this.spawnAheadDistance = 60;  // Reduced from 80
    this.despawnBehindDistance = 20; // Cleanup faster
    this.lastSpawnZ = 0;
    this.spawnInterval = 20;       // Increased spacing between waves
    this.maxActiveEntities = 50;   // Limit total entities for performance
    
    // === DIFFICULTY (GENTLER BLACK HOLES) ===
    this.difficultyMultiplier = 1;
    this.maxDifficulty = 2.5;
    this.blackHoleSpawnChance = 0.05; // Very rare (was 0.15)
    this.blackHoleMinDifficulty = 1.8; // Only appear later (was 1.2)
    this.lastBlackHoleZ = 0;       // Track to prevent clustering
    this.blackHoleMinSpacing = 100; // Minimum Z distance between black holes
    
    // Gameplay state
    this.gameTime = 0;
    this.invulnerableTime = 0;
    this.screenShakeIntensity = 0;
    this.lightSpeedTriggered = false;
    
    // === LIGHT SPEED BREAK STATE ===
    this.isInLightSpeedSequence = false;
    this.lightSpeedSequenceTime = 0;
    this.lightSpeedDuration = 5;   // 5 seconds of free flight
    this.finalPortal = null;
    this.portalDistance = 500;     // Portal spawns this far ahead
    
    // Shadow comet tracking
    this.nextCometTime = 15;       // First comet later
    this.cometInterval = 12;       // Less frequent
  }

  setupEnvironment() {
    this.scene.fog = new THREE.Fog(0x000511, 40, 150);
    this.scene.background = new THREE.Color(0x000511);
    
    this.createStarfield();
    this.createSpeedLines();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0x404060, 0.3);
    this.scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffcc, 0.5);
    directional.position.set(0, 10, 50);
    this.scene.add(directional);
    
    const forwardLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    forwardLight.position.set(0, 5, -100);
    this.scene.add(forwardLight);
  }

  spawnPlayer() {
    this.player = new Player(
      this.scene,
      this.engine.physicsSystem,
      this.engine.audioSystem,
      new THREE.Vector3(0, 0, 0)
    );
    
    this.player.currentLumen = 100;
    this.player.energyDecayRate = 0.1;
    this.player.baseSpeed = 10;
    this.player.speed = 10;
    
    this.engine.cameraSystem.follow(this.player);
    this.setupCamera();
  }

  setupCamera() {
    this.engine.cameraSystem.offset = new THREE.Vector3(0, 12, 18);
    this.engine.cameraSystem.lookAheadOffset = new THREE.Vector3(0, 0, -20);
  }

  spawnObjects() {
    // Spawn fewer initial waves
    this.spawnWave(-30);
    this.spawnWave(-50);
    console.log('🚀 Level 1 loaded: Race to Light Speed!');
  }

  createStarfield() {
    const starCount = 500; // Reduced from 1000
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 40 + Math.random() * 100;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.3) * 80;
      positions[i * 3 + 2] = Math.random() * 300 - 150;
      
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness * 0.9;
      colors[i * 3 + 1] = brightness * 0.95;
      colors[i * 3 + 2] = brightness;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false
    });
    
    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  createSpeedLines() {
    const lineCount = 30; // Reduced from 50
    const positions = new Float32Array(lineCount * 6);
    
    for (let i = 0; i < lineCount; i++) {
      const x = (Math.random() - 0.5) * this.mapWidth * 2;
      const y = Math.random() * 10 - 2;
      const z = Math.random() * -80;
      
      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z + 3;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.0
    });
    
    this.speedLines = new THREE.LineSegments(geometry, material);
    this.scene.add(this.speedLines);
  }

  /**
   * Spawn wave with performance limits
   */
  spawnWave(z) {
    // Skip if too many entities
    if (this.entities.length >= this.maxActiveEntities) return;
    
    // Skip if in light speed sequence
    if (this.isInLightSpeedSequence) return;
    
    const difficulty = this.difficultyMultiplier;
    
    // Meteors - fewer, within narrow bounds
    const meteorCount = Math.floor(1 + Math.random() * 2 * difficulty);
    for (let i = 0; i < meteorCount && this.entities.length < this.maxActiveEntities; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * this.mapWidth * 2,
        (Math.random() - 0.5) * this.mapHeight,
        z + (Math.random() - 0.5) * 8
      );
      
      const size = 0.6 + Math.random() * 1.2;
      const meteor = new Meteor(this.scene, this.engine.physicsSystem, pos, size);
      this.entities.push(meteor);
    }
    
    // Photons - guide player path
    const photonCount = Math.floor(2 + Math.random() * 3);
    for (let i = 0; i < photonCount && this.entities.length < this.maxActiveEntities; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * this.mapWidth * 1.8,
        (Math.random() - 0.5) * this.mapHeight * 0.8,
        z + (Math.random() - 0.5) * 8
      );
      
      const photon = new Photon(this.scene, this.engine.physicsSystem, pos);
      this.entities.push(photon);
    }
    
    // Black hole - VERY RARE, with spacing check
    const distanceSinceLastBlackHole = this.lastBlackHoleZ - z;
    if (Math.random() < this.blackHoleSpawnChance && 
        difficulty > this.blackHoleMinDifficulty &&
        distanceSinceLastBlackHole > this.blackHoleMinSpacing &&
        this.entities.length < this.maxActiveEntities - 5) {
      
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * this.mapWidth,
        0,
        z
      );
      
      const size = 3 + Math.random() * 2; // Smaller black holes
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
    
    // Update entities (batch for performance)
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
    this.handleCollisions();
    this.handleBlackHoleGravity();
    this.updateShadowComets(deltaTime);
    
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
      this.screenShakeIntensity *= 0.92;
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
  }

  updatePlayer(deltaTime) {
    if (!this.player) return;
    
    const inputManager = this.engine.inputManager;
    const moveVector = new THREE.Vector3();
    
    if (inputManager.isPressed('a')) moveVector.x -= 1;
    if (inputManager.isPressed('d')) moveVector.x += 1;
    if (inputManager.isPressed('w') || inputManager.isPressed('e')) moveVector.y += 1;
    if (inputManager.isPressed('s') || inputManager.isPressed('q')) moveVector.y -= 1;
    
    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(this.player.speed);
      this.engine.physicsSystem.applyForce(this.player, moveVector);
    }
    
    // Auto-forward
    const forwardSpeed = 5 + (this.currentSpeed / this.maxSpeed) * 25;
    this.player.body.position.z -= forwardSpeed * deltaTime;
    
    // Passive acceleration
    this.currentSpeed += this.baseAcceleration * deltaTime;
    this.currentSpeed = Math.min(this.currentSpeed, this.maxSpeed);
    
    // Clamp to narrower bounds
    this.player.body.position.x = Math.max(-this.mapWidth, Math.min(this.mapWidth, this.player.body.position.x));
    this.player.body.position.y = Math.max(-this.mapHeight, Math.min(this.mapHeight, this.player.body.position.y));
    
    this.player.mesh.position.copy(this.player.body.position);
    
    if (this.player.particleTrail) {
      this.player.particleTrail.update(deltaTime, this.player.mesh.position);
    }
    
    // Pulse handling
    this.player.activePulses.forEach((pulse, index) => {
      if (!pulse.update(deltaTime)) {
        this.player.activePulses.splice(index, 1);
      }
    });
    
    if (this.player.pulseCooldown > 0) {
      this.player.pulseCooldown -= deltaTime;
    }
    
    this.player.currentLumen -= (this.player.energyDecayRate || 0.1) * deltaTime;
    this.player.currentLumen = Math.max(0, this.player.currentLumen);
    
    // Visual speed effects
    const speedRatio = this.currentSpeed / this.maxSpeed;
    this.player.mesh.material.emissiveIntensity = 1 + speedRatio * 2;
    this.player.light.intensity = 1 + speedRatio * 3;
    
    // Blue shift
    const r = 1 - speedRatio * 0.3;
    const g = 0.67 + speedRatio * 0.2;
    const b = speedRatio;
    this.player.mesh.material.color.setRGB(r, g, b);
    this.player.mesh.material.emissive.setRGB(r, g, b);
    this.player.light.color.setRGB(r, g, b);
  }

  /**
   * Light Speed Break sequence - player flies freely to portal
   */
  updateLightSpeedSequence(deltaTime) {
    this.lightSpeedSequenceTime += deltaTime;
    
    // Auto-fly player forward at max speed
    const ultraSpeed = 50; // Very fast
    this.player.body.position.z -= ultraSpeed * deltaTime;
    this.player.mesh.position.copy(this.player.body.position);
    
    // Gentle centering
    this.player.body.position.x *= 0.98;
    this.player.body.position.y *= 0.98;
    
    // Update particle trail
    if (this.player.particleTrail) {
      this.player.particleTrail.update(deltaTime, this.player.mesh.position);
    }
    
    // Update speed lines (max intensity)
    this.updateSpeedLines(deltaTime);
    this.updateStarfield(deltaTime);
    
    // Update portal
    if (this.finalPortal) {
      this.finalPortal.update(deltaTime, this.player.mesh.position);
      
      // Check portal collision
      const distToPortal = this.player.mesh.position.distanceTo(this.finalPortal.mesh.position);
      if (distToPortal < 15) {
        this.onPortalEnter();
      }
    }
    
    // Maintain visual effects
    this.player.mesh.material.emissiveIntensity = 3;
    this.player.light.intensity = 5;
    this.player.mesh.material.emissive.setHex(0xaaddff);
    
    // Bloom pulsing
    if (this.engine.bloomPass) {
      this.engine.bloomPass.strength = 2 + Math.sin(this.lightSpeedSequenceTime * 3) * 0.5;
    }
  }

  triggerLightSpeedBreak() {
    if (this.lightSpeedTriggered) return;
    this.lightSpeedTriggered = true;
    
    console.log('🌟 LIGHT SPEED BREAK! Entering free flight...');
    
    // Clear all obstacles
    this.entities.forEach(entity => {
      if (!entity.destroyed) {
        entity.destroy();
      }
    });
    this.entities = [];
    
    // Spawn portal far ahead
    this.spawnFinalPortal();
    
    // Flash effect
    if (this.engine.bloomPass) {
      this.engine.bloomPass.strength = 5;
    }
    
    this.scene.background = new THREE.Color(0x111133);
    
    // Speed lines at max
    if (this.speedLines) {
      this.speedLines.material.opacity = 0.8;
      this.speedLines.material.color.setHex(0xaaddff);
    }
    
    // Enter light speed sequence
    this.isInLightSpeedSequence = true;
  }

  spawnFinalPortal() {
    const portalZ = this.player.mesh.position.z - this.portalDistance;
    
    // Create simple portal mesh (not using Portal entity to avoid circular import)
    const portalGroup = new THREE.Group();
    portalGroup.position.set(0, 0, portalZ);
    
    // Main ring
    const ringGeo = new THREE.TorusGeometry(15, 0.8, 32, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    portalGroup.add(ring);
    
    // Inner glow
    const innerGeo = new THREE.CircleGeometry(14, 64);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    portalGroup.add(inner);
    
    // Outer ring
    const outerGeo = new THREE.TorusGeometry(18, 0.3, 16, 64);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 0.6
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    portalGroup.add(outer);
    
    // Light
    const light = new THREE.PointLight(0x00ffff, 20, 100);
    portalGroup.add(light);
    
    this.scene.add(portalGroup);
    
    this.finalPortal = {
      mesh: portalGroup,
      ring: ring,
      time: 0,
      update: (dt, playerPos) => {
        this.finalPortal.time += dt;
        ring.rotation.z += dt * 0.5;
        outer.rotation.z -= dt * 0.3;
        light.intensity = 20 + Math.sin(this.finalPortal.time * 2) * 5;
        inner.material.opacity = 0.3 + Math.sin(this.finalPortal.time * 1.5) * 0.1;
      }
    };
  }

  onPortalEnter() {
    console.log('🌀 Entering portal! Level Complete!');
    
    // White flash
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: white;
      opacity: 0;
      z-index: 9999;
      transition: opacity 0.5s ease;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Courier New', monospace;
    `;
    document.body.appendChild(overlay);
    
    // Fade in
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 50);
    
    // Show message
    setTimeout(() => {
      overlay.innerHTML = `
        <div style="text-align: center; color: #000;">
          <h1 style="font-size: 48px; margin-bottom: 20px;">✨ LEVEL COMPLETE ✨</h1>
          <p style="font-size: 24px; color: #666;">The Ascent - Light Speed Achieved</p>
          <p style="margin-top: 40px; font-size: 18px; color: #999;">Next level coming soon...</p>
        </div>
      `;
    }, 800);
    
    this.isComplete = true;
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

  handleBlackHoleGravity() {
    if (!this.player) return;
    
    const playerPos = this.player.mesh.position;
    
    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];
      if (!(entity instanceof BlackHole) || entity.destroyed) continue;
      
      const effect = entity.calculateGravityEffect(playerPos);
      
      if (effect.effect === 'slingshot') {
        this.player.mesh.material.emissive.setHex(0x00ff88);
        setTimeout(() => this.player.mesh.material.emissive.setHex(0xffaa00), 100);
      } else if (effect.effect === 'trap') {
        this.player.mesh.material.emissive.setHex(0xff0000);
        this.screenShakeIntensity = 0.1;
      } else if (effect.effect === 'death') {
        this.currentSpeed = Math.max(0, this.currentSpeed - 40);
        this.screenShakeIntensity = 0.5;
        this.invulnerableTime = 2;
      }
      
      if (effect.speedChange !== 0) {
        this.currentSpeed = Math.max(0, Math.min(this.maxSpeed, 
          this.currentSpeed + effect.speedChange * 0.016));
      }
      
      if (effect.force.length() > 0) {
        this.player.body.velocity.x += effect.force.x * 0.016;
        this.player.body.velocity.y += effect.force.y * 0.016;
      }
    }
  }

  updateShadowComets(deltaTime) {
    if (this.isInLightSpeedSequence) return;
    
    if (this.gameTime >= this.nextCometTime && this.entities.length < this.maxActiveEntities) {
      const direction = Math.random() > 0.5 ? 'left' : 'right';
      const targetZ = this.player.mesh.position.z - 25 - Math.random() * 15;
      
      const comet = new ShadowComet(this.scene, this.engine.physicsSystem, targetZ, direction);
      this.entities.push(comet);
      
      this.nextCometTime = this.gameTime + this.cometInterval / this.difficultyMultiplier;
    }
  }

  onMeteorHit(meteor) {
    this.currentSpeed = Math.max(0, this.currentSpeed - this.meteorSpeedPenalty);
    this.screenShakeIntensity = 0.25;
    this.invulnerableTime = 0.5;
    this.engine.audioSystem.playNote('C2', 0.2, { type: 'sawtooth' });
    this.player.currentLumen = Math.max(0, this.player.currentLumen - 8);
  }

  onShadowCometHit(comet) {
    this.currentSpeed = Math.max(0, this.currentSpeed - comet.speedPenalty);
    this.screenShakeIntensity = 0.4;
    this.invulnerableTime = 1.0;
    this.engine.audioSystem.playNote('C1', 0.4, { type: 'sawtooth' });
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
    
    if (this.finalPortal) {
      this.scene.remove(this.finalPortal.mesh);
    }
    
    super.unload();
  }
}
