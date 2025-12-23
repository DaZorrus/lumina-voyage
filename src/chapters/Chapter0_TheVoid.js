import * as THREE from 'three';
import { BaseChapter } from './BaseChapter.js';
import { Player } from '../entities/Player.js';
import { EnergyOrb } from '../entities/EnergyOrb.js';
import { Portal } from '../entities/Portal.js';
import { PortalBeam } from '../entities/PortalBeam.js';

/**
 * Chapter0_TheVoid - Tutorial chapter
 * Goal: Collect 5 energy orbs to complete
 */
export class Chapter0_TheVoid extends BaseChapter {
  constructor(engine) {
    super(engine);
    this.name = 'The Void';
    this.totalOrbs = 5;
    this.portal = null;
    this.climaxTriggered = false;
    this.portalBeam = null;
    this.screenShakeIntensity = 0;
    this.previousSpeed = 0;
    
    // Pulse tracking for wave-based detection
    this.lastPulseOrigin = null;
    this.lastPulseTime = 0;
    this.pulseRadius = 10;
    this.pulseDuration = 3.0; // How long pulse wave expands
    this.gameTime = 0; // Track overall game time
  }

  // Override to prevent music restoration - Chapter 0 builds music progressively
  restoreMusicLayers() {
    console.log('⏭️ Chapter 0: Skipping music layer restore (will build progressively)');
    // Don't restore any music layers - they will be added as player collects orbs
  }

  setupEnvironment() {
    // Dark fog - VERY FAR to ensure starfield is visible
    this.scene.fog = new THREE.Fog(0x000000, 100, 600); // Extended range for starfield
    this.scene.background = new THREE.Color(0x0a0e27); // Darker background
    
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
      new THREE.Vector3(15, 0, -115)   
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

    console.log(`📍 Chapter 0 loaded: Collect ${this.totalOrbs} energy orbs`);
  }

  createStarfield() {
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      // Random position in MUCH LARGER sphere (far background)
      const radius = 250 + Math.random() * 250; // 100-200 units away (was 30-50)
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
    
    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
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
        
        // Play collection sound - bright chime
        this.engine.audioSystem?.playSpecificNote('E5', 0.2, { type: 'sine' });
        setTimeout(() => this.engine.audioSystem?.playSpecificNote('G5', 0.15, { type: 'sine' }), 60);
        
        // Small shake when collecting orbs
        this.screenShakeIntensity = Math.max(this.screenShakeIntensity, 0.2);
      }
    });
    
    // Store current speed for next frame
    this.previousSpeed = this.player.speed;

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
    
    // Update starfield - recycle stars as player moves
    this.updateStarfield(deltaTime);
    
    // Screen shake decay
    if (this.screenShakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
      this.engine.cameraSystem.camera.position.x += shakeX;
      this.engine.cameraSystem.camera.position.y += shakeY;
      this.screenShakeIntensity *= 0.95;
      if (this.screenShakeIntensity < 0.01) this.screenShakeIntensity = 0;
    }
  }

  updateStarfield(deltaTime) {
    if (!this.starfield || !this.player) return;
    
    const playerZ = this.player.mesh.position.z;
    const positions = this.starfield.geometry.attributes.position.array;
    const starCount = positions.length / 3;
    
    // Recycle stars that are out of visible range
    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const starZ = positions[idx + 2];
      
      // Player moves toward -Z, so stars with Z > playerZ + 400 are behind
      // Also recycle stars more than 800 units ahead (beyond fog range)
      const isBehind = starZ > playerZ + 400;
      const isTooFarAhead = starZ < playerZ - 800;
      
      if (isBehind || isTooFarAhead) {
        // Move star to safe zone ahead of player (50-500 units ahead)
        const radius = 250 + Math.random() * 250;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[idx] = Math.sin(phi) * Math.cos(theta) * radius;
        positions[idx + 1] = Math.sin(phi) * Math.sin(theta) * radius;
        positions[idx + 2] = playerZ - 50 - Math.random() * 450;  // 50-500 units ahead
      }
    }
    
    this.starfield.geometry.attributes.position.needsUpdate = true;
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
    
    // Override portal's transition to show completion screen
    this.portal.triggerWhiteFlashTransition = () => {
      this.showCompletionScreen();
    };
  }
  
  showCompletionScreen() {
    // White flash overlay
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
    
    // Show message first
    setTimeout(() => {
      overlay.style.pointerEvents = 'auto';
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
          <p style="font-size: 24px; color: #666;">The Void has been illuminated.</p>
        </div>
      `;
    }, 500);
    
    // Show buttons after delay
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
          <p style="font-size: 24px; color: #666; margin-bottom: 40px;">The Void has been illuminated.</p>
          <div style="display: flex; gap: 20px;">
            <button id="continueBtn" style="
              padding: 15px 40px;
              font-size: 20px;
              font-family: 'Courier New', monospace;
              background: rgba(255, 255, 255, 0.9);
              color: #000;
              border: 2px solid #000;
              cursor: pointer;
              transition: all 0.3s ease;
            ">Continue to Chapter 1</button>
            <button id="returnToMenuBtn" style="
              padding: 15px 40px;
              font-size: 20px;
              font-family: 'Courier New', monospace;
              background: rgba(0, 0, 0, 0.8);
              color: #fff;
              border: 2px solid #fff;
              cursor: pointer;
              transition: all 0.3s ease;
            ">Return to Main Menu</button>
          </div>
        </div>
      `;
      
      // Add button handlers for Continue
      const continueBtn = document.getElementById('continueBtn');
      if (continueBtn) {
        continueBtn.addEventListener('mouseenter', () => {
          continueBtn.style.background = '#000';
          continueBtn.style.color = '#fff';
          continueBtn.style.borderColor = '#fff';
        });
        continueBtn.addEventListener('mouseleave', () => {
          continueBtn.style.background = 'rgba(255, 255, 255, 0.9)';
          continueBtn.style.color = '#000';
          continueBtn.style.borderColor = '#000';
        });
        continueBtn.addEventListener('click', async () => {
          overlay.remove();
          // Properly cleanup current chapter and load next
          if (this.engine.currentLevel) {
            this.engine.currentLevel.unload();
            this.engine.currentLevel = null;
          }
          // Import and transition to Chapter 1
          const { Chapter1_TheAscent } = await import('./Chapter1_TheAscent.js');
          this.engine.transitionToLevel(Chapter1_TheAscent);
        });
      }
      
      // Add button handlers for Menu
      const btn = document.getElementById('returnToMenuBtn');
      if (btn) {
        btn.addEventListener('mouseenter', () => {
          btn.style.background = '#fff';
          btn.style.color = '#000';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'rgba(0, 0, 0, 0.8)';
          btn.style.color = '#fff';
        });
        btn.addEventListener('click', () => {
          overlay.remove();
          // returnToMenu() will handle all cleanup
          window.returnToMenu();
        });
      }
    }, 2000);
  }

  unload() {
    if (this.portal) {
      this.portal.destroy();
      this.portal = null;
    }
    super.unload();
  }
}
