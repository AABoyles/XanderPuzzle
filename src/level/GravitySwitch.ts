import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { axisOf, GravitySequencer, rotateClockwise } from '../gravity/axes';
import { GravityAxis, GravitySystem } from '../gravity/GravitySystem';

const INTERACT_RANGE = 2.6;
const SPENT_COLOR = new Color3(0.22, 0.22, 0.24);

/**
 * What a lever does when thrown:
 * - `fixed`: sets gravity to `target` (if that is a quarter turn from the current axis).
 * - `relative`: turns gravity a quarter turn clockwise around the wall the lever is mounted on, so
 *   its effect depends on the current gravity. Useless while you stand on (or hang from) its wall.
 * - `sequence`: starts the level's gravity sequencer, which then cycles gravity on a timer.
 */
export type LeverSpec =
  | { kind: 'fixed'; target: GravityAxis }
  | { kind: 'relative' }
  | { kind: 'sequence'; sequencer: GravitySequencer };

/**
 * A wall-mounted lever that, when the player is nearby and presses E, changes gravity. A `once`
 * lever goes dark after its first use and cannot be thrown again until the chamber restarts.
 */
export class GravitySwitch {
  public readonly root: TransformNode;
  public readonly spec: LeverSpec;
  public readonly once: boolean;
  public spent = false;

  private readonly position: Vector3;
  private readonly wallAxis: GravityAxis;
  private readonly lever: Mesh;
  private readonly arrow: Mesh;
  private readonly glowMat: StandardMaterial;
  private readonly color: (axis: GravityAxis) => Color3;
  private shownAxis: GravityAxis | null | undefined;
  private cooldown = 0;

  constructor(
    scene: Scene,
    position: Vector3,
    wallNormal: Vector3,
    spec: LeverSpec,
    color: (axis: GravityAxis) => Color3,
    once = false,
  ) {
    this.color = color;
    this.position = position.clone();
    this.spec = spec;
    this.once = once;
    this.wallAxis = axisOf([wallNormal.x, wallNormal.y, wallNormal.z]);

    this.root = new TransformNode(`switchRoot_${spec.kind}_${position.toString()}`, scene);
    this.root.position = this.position;

    const base = CreateCylinder('switchBase', { diameter: 1.1, height: 0.25, tessellation: 12 }, scene);
    const baseMat = new StandardMaterial('switchBaseMat', scene);
    baseMat.diffuseColor = new Color3(0.15, 0.15, 0.18);
    baseMat.specularColor = new Color3(0.2, 0.2, 0.2);
    base.material = baseMat;
    base.parent = this.root;
    // Orient the base plate flush against the wall (its own "up" faces along the wall normal).
    base.rotationQuaternion = GravitySwitch.rotationFromUp(wallNormal);
    base.position = wallNormal.scale(0.13);

    this.lever = CreateBox('switchLever', { width: 0.32, height: 0.32, depth: 0.75 }, scene);
    this.glowMat = new StandardMaterial('switchLeverMat', scene);
    this.lever.material = this.glowMat;
    this.lever.parent = this.root;
    this.lever.position = wallNormal.scale(0.55);
    this.lever.rotationQuaternion = GravitySwitch.rotationFromUp(wallNormal);
    const parts: Mesh[] = [base, this.lever];

    // Relative levers wear a ring flush with the wall; sequence levers a ring of four studs.
    if (spec.kind === 'relative') {
      const ring = CreateTorus('switchRing', { diameter: 1.7, thickness: 0.12, tessellation: 24 }, scene);
      ring.material = this.glowMat;
      ring.parent = this.root;
      ring.position = wallNormal.scale(0.12);
      ring.rotationQuaternion = GravitySwitch.rotationFromUp(wallNormal);
      parts.push(ring);
    } else if (spec.kind === 'sequence') {
      const q = GravitySwitch.rotationFromUp(wallNormal);
      for (let i = 0; i < 4; i++) {
        const stud = CreateBox('switchStud', { size: 0.22 }, scene);
        stud.material = this.glowMat;
        stud.parent = this.root;
        const a = (i * Math.PI) / 2;
        const offset = new Vector3(Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85).applyRotationQuaternionInPlace(q);
        stud.position = wallNormal.scale(0.12).add(offset);
        parts.push(stud);
      }
    }

    // Arrow showing which way "down" will be once the lever is thrown.
    const arrowShape = { diameterTop: 0, diameterBottom: 0.45, height: 0.7 };
    this.arrow = CreateCylinder('switchArrow', arrowShape, scene);
    this.arrow.material = this.glowMat;
    this.arrow.parent = this.root;
    parts.push(this.arrow);
    parts.forEach((m) => (m.isPickable = false));
    this.showTarget(spec.kind === 'fixed' ? spec.target : null);
  }

