import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * ModelManager - Centralized 3D model loading and caching
 * Handles loading, caching, and cloning of GLTF models
 */
class ModelManagerClass {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.loadingPromises = new Map();
    
    // Model paths
    this.modelPaths = {
      asteroid: 'assets/models/Asteroid.glb',
      asteroidField: 'assets/models/asteroid_field.glb',
      asteroidRock: 'assets/models/asteroid_rock.glb',
      asteroidRock1: 'assets/models/asteroid_rock1.glb',
      asteroidRock2: 'assets/models/asteroid_rock2.glb',
      comet: 'assets/models/Comet.glb'
    };
    
    // Color corrections for specific models
    this.colorCorrections = {
      asteroidRock: 0x3a3a3a  // Dark gray instead of yellow
    };
  }

  /**
   * Load a model by key name
   * @param {string} modelKey - Key from modelPaths
   * @returns {Promise<THREE.Group>} - Cloned model ready to use
   */
  async load(modelKey) {
    const path = this.modelPaths[modelKey];
    if (!path) {
      console.error(`ModelManager: Unknown model key "${modelKey}"`);
      return null;
    }
    
    // Check cache first
    if (this.cache.has(modelKey)) {
      return this.cloneModel(this.cache.get(modelKey), modelKey);
    }
    
    // Check if already loading
    if (this.loadingPromises.has(modelKey)) {
      await this.loadingPromises.get(modelKey);
      return this.cloneModel(this.cache.get(modelKey), modelKey);
    }
    
    // Load the model
    const loadPromise = new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          this.cache.set(modelKey, model);
          console.log(`📦 ModelManager: Loaded "${modelKey}"`);
          resolve(model);
        },
        undefined,
        (error) => {
          console.error(`ModelManager: Failed to load "${modelKey}"`, error);
          reject(error);
        }
      );
    });
    
    this.loadingPromises.set(modelKey, loadPromise);
    
    try {
      await loadPromise;
      return this.cloneModel(this.cache.get(modelKey), modelKey);
    } catch (error) {
      return null;
    }
  }

  /**
   * Clone a cached model with color corrections
   * @param {THREE.Group} original - Original model
   * @param {string} modelKey - Key for color corrections
   * @returns {THREE.Group} - Cloned model
   */
  cloneModel(original, modelKey) {
    const clone = original.clone();
    
    // Apply color corrections if needed
    if (this.colorCorrections[modelKey]) {
      const correctedColor = new THREE.Color(this.colorCorrections[modelKey]);
      clone.traverse((child) => {
        if (child.isMesh) {
          // Clone material to avoid affecting other instances
          child.material = child.material.clone();
          child.material.color = correctedColor;
          
          // Make it look more like asteroid
          if (child.material.isMeshStandardMaterial) {
            child.material.roughness = 0.9;
            child.material.metalness = 0.1;
          }
        }
      });
    }
    
    return clone;
  }

  /**
   * Preload multiple models
   * @param {string[]} modelKeys - Array of model keys to preload
   */
  async preload(modelKeys) {
    const promises = modelKeys.map(key => this.load(key));
    await Promise.all(promises);
    console.log(`📦 ModelManager: Preloaded ${modelKeys.length} models`);
  }

  /**
   * Get a random asteroid model key
   * @returns {string} - Random asteroid model key
   */
  getRandomAsteroidKey() {
    const asteroidKeys = ['asteroidRock', 'asteroidRock1', 'asteroidRock2'];
    return asteroidKeys[Math.floor(Math.random() * asteroidKeys.length)];
  }

  /**
   * Clear cache (for memory management)
   */
  clearCache() {
    this.cache.forEach((model) => {
      model.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.cache.clear();
    this.loadingPromises.clear();
    console.log('📦 ModelManager: Cache cleared');
  }
}

// Singleton instance
export const ModelManager = new ModelManagerClass();
