import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ParticleTrail } from '../systems/ParticleSystem.js';
import { PulseWave } from './PulseWave.js';

/**
 * Player - The Lumina Orb (main character)
 */
export class Player {
  constructor(scene, physicsSystem, audioSystem, position = new THREE.Vector3(0, 0, 0)) {
    this.id = 'player';
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.audioSystem = audioSystem;
    
    // Properties
    this.currentLumen = 20;
    this.maxLumen = 100;
    this.baseSpeed = 8; // Base speed for chill tutorial
    this.speed = this.baseSpeed;
    this.basePulseRadius = 20; // Large coverage radius for better visibility
    this.pulseRadius = this.basePulseRadius;
    this.pulseCooldown = 0;
    this.pulseCooldownMax = 1.0; // 1 second
    
    // Progression tracking
    this.orbsCollected = 0;
    this.hasUsedPulse = false;
    
    // Create mesh - LOW POLY ICOSAHEDRON (like React code)
    const geometry = new THREE.IcosahedronGeometry(0.5, 0); // 0 subdivisions = low poly
    const material = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.02, // Start dim
      roughness: 0.35,
      metalness: 0.7,
      flatShading: true // Low poly look
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.scale.setScalar(0.6); // Start smaller
    scene.add(this.mesh);
    
    // Add point light to player - START DIM
    this.light = new THREE.PointLight(0xffaa00, 0.2, 4); // Weak light initially
    this.mesh.add(this.light);
    
    // Guide beam (will be created on pulse)
    this.guideBeam = null;
    
    // Physics body
    this.body = physicsSystem.addBody(this, {
      mass: 1,
      shape: new CANNON.Sphere(0.5),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      linearDamping: 0.95, // High damping = stop quickly when no input
      angularDamping: 0.9
    });
    
    // Particle trail
    this.particleTrail = new ParticleTrail(scene, 100);
    
    // Active pulse waves
    this.activePulses = [];
    
    // For tracking velocity
    this.lastPosition = position.clone();
    
    // Breathing effect
    this.breathingTimer = 0;
    this.breathingSpeed = 0.5; // Cycles per second
    this.baseEmissiveIntensity = 1;
  }

  update(deltaTime, inputManager, entities = [], levelInstance = null) {
    // Update breathing timer
    this.breathingTimer += deltaTime * this.breathingSpeed;
    // === MOVEMENT ===
    const moveVector = new THREE.Vector3();
    
    if (inputManager.isPressed('w')) moveVector.z -= 1;
    if (inputManager.isPressed('s')) moveVector.z += 1;
    if (inputManager.isPressed('a')) moveVector.x -= 1;
    if (inputManager.isPressed('d')) moveVector.x += 1;
    if (inputManager.isPressed('e')) moveVector.y += 1; // Up
    if (inputManager.isPressed('q')) moveVector.y -= 1; // Down
    
    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(this.speed);
      this.physicsSystem.applyForce(this, moveVector);
    }
    
    // === ENERGY DECAY ===
    const decayRate = this.energyDecayRate || 0.5; // Default 0.5, can override per level
    this.currentLumen -= decayRate * deltaTime;
    this.currentLumen = Math.max(0, this.currentLumen);
    
    if (this.currentLumen <= 0) {
      this.die();
    }
    
    // === VISUAL FEEDBACK ===
    this.updateVisuals();
    
    // === ROTATION (low poly spin) ===
    this.mesh.rotation.x += deltaTime * 0.3;
    this.mesh.rotation.y += deltaTime * 0.5;
    
    // === PULSE MECHANIC ===
    if (this.pulseCooldown > 0) {
      this.pulseCooldown -= deltaTime;
    }
    
    // Debug: Check if F is pressed
    if (inputManager.isPressed('f')) {
      console.log('🔑 F key is pressed! Cooldown:', this.pulseCooldown);
    }
    
    if (inputManager.justPressed('f') && this.pulseCooldown <= 0) {
      console.log('✨ PULSE TRIGGERED!');
      this.pulse(entities, levelInstance); // Pass levelInstance for wave tracking
      this.pulseCooldown = this.pulseCooldownMax;
    }
    
    // === PARTICLE TRAIL ===
    const currentPos = this.mesh.position.clone();
    const velocity = currentPos.clone().sub(this.lastPosition).divideScalar(deltaTime);
    
    if (velocity.length() > 0.5) {
      this.particleTrail.emit(currentPos, velocity);
    }
    
    this.particleTrail.update(deltaTime);
    this.lastPosition.copy(currentPos);
    