  /** For a fixed lever, the axis it sets. */
  public get targetAxis(): GravityAxis | undefined {
    return this.spec.kind === 'fixed' ? this.spec.target : undefined;
  }

  /** The gravity this lever would switch to from `current`, or null if throwing it would do nothing. */
  public targetFor(current: GravityAxis): GravityAxis | null {
    if (this.spent) return null;
    switch (this.spec.kind) {
      case 'fixed':
        return current[1] !== this.spec.target[1] ? this.spec.target : null;
      case 'relative': {
        const next = rotateClockwise(current, this.wallAxis);
        return next === current ? null : next;
      }
      case 'sequence':
        return this.spec.sequencer.active ? null : this.spec.sequencer.next;
    }
  }

  public canUse(current: GravityAxis): boolean {
    return this.targetFor(current) !== null;
  }

  public distanceTo(playerPos: Vector3): number {
    return Vector3.Distance(playerPos, this.position);
  }

  public isInRange(playerPos: Vector3): boolean {
    return Vector3.Distance(playerPos, this.position) <= INTERACT_RANGE;
  }

  /** Throws the lever if `activate` and it is usable. Returns true if it fired. */
  public update(dt: number, gravity: GravitySystem, playerPos: Vector3, activate: boolean): boolean {
    if (this.cooldown > 0) this.cooldown -= dt;
    const inRange = this.isInRange(playerPos);
    const target = this.targetFor(gravity.axis);

    let fired = false;
    if (inRange && activate && this.cooldown <= 0 && target) {
      if (this.spec.kind === 'sequence') this.spec.sequencer.start(gravity.axis);
      else gravity.setAxis(target);
      this.cooldown = 0.6;
      if (this.once) this.spent = true;
      fired = true;
    }

    // Relative and sequence levers point at whatever they would do next.
    if (this.spec.kind !== 'fixed') this.showTarget(this.targetFor(gravity.axis));
    if (this.spent) {
      this.burnOut();
      return fired;
    }
    const isActive =
      this.spec.kind === 'fixed'
        ? gravity.axis === this.spec.target
        : this.spec.kind === 'sequence' && this.spec.sequencer.active;
    // Pulse brighter when reachable, full bright when it's the current gravity setting.
    const pulse = isActive ? 1.4 : inRange ? 0.9 : 0.5;
    this.glowMat.emissiveColor = this.baseColor().scale(pulse);
    return fired;
  }

  /** Marks the lever spent and paints it dark. Also used for levers that are already burnt out when you arrive. */
  public burnOut(): void {
    this.spent = true;
    this.glowMat.diffuseColor = SPENT_COLOR;
    this.glowMat.emissiveColor = Color3.Black();
    this.arrow.setEnabled(false);
  }

  public dispose(): void {
    this.root.dispose(false, true);
  }

  /** Relative levers are white; the rest take the colour of the axis they set. */
  private baseColor(): Color3 {
    if (this.spec.kind === 'relative') return new Color3(0.9, 0.9, 0.95);
    if (this.spec.kind === 'sequence') return new Color3(0.95, 0.75, 0.2);
    return this.color(this.spec.target);
  }

  private showTarget(axis: GravityAxis | null): void {
    if (axis === this.shownAxis) return;
    this.shownAxis = axis;
    this.arrow.setEnabled(axis !== null);
    const c = this.baseColor();
    this.glowMat.diffuseColor = c.scale(0.4);
    this.glowMat.emissiveColor = c;
    if (!axis) return;
    const dir = GravitySystem.axisVector(axis);
    const normal = GravitySystem.axisVector(this.wallAxis);
    this.arrow.position = normal.scale(1.25).add(dir.scale(0.2));
    this.arrow.rotationQuaternion = GravitySwitch.rotationFromUp(dir);
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
