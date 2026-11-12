import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Aabb, Body, bodyAabb, overlaps, stepBody, Vec3 } from '../physics/boxPhysics';
import { boundsOf, distanceOutside } from '../environment/fall';

const PLAYER_HALF = 0.5;
const MAX_STEP = 1 / 20;
/** A crate this far outside the level's bounds has fallen out through a hole and is gone for good. */
export const CRATE_LOST_MARGIN = 12;

const arr = (v: Vector3): Vec3 => [v.x, v.y, v.z];
const playerBox = (p: Vector3): Aabb => ({
  min: [p.x - PLAYER_HALF, p.y - PLAYER_HALF, p.z - PLAYER_HALF],
  max: [p.x + PLAYER_HALF, p.y + PLAYER_HALF, p.z + PLAYER_HALF],
});
const distance = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function makeGhostMaterial(scene: Scene): StandardMaterial {
  const mat = new StandardMaterial('crateGhostMat', scene);
  mat.diffuseColor = new Color3(1, 0.7, 0.3);
  mat.emissiveColor = new Color3(1, 0.7, 0.3);
  mat.specularColor = new Color3(0, 0, 0);
  mat.alpha = 0.18;
  mat.backFaceCulling = false;
  return mat;
}

/** A box that falls whichever way gravity points. Nothing but gravity moves it. */
export class Crate {
  public readonly body: Body;
  public readonly mesh: Mesh;
  /** True once the crate has fallen out of the level through a hole: it is hidden and no longer simulated. */
  public lost = false;

  constructor(scene: Scene, center: Vector3, size: number) {
    this.body = { center: arr(center), half: [size / 2, size / 2, size / 2], velocity: [0, 0, 0] };
    this.mesh = CreateBox('crate', { size }, scene);
    const mat = new StandardMaterial('crateMat', scene);
    mat.diffuseColor = new Color3(0.55, 0.42, 0.25);
    mat.emissiveColor = new Color3(0.12, 0.08, 0.03);
    mat.specularColor = new Color3(0.1, 0.1, 0.1);
    this.mesh.material = mat;
    this.mesh.enableEdgesRendering();
    this.mesh.edgesWidth = 3;
    this.mesh.edgesColor.set(1, 0.7, 0.3, 1);
    // The player collides with (and can stand on) crates through Babylon's own collision system.
    this.mesh.checkCollisions = true;
    this.mesh.position.copyFrom(center);
  }

  public get aabb(): Aabb {
    return bodyAabb(this.body);
  }

  public sync(): void {
    this.mesh.position.set(this.body.center[0], this.body.center[1], this.body.center[2]);
  }
}

/**
 * A pad on a surface that is "pressed" while a crate (or, optionally, the player) rests on it. An `inverted` plate is
 * satisfied while nothing rests on it: its door needs it kept clear.
 */
export class PressurePlate {
  public pressed = false;
  public readonly trigger: Aabb;
  public readonly mesh: Mesh;
  private readonly mat: StandardMaterial;

  /**
   * @param center point on the surface the plate is mounted on
   * @param normal axis-aligned unit vector pointing away from that surface
   */
  constructor(
    scene: Scene,
    center: Vector3,
    normal: Vector3,
    size: number,
    public readonly cratesOnly: boolean,
    public readonly inverted = false,
  ) {
    const c = arr(center);
    const n = arr(normal);
    const min: Vec3 = [0, 0, 0];
    const max: Vec3 = [0, 0, 0];
    const dims: Vec3 = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      if (n[i] !== 0) {
        // Reaches 0.4 out from the surface: enough to catch anything resting on it.
        min[i] = Math.min(c[i], c[i] + n[i] * 0.4);
        max[i] = Math.max(c[i], c[i] + n[i] * 0.4);
        dims[i] = 0.12;
      } else {
        min[i] = c[i] - size / 2;
        max[i] = c[i] + size / 2;
        dims[i] = size;
      }
    }
    this.trigger = { min, max };

    this.mesh = CreateBox('plate', { width: dims[0], height: dims[1], depth: dims[2] }, scene);
    this.mesh.position = center.add(normal.scale(0.06));
    this.mesh.isPickable = false;
    this.mat = new StandardMaterial('plateMat', scene);
    this.mat.diffuseColor = new Color3(0.1, 0.1, 0.1);
    this.mesh.material = this.mat;
    this.paint();
  }

  /** What a door asks of this plate: pressed, or for an inverted plate, clear. Lit green while true. */
  public get satisfied(): boolean {
    return this.pressed !== this.inverted;
  }

  public setPressed(pressed: boolean): boolean {
    if (pressed === this.pressed) return false;
    this.pressed = pressed;
    this.paint();
    return true;
  }

  private paint(): void {
    this.mat.emissiveColor = this.satisfied ? new Color3(0.2, 1.0, 0.4) : new Color3(0.9, 0.25, 0.15);
  }
}

