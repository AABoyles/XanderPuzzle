import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import { chaseDirection, PLANET_LAST, PLANET_NEAR, planetDistance } from '../environment/fall';
import type { FallTracker, Vec3 } from '../environment/fall';
import type { SpaceBackdrop } from '../environment/SpaceBackdrop';
import type { State } from '../game/GameState';
import type { GravitySystem } from '../gravity/GravitySystem';
import type { BuiltLevel } from '../level/Builder';
import { darkFraction, planetLights } from '../narrative';
import type { PlayerController } from '../player/PlayerController';
import type { TitleView } from '../title/TitleView';

/** What `Sky.update` needs to know about this frame. */
export interface SkyFrame {
  dt: number;
  /** A menu is up: the backdrop holds still. */
  frozen: boolean;
  kind: State['kind'];
  /** The title's outside view is wanted: the title is showing and the player has not left the print bed. */
  titleShot: boolean;
  level: BuiltLevel;
  levelIndex: number;
  levelCount: number;
  /** The first chamber from which the planet shows lights, or -1 for none (the sandbox). */
  lightsFrom: number;
  reducedMotion: boolean;
}

/**
 * Everything outside the chamber, once a frame: which camera is in use (the title's outside view or the player's),
 * where the planet lies, and what the space backdrop is told to draw. The backdrop keeps animating on the win screen.
 * It shows after an escape, through a chamber's window (`vista`), and behind the title.
 */
export class Sky {
  /** Whether the title's outside view is up this frame. */
  public titleShot = false;
  private wasStorming = false;
  /** 0-1: the new light on the planet, coming up once the last fall has ended. */
  private arrival = 0;
  /** Where the planet is: it chases the gravity direction, so "down" always leads to it. */
  private planetDir: Vec3;
  private readonly lastPosition: Vector3;

  constructor(
    private readonly scene: Scene,
    private readonly backdrop: SpaceBackdrop,
    private readonly titleView: TitleView,
    private readonly player: PlayerController,
    private readonly gravity: GravitySystem,
    private readonly fall: FallTracker,
  ) {
    this.planetDir = gravity.direction.asArray() as Vec3;
    this.lastPosition = player.position.clone();
  }

  /** A chamber has started: the ending's light is not up yet, and the player was put somewhere, not moved there. */
  public chamberStarted(): void {
    this.arrival = 0;
    this.playerPlaced();
  }

  /** The player was teleported (a start, an undo): that jump is not speed. */
  public playerPlaced(): void {
    this.lastPosition.copyFrom(this.player.position);
  }

  /**
   * Updates the camera choice and the backdrop. Returns the share of the field that is dark here, and whether a
   * stellar storm broke this frame (the caller decides whether anyone could see it).
   */
  public update(f: SkyFrame): { stormBroke: boolean; darkFraction: number } {
    const { backdrop, player, fall } = this;
    const { dt, level } = f;
    const down = this.gravity.direction.asArray() as Vec3;
    if (f.titleShot !== this.titleShot) {
      this.titleShot = f.titleShot;
      backdrop.resetField(); // the field is laid out around the cube for the title, around the view otherwise
      this.scene.activeCamera = f.titleShot ? this.titleView.camera : player.camera;
    }
    // Where a window shows the sky, the planet and the Crown swing round as the cube turns; elsewhere a hole in the
    // floor shows the planet at once.
    this.planetDir = fall.visibility > 0 || level.vista ? chaseDirection(this.planetDir, down, dt, 3) : down;
    const shared = {
      planetDirection: Vector3.FromArray(this.planetDir),
      darkFraction: darkFraction(f.levelIndex, f.levelCount),
      planetLights: planetLights(f.levelIndex, f.lightsFrom, f.levelCount),
    };
    if (this.titleShot) {
      backdrop.update({ ...shared, ...this.titleView.update(level.bounds, this.planetDir, dt, f.reducedMotion), dt });
    } else {
      // The last fall has ended: one more light comes up on the planet, under the end card.
      // The view settles on the ground below, where it is.
      if (f.kind === 'ended') {
        this.arrival = Math.min(1, this.arrival + dt / 2.5);
        player.lookDown(f.reducedMotion ? 1 : Math.min(1, dt * 2.5));
      }
      backdrop.update({
        ...shared,
        cameraPosition: player.camera.position,
        visibility: fall.visibility,
        vista: level.vista,
        planetDistance: planetDistance(fall.time, fall.duration, level.ending ? PLANET_LAST : PLANET_NEAR),
        speed: dt > 0 ? Vector3.Distance(player.position, this.lastPosition) / dt : 0,
        dt: f.frozen ? 0 : dt,
        hullDark: level.ending && !level.printer.online,
        arrival: this.arrival,
      });
    }
    this.lastPosition.copyFrom(player.position);
    const storming = backdrop.storm > 0;
    const stormBroke = storming && !this.wasStorming;
    this.wasStorming = storming;
    return { stormBroke, darkFraction: shared.darkFraction };
  }
}
