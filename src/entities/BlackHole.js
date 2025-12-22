import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * BlackHole - Gravity well in Level 1
 * Outer ring = potential slingshot zone (press F)
 * Inner pull = trap that slows player heavily
 */
export class BlackHole {
  constructor(scene, physicsSystem, position, size = 5) {
    this.id = `blackhole-${Math.random().toString(36).substr(2, 9)}`;
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.size = size;
    this.destroyed = false;
    
    // Gravity ranges - BIGGER and more dangerous
    this.slingshotRadius = size * 4.0;   // Outer ring - slingshot zone (was 2.5)
    this.trapRadius = size * 2.0;        // Inner - danger zone (was 1.2)
    this.eventHorizon = size * 0.6;      // Core - extreme danger (was 0.4)
    
    // Container
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    scene.add(this.mesh);
    
    // Core (event horizon - dark center with subtle glow)
    const coreGeometry = new THREE.SphereGeometry(this.eventHorizon, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x110022
    });
    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.mesh.add(this.core);
    
    // Inner core glow
    const innerGlowGeo = new THREE.SphereGeometry(this.eventHorizon * 1.3, 32, 32);
    const innerGlowMat = new THREE.MeshBasicMaterial({
      color: 0x440066,
      transparent: true,
      opacity: 0.6
    });
    this.innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    this.mesh.add(this.innerGlow);
    
    // Accretion disk - brighter and more visible
    const diskGeometry = new THREE.RingGeometry(size * 0.5, size * 1.5, 64);
    const diskMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    this.disk = new THREE.Mesh(diskGeometry, diskMaterial);
    this.disk.rotation.x = Math.PI * 0.5;
    this.mesh.add(this.disk);
    
    // Second accretion disk at angle
    const disk2Geometry = new THREE.RingGeometry(size * 0.6, size * 1.3, 48);
    const disk2Material = new THREE.MeshBasicMaterial({
      color: 0xffaa66,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    this.disk2 = new THREE.Mesh(disk2Geometry, disk2Material);
    this.disk2.rotation.x = Math.PI * 0.4;
    this.disk2.rotation.z = Math.PI * 0.3;
    this.mesh.add(this.disk2);
    
    // SLINGSHOT ZONE indicator (green outer ring) - clearly visible
    const slingshotRingGeometry = new THREE.RingGeometry(this.slingshotRadius * 0.85, this.slingshotRadius, 64);
    const slingshotRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    this.slingshotRing = new THREE.Mesh(slingshotRingGeometry, slingshotRingMaterial);
    this.slingshotRing.rotation.x = Math.PI * 0.5;
    this.mesh.add(this.slingshotRing);
    
    // "Press F" indicator ring
    const fRingGeometry = new THREE.TorusGeometry(this.slingshotRadius * 0.92, 0.15, 8, 32);
    const fRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ffaa,
      transparent: true,
      opacity: 0.6
    });
    this.fRing = new THREE.Mesh(fRingGeometry, fRingMaterial);
    this.fRing.rotation.x = Math.PI * 0.5;
    this.mesh.add(this.fRing);
    
    // DANGER ZONE indicator (red inner ring)
    const dangerRingGeometry = new THREE.RingGeometry(this.trapRadius * 0.9, this.trapRadius * 1.1, 64);
    const dangerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    this.dangerRing = new THREE.Mesh(dangerRingGeometry, dangerRingMaterial);
    this.dangerRing.rotation.x = Math.PI * 0.5;
    this.mesh.add(this.dangerRing);
    
    // Particle system for swirling effect
    this.createParticles();
    
    // Lights - multiple for visibility
    this.centerLight = new THREE.PointLight(0x8800ff, 2, size * 4);
    this.mesh.add(this.centerLight);
    
    this.accentLight = new THREE.PointLight(0xff6600, 1.5, size * 3);
    this.accentLight.position.y = size * 0.5;
    this.mesh.add(this.accentLight);
    
    // Physics body
    this.body = physicsSystem.addBody(this, {
      mass: 0,
      shape: new CANNON.Sphere(this.slingshotRadius),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      isTrigger: true
    });
    
    // Animation
    this.time = 0;
    
