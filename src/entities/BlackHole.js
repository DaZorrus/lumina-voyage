import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * BlackHole - Gravity well in Level 1
 * Outer ring = slingshot boost
 * Inner pull = trap that slows player
 */
export class BlackHole {
  constructor(scene, physicsSystem, position, size = 5) {
    this.id = `blackhole-${Math.random().toString(36).substr(2, 9)}`;
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.size = size;
    this.destroyed = false;
    
    // Gravity ranges
    this.slingshotRadius = size * 2;    // Outer ring - boost zone
    this.trapRadius = size * 0.8;        // Inner - slow zone
    this.eventHorizon = size * 0.3;      // Core - instant fail?
    
    // Container
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    scene.add(this.mesh);
    
    // Core (event horizon - dark center)
    const coreGeometry = new THREE.SphereGeometry(this.eventHorizon, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000
    });
    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.mesh.add(this.core);
    
    // Accretion disk
    const diskGeometry = new THREE.RingGeometry(size * 0.4, size * 1.2, 64);
    const diskMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    this.disk = new THREE.Mesh(diskGeometry, diskMaterial);
    this.disk.rotation.x = Math.PI * 0.5;
    this.mesh.add(this.disk);
    
    // Outer glow ring (slingshot zone indicator)
    const outerRingGeometry = new THREE.RingGeometry(this.slingshotRadius * 0.9, this.slingshotRadius, 64);
    const outerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    this.outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
    this.outerRing.rotation.x = Math.PI * 0.5;
    this.mesh.add(this.outerRing);
    
    // Inner warning ring (trap zone)
    const innerRingGeometry = new THREE.RingGeometry(this.trapRadius * 0.9, this.trapRadius, 64);
    const innerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    this.innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
    this.innerRing.rotation.x = Math.PI * 0.5;
    this.mesh.add(this.innerRing);
    
    // Particle system for swirling effect
    this.createParticles();
    
    // Light at core (subtle purple glow)
    this.light = new THREE.PointLight(0x8800ff, 1, size * 3);
    this.mesh.add(this.light);
    
    // Physics body (just for detection, gravity is calculated manually)
    this.body = physicsSystem.addBody(this, {
      mass: 0,
      shape: new CANNON.Sphere(this.slingshotRadius),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      isTrigger: true
    });
    
    // Animation
    this.time = 0;
    
    // Gravity strength
    this.gravityStrength = 50;
    this.slingshotBoost = 30;
    this.trapPenalty = 25;
  }

  createParticles() {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = this.size * 0.5 + Math.random() * this.size * 0.5;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Orange to purple gradient
      const t = Math.random();
      colors[i * 3] = 1 - t * 0.5;     // R
      colors[i * 3 + 1] = 0.3 * (1 - t); // G
      colors[i * 3 + 2] = t;            // B
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
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
    
    // Rotate accretion disk
    this.disk.rotation.z += deltaTime * 0.5;
    
    // Pulse rings
    const outerPulse = 1 + Math.sin(this.time * 2) * 0.1;
    this.outerRing.scale.setScalar(outerPulse);
    
    const innerPulse = 1 + Math.sin(this.time * 3) * 0.15;
    this.innerRing.scale.setScalar(innerPulse);
    
    // Animate particles (spiral inward)
    const positions = this.particles.geometry.attributes.position.array;
    for (let i = 0; i < this.particleAngles.length; i++) {
      this.particleAngles[i] += deltaTime * (2 + i * 0.01);
      
      const radius = this.size * 0.3 + (Math.sin(this.particleAngles[i] * 0.5) + 1) * this.size * 0.4;
      positions[i * 3] = Math.cos(this.particleAngles[i]) * radius;
      positions[i * 3 + 2] = Math.sin(this.particleAngles[i]) * radius;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    
    // Light flicker
    this.light.intensity = 1 + Math.sin(this.time * 5) * 0.3;
  }

  /**
   * Calculate gravitational effect on player
   * @param {THREE.Vector3} playerPos - Player position
   * @returns {Object} { force: THREE.Vector3, effect: 'none'|'slingshot'|'trap'|'death' }
   */
  calculateGravityEffect(playerPos) {
    const direction = new THREE.Vector3().subVectors(this.mesh.position, playerPos);
    const distance = direction.length();
    
    // Normalize direction
    direction.normalize();
    
    // Check zones
    if (distance < this.eventHorizon) {
      return { 
        force: new THREE.Vector3(), 
        effect: 'death',
        speedChange: -100
      };
    }
    
    if (distance < this.trapRadius) {
      // Trap zone - pull inward and slow
      const strength = this.gravityStrength * (1 - distance / this.trapRadius);
      return { 
        force: direction.multiplyScalar(strength), 
        effect: 'trap',
        speedChange: -this.trapPenalty * (1 - distance / this.trapRadius)
      };
    }
    
    if (distance < this.slingshotRadius) {
      // Slingshot zone - boost if moving tangentially
      // (simplified: just give boost)
      return { 
        force: new THREE.Vector3(), 
        effect: 'slingshot',
        speedChange: this.slingshotBoost * (1 - (distance - this.trapRadius) / (this.slingshotRadius - this.trapRadius))
      };
    }
    
    // Outside range
    return { 
      force: new THREE.Vector3(), 
      effect: 'none',
      speedChange: 0
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    
    this.scene.remove(this.mesh);
    this.physicsSystem.removeBody(this.id);
    
    // Dispose geometries and materials
    this.core.geometry.dispose();
    this.core.material.dispose();
    this.disk.geometry.dispose();
    this.disk.material.dispose();
    this.outerRing.geometry.dispose();
    this.outerRing.material.dispose();
    this.innerRing.geometry.dispose();
    this.innerRing.material.dispose();
    this.particles.geometry.dispose();
    this.particles.material.dispose();
  }
}
