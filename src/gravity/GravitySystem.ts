import { Observable, Vector3 } from '@babylonjs/core';

/** The six axis-aligned directions gravity can point in. */
export type GravityAxis = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';

const AXIS_VECTORS: Record<GravityAxis, Vector3> = {
  '+X': new Vector3(1, 0, 0),
  '-X': new Vector3(-1, 0, 0),
  '+Y': new Vector3(0, 1, 0),
  '-Y': new Vector3(0, -1, 0),
  '+Z': new Vector3(0, 0, 1),
  '-Z': new Vector3(0, 0, -1),
};

/** The four axes adjacent (90 degrees away) from a given axis - excludes itself and its opposite. */
const ADJACENT: Record<GravityAxis, GravityAxis[]> = {
  '+X': ['+Y', '-Y', '+Z', '-Z'],
  '-X': ['+Y', '-Y', '+Z', '-Z'],
  '+Y': ['+X', '-X', '+Z', '-Z'],
  '-Y': ['+X', '-X', '+Z', '-Z'],
  '+Z': ['+X', '-X', '+Y', '-Y'],
  '-Z': ['+X', '-X', '+Y', '-Y'],
};

/**
 * Owns the single global "which way is down" state for the level.
 * Switches call setAxis(); the player controller and any dynamic props
 * read `.direction` / `.up` every frame to know which way to fall.
 */
export class GravitySystem {
  /** Acceleration magnitude, in units/s^2. */
  public readonly magnitude: number;

  private _axis: GravityAxis;

  /** Fired with (newAxis, previousAxis) whenever the direction changes. */
  public readonly onChangeObservable = new Observable<{ axis: GravityAxis; previous: GravityAxis }>();

  constructor(initialAxis: GravityAxis = '-Y', magnitude = 22) {
    this._axis = initialAxis;
    this.magnitude = magnitude;
  }

  public get axis(): GravityAxis {
    return this._axis;
  }

  /** Unit vector pointing in the direction things fall. */
  public get direction(): Vector3 {
    return AXIS_VECTORS[this._axis];
  }

  /** Unit vector pointing "up" for whoever is standing in this field (opposite of direction). */
  public get up(): Vector3 {
    return AXIS_VECTORS[this._axis].scale(-1);
  }

  /** Gravity vector including magnitude, e.g. for velocity integration. */
  public get vector(): Vector3 {
    return this.direction.scale(this.magnitude);
  }

  public isAdjacentTo(axis: GravityAxis): boolean {
    return ADJACENT[this._axis].includes(axis);
  }

  public setAxis(axis: GravityAxis): void {
    if (axis === this._axis) return;
    const previous = this._axis;
    this._axis = axis;
    this.onChangeObservable.notifyObservers({ axis, previous });
  }

  public static axisVector(axis: GravityAxis): Vector3 {
    return AXIS_VECTORS[axis];
  }

  public static allAxes(): GravityAxis[] {
    return ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];
  }
}