    // === UPDATE PULSE WAVES ===
    this.activePulses = this.activePulses.filter(pulse => pulse.update(deltaTime));
  }

  updateVisuals() {
    // Scale and intensity based on energy
    const energyPercent = this.currentLumen / this.maxLumen;
    
    // Breathing effect (sin wave)
    const breathingFactor = Math.sin(this.breathingTimer * Math.PI * 2) * 0.3 + 1; // 0.7 to 1.3
    
    // Emissive intensity with breathing
    const baseIntensity = 1 + energyPercent * 2;
    this.mesh.material.emissiveIntensity = baseIntensity * breathingFactor;
    
    // Light intensity with breathing
    this.light.intensity = (1 + energyPercent * 2) * breathingFactor;
    
    // Scale with subtle breathing
    const baseScale = 0.8 + energyPercent * 0.4;
    const scalePulse = Math.sin(this.breathingTimer * Math.PI * 2) * 0.05 + 1; // 0.95 to 1.05
    this.mesh.scale.setScalar(baseScale * scalePulse);
    
    // Color shift when low
    if (energyPercent < 0.3) {
      this.mesh.material.emissive.setHex(0xff4400); // Red-orange
      this.light.color.setHex(0xff4400);
    } else {
      this.mesh.material.emissive.setHex(0xffaa00); // Orange-yellow
      this.light.color.setHex(0xffaa00);
    }
  }

  pulse(entities, levelInstance = null) {
    console.log('🌟🌟🌟 PULSE ACTIVATED! 🌟🌟🌟');
    console.log('   Position:', this.mesh.position);
    console.log('   Pulse Radius:', this.pulseRadius);
    console.log('   Entities count:', entities.length);
    
    // Save pulse data for wave-based detection
    const pulseOrigin = this.mesh.position.clone();
    
    // Pass to level for tracking (if level exists)
    if (levelInstance) {
      levelInstance.lastPulseOrigin = pulseOrigin;
      levelInstance.lastPulseTime = levelInstance.gameTime || 0;
      console.log('   Level pulse time set:', levelInstance.gameTime);
    }
    
    // Hide tutorial hint on first pulse
    if (!this.hasUsedPulse) {
      this.hasUsedPulse = true;
      console.log('   ✅ First pulse - hiding tutorial hint');
      const tutorialHint = document.getElementById('tutorial-hint');
      if (tutorialHint) {
        tutorialHint.classList.add('hidden');
      }
    }
    
    // Audio feedback
    this.audioSystem.playPulseSound();
    
    // === VISUAL EFFECT: Spawn PulseWave ===
    console.log('   💫 Creating PulseWave...');
    const pulseWave = new PulseWave(
      this.scene,
      pulseOrigin,
      this.pulseRadius,
      3.0 // Duration
    );
    this.activePulses.push(pulseWave);
    console.log('   Active pulses:', this.activePulses.length);
    
    // === GUIDE BEAM to nearest orb ===
    console.log('   🎯 Creating guide beam...');
    this.createGuideBeam(entities);
    
    // Flash the light
    const originalIntensity = this.light.intensity;
    this.light.intensity = 5;
    setTimeout(() => {
      this.light.intensity = originalIntensity;
    }, 100);
    
    // Note: Wave-based detection now handled in Level update loop
    // This allows for proper expanding wave animation
  }

  takeDamage(amount) {
    this.currentLumen -= amount;
    console.log(`💔 Took ${amount} damage. Lumen: ${this.currentLumen.toFixed(1)}`);
    
    // Audio feedback
    this.audioSystem.playCollisionSound(0.5);
    
    if (this.currentLumen <= 0) {
      this.die();
    }
  }

  heal(amount) {
    this.currentLumen = Math.min(this.maxLumen, this.currentLumen + amount);
    console.log(`💚 Healed ${amount}. Lumen: ${this.currentLumen.toFixed(1)}`);
    
    // Audio feedback
    this.audioSystem.playNote(0.7);
  }

  onOrbCollected() {
    this.orbsCollected++;
    console.log(`⭐ Orb collected! Total: ${this.orbsCollected}`);
    
    // Multi-sensory progression
    // Visual: Increase brightness AND light range
    // Kinetic: Increase speed
    this.speed = this.baseSpeed + (this.orbsCollected * 2); // +2 speed per orb
    
    // Increase pulse radius
    this.pulseRadius = this.basePulseRadius + (this.orbsCollected * 2); // +2 radius per orb
    
    // Increase base emissive AND light intensity/range
    this.baseEmissiveIntensity = 0.5 + (this.orbsCollected * 0.5); // Start at 0.5, increase
    this.light.intensity = 0.5 + (this.orbsCollected * 1.5); // Brighter with each orb
    this.light.distance = 8 + (this.orbsCollected * 3); // Farther reach
    
    // Increase scale
    const newScale = 0.6 + (this.orbsCollected * 0.1); // Get bigger
    this.mesh.scale.setScalar(newScale);
    
    // Audio: Add music layer (handled by AudioSystem)
    this.audioSystem.addMusicLayer(this.orbsCollected);
    
    console.log(`🚀 Speed: ${this.speed}, Light: ${this.light.intensity.toFixed(1)}, Scale: ${newScale.toFixed(1)}`);
  }
  
  /**
   * Create guide beam to nearest orb (from React code)
   * Now follows player position in real-time!
   */
  createGuideBeam(entities) {
    // Remove old beam
    if (this.guideBeam) {
      this.scene.remove(this.guideBeam);
      this.guideBeam.geometry.dispose();
      this.guideBeam.material.dispose();
      this.guideBeam = null;
    }
    
    // Clear previous beam update interval
    if (this.guideBeamInterval) {
      clearInterval(this.guideBeamInterval);
      this.guideBeamInterval = null;
    }
    
    // Find nearest uncollected orb
    const uncollectedOrbs = entities.filter(e => e.constructor.name === 'EnergyOrb' && !e.collected);
    
    if (uncollectedOrbs.length === 0) return;
    
    let nearestOrb = null;
    let minDistance = Infinity;
    
    uncollectedOrbs.forEach(orb => {
      const dist = this.mesh.position.distanceTo(orb.mesh.position);
      if (dist < minDistance) {
        minDistance = dist;
        nearestOrb = orb;
      }
    });
    
    if (!nearestOrb) return;
    
    // Store reference for real-time updates
    this.guideBeamTarget = nearestOrb;
    
    console.log('📍 Guide beam pointing to nearest orb');
    
    // Create beam geometry with many segments for smooth curve
    const points = this.calculateBeamPoints(this.mesh.position, nearestOrb.mesh.position);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    });
    
    this.guideBeam = new THREE.Line(geometry, material);
    this.scene.add(this.guideBeam);
    
    // Make nearest orb IMMEDIATELY glow bright (most important!)
    if (nearestOrb.mesh && nearestOrb.mesh.material) {
      nearestOrb.isRevealed = true;
      nearestOrb.revealTimer = 5; // Stay revealed for 5 seconds
      nearestOrb.mesh.material.emissiveIntensity = 4;
      nearestOrb.mesh.material.color.setHex(0xFFD700);
      nearestOrb.mesh.material.emissive.setHex(0xFFD700);
      nearestOrb.mesh.material.wireframe = false;
      nearestOrb.mesh.material.opacity = 1;
      nearestOrb.light.intensity = 3;
      nearestOrb.light.color.setHex(0xFFD700);
    }
    
    // Real-time beam update every 16ms (60fps)
    this.guideBeamInterval = setInterval(() => {
      if (!this.guideBeam || !this.guideBeamTarget || this.guideBeamTarget.collected) {
        this.removeGuideBeam();
        return;
      }
      
      // Update beam points to follow player
      const newPoints = this.calculateBeamPoints(this.mesh.position, this.guideBeamTarget.mesh.position);
      this.guideBeam.geometry.setFromPoints(newPoints);
      this.guideBeam.geometry.attributes.position.needsUpdate = true;
    }, 16);
    
    // Remove beam after 3 seconds
    setTimeout(() => {
      this.removeGuideBeam();
    }, 3000);
  }
  
  /**
   * Calculate smooth curved beam points
   */
  calculateBeamPoints(start, end) {
    const points = [];
    const segments = 20;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pos = new THREE.Vector3().lerpVectors(start, end, t);
      
      // Add subtle wave effect
      const waveOffset = Math.sin(t * Math.PI * 3 + Date.now() * 0.003) * 0.1 * (1 - Math.abs(t - 0.5) * 2);
      pos.y += waveOffset;
      
      points.push(pos);
    }
    
    return points;
  }
  
  /**
   * Remove guide beam and cleanup
   */
  removeGuideBeam() {
    if (this.guideBeamInterval) {
      clearInterval(this.guideBeamInterval);
      this.guideBeamInterval = null;
    }
    if (this.guideBeam) {
      this.scene.remove(this.guideBeam);
      this.guideBeam.geometry.dispose();
      this.guideBeam.material.dispose();
      this.guideBeam = null;
    }
    this.guideBeamTarget = null;
  }

  die() {
    console.log('💀 Player died!');
    // TODO: Trigger game over
  }

  onCollide(otherBody) {
    // Collision handling (will be used for meteors, etc.)
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.physicsSystem.removeBody(this.id);
    this.particleTrail.destroy();
  }
}
