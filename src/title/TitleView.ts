import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { BackdropFrame } from '../environment/SpaceBackdrop';
import type { Vec3 } from '../environment/fall';
import type { Aabb } from '../physics/boxPhysics';
import { TITLE_CROWN, TITLE_PLANET, titleShotFrame } from './titleShot';

/** The backdrop options the title's view sets; `main.ts` adds the shared ones and `dt`. */
export type TitleFrame = Pick<
  BackdropFrame,
  'cameraPosition' | 'anchor' | 'sunDirection' | 'visibility' | 'planetDistance' | 'crownDistance' | 'speed'
>;

/**
 * The title's view: the cube from outside, hanging in the field with the Crown above it and the planet below (the one
 * place the whole machine is seen at once, before the attendant is printed inside it). `main.ts` decides when it is up
 * (the title, with the player still on the print bed) and switches to `camera` while it is.
 */
export class TitleView {
  /** The outside camera. It is not the player's, so `main.ts` makes it active only while the title shot holds. */
  readonly camera: TargetCamera;
  private readonly anchor = new Vector3();
  private readonly sun = new Vector3();
  /** Seconds of drift around the cube; stays still under reduced motion. */
  private time = 0;

  constructor(scene: Scene) {
    this.camera = new TargetCamera('titleCamera', Vector3.Zero(), scene);
    this.camera.fov = 1.45;
    this.camera.minZ = 1;
    this.camera.maxZ = 2000;
  }

  /**
   * Places the camera for the chamber with `bounds`, the planet in direction `planetDir`, and returns what the backdrop
   * needs for this frame (to be spread into its `update`, with `dt` added).
   */
  update(
    bounds: Aabb,
    planetDir: Readonly<Vec3>,
    dt: number,
    reducedMotion: boolean,
  ): TitleFrame {
    this.time += reducedMotion ? 0 : dt;
    const shot = titleShotFrame(bounds, planetDir, this.time);
    this.camera.position.set(shot.position[0], shot.position[1], shot.position[2]);
    this.camera.upVector.fromArray(shot.up);
    this.camera.setTarget(Vector3.FromArray(shot.target));
    this.anchor.fromArray(shot.anchor);
    this.sun.fromArray(shot.sun);
    return {
      cameraPosition: this.camera.position,
      anchor: this.anchor,
      sunDirection: this.sun,
      visibility: 1,
      planetDistance: TITLE_PLANET,
      crownDistance: TITLE_CROWN,
      speed: 0,
    };
  }

  dispose(): void {
    this.camera.dispose();
  }
}
