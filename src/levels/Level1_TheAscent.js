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
    this.baseAcceleration = 2;     // Slow passive acceleration
    this.photonSpeedBoost = 5;     // Speed gained per photon
    this.meteorSpeedPenalty = 15;  // Speed lost per meteor hit
    
    // Procedural generation
    this.spawnAheadDistance = 80;  // How far ahead to spawn obstacles
    this.despawnBehindDistance = 30; // When to cleanup passed obstacles
    this.lastSpawnZ = 0;           // Track last spawn position
    this.spawnInterval = 15;       // Z-distance between spawn waves
    
    // Difficulty scaling
    this.difficultyMultiplier = 1;
    this.maxDifficulty = 3;
    
    // Gameplay
    this.gameTime = 0;
    this.invulnerableTime = 0;     // Brief invulnerability after hit
    this.screenShakeIntensity = 0;
    this.lightSpeedTriggered = false;
    
    // Track blackhole effects (calculated per frame)
    this.activeBlackholeEffect = null;
    
    // Shadow comet tracking
    this.nextCometTime = 10;       // First comet at 10 seconds
    this.cometInterval = 8;        // Seconds between comets
  }

  setupEnvironment() {
    // Deep space with distant stars
    this.scene.fog = new THREE.Fog(0x000511, 50, 200);
    this.scene.background = new THREE.Color(0x000511);
    
    // Create infinite starfield
    this.createStarfield();
    
    // Speed lines (will intensify with speed)
    this.createSpeedLines();
  }

  setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404060, 0.3);
    this.scene.add(ambient);
    
    // Directional "sun" light from behind
    const directional = new THREE.DirectionalLight(0xffffcc, 0.5);
    directional.position.set(0, 10, 50);
    this.scene.add(directional);
    
    // Forward directional (destination)
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
    
    // Level 1 settings - faster and more intense
    this.player.currentLumen = 100;
    this.player.energyDecayRate = 0.1; // Slow decay during speed run
    this.player.baseSpeed = 12;        // Faster lateral movement
    this.player.speed = 12;
    
    // Set camera to follow player with top-down tilt
    this.engine.cameraSystem.follow(this.player);
    this.setupCamera();
  }

  setupCamera() {
    // Top-down tilted view for better forward visibility
    const camera = this.engine.cameraSystem.camera;
    
    // Position camera above and behind player
    this.engine.cameraSystem.offset = new THREE.Vector3(0, 12, 18);
    
    // Look ahead of player
    this.engine.cameraSystem.lookAheadOffset = new THREE.Vector3(0, 0, -20);
  }

  spawnObjects() {
    // Initial wave of obstacles
    this.spawnWave(-30);
    this.spawnWave(-50);
    this.spawnWave(-70);
    
    console.log('🚀 Level 1 loaded: Race to Light Speed!');
  }

  createStarfield() {
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      // Spread stars in a cylinder around the path
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 150;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.3) * 100; // Mostly above
      positions[i * 3 + 2] = Math.random() * 400 - 200;   // Along path
      
      // Blue-white stars
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
    const lineCount = 50;
    const positions = new Float32Array(lineCount * 6); // 2 vertices per line
    
    for (let i = 0; i < lineCount; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = Math.random() * 15 - 2;
      const z = Math.random() * -100;
      
      // Line start
      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      
      // Line end (stretched back)
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z + 3; // Length
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.0 // Start invisible, increase with speed
    });
    
    this.speedLines = new THREE.LineSegments(geometry, material);
    this.scene.add(this.speedLines);
    
    this.speedLineBasePositions = positions.slice(); // Save for animation
  }

  /**
   * Procedurally spawn a wave of obstacles at given Z position
   */
  spawnWave(z) {
    const difficulty = this.difficultyMultiplier;
    
    // Spawn meteors (more with difficulty)
    const meteorCount = Math.floor(2 + Math.random() * 3 * difficulty);
    for (let i = 0; i < meteorCount; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 40,       // X spread
        (Math.random() - 0.5) * 8,        // Y spread (smaller)
        z + (Math.random() - 0.5) * 10    // Z variance
      );
      
      const size = 0.8 + Math.random() * 1.5;
      const meteor = new Meteor(this.scene, this.engine.physicsSystem, pos, size);
      this.entities.push(meteor);
    }
    
    // Spawn photons (collectibles) - always some available
    const photonCount = Math.floor(3 + Math.random() * 4);
    for (let i = 0; i < photonCount; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 6,
        z + (Math.random() - 0.5) * 10
      );
      
      const photon = new Photon(this.scene, this.engine.physicsSystem, pos);
      this.entities.push(photon);
    }
    
    // Spawn black hole (rare, increases with difficulty)
    if (Math.random() < 0.15 * difficulty && difficulty > 1.2) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 25,
        0,
        z
      );
      
      const size = 4 + Math.random() * 3;
      const blackHole = new BlackHole(this.scene, this.engine.physicsSystem, pos, size);
      this.entities.push(blackHole);
    }
  }

  update(deltaTime) {
    this.gameTime += deltaTime;
    
    // Update player (custom for Level 1 - auto-forward movement)
    this.updatePlayer(deltaTime);
    
    // Update all entities
    this.entities.forEach(entity => {
      if (entity.update) {
        entity.update(deltaTime, this.player ? this.player.mesh.position : null);
      }
    });
    
    // Procedural spawning
    this.updateProceduralSpawning();
    
    // Cleanup passed objects
    this.cleanupPassedObjects();
    
    // Update speed lines effect
    this.updateSpeedLines(deltaTime);
    
    // Update starfield (parallax)
    this.updateStarfield(deltaTime);
    
    // Handle collisions
    this.handleCollisions();
    
    // Handle black hole gravity
    this.handleBlackHoleGravity();
    
    // Shadow comet spawning
    this.updateShadowComets(deltaTime);
    
    // Invulnerability timer
    if (this.invulnerableTime > 0) {
      this.invulnerableTime -= deltaTime;
      // Flash player
      this.player.mesh.visible = Math.sin(this.gameTime * 30) > 0;
    } else {
      this.player.mesh.visible = true;
    }
    
    // Screen shake
    if (this.screenShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
      this.engine.cameraSystem.camera.position.x += shakeX;
      this.engine.cameraSystem.camera.position.y += shakeY;
      this.screenShakeIntensity *= 0.92;
      if (this.screenShakeIntensity < 0.01) this.screenShakeIntensity = 0;
    }
    
    // Check win condition
    if (this.checkWinCondition() && !this.lightSpeedTriggered) {
      this.complete();
    }
    
    // Update difficulty based on progress
    this.difficultyMultiplier = Math.min(
      this.maxDifficulty,
      1 + (this.currentSpeed / this.maxSpeed) * 2
    );
  }

  updatePlayer(deltaTime) {
    if (!this.player) return;
    
    const inputManager = this.engine.inputManager;
    
    // Lateral movement (X and Y only)
    const moveVector = new THREE.Vector3();
    
    if (inputManager.isPressed('a')) moveVector.x -= 1;
    if (inputManager.isPressed('d')) moveVector.x += 1;
    if (inputManager.isPressed('w') || inputManager.isPressed('e')) moveVector.y += 1;
    if (inputManager.isPressed('s') || inputManager.isPressed('q')) moveVector.y -= 1;
    
    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(this.player.speed);
      this.engine.physicsSystem.applyForce(this.player, moveVector);
    }
    
    // Auto-forward movement based on current speed
    const forwardSpeed = 5 + (this.currentSpeed / this.maxSpeed) * 25; // 5-30 units/s
    this.player.body.position.z -= forwardSpeed * deltaTime;
    
    // Passive speed acceleration
    this.currentSpeed += this.baseAcceleration * deltaTime;
    this.currentSpeed = Math.min(this.currentSpeed, this.maxSpeed);
    
    // Clamp player position (lateral bounds)
    const maxX = 25;
    const maxY = 10;
    this.player.body.position.x = Math.max(-maxX, Math.min(maxX, this.player.body.position.x));
    this.player.body.position.y = Math.max(-maxY, Math.min(maxY, this.player.body.position.y));
    
    // Sync mesh
    this.player.mesh.position.copy(this.player.body.position);
    
    // Update particle trail
    if (this.player.particleTrail) {
      this.player.particleTrail.update(deltaTime, this.player.mesh.position);
    }
    
    // Update active pulses (can still pulse to reveal things)
    this.player.activePulses.forEach((pulse, index) => {
      if (!pulse.update(deltaTime)) {
        this.player.activePulses.splice(index, 1);
      }
    });
    
    // Pulse cooldown
    if (this.player.pulseCooldown > 0) {
      this.player.pulseCooldown -= deltaTime;
    }
    
    // Energy decay
    this.player.currentLumen -= (this.player.energyDecayRate || 0.1) * deltaTime;
    this.player.currentLumen = Math.max(0, this.player.currentLumen);
    
    // Update player visual intensity based on speed
    const speedRatio = this.currentSpeed / this.maxSpeed;
    this.player.mesh.material.emissiveIntensity = 1 + speedRatio * 2;
    this.player.light.intensity = 1 + speedRatio * 3;
    
    // Color shift toward blue at high speed (blue shift effect)
    const r = 1 - speedRatio * 0.3;
    const g = 0.67 + speedRatio * 0.2;
    const b = 0 + speedRatio * 1;
    this.player.mesh.material.color.setRGB(r, g, b);
    this.player.mesh.material.emissive.setRGB(r, g, b);
    this.player.light.color.setRGB(r, g, b);
  }

  updateProceduralSpawning() {
    const playerZ = this.player.mesh.position.z;
    const targetSpawnZ = playerZ - this.spawnAheadDistance;
    
    // Spawn new waves when needed
    while (this.lastSpawnZ > targetSpawnZ) {
      this.lastSpawnZ -= this.spawnInterval;
      this.spawnWave(this.lastSpawnZ);
    }
  }

  cleanupPassedObjects() {
    const playerZ = this.player.mesh.position.z;
    const cleanupZ = playerZ + this.despawnBehindDistance;
    
    // Remove entities that are behind the player
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
    
    const speedRatio = this.currentSpeed / this.maxSpeed;
    
    // Fade in speed lines with speed
    this.speedLines.material.opacity = speedRatio * 0.6;
    
    // Stretch lines with speed
    const positions = this.speedLines.geometry.attributes.position.array;
    const playerZ = this.player.mesh.position.z;
    
    for (let i = 0; i < positions.length / 6; i++) {
      // Move lines forward relative to player
      positions[i * 6 + 2] = playerZ - 20 - Math.random() * 80;
      positions[i * 6 + 5] = positions[i * 6 + 2] + 3 + speedRatio * 10; // Longer with speed
    }
    
    this.speedLines.geometry.attributes.position.needsUpdate = true;
  }

  updateStarfield(deltaTime) {
    if (!this.starfield) return;
    
    // Move starfield with player (parallax - slower than player)
    const playerZ = this.player.mesh.position.z;
    this.starfield.position.z = playerZ * 0.3; // 30% parallax
  }

  handleCollisions() {
    if (!this.player || this.invulnerableTime > 0) return;
    
    const playerPos = this.player.mesh.position;
    const playerRadius = 0.5;
    
    this.entities.forEach(entity => {
      if (entity.destroyed || entity.collected) return;
      
      const entityPos = entity.mesh ? entity.mesh.position : null;
      if (!entityPos) return;
      
      const distance = playerPos.distanceTo(entityPos);
      
      // Photon collection
      if (entity instanceof Photon && distance < 1.5) {
        const boost = entity.collect();
        this.currentSpeed = Math.min(this.currentSpeed + boost, this.maxSpeed);
        
        // Audio feedback
        this.engine.audioSystem.playNote('C5', 0.1, { type: 'sine' });
        
        // Heal player slightly
        this.player.currentLumen = Math.min(this.player.currentLumen + 5, this.player.maxLumen);
      }
      
      // Meteor collision
      if (entity instanceof Meteor && distance < entity.size + playerRadius) {
        this.onMeteorHit(entity);
      }
      
      // Shadow comet collision
      if (entity instanceof ShadowComet && entity.active && distance < 2) {
        this.onShadowCometHit(entity);
      }
    });
  }

  handleBlackHoleGravity() {
    if (!this.player) return;
    
    const playerPos = this.player.mesh.position;
    let totalEffect = { force: new THREE.Vector3(), speedChange: 0, effect: 'none' };
    
    this.entities.forEach(entity => {
      if (!(entity instanceof BlackHole) || entity.destroyed) return;
      
      const effect = entity.calculateGravityEffect(playerPos);
      
      if (effect.effect !== 'none') {
        totalEffect.force.add(effect.force);
        totalEffect.speedChange += effect.speedChange;
        totalEffect.effect = effect.effect;
        
        // Visual feedback
        if (effect.effect === 'slingshot') {
          // Green flash
          this.player.mesh.material.emissive.setHex(0x00ff88);
          setTimeout(() => {
            this.player.mesh.material.emissive.setHex(0xffaa00);
          }, 100);
        } else if (effect.effect === 'trap') {
          // Red warning
          this.player.mesh.material.emissive.setHex(0xff0000);
          this.screenShakeIntensity = 0.1;
        } else if (effect.effect === 'death') {
          // Major hit
          this.currentSpeed = Math.max(0, this.currentSpeed - 50);
          this.screenShakeIntensity = 0.5;
          this.invulnerableTime = 2;
        }
      }
    });
    
    // Apply accumulated effects
    if (totalEffect.speedChange !== 0) {
      this.currentSpeed = Math.max(0, Math.min(this.maxSpeed, 
        this.currentSpeed + totalEffect.speedChange * 0.016)); // Scale by frame time
    }
    
    // Apply gravitational pull
    if (totalEffect.force.length() > 0) {
      this.player.body.velocity.x += totalEffect.force.x * 0.016;
      this.player.body.velocity.y += totalEffect.force.y * 0.016;
    }
  }

  updateShadowComets(deltaTime) {
    if (this.gameTime >= this.nextCometTime) {
      // Spawn shadow comet
      const direction = Math.random() > 0.5 ? 'left' : 'right';
      const targetZ = this.player.mesh.position.z - 30 - Math.random() * 20;
      
      const comet = new ShadowComet(this.scene, this.engine.physicsSystem, targetZ, direction);
      this.entities.push(comet);
      
      // Schedule next comet (faster as difficulty increases)
      this.nextCometTime = this.gameTime + this.cometInterval / this.difficultyMultiplier;
    }
  }

  onMeteorHit(meteor) {
    // Speed penalty
    this.currentSpeed = Math.max(0, this.currentSpeed - this.meteorSpeedPenalty);
    
    // Screen shake
    this.screenShakeIntensity = 0.3;
    
    // Invulnerability
    this.invulnerableTime = 0.5;
    
    // Audio
    this.engine.audioSystem.playNote('C2', 0.3, { type: 'sawtooth' });
    
    // Damage feedback
    this.player.currentLumen = Math.max(0, this.player.currentLumen - 10);
  }

  onShadowCometHit(comet) {
    // Major speed penalty
    this.currentSpeed = Math.max(0, this.currentSpeed - comet.speedPenalty);
    
    // Big screen shake
    this.screenShakeIntensity = 0.5;
    
    // Longer invulnerability
    this.invulnerableTime = 1.0;
    
    // Audio
    this.engine.audioSystem.playNote('C1', 0.5, { type: 'sawtooth' });
    
    // Damage
    this.player.currentLumen = Math.max(0, this.player.currentLumen - 20);
  }

  checkWinCondition() {
    return this.currentSpeed >= this.maxSpeed;
  }

  complete() {
    if (this.lightSpeedTriggered) return;
    this.lightSpeedTriggered = true;
    
    console.log('🌟 LIGHT SPEED BREAK! Level Complete!');
    
    // Trigger light speed visual effect
    this.triggerLightSpeedBreak();
    
    super.complete();
  }

  triggerLightSpeedBreak() {
    // Massive bloom flash
    if (this.engine.bloomPass) {
      const originalStrength = this.engine.bloomPass.strength;
      this.engine.bloomPass.strength = 8;
      
      // White screen
      this.scene.background = new THREE.Color(0xffffff);
      
      // Player becomes pure light
      this.player.mesh.material.emissive.setHex(0xffffff);
      this.player.mesh.material.emissiveIntensity = 10;
      this.player.light.intensity = 50;
      
      // Speed lines go crazy
      if (this.speedLines) {
        this.speedLines.material.opacity = 1;
        this.speedLines.material.color.setHex(0xffffff);
      }
      
      // Fade back over 2 seconds
      const startTime = Date.now();
      const duration = 2000;
      
      const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          clearInterval(fadeInterval);
          // TODO: Transition to Level 2 or victory screen
          console.log('Ready for next level transition...');
        } else {
          // Hold the white for dramatic effect
          const easeIn = Math.pow(progress, 2);
          this.engine.bloomPass.strength = 8 - (8 - originalStrength) * easeIn;
        }
      }, 16);
    }
  }

  /**
   * Get current speed percentage for HUD
   */
  getSpeedPercentage() {
    return (this.currentSpeed / this.maxSpeed) * 100;
  }

  unload() {
    // Cleanup starfield
    if (this.starfield) {
      this.scene.remove(this.starfield);
      this.starfield.geometry.dispose();
      this.starfield.material.dispose();
    }
    
    // Cleanup speed lines
    if (this.speedLines) {
      this.scene.remove(this.speedLines);
      this.speedLines.geometry.dispose();
      this.speedLines.material.dispose();
    }
    
    super.unload();
  }
}
