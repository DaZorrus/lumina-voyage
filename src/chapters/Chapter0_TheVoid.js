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

    // Reset progression for Chapter 0 (tutorial should always start fresh)
    this.player.orbsCollected = 0;
    this.player.speed = this.player.baseSpeed; // Reset speed explicitly!
    this.player.pulseRadius = this.player.basePulseRadius;
    this.player.mesh.scale.setScalar(0.6);
    localStorage.removeItem('luminaVoyage_orbsCollected');

    // Tutorial: slower energy decay for chill exploration
    this.player.currentLumen = 100;
    this.player.energyDecayRate = 0.5; // Slower than normal

    // Set camera to follow player - Restore original close view
    this.engine.cameraSystem.follow(this.player);
    this.engine.cameraSystem.offset.set(0, 3, 7); // Closer view

    // Explicitly set camera FOV for Chapter 0 view - Start focused (60)
    this.engine.cameraSystem.camera.fov = 60;
    this.engine.cameraSystem.camera.updateProjectionMatrix();
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
      const radius = 250 + Math.random() * 250; 
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
      size: 2.5, // Slightly larger for texture
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      map: this.createStarTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);

    // Add a second "glow" layer for bloom feel
    const glowMaterial = new THREE.PointsMaterial({
      size: 6.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      map: this.createStarTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false
    });
    this.glowField = new THREE.Points(geometry, glowMaterial);
    this.scene.add(this.glowField);
  }

  update(deltaTime) {
    super.update(deltaTime);

    // Twinkling effect
    if (this.starfield) {
      // Tăng Base (0.75) và giảm Amplitude (0.15) để ngưỡng min cao hơn (0.75 - 0.15 = 0.6)
      this.starfield.material.opacity = 0.9 + Math.sin(this.gameTime * 2.5) * 0.1;
      if (this.glowField) {
        this.glowField.material.opacity = 0.2 + Math.sin(this.gameTime * 0.7) * 0.1;
        this.glowField.material.size = 5.0 + Math.sin(this.gameTime * 1.1) * 2.0;
      }
    }

    // Toggle controls hint with H key (only when game is active)
    if (this.engine.inputManager.justPressed('h') && !this.paused) {
      this.toggleControlsHint();
    }

    // Update game time
    this.gameTime += deltaTime;

    // Dynamic FOV progression: 60 (0 orbs) -> 85 (5 orbs)
    const targetFov = 60 + (this.player.orbsCollected * 5);
    const currentFov = this.engine.cameraSystem.camera.fov;
    if (Math.abs(currentFov - targetFov) > 0.1) {
      this.engine.cameraSystem.camera.fov = THREE.MathUtils.lerp(currentFov, targetFov, deltaTime * 2);
      this.engine.cameraSystem.camera.updateProjectionMatrix();
    }

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

        // Update camera FOV based on orbs collected (handled in update loop now)
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
    super.complete({ showUI: false });

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
    // Keep it subtle for a chill experience - removed dramatic white glow
    this.engine.audioSystem?.playPulseSound();
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

  toggleControlsHint() {
    const hintElement = document.getElementById('controls-hint');
    const chapter0Section = document.getElementById('hint-chapter0');
    const chapter1Section = document.getElementById('hint-chapter1');

    if (hintElement.classList.contains('hidden')) {
      // Show controls hint
      hintElement.classList.remove('hidden');
      // Show only Chapter 0 controls
      if (chapter0Section) chapter0Section.style.display = 'flex';
      if (chapter1Section) chapter1Section.style.display = 'none';
    } else {
      // Hide controls hint
      hintElement.classList.add('hidden');
    }
  }

  unload() {
    // Hide controls hint when leaving chapter
    document.getElementById('controls-hint')?.classList.add('hidden');

    if (this.portal) {
      this.portal.destroy();
      this.portal = null;
    }
    super.unload();
  }
}
