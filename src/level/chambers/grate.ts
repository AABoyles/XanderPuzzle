import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 12 - the floor is half grate, half glass, over a sealed lower deck. You cannot go down, but
 * crates can: shift east and the crate slides across the glass onto the grate, shift back and it drops
 * through onto a crates-only plate whose door is the exit. Route: -Y -> +X -> -Y.
 */
export function buildGrate(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.2, 0.85, 0.75));
  const R = 8; // half-width in x and z
  const F = -4; // top of the grate/glass floor
  const lo = -8; // floor of the lower deck
  const hi = 4; // ceiling
  const x: [number, number] = [-R, R];
  const z: [number, number] = [-R, R];
  const door = { x: [-2, 2] as [number, number], y: [F, F + 3] as [number, number] };

  // Shell, with the entrance (south) and exit (north) doorways just above the floor.
  b.slab('y', lo - T, lo, x, z, b.floor);
  b.slab('y', hi, hi + T, x, z, b.wall);
  b.slab('x', -R - T, -R, [lo, hi], z, b.wall);
  b.slab('x', R, R + T, [lo, hi], z, b.wall);
  b.slab('z', -R - T, -R, x, [lo, hi], b.wall, { u: door.x, v: door.y });
  b.slab('z', R, R + T, x, [lo, hi], b.wall, { u: door.x, v: door.y });

  // The upper floor: glass in the west half (the crate cannot fall here), grate in the east half.
  b.glass(V(-R, F - 0.5, -R), V(-2, F, R));
  b.grate(V(-2, F - 0.5, -R), V(R, F, R));
  // Under the doorways, level with the floor.
  b.box(V(-2, F - 0.5, -R - T), V(2, F, -R), b.alcove);
  b.box(V(-2, F - 0.5, R), V(2, F, R + T), b.exit);

  b.tube(V(-2, F, -R - 9), V(2, F + 3, -R - T), ['+z'], b.alcove);
  b.tube(V(-2, F, R + T), V(2, F + 3, R + 9), ['-z'], b.exit);

  // The plate on the lower deck, visible through the floor; the crate starts on the glass.
  const plate = b.addPlate(V(6.5, lo, 4), V(0, 1, 0), 2.5, true);
  b.addDoor(V(door.x[0], door.y[0], R), V(door.x[1], door.y[1], R + T), [plate]);
  b.addCrate(V(-4, F + 0.75, 4), 1.5, { stamp: 'BALLAST MASS\nBM-2307' });

  // Block lever: shift east. Second block: shift back down once you have landed on the east wall.
  // Both levers face south, on low blocks in the south half, so the player throws them looking north across the
  // glass at the crate and the east wall. The second block stands near the east wall, where the shift lands you.
  b.glass(V(-0.75, F - 0.5, -5.5), V(0.75, F + 1, -4.5));
  b.addSwitch(V(0, F + 0.5, -5.8), V(0, 0, -1), '+X');
  b.glass(V(5.5, lo, -5.5), V(7.5, F + 1, -4.5));
  b.addSwitch(V(6.5, F + 0.5, -5.8), V(0, 0, -1), '-Y');

  b.placard(V(-2, F + 1.6, -R - 3), V(1, 0, 0), '-Y', 'CUBE 0130', { width: 2.6 });
  // On the glass, read looking down at the lower deck.
  b.placard(V(-5, F, -4), V(0, 1, 0), '-Y', 'LOWER DECK · BALLAST ONLY', { width: 5.9, top: V(0, 0, 1) });
  // On the east wall, where the shift east puts you.
  b.note(V(R, -1, -1), V(-1, 0, 0), '+X', 'Everything ends up below.\nThe crates just get there first.', {
    width: 5,
    top: V(0, 0, 1),
  });

  return b.finish({
    name: 'XV · THE GRATE',
    hint: 'You cannot go down there. The crate can.',
    spawnPosition: V(0, F + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '-Y',
    exitCenter: V(0, F + 0.5, R + 7),
    exitRadius: 2,
  });
}

export default buildGrate;
