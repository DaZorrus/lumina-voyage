import * as THREE from 'three';

/**
 * PortalBeam - Light particles that fly from player to create portal
 */
export class PortalBeam {
  constructor(scene, startPosition, endPosition, onComplete) {
    this.scene = scene;
    this.particles = [];
    this.completed = 0;
    this.onComplete = onComplete;
    
    // Create 5 light particles
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
      });
      
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(startPosition);
      
      // Add glow light to each particle
      const light = new THREE.PointLight(0x00D9FF, 2, 10);
      particle.add(light);
      
      scene.add(particle);
      
      this.particles.push({
        mesh: particle,
        light: light,
        progress: 0,
        delay: i * 0.15, // Stagger particles
        startPos: startPosition.clone(),
        endPos: endPosition.clone(),
        active: false
      });
    }
    
    this.time = 0;
    this.duration = 2.0; // 2 seconds to reach destination
  }
  
  update(deltaTime) {
    this.time += deltaTime;
    
    let allComplete = true;
    
    this.particles.forEach((p, index) => {
      // Check if particle should start
      if (this.time < p.delay) {
        allComplete = false;
        return;
      }
      
      if (!p.active) {
        p.active = true;
      }
      
      // Update progress
      const elapsed = this.time - p.delay;
      p.progress = Math.min(elapsed / this.duration, 1);
      
      if (p.progress < 1) {
        allComplete = false;
        
        // Smooth easing
        const eased = 1 - Math.pow(1 - p.progress, 3);
        
        // Interpolate position with slight curve
        p.mesh.position.lerpVectors(p.startPos, p.endPos, eased);
        
        // Add some wave motion
        const wave = Math.sin(elapsed * 8 + index) * (1 - eased) * 2;
        p.mesh.position.y += wave;
        p.mesh.position.x += Math.cos(elapsed * 6 + index) * (1 - eased);
        
        // Scale down as approaching
        const scale = 1 - eased * 0.5;
        p.mesh.scale.setScalar(scale);
        
        // Pulse light
        p.light.intensity = 2 + Math.sin(elapsed * 10) * 1;
      } else {
        // Hide completed particle
        p.mesh.visible = false;
        p.light.intensity = 0;
      }
    });
    
    if (allComplete && this.onComplete) {
      this.onComplete();
      this.destroy();
      return false;
    }
    
    return true;
  }
  
  destroy() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.particles = [];
  }
}
