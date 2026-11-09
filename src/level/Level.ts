import { Color3, Material, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import { GridMaterial } from '@babylonjs/materials';
import { GravityAxis } from '../gravity/GravitySystem';
import { GravitySwitch } from './GravitySwitch';

export interface BuiltLevel {
  spawnPosition: Vector3;
  entranceAxis: GravityAxis;
  exitAxis: GravityAxis;
  switches: GravitySwitch[];
  exitCenter: Vector3;
  exitRadius: number;
  colliders: Mesh[];
}

/** Half-extent of the main vault room; walls sit at +/-12 on every axis. */
const R = 12;
const THICK = 1;

function box(scene: Scene, name: string, min: Vector3, max: Vector3, material: Material): Mesh {
  const size = max.subtract(min);
  const center = min.add(max).scale(0.5);
  const m = MeshBuilder.CreateBox(
    name,
    { width: Math.abs(size.x), height: Math.abs(size.y), depth: Math.abs(size.z) },
    scene,
  );
  m.position = center;
  m.material = material;
  m.checkCollisions = true;
  m.isPickable = true;
  return m;
}

/**
 * Builds "The Vault": a hollow cube room whose six inner faces can each become
 * the floor depending on gravity. The player enters through a floor-level
 * doorway (natural -Y gravity) and must throw two wall-mounted switches -
 * first rotating gravity onto the +Z wall, then onto the +X wall - to reach a
 * hole in the final floor that drops them into the exit chamber.
 */
export function buildLevel(scene: Scene): BuiltLevel {
  const colliders: Mesh[] = [];

  const wallMat = new GridMaterial('wallMat', scene);
  wallMat.mainColor = new Color3(0.08, 0.09, 0.12);
  wallMat.lineColor = new Color3(0.25, 0.55, 0.9);
  wallMat.gridRatio = 1;
  wallMat.majorUnitFrequency = 4;
  wallMat.minorUnitVisibility = 0.35;
  wallMat.opacity = 1;

  const floorMat = new GridMaterial('floorMat', scene);
  floorMat.mainColor = new Color3(0.1, 0.1, 0.13);
  floorMat.lineColor = new Color3(0.9, 0.6, 0.2);
  floorMat.gridRatio = 1;
  floorMat.majorUnitFrequency = 4;
  floorMat.minorUnitVisibility = 0.3;

  const alcoveMat = new GridMaterial('alcoveMat', scene);
  alcoveMat.mainColor = new Color3(0.07, 0.08, 0.1);
  alcoveMat.lineColor = new Color3(0.5, 0.35, 0.8);
  alcoveMat.gridRatio = 0.8;
  alcoveMat.minorUnitVisibility = 0.25;

  const add = (m: Mesh) => colliders.push(m);

  // ---------------------------------------------------------------------------------------------
  // Main vault: -Y floor, +Y ceiling, +Z / -X plain walls, -Z has the entrance doorway,
  // +X has the centered exit hole.
  // ---------------------------------------------------------------------------------------------
  add(box(scene, 'floor', new Vector3(-R, -R - THICK, -R), new Vector3(R, -R, R), floorMat));
  add(box(scene, 'ceiling', new Vector3(-R, R, -R), new Vector3(R, R + THICK, R), wallMat));
  add(box(scene, 'wallPlusZ', new Vector3(-R, -R, R), new Vector3(R, R, R + THICK), wallMat));
  add(box(scene, 'wallMinusX', new Vector3(-R - THICK, -R, -R), new Vector3(-R, R, R), wallMat));

  // -Z wall with a floor-level doorway (width 4, height 3) for the entrance.
  add(box(scene, 'wallMinusZ_top', new Vector3(-R, -R + 3, -R - THICK), new Vector3(R, R, -R), wallMat));
  add(box(scene, 'wallMinusZ_left', new Vector3(-R, -R, -R - THICK), new Vector3(-2, -R + 3, -R), wallMat));
  add(box(scene, 'wallMinusZ_right', new Vector3(2, -R, -R - THICK), new Vector3(R, -R + 3, -R), wallMat));

  // +X wall with a centered hole (the exit chute) leading to the exit chamber beyond.
  const holeHalf = 2.5;
  add(
    box(
      scene,
      'wallPlusX_top',
      new Vector3(R, holeHalf, -R),
      new Vector3(R + THICK, R, R),
      wallMat,
    ),
  );
  add(
    box(
      scene,
      'wallPlusX_bottom',
      new Vector3(R, -R, -R),
      new Vector3(R + THICK, -holeHalf, R),
      wallMat,
    ),
  );
  add(
    box(
      scene,
      'wallPlusX_left',
      new Vector3(R, -holeHalf, -R),
      new Vector3(R + THICK, holeHalf, -holeHalf),
      wallMat,
    ),
  );
  add(
    box(
      scene,
      'wallPlusX_right',
      new Vector3(R, -holeHalf, holeHalf),
      new Vector3(R + THICK, holeHalf, R),
      wallMat,
    ),
  );

  // ---------------------------------------------------------------------------------------------
  // Entrance corridor: floor-height doorway through -Z, extending out to z = -20.
  // ---------------------------------------------------------------------------------------------
  const ez0 = -R - 8; // -20
  add(box(scene, 'entranceFloor', new Vector3(-2, -R - THICK, ez0), new Vector3(2, -R, -R), alcoveMat));
  add(box(scene, 'entranceCeiling', new Vector3(-2, -R + 3, ez0), new Vector3(2, -R + 4, -R), alcoveMat));
  add(box(scene, 'entranceLeftWall', new Vector3(-3, -R, ez0), new Vector3(-2, -R + 3, -R), alcoveMat));
  add(box(scene, 'entranceRightWall', new Vector3(2, -R, ez0), new Vector3(3, -R + 3, -R), alcoveMat));
  add(box(scene, 'entranceEndCap', new Vector3(-3, -R - THICK, ez0 - THICK), new Vector3(3, -R + 4, ez0), alcoveMat));

  // ---------------------------------------------------------------------------------------------
  // Exit chamber: a tube extending out through +X beyond the hole, capped at x = 20.
  // ---------------------------------------------------------------------------------------------
  const ex1 = R + 8; // 20
  const h = 3.2; // chamber half-width, slightly larger than the hole for clearance
  add(box(scene, 'exitTop', new Vector3(R, h - THICK, -h), new Vector3(ex1, h, h), alcoveMat));
  add(box(scene, 'exitBottom', new Vector3(R, -h, -h), new Vector3(ex1, -h + THICK, h), alcoveMat));
  add(box(scene, 'exitLeft', new Vector3(R, -h, -h), new Vector3(ex1, h, -h + THICK), alcoveMat));
  add(box(scene, 'exitRight', new Vector3(R, -h, h - THICK), new Vector3(ex1, h, h), alcoveMat));
  add(box(scene, 'exitEndCap', new Vector3(ex1, -h, -h), new Vector3(ex1 + THICK, h, h), alcoveMat));

  // ---------------------------------------------------------------------------------------------
  // Switches: step 1 rotates gravity onto the +Z wall, step 2 onto the +X wall (the exit floor).
  // ---------------------------------------------------------------------------------------------
  const switches: GravitySwitch[] = [
    new GravitySwitch(scene, new Vector3(0, -R + 1.5, R - 0.3), new Vector3(0, 0, -1), '+Z'),
    new GravitySwitch(scene, new Vector3(R - 0.3, 0, R - 1.5), new Vector3(-1, 0, 0), '+X'),
  ];

  const spawnPosition = new Vector3(0, -R + 0.5, ez0 + 3);

  return {
    spawnPosition,
    entranceAxis: '-Y',
    exitAxis: '+X',
    switches,
    exitCenter: new Vector3(ex1 - 2, 0, 0),
    exitRadius: 3,
    colliders,
  };
}

/** Skybox-friendly single-color material fallback if a texture ever fails to load. */
export function makeUnlitMaterial(scene: Scene, color: Color3): StandardMaterial {
  const mat = new StandardMaterial('unlit', scene);
  mat.diffuseColor = color;
  mat.specularColor = Color3.Black();
  return mat;
}
