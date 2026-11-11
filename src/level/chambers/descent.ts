import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { SkinRuntime } from '../../skins/Skin';
import { Builder, BuiltLevel, T, V } from '../Builder';

/**
 * Level 15 - the Descent, the epilogue (NARRATIVE.md). A cube with no door: the only way out is a hole in the middle
 * of the ceiling, and leaving through it ends the game in a long fall to the planet.
 * Route: -Y -> +X -> +Y. The first lever, low on the +X wall, puts you on that wall; walk up it to the second, on the
 * ceiling beside the +X wall, which puts you on the ceiling; walk to the hole and fall out.
 *
 * Both levers are one-shot and nothing puts gravity back: every throw is final, and the facility objects to each one
 * (`descentAlarm` in narrative.ts). The route only runs forward, so nothing can strand you.
 */
export function buildDescent(scene: Scene, skin: SkinRuntime): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(0.9, 0.3, 0.22));
  const R = 8;
  const w: [number, number] = [-R, R];
  const full: [number, number] = [-R - T, R + T]; // slabs that close the corner seams
  const hole = { u: [-2, 2] as [number, number], v: [-2, 2] as [number, number] };

  b.slab('y', -R - T, -R, w, w, b.floor);
  // The way out: a hole in the middle of the ceiling, onto open space.
  b.slab('y', R, R + T, w, w, b.wall, hole);
  b.slab('x', -R - T, -R, full, full, b.wall);
  b.slab('x', R, R + T, full, full, b.wall);
  b.slab('z', -R - T, -R, w, full, b.wall, { u: [-2, 2], v: [-R, -R + 3] });
  b.slab('z', R, R + T, w, full, b.wall);

  b.tube(V(-2, -R, -R - 9), V(2, -R + 3, -R - T), ['+z'], b.alcove);
  // Sill under the doorway: the wall's hole runs to the floor, so nothing else covers this strip.
  b.box(V(-2, -R - T, -R - T), V(2, -R, -R), b.alcove);

  b.addSwitch(V(R - 0.3, -R + 1.5, -4), V(-1, 0, 0), '+X', { once: true });
  b.addSwitch(V(R - 1.5, R - 0.3, 4), V(0, -1, 0), '+Y', { once: true });

  b.placard(V(-2, -R + 1.6, -R - 3), V(1, 0, 0), '-Y', 'CUBE 0147', { width: 2.6 });
  b.placard(V(0, -4, R), V(0, 0, -1), '-Y', 'CUBE 0147 · BALANCE ACCESS\nAUTHORISED SHIFTS ONLY', { width: 10 });
  // Above the first lever: the rule the whole chamber turns on, in the facility's own words.
  b.placard(V(R, -R + 4.3, -4), V(-1, 0, 0), '-Y', [
    'A CUBE OUT OF TRIM',
    'LEAVES THE SCHEDULE.',
    'ITS PRINTER WILL NOT RUN.',
  ].join('\n'), {
    width: 6.5,
  });
  // Under the Stencil, facing the entrance: why the notes exist, and why their writer is not here.
  b.note(V(0, -6.3, R), V(0, 0, -1), '-Y', [
    'I got this far once.',
    'I went back to write it all down.',
    'Don\'t go back.',
    '\u2014 416',
  ].join('\n'), {
    width: 5.6,
  });
  // The Margin's last word, on the lip of the hole: upright only once the ceiling is the floor.
  b.note(V(3.2, R, 0), V(0, -1, 0), '+Y', 'Steer.', { width: 2.6, lineHeight: 0.9, top: V(-1, 0, 0) });

  return b.finish({
    name: 'XXI · THE DESCENT',
    hint: 'The way out is down. All the way down.',
    spawnPosition: V(0, -R + 0.5, -R - 5),
    entranceAxis: '-Y',
    exitAxis: '+Y',
    exitCenter: V(0, R + T, 0),
    exitRadius: 2,
    ending: true,
    // The hole in the ceiling shows the Crown on the way in, and the planet once the ceiling is the floor.
    vista: true,
  });
}
