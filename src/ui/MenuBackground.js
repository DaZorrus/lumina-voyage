import * as THREE from 'three';

/**
 * MenuBackground - Handles the 3D starfield background for the menu
 */
export class MenuBackground {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.starfield = null;
    }

    /**
     * Initialize menu background scene (starfield)
     * This is idempotent - calling multiple times is safe
     */
    init() {
        // Skip if already initialized
        if (this.scene && this.starfield) {
            return;
        }

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 0);

        // Create starfield
        const starCount = 1500;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            // Spherical distribution
            const radius = 50 + Math.random() * 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            // Blue-white stars with some golden ones
            const isGolden = Math.random() < 0.1;
            if (isGolden) {
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.85;
                colors[i * 3 + 2] = 0.5;
            } else {
                colors[i * 3] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 2] = 1.0;
            }

            sizes[i] = 0.5 + Math.random() * 1.5;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true
        });

        this.starfield = new THREE.Points(geometry, material);
        this.scene.add(this.starfield);

        // Add ambient glow
        const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
        this.scene.add(ambientLight);
    }

    /**
     * Update menu background (rotating starfield)
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        if (this.starfield) {
            this.starfield.rotation.y += deltaTime * 0.02;
            this.starfield.rotation.x += deltaTime * 0.005;
        }
    }

    /**
     * Render menu background
     * @param {THREE.WebGLRenderer} renderer 
     */
    render(renderer) {
        if (this.scene && this.camera) {
            renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Handle window resize
     */
    onResize() {
        if (this.camera) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }
    }
}
