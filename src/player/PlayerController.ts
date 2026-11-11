import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scalar } from '@babylonjs/core/Maths/math.scalar';
import { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { GravitySystem } from '../gravity/GravitySystem';
import type { InputManager } from '../input/InputManager';
import type { InputFrame } from '../input/InputSource';

const RADIUS = 0.5;
const EYE_OFFSET = 0.35; // above the collider center
const MOVE_SPEED = 6.5;
const JUMP_SPEED = 8.5;
const REORIENT_SPEED = 6; // higher = snappier catch-up to the new "up"
const PITCH_LIMIT = (89 * Math.PI) / 180;

const tmpMatrix = new Matrix();

function rotate(v: Vector3, q: Quaternion): Vector3 {
  Matrix.FromQuaternionToRef(q, tmpMatrix);
  return Vector3.TransformNormal(v, tmpMatrix);
}

/**
 * Drives a first-person kinematic body through the level. Physics, movement
 * basis and camera orientation all derive from a single smoothed "up" vector
 * that continuously chases the GravitySystem's true up - so flipping gravity
 * produces a coherent tumble into the new orientation rather than a snap.
 */
export class PlayerController {
  public readonly collider: Mesh;
  public readonly camera: UniversalCamera;

  private readonly scene: Scene;
  private readonly input: InputManager;
  private readonly gravity: GravitySystem;

  /** Snap to the new orientation on a gravity change instead of rolling into it. */
  public reducedMotion = false;

  private alignRot = Quaternion.Identity();
  private yaw = 0;
  private pitch = 0;
  private verticalSpeed = 0;
  private grounded = false;

  private jumpQueued = false;
  private interactQueued = false;

  constructor(scene: Scene, gravity: GravitySystem, spawnPosition: Vector3, input: InputManager) {
    this.scene = scene;
    this.input = input;
    this.gravity = gravity;

    // Initialise the alignment so the player already faces the level's natural up.
    this.alignRot = PlayerController.quaternionFromTo(Vector3.Up(), gravity.up);

    this.collider = CreateSphere('playerCollider', { diameter: RADIUS * 2, segments: 8 }, scene);
    this.collider.isVisible = false;
    this.collider.isPickable = false;
    this.collider.checkCollisions = true;
    this.collider.ellipsoid = new Vector3(RADIUS, RADIUS, RADIUS);
    this.collider.position = spawnPosition.clone();

    this.camera = new UniversalCamera('fpsCamera', spawnPosition.clone(), scene);
    this.camera.minZ = 0.05;
    this.camera.fov = 1.0;
    this.camera.inputs.clear();
    this.camera.rotationQuaternion = this.alignRot.clone();
    scene.activeCamera = this.camera;
  }

  public get position(): Vector3 {
    return this.collider.position;
  }

  /** Returns true once, the frame the interact key was pressed. */
  public consumeInteract(): boolean {
    const v = this.interactQueued;
    this.interactQueued = false;
    return v;
  }

  /** Teleport to a spawn point and snap orientation to the current gravity. */
  public reset(position: Vector3): void {
    this.collider.position.copyFrom(position);
    this.alignRot = PlayerController.quaternionFromTo(Vector3.Up(), this.gravity.up);
    this.yaw = 0;
    this.pitch = 0;
    this.verticalSpeed = 0;
    this.jumpQueued = false;
    this.interactQueued = false;
    // Drain pending edges and look deltas so a queued press doesn't fire after the restart.
    this.input.drain();
  }

  /**
   * Turns the view a step towards straight down (towards the planet), for when the player no longer has control: the
   * end of the last fall. `amount` is the fraction of the remaining angle to close this frame.
   */
  public lookDown(amount: number): void {
    this.pitch += (PITCH_LIMIT - this.pitch) * Math.min(Math.max(amount, 0), 1);
    const look = Quaternion.RotationAxis(Vector3.Up(), this.yaw).multiply(Quaternion.RotationAxis(Vector3.Right(), this.pitch));
    this.camera.rotationQuaternion = this.alignRot.multiply(look);
  }

  /** Sets the view direction relative to the current up (radians; positive pitch looks down). */
  public setLook(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
  }

  public get isGrounded(): boolean {
    return this.grounded;
  }

  /** Advances one frame. `input` is this frame's merged input, read once by the caller. */
  public update(dt: number, input: InputFrame): void {
    dt = Math.min(dt, 1 / 20);

    // --- Smoothly chase the level's true "up" -------------------------------------------------
    const targetUp = this.gravity.up;
    const currentUp = rotate(Vector3.Up(), this.alignRot);
    const dot = Scalar.Clamp(Vector3.Dot(currentUp, targetUp), -1, 1);
    if (dot < 0.99999) {
      let axis = Vector3.Cross(currentUp, targetUp);
      let axisLen = axis.length();
      if (axisLen <= 1e-5) {
        // Exactly opposite: roll around the body's own forward axis.
        axis = rotate(Vector3.Forward(), this.alignRot);
        axisLen = 1;
      }
      if (axisLen > 1e-5) {
        axis.scaleInPlace(1 / axisLen);
        const angle = Math.acos(dot);
        const delta = Quaternion.RotationAxis(axis, angle);
        const fullTarget = delta.multiply(this.alignRot);
        // Reduced motion snaps straight to the target (same shortest rotation, so the look direction carries over).
        const t = this.reducedMotion ? 1 : 1 - Math.exp(-REORIENT_SPEED * dt);
        Quaternion.SlerpToRef(this.alignRot, fullTarget, t, this.alignRot);
        this.alignRot.normalize();
      }
    }
    const up = rotate(Vector3.Up(), this.alignRot);

    // --- Look ------------------------------------------------------------------------------------
    if (input.jump) this.jumpQueued = true;
    if (input.interact) this.interactQueued = true;
    this.yaw += input.lookX;
    this.pitch = Scalar.Clamp(this.pitch + input.lookY, -PITCH_LIMIT, PITCH_LIMIT);

    const yawQuat = Quaternion.RotationAxis(Vector3.Up(), this.yaw);
    const pitchQuat = Quaternion.RotationAxis(Vector3.Right(), this.pitch);
    const moveBasis = this.alignRot.multiply(yawQuat);
    const lookRot = this.alignRot.multiply(yawQuat.multiply(pitchQuat));

    const forward = rotate(Vector3.Forward(), moveBasis);
    const right = rotate(Vector3.Right(), moveBasis);

    // --- Grounded check --------------------------------------------------------------------------
    const rayOrigin = this.collider.position.add(up.scale(0.05));
    const ray = new Ray(rayOrigin, up.scale(-1), RADIUS + 0.25);
    const hit = this.scene.pickWithRay(ray, (m) => m.checkCollisions && m !== this.collider);
    this.grounded = !!hit && !!hit.hit;

    // --- Horizontal input --------------------------------------------------------------------------
    const horizontal = new Vector3(0, 0, 0);
    if (input.moveX !== 0 || input.moveZ !== 0) {
      horizontal.addInPlace(forward.scale(input.moveZ));
      horizontal.addInPlace(right.scale(input.moveX));
      horizontal.scaleInPlace(input.sprint ? MOVE_SPEED * 1.6 : MOVE_SPEED);
    }

    // --- Vertical (gravity + jump) -------------------------------------------------------------
    if (this.grounded && this.verticalSpeed <= 0) {
      this.verticalSpeed = 0;
      if (this.jumpQueued) {
        this.verticalSpeed = JUMP_SPEED;
      }
    } else {
      this.verticalSpeed -= this.gravity.magnitude * dt;
    }
    this.jumpQueued = false;

    const displacement = horizontal.scale(dt).add(up.scale(this.verticalSpeed * dt));
    this.collider.moveWithCollisions(displacement);

    // --- Sync camera -----------------------------------------------------------------------------
    this.camera.position.copyFrom(this.collider.position).addInPlace(up.scale(EYE_OFFSET));
    this.camera.rotationQuaternion = lookRot;
  }

  public dispose(): void {
    this.collider.dispose();
    this.camera.dispose();
  }

  private static quaternionFromTo(from: Vector3, to: Vector3): Quaternion {
    const dot = Scalar.Clamp(Vector3.Dot(from, to), -1, 1);
    if (dot > 0.99999) return Quaternion.Identity();
    if (dot < -0.99999) {
      // 180 degrees - pick any perpendicular axis.
      let axis = Vector3.Cross(from, Vector3.Right());
      if (axis.lengthSquared() < 1e-6) axis = Vector3.Cross(from, Vector3.Forward());
      axis.normalize();
      return Quaternion.RotationAxis(axis, Math.PI);
    }
    const axis = Vector3.Cross(from, to).normalize();
    const angle = Math.acos(dot);
    return Quaternion.RotationAxis(axis, angle);
  }
}
