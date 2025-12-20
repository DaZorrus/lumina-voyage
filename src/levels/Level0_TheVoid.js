import * as THREE from 'three';
import { BaseLevel } from './BaseLevel.js';
import { Player } from '../entities/Player.js';
import { EnergyOrb } from '../entities/EnergyOrb.js';
import { Portal } from '../entities/Portal.js';
import { PortalBeam } from '../entities/PortalBeam.js';

/**
 * Level0_TheVoid - Tutorial level
 * Goal: Collect 5 energy orbs to complete
 */
export class Level0_TheVoid extends BaseLevel {
  constructor(engine) {
    super(engine);
    this.name = 'The Void';
    this.totalOrbs = 5;
    this.portal = null;
    this.climaxTriggered = false;
    this.portalBeam = null;
    this.screenShakeIntensity = 0;
    
    // Pulse tracking for wave-based detection
    this.lastPulseOrigin = null;
    this.lastPulseTime = 0;
    this.pulseRadius = 10;
    this.pulseDuration = 3.0; // How long pulse wave expands // 
    this.gameTime = 0; // Track overall game time
  }

  setupEnvironment() {
    // Dark fog - MUCH FARTHER to see starfield and distant orbs
    this.scene.fog = new THREE.Fog(0x000000, 20, 300); // Was 10, 50
    this.scene.background = new THREE.Color(0x0a0e27);
    
    // Add some ambient particles/stars
    this.createStarfield();
  }

  setupLighting() {
    // Very low ambient light
    const ambient = new THREE.AmbientLight(0x404040, 0.2);
    this.scene.add(ambient);
    
    // Dim directional light
    const directional = new THREE.DirectionalLight(0x8888ff, 0.3);
    directional.position.set(5, 10, 5);
    this.scene.add(directional);
  }

  spawnPlayer() {
    this.player = new Player(
      this.scene,
      this.engine.physicsSystem,
      this.engine.audioSystem,
      new THREE.Vector3(0, 0, 0)
    );
    
    // Tutorial: slower energy decay for chill exploration
    this.player.currentLumen = 100;
    this.player.energyDecayRate = 0.5; // Slower than normal
    
    // Set camera to follow player
    this.engine.cameraSystem.follow(this.player);
  }

  spawnObjects() {
    // Breadcrumb trail of 5 energy orbs 
    const orbPositions = [
      new THREE.Vector3(0, 0, -15),   
      new THREE.Vector3(6, 2, -35),   
      new THREE.Vector3(12, -2, -60),   
      new THREE.Vector3(20, 1, -85),   
      new THREE.Vector3(30, 0, -115)   
    ];

    orbPositions.forEach(pos => {
      const orb = new EnergyOrb(
        this.scene,
        this.engine.physicsSystem,
        pos,
        15 // Heal amount
      );
      this.entities.push(orb);
    });

    console.log(`📍 Level 0 loaded: Collect ${this.totalOrbs} energy orbs`);
  }

