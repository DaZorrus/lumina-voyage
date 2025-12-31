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
    this.lookAheadOffset = new THREE.Vector3(0, 0, 0); // Look ahead for Level 1
    this.smoothFactor = 8; // Higher value = faster catch-up, multiplied by deltaTime
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

    // Reset camera settings for new target
    this.lookAheadOffset.set(0, 0, 0);
    this.orbsCollected = 0;

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

    // FOV is now managed by levels for better precision

    // Calculate target position
    const targetPosition = this.target.mesh.position.clone().add(this.offset);

    // Smooth lerp with deltaTime for frame-rate independent smoothing
    const lerpFactor = 1 - Math.exp(-this.smoothFactor * deltaTime);
    this.camera.position.lerp(targetPosition, lerpFactor);

    // Look at player (or ahead if lookAheadOffset is set)
    const lookAtTarget = this.target.mesh.position.clone().add(this.lookAheadOffset);
    this.camera.lookAt(lookAtTarget);

    // Banking effect disabled to prevent any shake-like feeling
    // Camera tilt was causing perceived shake during fast movement
    this.bankAngle *= 0.95; // Just decay any existing tilt
    this.camera.rotation.z = 0; // Keep camera level
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

  /**
   * Reset camera to default state
   */
  reset() {
    console.log('📷 Resetting camera...');
    this.target = null;
    this.offset.set(0, 3, 8);
    this.lookAheadOffset.set(0, 0, 0);
    this.baseFov = 70;
    this.targetFov = 70;
    this.camera.fov = 70;
    this.orbsCollected = 0;
    this.currentDistance = 15;
    this.camera.position.set(0, 5, 10);
    this.camera.updateProjectionMatrix();
  }
}
