import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * CameraSystem - Manages camera movement and behavior
 */
export class CameraSystem {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV
      aspect,
      0.1, // Near
      2000 // Far - increased for starfield visibility
    );

    this.camera.position.set(0, 5, 10);
    
    this.target = null;
    this.offset = new THREE.Vector3(0, 3, 8);
    this.smoothFactor = 0.1;
    this.bankAngle = 0;
    this.maxBankAngle = 0.2;
    
    // FOV dynamics (juice effect)
    this.baseFov = 70; // Base FOV for Level 0
    this.targetFov = this.baseFov;
    this.orbsCollected = 0; // Track for FOV increase
    
    // Zoom control
    this.minDistance = 8;
    this.maxDistance = 30;
    this.currentDistance = 15; // Start farther
    this.setupZoomControl();
  }

  setupZoomControl() {
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.currentDistance += e.deltaY * 0.01;
      this.currentDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.currentDistance));
      
      // Update offset based on distance
      const ratio = this.currentDistance / 15;
      this.offset.set(0, 3 * ratio, 8 * ratio);
    }, { passive: false });
  }

  follow(targetEntity) {
    this.target = targetEntity;
    // Set initial farther position
    if (this.target && this.target.mesh) {
      this.camera.position.set(
        this.target.mesh.position.x,
        this.target.mesh.position.y + 6,
        this.target.mesh.position.z + 15
      );
      this.offset.set(0, 6, 15);
    }
  }

  update(deltaTime, mouseVelocityX) {
    if (!this.target || !this.target.mesh) return;

    // === FOV DYNAMICS (Juice Effect) ===
    // Increase FOV with collected orbs for sense of speed
    this.targetFov = this.baseFov + (this.orbsCollected * 2); // +2 FOV per orb
    
    // Smooth FOV transitions
    const currentFov = this.camera.fov;
    this.camera.fov = THREE.MathUtils.lerp(currentFov, this.targetFov, deltaTime * 2);
    this.camera.updateProjectionMatrix();
    
    // Calculate target position
    const targetPosition = this.target.mesh.position.clone().add(this.offset);
    
    // Smooth lerp
    this.camera.position.lerp(targetPosition, this.smoothFactor);
    
    // Look at player
    this.camera.lookAt(this.target.mesh.position);
    
    // Banking effect (camera tilt when turning)
    if (Math.abs(mouseVelocityX) > 2) {
      const targetBank = THREE.MathUtils.clamp(
        mouseVelocityX * 0.01,
        -this.maxBankAngle,
        this.maxBankAngle
      );
      this.bankAngle = THREE.MathUtils.lerp(this.bankAngle, targetBank, 0.1);
    } else {
      this.bankAngle *= 0.9; // Decay
    }
    
    this.camera.rotation.z = this.bankAngle;
  }

  transitionTo(newPosition, newTarget, duration = 2) {
    gsap.to(this.camera.position, {
      x: newPosition.x,
      y: newPosition.y,
      z: newPosition.z,
      duration: duration,
      ease: 'power2.inOut'
    });

    if (newTarget) {
      // Animate lookAt over time (requires custom implementation)
    }
  }

  shake(intensity = 0.5, duration = 0.3) {
    const originalPos = this.camera.position.clone();
    
    gsap.to(this.camera.position, {
      x: `+=${(Math.random() - 0.5) * intensity}`,
      y: `+=${(Math.random() - 0.5) * intensity}`,
      duration: duration / 4,
      yoyo: true,
      repeat: 3,
      ease: 'power2.inOut',
      onComplete: () => {
        this.camera.position.copy(originalPos);
      }
    });
  }

  onResize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
  
  /**
   * Update FOV based on orbs collected (juice effect)
   */
  setOrbsCollected(count) {
    this.orbsCollected = count;
  }
  
  /**
   * Set base FOV for current level
   */
  setBaseFov(fov) {
    this.baseFov = fov;
    this.targetFov = fov;
  }
}
