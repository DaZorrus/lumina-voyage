import * as THREE from 'three';

/**
 * ParticleSystem - Beautiful comet-like trail effect for player
 */
export class ParticleTrail {
  constructor(scene, maxParticles = 150) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.particles = [];
    this.emitCounter = 0;
    
    // Create particle geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Material - larger, smoother particles
    const material = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.mesh = new THREE.Points(geometry, material);
    this.mesh.frustumCulled = false; // CRITICAL: Prevent culling when particles spread out
    scene.add(this.mesh);
    
    // Initialize particle data with longer life for comet tail
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4, // 0.8-1.2 seconds for longer trail
        size: 0.15 + Math.random() * 0.15, // Varied sizes
        colorPhase: Math.random() * Math.PI * 2 // For color variation
      });
    }
  }

  emit(position, velocity) {
    // Emit particles every frame for continuous trail
    this.emitCounter++;
    
    // Find dead particle
    const particle = this.particles.find(p => p.life <= 0);
    if (!particle) return;
    
    // Add slight random spread
    const spread = 0.1;
    particle.position.copy(position);
    particle.position.x += (Math.random() - 0.5) * spread;
    particle.position.y += (Math.random() - 0.5) * spread;
    particle.position.z += (Math.random() - 0.5) * spread;
    
    // Trail behind with some drift
    particle.velocity.copy(velocity).multiplyScalar(-0.05);
    particle.velocity.x += (Math.random() - 0.5) * 0.3;
    particle.velocity.y += (Math.random() - 0.5) * 0.3;
    particle.life = particle.maxLife;
  }

  update(deltaTime) {
    const positions = this.mesh.geometry.attributes.position.array;
    const colors = this.mesh.geometry.attributes.color.array;
    const sizes = this.mesh.geometry.attributes.size.array;
    
    for (let i = 0; i < this.maxParticles; i++) {
      const particle = this.particles[i];
      
      if (particle.life > 0) {
        // Update position with gentle drift
        particle.position.add(
          particle.velocity.clone().multiplyScalar(deltaTime)
        );
        
        // Update life
        particle.life -= deltaTime;
        
        // Calculate alpha with smooth ease-out
        const lifeRatio = particle.life / particle.maxLife;
        const alpha = Math.pow(lifeRatio, 0.5); // Smooth fade
        
        // Update buffer
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;
        
        // Beautiful color gradient: orange -> gold -> white (comet tail)
        // Start: warm orange, fade to white/gold
        const colorShift = 1 - lifeRatio;
        colors[i * 3] = 1.0; // R stays bright
        colors[i * 3 + 1] = 0.6 + colorShift * 0.4; // G: 0.6 -> 1.0
        colors[i * 3 + 2] = 0.2 + colorShift * 0.6; // B: 0.2 -> 0.8
        
        // Size: start bigger, shrink as it fades
        sizes[i] = particle.size * alpha;
      } else {
        // Hide dead particles
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        sizes[i] = 0;
      }
    }
    
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
    this.mesh.geometry.attributes.size.needsUpdate = true;
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
