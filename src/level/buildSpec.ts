import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { SkinRuntime } from '../skins/Skin';
import { Builder, type BuiltLevel } from './Builder';
import type { ChamberSpec, Vec } from './spec';

const v = (a: Vec) => new Vector3(a[0], a[1], a[2]);

/** The one builder for chambers described as data (see `ChamberSpec`). */
export function buildFromSpec(scene: Scene, skin: SkinRuntime, spec: ChamberSpec): BuiltLevel {
  const b = new Builder(scene, skin, new Color3(...spec.accent));
  for (const p of spec.parts) {
    if (p.kind === 'slab') b.slab(p.axis, p.lo, p.hi, p.u, p.v, p.role, p.hole);
    else if (p.kind === 'box') b.box(v(p.min), v(p.max), p.role);
    else if (p.kind === 'tube') b.tube(v(p.min), v(p.max), p.open, p.role);
    else b.glass(v(p.min), v(p.max));
  }
  for (const l of spec.levers) b.addSwitch(v(l.at), v(l.normal), l.target, { once: l.once });
  for (const p of spec.placards) {
    const opts = { width: p.width, lineHeight: p.lineHeight, top: p.top && v(p.top) };
    if (p.voice === 'margin') b.note(v(p.at), v(p.normal), p.readAs, p.text, opts);
    else b.placard(v(p.at), v(p.normal), p.readAs, p.text, opts);
  }
  return b.finish({
    name: spec.name,
    hint: spec.hint,
    spawnPosition: v(spec.spawn),
    entranceAxis: spec.entranceAxis,
    exitAxis: spec.exitAxis,
    exitCenter: v(spec.exitCenter),
    exitRadius: spec.exitRadius,
    vista: spec.vista,
    ending: spec.ending,
  });
}