/** A solid slab that opens while every linked plate is satisfied (pressed, or clear if the plate is inverted). */
export class Door {
  public isOpen = false;
  public readonly aabb: Aabb;
  public readonly mesh: Mesh;

  constructor(scene: Scene, min: Vector3, max: Vector3, public readonly plates: PressurePlate[]) {
    this.aabb = { min: arr(min), max: arr(max) };
    const size = max.subtract(min);
    this.mesh = CreateBox('door', { width: size.x, height: size.y, depth: size.z }, scene);
    this.mesh.position = min.add(max).scale(0.5);
    const mat = new StandardMaterial('doorMat', scene);
    mat.diffuseColor = new Color3(0.25, 0.08, 0.06);
    mat.emissiveColor = new Color3(0.5, 0.12, 0.08);
    this.mesh.material = mat;
    this.mesh.checkCollisions = true;
  }

  public setOpen(open: boolean): boolean {
    if (open === this.isOpen) return false;
    this.isOpen = open;
    this.mesh.checkCollisions = !open;
    this.mesh.visibility = open ? 0.15 : 1;
    // Dim the glow too, or the glow layer makes an open door look as solid as a closed one.
    (this.mesh.material as StandardMaterial).emissiveColor = open ? new Color3(0.04, 0.01, 0.01) : new Color3(0.5, 0.12, 0.08);
    return true;
  }
}

/** The state of a level's crates, plates and doors, as `LevelDynamics.snapshot` saves it. */
export interface DynamicsSnapshot {
  crates: Array<{ center: Vec3; velocity: Vec3; lost: boolean }>;
  plates: boolean[];
  doors: boolean[];
}

export interface DynamicsEvents {
  /** Hardest crate impact this frame, units/s. */
  impact: number;
  plateChanged: boolean;
  doorChanged: boolean;
  /** A crate fell out of the level this frame. */
  crateLost: boolean;
}

/** Owns a level's crates, plates and doors and advances them each frame. */
export class LevelDynamics {
  public readonly crates: Crate[] = [];
  public readonly plates: PressurePlate[] = [];
  public readonly doors: Door[] = [];

  /** @param statics the level's fixed geometry; the array is read live, not copied */
  constructor(private readonly statics: Aabb[]) {}

  /** The level's bounds, from its statics; worked out on first use, once the level is fully built. */
  private bounds?: Aabb;

  /** The ghost outlines `showPreview` draws, one per crate once made; created on first use. */
  private ghosts: Mesh[] = [];
  private ghostMat?: StandardMaterial;

  /**
   * One sub-step of `dt` (at most MAX_STEP) for the given crate bodies, against the statics, the closed doors, the
   * player's box and each other. The one place crates are stepped: `update` and `predict` both use it.
   * Returns the hardest impact (units/s).
   */
  private stepCrates(bodies: Body[], dt: number, g: Vec3, player: Aabb): number {
    const fixed = [...this.statics, ...this.doors.filter((d) => !d.isOpen).map((d) => d.aabb), player];
    let impact = 0;
    for (const body of bodies) {
      const others = bodies.filter((b) => b !== body).map(bodyAabb);
      const r = stepBody(body, g, dt, [...fixed, ...others]);
      impact = Math.max(impact, r.impactSpeed);
    }
    return impact;
  }

  /**
   * Where each crate would come to rest if gravity pointed along `gravity` now, in the order of `crates`. Runs on
   * copies, so the real bodies are not touched. Stops early once every copy has stopped moving, and runs for at most
   * `seconds` of simulated time.
   *
   * An approximation: the doors keep their CURRENT open state for the whole slide (a door that would open or close
   * during it is not modelled), the player stays where they are (their box is an obstacle, as in `update`), and a
   * crate that leaves the level is reported wherever it is after `seconds`. A lost crate reports its current centre.
   */
  public predict(gravity: Vector3, playerPos: Vector3, seconds = 6): Vec3[] {
    const g = arr(gravity);
    const player = playerBox(playerPos);
    const copies: Body[] = [];
    // For each crate, its copy's index in `copies`, or -1 for a lost crate.
    const copyIndex = this.crates.map((c) => {
      if (c.lost) return -1;
      copies.push({ center: [...c.body.center], half: [...c.body.half], velocity: [...c.body.velocity] });
      return copies.length - 1;
    });
    const steps = Math.ceil(seconds / MAX_STEP);
    for (let i = 0; i < steps && copies.length; i++) {
      const before = copies.map((b) => [...b.center]);
      this.stepCrates(copies, MAX_STEP, g, player);
      const settled = copies.every((b, k) =>
        [0, 1, 2].every((a) => Math.abs(b.center[a] - before[k][a]) < 1e-4 && Math.abs(b.velocity[a]) < 1e-4),
      );
      if (settled) break;
    }
    return this.crates.map((c, i) => (copyIndex[i] < 0 ? [...c.body.center] : [...copies[copyIndex[i]].center]));
  }