    // Gravity strength - STRONGER pull
    this.gravityStrength = 80;    // Was 50
    this.slingshotBoost = 35;     // Was 30
    this.trapPenalty = 40;        // Was 25 - more punishing
  }

  createParticles() {
    const particleCount = 150;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = this.size * 0.5 + Math.random() * this.size * 0.8;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1.0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Orange to purple gradient - brighter
      const t = Math.random();
      colors[i * 3] = 1 - t * 0.3;     // R
      colors[i * 3 + 1] = 0.4 * (1 - t); // G
      colors[i * 3 + 2] = 0.3 + t * 0.7; // B
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.mesh.add(this.particles);
    
    this.particleAngles = [];
    for (let i = 0; i < particleCount; i++) {
      this.particleAngles.push((i / particleCount) * Math.PI * 2);
    }
  }

  update(deltaTime) {
    if (this.destroyed) return;
    
    this.time += deltaTime;
    
    // Rotate accretion disks
    this.disk.rotation.z += deltaTime * 0.6;
    this.disk2.rotation.z -= deltaTime * 0.4;
    
    // Pulse slingshot ring (green)
    const slingshotPulse = 1 + Math.sin(this.time * 2) * 0.1;
    this.slingshotRing.scale.setScalar(slingshotPulse);
    this.slingshotRing.material.opacity = 0.35 + Math.sin(this.time * 3) * 0.15;
    
    // Rotate F ring
    this.fRing.rotation.z += deltaTime * 1.5;
    this.fRing.material.opacity = 0.5 + Math.sin(this.time * 4) * 0.2;
    
    // Pulse danger ring (red)
    const dangerPulse = 1 + Math.sin(this.time * 4) * 0.15;
    this.dangerRing.scale.setScalar(dangerPulse);
    this.dangerRing.material.opacity = 0.4 + Math.sin(this.time * 5) * 0.2;
    
    // Animate particles (spiral inward)
    const positions = this.particles.geometry.attributes.position.array;
    for (let i = 0; i < this.particleAngles.length; i++) {
      this.particleAngles[i] += deltaTime * (1.5 + i * 0.008);
      
      const radius = this.size * 0.4 + (Math.sin(this.particleAngles[i] * 0.5) + 1) * this.size * 0.5;
      positions[i * 3] = Math.cos(this.particleAngles[i]) * radius;
      positions[i * 3 + 2] = Math.sin(this.particleAngles[i]) * radius;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    
    // Light flicker
    this.centerLight.intensity = 2 + Math.sin(this.time * 5) * 0.5;
    this.accentLight.intensity = 1.5 + Math.sin(this.time * 4 + 1) * 0.4;
    
    // Inner glow pulse
    this.innerGlow.scale.setScalar(1 + Math.sin(this.time * 3) * 0.1);
  }

  /**
   * Calculate gravitational effect on player (for reference/utility)
   * Main gravity logic is now in Level1_TheAscent.handleBlackHoleGravity()
   */
  calculateGravityEffect(playerPos) {
    const direction = new THREE.Vector3().subVectors(this.mesh.position, playerPos);
    const distance = direction.length();
    direction.normalize();
    
    if (distance < this.eventHorizon) {
      return { 
        force: new THREE.Vector3(), 
        effect: 'death',
        speedChange: -100,
        inSlingshotZone: false
      };
    }
    
    if (distance < this.trapRadius) {
      const strength = this.gravityStrength * (1 - distance / this.trapRadius);
      return { 
        force: direction.multiplyScalar(strength), 
        effect: 'trap',
        speedChange: -this.trapPenalty * (1 - distance / this.trapRadius),
        inSlingshotZone: false
      };
    }
    
    if (distance < this.slingshotRadius) {
      return { 
        force: new THREE.Vector3(), 
        effect: 'slingshot',
        speedChange: 0, // Slingshot is now manual (press F)
        inSlingshotZone: true
      };
    }
    
    return { 
      force: new THREE.Vector3(), 
      effect: 'none',
      speedChange: 0,
      inSlingshotZone: false
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    
    this.scene.remove(this.mesh);
    this.physicsSystem.removeBody(this.id);
    
    // Dispose all geometries and materials
    this.core.geometry.dispose();
    this.core.material.dispose();
    this.innerGlow.geometry.dispose();
    this.innerGlow.material.dispose();
    this.disk.geometry.dispose();
    this.disk.material.dispose();
    this.disk2.geometry.dispose();
    this.disk2.material.dispose();
    this.slingshotRing.geometry.dispose();
    this.slingshotRing.material.dispose();
    this.fRing.geometry.dispose();
    this.fRing.material.dispose();
    this.dangerRing.geometry.dispose();
    this.dangerRing.material.dispose();
    this.particles.geometry.dispose();
    this.particles.material.dispose();
  }
}
