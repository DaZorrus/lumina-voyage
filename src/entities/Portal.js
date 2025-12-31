import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Portal - Gateway to next level
 * Beautiful glowing portal that appears far away
 */
export class Portal {
  constructor(scene, physicsSystem, position = new THREE.Vector3(0, 0, -100), engine = null) {
    this.id = 'portal';
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.engine = engine;
    this.activated = false;

    // Create portal group
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    scene.add(this.mesh);

    // === MAIN RING - Large torus (2.5x bigger!) ===
    const ringGeometry = new THREE.TorusGeometry(12, 0.6, 32, 64);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x00D9FF,
      emissive: 0x00D9FF,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
      metalness: 0.9
    });

    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.mesh.add(this.ring);

    // === INNER GLOW - Ethereal center ===
    const innerGeometry = new THREE.CircleGeometry(11, 64);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    this.innerGlow = new THREE.Mesh(innerGeometry, innerMaterial);
    this.mesh.add(this.innerGlow);

    // === SECONDARY RING - Outer decoration ===
    const outerRingGeo = new THREE.TorusGeometry(14, 0.25, 16, 64);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    this.mesh.add(this.outerRing);

    // === THIRD RING - Extra decoration ===
    const thirdRingGeo = new THREE.TorusGeometry(16, 0.15, 16, 64);
    const thirdRingMat = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    this.thirdRing = new THREE.Mesh(thirdRingGeo, thirdRingMat);
    this.mesh.add(this.thirdRing);

    // === PORTAL LIGHTS (stronger for bigger portal) ===
    this.mainLight = new THREE.PointLight(0x00D9FF, 25, 150);
    this.mesh.add(this.mainLight);

    this.accentLight = new THREE.PointLight(0xFFD700, 10, 80);
    this.accentLight.position.z = 2;
    this.mesh.add(this.accentLight);

    // === SPIRAL PARTICLES ===
    this.createSpiralParticles();

    // Physics trigger (larger for bigger portal)
    this.body = physicsSystem.addBody(this, {
      mass: 0,
      shape: new CANNON.Sphere(12),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      isTrigger: true
    });

    // Animation
    this.time = 0;
    this.spawnProgress = 0;
  }

  createSpiralParticles() {
    this.spiralParticles = [];

    // More particles for bigger portal
    for (let i = 0; i < 24; i++) {
      const geometry = new THREE.OctahedronGeometry(0.25);
      const material = new THREE.MeshStandardMaterial({
        emissive: i % 2 === 0 ? 0x00D9FF : 0xFFD700,
        emissiveIntensity: 4,
        color: i % 2 === 0 ? 0x00D9FF : 0xFFD700,
        toneMapped: false
      });

      const particle = new THREE.Mesh(geometry, material);
      this.mesh.add(particle);

      this.spiralParticles.push({
        mesh: particle,
        initialOffset: i * (Math.PI * 2) / 24,
        speed: 0.6 + Math.random() * 0.4
      });
    }
  }

  update(deltaTime, playerPosition) {
    this.time += deltaTime;

    // Spawn animation (scale up from 0)
    if (this.spawnProgress < 1) {
      this.spawnProgress += deltaTime * 0.5;
      const scale = Math.min(this.spawnProgress, 1);
      const eased = 1 - Math.pow(1 - scale, 3);
      this.mesh.scale.setScalar(eased);
    }

    // Rotate rings in opposite directions
    this.ring.rotation.z += deltaTime * 0.3;
    this.outerRing.rotation.z -= deltaTime * 0.5;

    // Pulsing effect
    const pulse = Math.sin(this.time * 2) * 0.3 + 1;
    this.mainLight.intensity = 12 * pulse;
    this.accentLight.intensity = 4 * pulse;

    // Inner glow breathing
    this.innerGlow.material.opacity = 0.1 + Math.sin(this.time * 1.5) * 0.08;

    // Third ring rotation
    if (this.thirdRing) {
      this.thirdRing.rotation.z += deltaTime * 0.2;
    }

    // Spiral particle animation (bigger radius for bigger portal)
    if (this.spiralParticles) {
      this.spiralParticles.forEach(({ mesh, initialOffset, speed }) => {
        const t = this.time * speed;

        const radius = 13 + Math.sin(t * 2 + initialOffset) * 1;
        mesh.position.x = Math.cos(t * 2 + initialOffset) * radius;
        mesh.position.y = Math.sin(t * 2 + initialOffset) * radius;
        mesh.position.z = Math.sin(t * 3) * 1;

        mesh.rotation.x += deltaTime * 3;
        mesh.rotation.y += deltaTime * 2;
      });
    }

    // Check if player enters portal (bigger trigger area)
    if (playerPosition) {
      const distance = this.mesh.position.distanceTo(playerPosition);

      if (distance < 15 && !this.activated) {
        this.activate();
      }
    }
  }

  activate() {
    if (this.activated) return;

    this.activated = true;
    console.log('🌀 Portal activated!');

    this.triggerWhiteFlashTransition();
  }

  triggerWhiteFlashTransition() {
    if (this.engine && this.engine.uiManager) {
      // Default behavior: show completion UI for Chapter 0
      this.engine.uiManager.showChapterComplete(0, {
        title: '✨ CHAPTER COMPLETE ✨',
        subtitle: 'The Void has been illuminated.'
      });
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.physicsSystem.removeBody(this.id);

    // Dispose all geometries and materials
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.innerGlow.geometry.dispose();
    this.innerGlow.material.dispose();
    this.outerRing.geometry.dispose();
    this.outerRing.material.dispose();

    if (this.thirdRing) {
      this.thirdRing.geometry.dispose();
      this.thirdRing.material.dispose();
    }

    if (this.spiralParticles) {
      this.spiralParticles.forEach(p => {
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      });
    }
  }
}