  /**
   * Shows a faint ghost of each crate at its predicted resting place (see `predict`); `null` hides them all. A ghost
   * is hidden where the crate would not move, or once the crate is lost. Ghosts are not pickable and collide with
   * nothing, and are in no statics list.
   */
  public showPreview(centers: Vec3[] | null): void {
    this.crates.forEach((crate, i) => {
      const center = centers?.[i];
      const show = center !== undefined && !crate.lost && distance(center, crate.body.center) >= 0.05;
      if (!show && !this.ghosts[i]) return;
      const ghost = (this.ghosts[i] ??= this.makeGhost(crate));
      if (show) ghost.position.set(center[0], center[1], center[2]);
      ghost.setEnabled(show);
    });
  }

  private makeGhost(crate: Crate): Mesh {
    const h = crate.body.half;
    const ghost = CreateBox(
      'crateGhost',
      { width: h[0] * 2, height: h[1] * 2, depth: h[2] * 2 },
      crate.mesh.getScene(),
    );
    // One material is shared by every ghost. It is disposed once, in `dispose`, so the meshes must not take it along.
    this.ghostMat ??= makeGhostMaterial(crate.mesh.getScene());
    ghost.material = this.ghostMat;
    ghost.isPickable = false;
    ghost.checkCollisions = false;
    ghost.enableEdgesRendering();
    ghost.edgesWidth = 1.5;
    ghost.edgesColor.set(1, 0.7, 0.3, 0.6);
    return ghost;
  }

  public update(dt: number, gravity: Vector3, playerPos: Vector3): DynamicsEvents {
    const events: DynamicsEvents = { impact: 0, plateChanged: false, doorChanged: false, crateLost: false };
    if (!this.crates.length && !this.plates.length && !this.doors.length) return events;

    const g = arr(gravity);
    const player = playerBox(playerPos);

    let live = this.crates.filter((c) => !c.lost);
    // Crates: sub-step long frames so stacks settle the same at any frame rate.
    for (let remaining = Math.min(dt, 0.25); remaining > 1e-6; remaining -= MAX_STEP) {
      const impact = this.stepCrates(
        live.map((c) => c.body),
        Math.min(remaining, MAX_STEP),
        g,
        player,
      );
      events.impact = Math.max(events.impact, impact);
    }
    // A crate that has fallen out through a hole in the shell is gone: nothing brings it back but a restart.
    this.bounds ??= boundsOf(this.statics);
    for (const crate of live) {
      crate.sync();
      if (distanceOutside(this.bounds, crate.body.center) > CRATE_LOST_MARGIN) {
        crate.lost = true;
        crate.mesh.setEnabled(false);
        crate.mesh.checkCollisions = false;
        events.crateLost = true;
      }
    }
    live = live.filter((c) => !c.lost);

    for (const plate of this.plates) {
      const held =
        live.some((c) => overlaps(c.aabb, plate.trigger)) ||
        (!plate.cratesOnly && overlaps(player, plate.trigger));
      if (plate.setPressed(held)) events.plateChanged = true;
    }

    for (const door of this.doors) {
      const want = door.plates.every((pl) => pl.satisfied);
      // Never close on top of something standing in the doorway.
      const blocked = overlaps(player, door.aabb) || live.some((c) => overlaps(c.aabb, door.aabb));
      if (want !== door.isOpen && (want || !blocked) && door.setOpen(want)) events.doorChanged = true;
    }
    return events;
  }

  /** Saves every crate's position, velocity and lost state, and each plate's and door's state. */
  public snapshot(): DynamicsSnapshot {
    return {
      crates: this.crates.map((c) => ({ center: [...c.body.center], velocity: [...c.body.velocity], lost: c.lost })),
      plates: this.plates.map((p) => p.pressed),
      doors: this.doors.map((d) => d.isOpen),
    };
  }

  /** Puts back what `snapshot` saved. A crate lost since is shown and simulated again. */
  public restore(s: DynamicsSnapshot): void {
    this.crates.forEach((c, i) => {
      const saved = s.crates[i];
      if (!saved) return;
      c.body.center = [...saved.center];
      c.body.velocity = [...saved.velocity];
      c.lost = saved.lost;
      c.mesh.setEnabled(!saved.lost);
      c.mesh.checkCollisions = !saved.lost;
      c.sync();
    });
    this.plates.forEach((p, i) => p.setPressed(s.plates[i] ?? p.pressed));
    this.doors.forEach((d, i) => d.setOpen(s.doors[i] ?? d.isOpen));
  }

  public dispose(): void {
    [...this.crates, ...this.plates, ...this.doors].forEach((o) => o.mesh.dispose(false, true));
    this.ghosts.forEach((g) => g.dispose(false, false));
    this.ghosts = [];
    this.ghostMat?.dispose();
    this.ghostMat = undefined;
  }
}
