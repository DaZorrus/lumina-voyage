import * as CANNON from 'cannon-es';

/**
 * PhysicsSystem - Wrapper for Cannon.js physics engine
 */
export class PhysicsSystem {
  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, 0); // Zero gravity for space environment
    
    // Performance optimizations
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.solver.tolerance = 0.1;
    
    // Default material
    this.defaultMaterial = new CANNON.Material('default');
    this.defaultContactMaterial = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      {
        friction: 0.1,
        restitution: 0.3
      }
    );
    this.world.addContactMaterial(this.defaultContactMaterial);
    
    // Storage for bodies
    this.bodies = new Map();
  }

  addBody(entity, options = {}) {
    const shape = options.shape || new CANNON.Sphere(0.5);
    const body = new CANNON.Body({
      mass: options.mass !== undefined ? options.mass : 1,
      shape: shape,
      position: options.position || new CANNON.Vec3(0, 0, 0),
      material: this.defaultMaterial,
      linearDamping: options.linearDamping || 0.1,
      angularDamping: options.angularDamping || 0.5
    });

    this.world.addBody(body);
    this.bodies.set(entity.id, body);

    // Setup collision callback
    body.addEventListener('collide', (event) => {
      if (entity.onCollide) {
        entity.onCollide(event.body);
      }
    });

    return body;
  }

  removeBody(entityId) {
    const body = this.bodies.get(entityId);
    if (body) {
      this.world.removeBody(body);
      this.bodies.delete(entityId);
    }
  }

  getBody(entityId) {
    return this.bodies.get(entityId);
  }

  applyForce(entity, forceVector) {
    const body = this.bodies.get(entity.id);
    if (body) {
      body.applyForce(
        new CANNON.Vec3(forceVector.x, forceVector.y, forceVector.z),
        body.position
      );
    }
  }

  step(deltaTime) {
    // Fixed timestep to prevent physics instability
    const fixedTimeStep = 1 / 60;
    const maxSubSteps = 3;
    
    // Clamp deltaTime to prevent spiral of death
    const clampedDelta = Math.min(deltaTime, 0.1);
    
    this.world.step(fixedTimeStep, clampedDelta, maxSubSteps);
  }

  syncMeshes(entities) {
    // Sync Three.js meshes with Cannon.js bodies
    entities.forEach(entity => {
      const body = this.bodies.get(entity.id);
      if (body && entity.mesh) {
        entity.mesh.position.copy(body.position);
        entity.mesh.quaternion.copy(body.quaternion);
      }
    });
  }
}
