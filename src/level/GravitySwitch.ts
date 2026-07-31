import {
  Color3,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { GravityAxis, GravitySystem } from '../gravity/GravitySystem';

const INTERACT_RANGE = 2.6;
const AXIS_COLOR: Record<GravityAxis, Color3> = {
  '+X': new Color3(1.0, 0.35, 0.35),
  '-X': new Color3(0.6, 0.15, 0.15),
  '+Y': new Color3(0.35, 1.0, 0.45),
  '-Y': new Color3(0.15, 0.55, 0.2),
  '+Z': new Color3(0.35, 0.55, 1.0),
  '-Z': new Color3(0.15, 0.25, 0.6),
};

/**
 * A wall-mounted lever that, when the player is nearby and presses E,
 * snaps the whole level's gravity to `targetAxis`.
 */
export class GravitySwitch {
  public readonly root: TransformNode;
  public readonly targetAxis: GravityAxis;

  private readonly position: Vector3;
  private readonly lever: Mesh;
  private readonly glowMat: StandardMaterial;
  private cooldown = 0;

  constructor(scene: Scene, position: Vector3, wallNormal: Vector3, targetAxis: GravityAxis) {
    this.position = position.clone();
    this.targetAxis = targetAxis;

    this.root = new TransformNode(`switchRoot_${targetAxis}_${position.toString()}`, scene);
    this.root.position = this.position;

    const base = MeshBuilder.CreateCylinder(
      'switchBase',
      { diameter: 1.1, height: 0.25, tessellation: 12 },
      scene,
    );
    const baseMat = new StandardMaterial('switchBaseMat', scene);
    baseMat.diffuseColor = new Color3(0.15, 0.15, 0.18);
    baseMat.specularColor = new Color3(0.2, 0.2, 0.2);
    base.material = baseMat;
    base.parent = this.root;
    // Orient the base plate flush against the wall (its own "up" faces along the wall normal).
    base.rotationQuaternion = GravitySwitch.rotationFromUp(wallNormal);
    base.position = wallNormal.scale(0.13);

    this.lever = MeshBuilder.CreateBox('switchLever', { width: 0.32, height: 0.32, depth: 0.75 }, scene);
    this.glowMat = new StandardMaterial('switchLeverMat', scene);
    this.glowMat.diffuseColor = AXIS_COLOR[targetAxis].scale(0.4);
    this.glowMat.emissiveColor = AXIS_COLOR[targetAxis];
    this.lever.material = this.glowMat;
    this.lever.parent = this.root;
    this.lever.position = wallNormal.scale(0.55);
    this.lever.rotationQuaternion = GravitySwitch.rotationFromUp(wallNormal);
  }

  public isInRange(playerPos: Vector3): boolean {
    return Vector3.Distance(playerPos, this.position) <= INTERACT_RANGE;
  }

  public update(dt: number, gravity: GravitySystem, playerPos: Vector3, activate: boolean): boolean {
    if (this.cooldown > 0) this.cooldown -= dt;

    const inRange = this.isInRange(playerPos);
    const isActiveAxis = gravity.axis === this.targetAxis;

    // Pulse brighter when reachable, full bright when it's the current gravity setting.
    const pulse = isActiveAxis ? 1.4 : inRange ? 0.9 : 0.5;
    this.glowMat.emissiveColor = AXIS_COLOR[this.targetAxis].scale(pulse);

    if (inRange && activate && this.cooldown <= 0) {
      gravity.setAxis(this.targetAxis);
      this.cooldown = 0.6;
      return true;
    }
    return false;
  }

  public dispose(): void {
    this.root.dispose();
  }

  private static rotationFromUp(up: Vector3): Quaternion {
    // Build a quaternion that maps world +Y to the given wall-normal direction.
    const worldUp = Vector3.Up();
    const dot = Math.max(-1, Math.min(1, Vector3.Dot(worldUp, up)));
    if (dot > 0.9999) return Quaternion.Identity();
    if (dot < -0.9999) {
      return Quaternion.RotationAxis(Vector3.Right(), Math.PI);
    }
    const axis = Vector3.Cross(worldUp, up).normalize();
    const angle = Math.acos(dot);
    return Quaternion.RotationAxis(axis, angle);
  }
}
