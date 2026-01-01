import * as THREE from 'three';

/**
 * MenuBackground - Handles the 3D starfield background for the menu
 */
export class MenuBackground {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.starfield = null;
        this.time = 0;
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
        this.scene.background = new THREE.Color(0x050510); // Deeper blue-black

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 0);

        // Create star texture for better glow
        const starTexture = this.createStarTexture();

        // Create starfield
        const starCount = 2000; // More stars
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            // Spherical distribution
            const radius = 40 + Math.random() * 250;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            // Blue-white stars with some golden and cyan ones
            const rand = Math.random();
            if (rand < 0.1) { // Golden
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.9;
                colors[i * 3 + 2] = 0.5;
            } else if (rand < 0.2) { // Cyan/Lumina
                colors[i * 3] = 0.0;
                colors[i * 3 + 1] = 0.8;
                colors[i * 3 + 2] = 1.0;
            } else { // White-blue
                colors[i * 3] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 2] = 1.0;
            }

            sizes[i] = 0.8 + Math.random() * 2.5;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 2.0,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            map: starTexture,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.starfield = new THREE.Points(geometry, material);
        this.scene.add(this.starfield);

        // Add a second "glow" layer (larger, softer stars)
        const glowMaterial = new THREE.PointsMaterial({
            size: 6.0,
            vertexColors: true,
            transparent: true,
            opacity: 0.3,
            map: starTexture,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });
        this.glowField = new THREE.Points(geometry, glowMaterial);
        this.scene.add(this.glowField);

        // Add ambient glow
        this.ambientLight = new THREE.AmbientLight(0x404080, 0.6);
        this.scene.add(this.ambientLight);
    }

    /**
     * Create a circular gradient texture for glowing stars
     */
    createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.4, 'rgba(128, 128, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Update menu background (rotating starfield)
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        if (this.starfield) {
            this.time += deltaTime;
            
            // Rotation
            this.starfield.rotation.y += deltaTime * 0.015;
            this.starfield.rotation.x += deltaTime * 0.004;
            
            if (this.glowField) {
                this.glowField.rotation.y = this.starfield.rotation.y;
                this.glowField.rotation.x = this.starfield.rotation.x;
            }

            // Twinkling effect (more aggressive flicker)
            // Primary stars flicker fast - Ngưỡng min cao hơn (0.8 - 0.15 = 0.65)
            this.starfield.material.opacity = 0.8 + Math.sin(this.time * 2.5) * 0.15;
            
            // Glow layer pulses slowly for "bloom" feel
            if (this.glowField) {
                this.glowField.material.opacity = 0.25 + Math.sin(this.time * 0.8) * 0.1;
                this.glowField.material.size = 6.0 + Math.sin(this.time * 1.2) * 2.0;
            }

            // Modulate ambient light for environmental glow
            if (this.ambientLight) {
                this.ambientLight.intensity = 0.5 + Math.sin(this.time * 0.6) * 0.3;
            }
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
