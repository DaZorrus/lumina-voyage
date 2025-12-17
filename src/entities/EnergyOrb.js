import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * EnergyOrb - Collectible that restores player energy
 */
export class EnergyOrb {
  constructor(scene, physicsSystem, position, healAmount = 15) {
    this.id = `orb-${Math.random()}`;
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.healAmount = healAmount;
    this.collected = false;
    
    // Create mesh - LOW POLY DODECAHEDRON (like React code)
    const geometry = new THREE.DodecahedronGeometry(0.8, 0); // 0 subdivisions = low poly
    const material = new THREE.MeshStandardMaterial({
      color: 0x004444, // Start with hidden color
      emissive: 0x004444,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: true, // Low poly wireframe
      flatShading: true
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    scene.add(this.mesh);
    
    // Add glow light
    this.light = new THREE.PointLight(0x00D9FF, 1, 8);
    this.mesh.add(this.light);
    
    // Physics (sensor - no physical collision, only trigger)
    this.body = physicsSystem.addBody(this, {
      mass: 0, // Static
      shape: new CANNON.Sphere(1.5), // Larger collision radius for easier collection
      position: new CANNON.Vec3(position.x, position.y, position.z),
      isTrigger: true
    });
    
    // Animation state
    this.time = Math.random() * Math.PI * 2; // Random start phase
    this.randomOffset = Math.random() * 100; // Random offset for organic breathing
    this.basePosition = position.clone(); // Store original position for distance calc
    this.baseY = position.y;
    this.magneticRadius = 6; // Reduced for less aggressive pull
    this.magneticStrength = 0.08; // Much gentler pull
    
    // Breathing animation
    this.baseScale = 0.7; // Start smaller
    this.breathingSpeed = 0.5; // Much slower breathing (was 0.8)
    
    // Visual states
    this.isRevealed = false;
    this.revealTimer = 0;
    this.pulsedAt = 0; // Track when last pulse hit this orb
  }

  update(deltaTime, playerPosition) {
    if (this.collected) return;
    
    // Update time
    this.time += deltaTime;
    
    // Gentle bobbing animation - use basePosition
    this.mesh.position.x = this.basePosition.x;
    this.mesh.position.y = this.basePosition.y + Math.sin(this.time * 1.5) * 0.3;
    this.mesh.position.z = this.basePosition.z;
    
    // Slow rotation
    this.mesh.rotation.y += deltaTime * 0.5;
    
    // Breathing scale animation (slow, smooth)
    const breathingPhase = Math.sin(this.time * this.breathingSpeed);
    const scaleVariation = breathingPhase * 0.15; // ±15% size variation
    const targetScale = this.baseScale + scaleVariation;
    this.mesh.scale.setScalar(targetScale);
    
    // Update reveal timer
    if (this.revealTimer > 0) {
      this.revealTimer -= deltaTime;
      if (this.revealTimer <= 0) {
        this.isRevealed = false;
      }
    }
    
    // Update visual state
    this.updateVisualState();
    
    // Magnetic attraction to player - use actual mesh position for distance
    if (playerPosition) {
      const distance = this.mesh.position.distanceTo(playerPosition);
      
      // Collection check FIRST (before any position changes)
      if (distance < 2.5) {
        console.log(`🔵 Orb collected! Distance: ${distance.toFixed(2)}`);
        this.collect();
        return;
      }
      
      // Magnetic pull only if within radius
      if (distance < this.magneticRadius) {
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, this.mesh.position)
          .normalize();
        
        // Gentle pull that increases when closer
        const distanceRatio = 1 - (distance / this.magneticRadius);
        const pullStrength = distanceRatio * this.magneticStrength;
        
        // Update base position so bobbing follows the pull
        this.basePosition.add(direction.clone().multiplyScalar(pullStrength));
        this.baseY = this.basePosition.y;
      }
    }
  }

  updateVisualState() {
    // Smooth interpolation factor
    const mat = this.mesh.material;
    
    if (this.isRevealed) {
      // Revealed state: Warm gold (stable, no flickering)
      mat.color.setHex(0xFFD700);
      mat.emissive.setHex(0xFFD700);
      mat.emissiveIntensity = 2; // Reduced from 3
      mat.opacity = 1;
      mat.wireframe = false; // Solid when revealed
      this.light.intensity = 2;
      this.light.color.setHex(0xFFD700);
    } else {
      // Hidden state: Dim teal with subtle breathing
      mat.color.setHex(0x004444);
      mat.emissive.setHex(0x006666);
      
      // Gentle breathing (slower frequency)
      const breathingPulse = (Math.sin(this.time * 1.5 + this.randomOffset) + 1) * 0.5;
      mat.emissiveIntensity = 0.3 + breathingPulse * 0.3; // 0.3 to 0.6
      mat.opacity = 0.5 + breathingPulse * 0.2;
      mat.wireframe = true;
      this.light.intensity = 0.3 + breathingPulse * 0.2;
      this.light.color.setHex(0x006666);
    }
  }

  collect() {
    if (this.collected) return;
    
    this.collected = true;
    console.log(`✨ Collected Energy Orb! +${this.healAmount} Lumen`);
    
    // Hide outline immediately to avoid visual glitch
    if (this.outlineMesh) {
      this.outlineMesh.visible = false;
    }
    
    // Disable light immediately
    this.light.intensity = 0;
    
    // Reset material state for clean animation
    const mat = this.mesh.material;
    mat.wireframe = false;
    mat.color.setHex(0xFFD700);
    mat.emissive.setHex(0xFFD700);
    mat.emissiveIntensity = 2;
    mat.opacity = 1;
    
    // Smooth shrink and fade animation using requestAnimationFrame
    const startScale = this.mesh.scale.x;
    const startTime = performance.now();
    const duration = 200; // ms
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      // Shrink to center (not expand)
      const scale = startScale * (1 - easeOut * 0.8);
      this.mesh.scale.setScalar(scale);
      
      // Fade out
      mat.opacity = 1 - easeOut;
      mat.emissiveIntensity = 2 * (1 - easeOut);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.destroy();
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Wave-based pulse detection (from React code)
   * @param {THREE.Vector3} pulseOrigin - Origin of pulse
   * @param {number} pulseRadius - Max radius
   * @param {number} currentTime - Current game time
   * @param {number} pulseStartTime - When pulse started
   * @param {number} pulseDuration - Duration of pulse expansion
   */
  onPulse(pulseOrigin, pulseRadius = 10, currentTime = 0, pulseStartTime = 0, pulseDuration = 3.0) {
    if (this.collected) return;
    
    const distToPulseOrigin = this.mesh.position.distanceTo(pulseOrigin);
    const timeSincePulse = currentTime - pulseStartTime;
    
    // Calculate current wave radius
    const waveRadius = timeSincePulse * (pulseRadius / pulseDuration);
    
    // Wave hits orb when distance matches wave radius (with tolerance)
    if (Math.abs(distToPulseOrigin - waveRadius) < 3 && distToPulseOrigin < pulseRadius) {
      if (!this.isRevealed || this.revealTimer < 1) {
        console.log('🔆 Orb revealed by pulse wave!');
        
        this.isRevealed = true;
        this.revealTimer = 5; // Stay revealed for 5 seconds
        
        // Create wireframe outline if not exists
        if (!this.outlineMesh) {
          const outlineGeo = new THREE.SphereGeometry(0.4, 16, 16);
          const outlineMat = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            wireframe: true,
            transparent: true,
            opacity: 0.8
          });
          this.outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
          this.mesh.add(this.outlineMesh);
        }
        
        // Show outline
        this.outlineMesh.visible = true;
        this.outlineMesh.material.opacity = 0.8;
      }
    }
  }

  destroy() {
    if (this.outlineMesh) {
      this.mesh.remove(this.outlineMesh);
      this.outlineMesh.geometry.dispose();
      this.outlineMesh.material.dispose();
    }
    this.scene.remove(this.mesh);
    this.physicsSystem.removeBody(this.id);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