  createStarfield() {
    const starCount = 600;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      // Random position in MUCH LARGER sphere (far background)
      const radius = 150 + Math.random() * 150; // 100-200 units away (was 30-50)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Slightly blue-white stars
      colors[i * 3] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 2] = 1.0;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 1.0, // Much bigger to be visible at distance
      vertexColors: true,
      transparent: true,
      opacity: 1.0, // Full opacity to ensure visibility
      sizeAttenuation: false // Don't shrink with distance
    });
    
    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  update(deltaTime) {
    super.update(deltaTime);
    
    // Update game time
    this.gameTime += deltaTime;
    
    // If pulse is active, update all orbs with wave detection
    if (this.lastPulseOrigin && (this.gameTime - this.lastPulseTime) < this.pulseDuration) {
      this.entities.forEach(entity => {
        if (entity instanceof EnergyOrb) {
          entity.onPulse(
            this.lastPulseOrigin,
            this.pulseRadius,
            this.gameTime,
            this.lastPulseTime,
            this.pulseDuration
          );
        }
      });
    }
    
    // Check for orb collection and notify player
    this.entities.forEach(entity => {
      if (entity instanceof EnergyOrb && entity.collected && !entity.progressionCounted) {
        entity.progressionCounted = true;
        this.player.heal(entity.healAmount);
        this.player.onOrbCollected();
        
        // Update camera FOV based on orbs collected
        this.engine.cameraSystem.setOrbsCollected(this.player.orbsCollected);
        
        // Screen shake when at max speed (all 5 orbs collected)
        if (this.player.orbsCollected >= 5) {
          this.screenShakeIntensity = 0.5;
        }
      }
    });

    // Remove collected orbs safely (avoid mutating array during iteration)
    this.entities = this.entities.filter(entity => !(entity instanceof EnergyOrb && entity.collected));
    
    // Update portal beam if active
    if (this.portalBeam) {
      if (!this.portalBeam.update(deltaTime)) {
        this.portalBeam = null;
      }
    }
    
    // Update portal if spawned
    if (this.portal) {
      this.portal.update(deltaTime, this.player.mesh.position);
    }
    
    // Apply screen shake
    if (this.screenShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
      this.engine.cameraSystem.camera.position.x += shakeX;
      this.engine.cameraSystem.camera.position.y += shakeY;
      this.screenShakeIntensity *= 0.95; // Decay
      if (this.screenShakeIntensity < 0.01) this.screenShakeIntensity = 0;
    }
  }

  checkWinCondition() {
    // Check if all orbs collected
    const remainingOrbs = this.entities.filter(e => e instanceof EnergyOrb && !e.collected);
    return remainingOrbs.length === 0;
  }

  complete() {
    if (this.climaxTriggered) return;
    
    this.climaxTriggered = true;
    super.complete();
    
    console.log('✨ All orbs collected! Launching portal beams...');
    
    // Climax Sequence: White Bloom Flash
    this.triggerWhiteFlash();
    
    // Calculate portal position (100 units ahead of player)
    const portalPosition = new THREE.Vector3(
      this.player.mesh.position.x,
      this.player.mesh.position.y,
      this.player.mesh.position.z - 130 // Far away
    );
    
    // Create portal beam particles that fly from player to portal location
    this.portalBeam = new PortalBeam(
      this.scene,
      this.player.mesh.position.clone(),
      portalPosition,
      () => {
        // Callback when beams arrive - spawn portal
        this.spawnPortalAt(portalPosition);
      },
      this.player // Pass player reference for position updates
    );
  }

  triggerWhiteFlash() {
    // Increase bloom intensity dramatically
    if (this.engine.bloomPass) {
      const originalStrength = this.engine.bloomPass.strength;
      this.engine.bloomPass.strength = 5;
      
      // Player explosion effect
      this.player.mesh.material.emissiveIntensity = 10;
      this.player.light.intensity = 20;
      
      // Fade back to normal over 1 second
      const startTime = Date.now();
      const duration = 1000;
      
      const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          clearInterval(fadeInterval);
          this.engine.bloomPass.strength = originalStrength;
        } else {
          // Ease out
          const easeOut = 1 - Math.pow(1 - progress, 3);
          this.engine.bloomPass.strength = 5 - (5 - originalStrength) * easeOut;
          this.player.mesh.material.emissiveIntensity = 10 - 7 * easeOut;
          this.player.light.intensity = 20 - 17 * easeOut;
        }
      }, 16);
    }
  }

  spawnPortal() {
    console.log('🌀 Portal appearing in the distance...');
    
    // Spawn portal far away
    const portalPosition = new THREE.Vector3(
      this.player.mesh.position.x,
      this.player.mesh.position.y,
      this.player.mesh.position.z - 100 // 100 units away
    );
    
    this.portal = new Portal(
      this.scene,
      this.engine.physicsSystem,
      portalPosition,
      this.engine
    );
  }
  
  spawnPortalAt(position) {
    console.log('🌀 Portal materializing at beam destination...');
    
    this.portal = new Portal(
      this.scene,
      this.engine.physicsSystem,
      position,
      this.engine
    );
  }

  unload() {
    if (this.portal) {
      this.portal.destroy();
      this.portal = null;
    }
    super.unload();
  }
}
