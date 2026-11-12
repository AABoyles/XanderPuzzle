import { Color3 } from '@babylonjs/core/Maths/math.color';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { hashString, random } from '../random';
import type { PlacardInk } from '../skins/Skin';
import { afterFontsLoad, MARGIN_FONT, STENCIL_FONT } from './fonts';
import { handwriting, PADDING, placardSize, texturePixels } from './placardText';
import type { PlacardFrame, Voice } from './placardText';

/** The Margin writes in red grease pencil, the same in every skin. */
const MARGIN_INK = '#b3462c';

export interface PlacardSpec {
  text: string;
  voice: Voice;
  /** World units. */
  width: number;
  lineHeight?: number;
  frame: PlacardFrame;
  /** How the skin paints stencils; ignored for the Margin. */
  ink: PlacardInk;
}

/**
 * A flat textured plane carrying text, oriented by `frame` and centred on its local origin; the caller positions and
 * parents it. Disposing the mesh with its material and textures releases everything.
 */
export function createPlacard(scene: Scene, name: string, spec: PlacardSpec): { mesh: Mesh; height: number } {
  const size = placardSize(spec.text, spec.width, spec.voice, spec.lineHeight);
  const px = texturePixels(size.width, size.height);
  const texture = new DynamicTexture(`${name}Tex`, { width: px.w, height: px.h }, scene, true);
  texture.hasAlpha = true;

  const material = new StandardMaterial(`${name}Mat`, scene);
  material.diffuseTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.specularColor = Color3.Black();
  material.zOffset = -2;
  if (spec.voice === 'stencil' && spec.ink.glow) {
    material.emissiveTexture = texture;
    material.disableLighting = true;
  } else {
    // A little self-light so writing stays legible in a chamber's darker corners.
    material.emissiveColor = new Color3(0.25, 0.25, 0.25);
  }

  const mesh = CreatePlane(name, { width: size.width, height: size.height }, scene);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  // A plane faces its local -Z; the frame's forward points into the face, so the text faces out of it.
  mesh.rotationQuaternion = Quaternion.RotationQuaternionFromAxis(
    Vector3.FromArray(spec.frame.right),
    Vector3.FromArray(spec.frame.up),
    Vector3.FromArray(spec.frame.forward),
  );

  let disposed = false;
  material.onDisposeObservable.add(() => {
    disposed = true;
  });
  const draw = () => {
    if (disposed) return;
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, px.w, px.h);
    if (spec.voice === 'stencil') drawStencil(ctx, size.lines, size.lineHeight * px.scale, px, spec.ink, spec.text);
    else drawMargin(ctx, size.lines, size.lineHeight * px.scale, px, spec.text);
    texture.update();
  };
  draw();
  afterFontsLoad(draw);
  return { mesh, height: size.height };
}

type Pixels = { w: number; h: number; scale: number };

function drawStencil(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  lh: number,
  px: Pixels,
  ink: PlacardInk,
  text: string,
) {
  const pad = PADDING * px.scale;
  const fontPx = lh * 0.78;
  ctx.font = `${fontPx}px ${STENCIL_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink.color;
  ctx.strokeStyle = ink.color;
  ctx.lineWidth = Math.max(1, fontPx * 0.06);
  lines.forEach((line, i) => {
    const y = pad + lh * (i + 0.5);
    // maxWidth squeezes a line that is too long instead of letting it run off the placard.
    if (ink.outline) ctx.strokeText(line, px.w / 2, y, px.w - pad * 2);
    else ctx.fillText(line, px.w / 2, y, px.w - pad * 2);
  });
  if (ink.weathered) {
    // Flake the paint: knock out small, uneven specks, the same specks every time for the same text.
    const rand = random(hashString(text));
    ctx.globalCompositeOperation = 'destination-out';
    const specks = Math.round((px.w * px.h) / 80);
    for (let i = 0; i < specks; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.4 + rand() * 0.6})`;
      ctx.beginPath();
      ctx.arc(rand() * px.w, rand() * px.h, 0.8 + rand() * rand() * rand() * fontPx * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawMargin(ctx: CanvasRenderingContext2D, lines: string[], lh: number, px: Pixels, text: string) {
  const pad = PADDING * px.scale;
  const fontPx = lh * 0.95;
  ctx.font = `${fontPx}px ${MARGIN_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = MARGIN_INK;
  const glyphs = handwriting(hashString(text), text.length);
  let g = 0;
  lines.forEach((line, i) => {
    const chars = [...line];
    const widths = chars.map((c) => Number(ctx.measureText(c).width) || 0);
    const total = widths.reduce((a, b) => a + b, 0);
    const squeeze = total > 0 ? Math.min(1, (px.w - pad * 2) / total) : 1;
    let x = pad;
    const y = pad + lh * (i + 0.5);
    chars.forEach((c, j) => {
      const glyph = glyphs[g++ % glyphs.length];
      ctx.save();
      ctx.translate(x + glyph.dx * lh, y + glyph.dy * lh);
      ctx.rotate(glyph.angle);
      ctx.scale(squeeze, 1);
      ctx.globalAlpha = glyph.ink;
      ctx.fillText(c, 0, 0);
      ctx.restore();
      x += widths[j] * squeeze;
    });
    g++; // the newline
  });
}
