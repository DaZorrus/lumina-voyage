import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ParticleTrail } from '../systems/ParticleSystem.js';
import { PulseWave } from './PulseWave.js';
import { EnergyOrb } from './EnergyOrb.js';

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
    this.basePulseRadius = 17; // Large coverage radius for better visibility
    this.pulseRadius = this.basePulseRadius;
    this.pulseCooldown = 0;
    this.pulseCooldownMax = 2.0; // 2 seconds

    // Progression tracking
    this.orbsCollected = 0;
    this.hasUsedPulse = false;

    // Create mesh - LOW POLY ICOSAHEDRON (like React code)
    const geometry = new THREE.IcosahedronGeometry(0.5, 0); // 0 subdivisions = low poly
    const material = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.2, // Solid base visibility (was 0.02)
      roughness: 0.35,
      metalness: 0.7,
      flatShading: true // Low poly look
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.scale.setScalar(0.6); // Start smaller
    scene.add(this.mesh);

    console.log('👤 Player mesh added to scene at', position);

    // Add point light to player - Visible from start
    this.light = new THREE.PointLight(0xffaa00, 2, 8); // Brighter light (was 0.2, 4)
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

    // Visual state tracking
    this.baseColor = new THREE.Color(0xffaa00);
    this.currentColor = new THREE.Color(0xffaa00);
    this.targetColor = new THREE.Color(0xffaa00);
    this.intensityMultiplier = 1.0;
    this.targetIntensityMultiplier = 1.0;

    // Load progression from storage for consistent look and stats across chapters
    this.baseEmissiveIntensity = 1.2; // FIXED GLOW: No longer scales (was progressive)

    // Feature flags
    this.isTrailEnabled = true;
    this.isPulseEnabled = true;

    this.loadProgression();
  }

  loadProgression() {
    try {
      const saved = localStorage.getItem('luminaVoyage_orbsCollected');
      if (saved) {
        const count = parseInt(saved);
        this.orbsCollected = Math.min(count, 5); // Cap for safety

        // Anchored to baseSpeed to prevent stacking over multiple plays
        this.speed = this.baseSpeed + (this.orbsCollected * 1.5);
        this.pulseRadius = this.basePulseRadius + (this.orbsCollected * 1.5);

        // Visuals remain consistent (no emissive scaling as requested)
        this.light.distance = 15;

        const newScale = 0.6 + (this.orbsCollected * 0.08);
        this.mesh.scale.setScalar(newScale);

        console.log(`✨ Player progression loaded: ${this.orbsCollected} orbs. Speed: ${this.speed.toFixed(1)}`);
      }
    } catch (e) {
      console.warn('Could not load player progression:', e);
    }
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

    // === PARTICLE TRAIL ===
    const currentPos = this.mesh.position.clone();
    const velocity = currentPos.clone().sub(this.lastPosition).divideScalar(deltaTime);
    const speed = velocity.length();

    // === ROTATION (low poly spin) - Speed-based rotation ===
    // Faster movement = faster spin for dynamic feedback
    const speedMultiplier = 1 + Math.min(speed * 0.1, 2); // Cap at 3x to prevent shake
    this.mesh.rotation.x += deltaTime * 1.2 * speedMultiplier;
    this.mesh.rotation.y += deltaTime * 1.8 * speedMultiplier;

    // === PULSE MECHANIC ===
    if (this.pulseCooldown > 0) {
      this.pulseCooldown -= deltaTime;
    }

    if (this.isPulseEnabled && inputManager.justPressed('f') && this.pulseCooldown <= 0) {
      this.pulse(entities, levelInstance); // Pass levelInstance for wave tracking
      this.pulseCooldown = this.pulseCooldownMax;
    }

    // === EMIT TRAIL ===
    if (this.isTrailEnabled && speed > 0.1) {
      if (this.particleTrail.setBaseColor) {
        this.particleTrail.setBaseColor(this.currentColor);
      }
      this.particleTrail.emit(currentPos, velocity);
    }

    this.particleTrail.update(deltaTime);
    this.lastPosition.copy(currentPos);

    // === UPDATE PULSE WAVES ===
    this.activePulses = this.activePulses.filter(pulse => pulse.update(deltaTime));

    // Smoothly transition colors and intensity multipliers
    this.currentColor.lerp(this.targetColor, deltaTime * 5);
    this.intensityMultiplier += (this.targetIntensityMultiplier - this.intensityMultiplier) * deltaTime * 5;
  }

  setVisualState(state = 'normal') {
    switch (state) {
      case 'boost':
        this.targetColor.setHex(0x99eeff); // Bright Cyan for light speed
        this.targetIntensityMultiplier = 1.3;
        break;
      case 'danger':
        this.targetColor.setHex(0xaa00ff); // Purple for debuffs
        this.targetIntensityMultiplier = 1.6;
        break;
      case 'climax':
        this.targetColor.setHex(0xffffff);
        this.targetIntensityMultiplier = 5.0;
        break;
      case 'normal':
      default:
        this.targetColor.copy(this.baseColor);
        this.targetIntensityMultiplier = 1.0;
        break;
    }
  }

  updateVisuals() {
    // Scale and intensity based on energy
    const energyPercent = this.currentLumen / this.maxLumen;

    // Breathing effect (sin wave) - Very distinct breathing (1.2 to 1.8 range)
    // Synchronized breathing timer ensures it's always active
    const breathingFactor = Math.sin(this.breathingTimer * Math.PI * 2) * 0.3 + 1.5;

    // Calculate intensity: Unified fixed base (no orb scaling as requested)
    const baseIntensity = 1.8; // Bright and premium
    const energyBonus = energyPercent * 0.4;

    // Apply current intensity multiplier (from visual states like climax or boost)
    const finalIntensity = (baseIntensity + energyBonus) * this.intensityMultiplier;

    // Sync mesh and light perfectly
    this.mesh.material.emissiveIntensity = finalIntensity * (breathingFactor / 1.5);
    this.mesh.material.emissive.copy(this.currentColor);

    // Light intensity matches emissive for physical accuracy
    this.light.intensity = this.mesh.material.emissiveIntensity * 1.8;
    this.light.color.copy(this.currentColor);
    this.light.distance = 18; // Wide aura reach
  }

  pulse(entities, levelInstance = null) {
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

    // Save to localStorage for music layer persistence
    try {
      localStorage.setItem('luminaVoyage_orbsCollected', this.orbsCollected.toString());
    } catch (e) {
      console.warn('Could not save orbs collected:', e);
    }

    // Multi-sensory progression
    // Visual: Increase brightness AND light range
    // Kinetic: Increase speed (softer scale)
    this.speed = this.baseSpeed + (this.orbsCollected * 1.5);

    // Increase pulse radius
    this.pulseRadius = this.basePulseRadius + (this.orbsCollected * 1.5);

    // Visual: Keep glow fixed as requested
    this.light.distance = 15;

    // Increase scale (subtle)
    const newScale = 0.6 + (this.orbsCollected * 0.08);
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

    // Find nearest uncollected orb - Use instanceof for minification safety
    const uncollectedOrbs = entities.filter(e => e instanceof EnergyOrb && !e.collected);

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

    // Create simple cylinder beam between player and orb
    const distance = this.mesh.position.distanceTo(nearestOrb.mesh.position);
    const geometry = new THREE.CylinderGeometry(0.03, 0.03, distance, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6
    });

    this.guideBeam = new THREE.Mesh(geometry, material);
    
    // Position and orient the beam
    const midpoint = new THREE.Vector3().addVectors(this.mesh.position, nearestOrb.mesh.position).multiplyScalar(0.5);
    this.guideBeam.position.copy(midpoint);
    this.guideBeam.lookAt(nearestOrb.mesh.position);
    this.guideBeam.rotateX(Math.PI / 2); // Align with cylinder's axis
    
    this.scene.add(this.guideBeam);
    
    console.log('✅ Guide beam created:', {
      distance: distance.toFixed(2),
      position: midpoint,
      visible: this.guideBeam.visible
    });

    // Make nearest orb IMMEDIATELY glow bright (most important!)
    if (nearestOrb.mesh && nearestOrb.mesh.material) {
      console.log('💡 Making orb glow:', {
        orbPosition: nearestOrb.mesh.position,
        isRevealed: nearestOrb.isRevealed,
        material: nearestOrb.mesh.material.type
      });
      
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

      // Update beam position and orientation
      const distance = this.mesh.position.distanceTo(this.guideBeamTarget.mesh.position);
      const midpoint = new THREE.Vector3()
        .addVectors(this.mesh.position, this.guideBeamTarget.mesh.position)
        .multiplyScalar(0.5);
      
      this.guideBeam.position.copy(midpoint);
      this.guideBeam.lookAt(this.guideBeamTarget.mesh.position);
      this.guideBeam.rotateX(Math.PI / 2);
      
      // Update beam length if distance changed
      this.guideBeam.scale.y = distance / this.guideBeam.geometry.parameters.height;
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

  // die() {
  //   console.log('💀 Player died!');
  //   // TODO: Trigger game over
  // }

  onCollide(otherBody) {
    // Collision handling (will be used for meteors, etc.)
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.physicsSystem.removeBody(this.id);
    this.particleTrail.destroy();
  }
}
