import { Effect } from '@babylonjs/core/Materials/effect';

/** Planet radius in world units. */
export const PLANET_RADIUS = 150;
export const HALO_SCALE = 1.12;

/** The space backdrop's GLSL, registered in Babylon's shader store when this module loads. */
// Shared GLSL (WebGL1 style). SUN is the unit direction towards the star, set every frame (see `SUN_OFFSET`).
const COMMON = `
  uniform vec3 sunDir;
  #define SUN sunDir

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
      s += a * vnoise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return s;
  }
`;

const STARS_VERTEX = `
  precision highp float;
  attribute vec3 position;
  uniform mat4 worldViewProjection;
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

const STARS_FRAGMENT = `
  precision highp float;
  varying vec3 vDir;
  uniform float fade;
  uniform float shine;
  uniform float time;
  uniform float storm;
  ${COMMON}

  vec3 starLayer(vec3 dir, float scale, float density, float seed) {
    vec3 p = dir * scale;
    vec3 id = floor(p);
    vec3 f = fract(p);
    float h = hash(id + seed);
    vec3 c = vec3(0.2) + 0.6 * vec3(hash(id + seed + 1.7), hash(id + seed + 3.1), hash(id + seed + 5.3));
    float d = length(f - c);
    float m = hash(id + seed + 7.7);
    float present = step(1.0 - density, h);
    float size = 0.06 + 0.07 * m;
    float s = 1.0 - smoothstep(0.0, size, d);
    s *= s;
    float tw = 1.0 + 0.25 * sin(time * (2.0 + 4.0 * m) + h * 50.0);
    vec3 tint = mix(vec3(0.7, 0.82, 1.0), vec3(1.0, 0.85, 0.65), hash(id + seed + 9.1));
    return tint * s * present * tw * (0.6 + 2.0 * m * m);
  }

  void main() {
    vec3 dir = normalize(vDir);
    vec3 col = vec3(0.004, 0.008, 0.02);

    // Faint milky band
    vec3 bandN = normalize(vec3(0.3, 0.8, -0.5));
    float band = exp(-pow(dot(dir, bandN) * 3.2, 2.0));
    float cloud = vnoise(dir * 4.0 + vec3(3.0, 1.0, 7.0)) * 0.6 + vnoise(dir * 9.0) * 0.4;
    col += vec3(0.05, 0.06, 0.12) * band * cloud * 0.9;

    col += starLayer(dir, 28.0, 0.10, 0.0);
    col += starLayer(dir, 55.0, 0.07, 11.0);
    col += starLayer(dir, 100.0, 0.05, 23.0) * 0.8;

    // Sun disc and glow
    float sd = max(dot(dir, SUN), 0.0);
    float disc = smoothstep(0.9993, 0.9997, sd);
    // A storm on the star: its glare swells.
    float halo = pow(sd, 90.0) * (0.55 + 1.6 * storm) + pow(sd, 10.0) * (0.1 + 0.5 * storm);
    col += vec3(1.0, 0.95, 0.85) * disc * 2.0 + vec3(1.0, 0.8, 0.55) * halo;

    // Inside a chamber (shine 0) the sky through a hole is pitch black; the stars come out after an escape.
    gl_FragColor = vec4(min(col * shine, vec3(1.5)), fade);
  }
`;

const PLANET_VERTEX = `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 worldViewProjection;
  uniform mat4 world;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vN = normal;
    vW = (world * vec4(position, 1.0)).xyz;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

// The planet is never rotated or non-uniformly scaled, so the object-space normal doubles as the world normal.
const PLANET_FRAGMENT = `
  precision highp float;
  varying vec3 vN;
  varying vec3 vW;
  uniform float fade;
  uniform float lights;
  uniform float arrival;
  uniform vec3 arrivalDir;
  uniform vec3 camPos;
  ${COMMON}

  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(camPos - vW);
    float ndl = dot(n, SUN);

    float e = fbm(n * 3.2 + vec3(3.1, 1.7, 5.3));
    float land = smoothstep(0.50, 0.54, e);
    vec3 ocean = mix(vec3(0.02, 0.12, 0.30), vec3(0.05, 0.40, 0.52), smoothstep(0.30, 0.50, e));
    vec3 ground = mix(vec3(0.16, 0.42, 0.28), vec3(0.46, 0.40, 0.30), smoothstep(0.54, 0.72, e));
    vec3 surf = mix(ocean, ground, land);
    // The poles sit on a tilted axis: gravity is axis-aligned, so an axis-aligned pole would face the camera.
    float ice = smoothstep(0.90, 0.97, abs(dot(n, vec3(0.45, 0.35, -0.82))) + (e - 0.5) * 0.2);
    surf = mix(surf, vec3(0.88, 0.93, 0.97), ice);

    float cl = smoothstep(0.56, 0.8, fbm(n * vec3(3.5, 6.5, 3.5) + vec3(7.0, 2.0, 1.0)));

    float lam = smoothstep(-0.1, 0.5, ndl);
    vec3 col = surf * (0.04 + lam * 1.05);
    float spec = pow(max(dot(reflect(-SUN, n), v), 0.0), 40.0) * (1.0 - land) * (1.0 - cl) * lam;
    col += vec3(0.7, 0.85, 1.0) * spec * 0.5;
    col = mix(col, vec3(1.0) * (0.03 + lam), cl * 0.75);

    // Night side: faint blue ambient, and city lights that only appear late in the game (the lights uniform, 0-1).
    // The field hangs on the day side, under the Crown, so the only dark ground in view is the dusk towards the
    // limb furthest from the star: the lights come on there, well before full night.
    float night = 1.0 - smoothstep(-0.15, 0.05, ndl);
    float dusk = 1.0 - smoothstep(0.0, 0.5, ndl);
    col += vec3(0.01, 0.03, 0.07) * night;
    // Each light is a soft dot in its own cell, so up close they read as points rather than tiles.
    vec3 cell = n * 85.0;
    float spot = 1.0 - smoothstep(0.12, 0.3, length(fract(cell) - 0.5));
    float city = step(1.0 - 0.03 * lights, hash(floor(cell))) * spot * land * (1.0 - cl) * (1.0 - ice);
    col += vec3(1.0, 0.75, 0.4) * city * dusk * 1.3;
    // By day the same settlements show as glints: sunlight off whatever has been built there.
    col += vec3(1.0, 0.96, 0.88) * city * lam * (1.0 - dusk) * 0.9;
    // One more light, where the last attendant comes down: a point with a soft halo, on any ground, day or night.
    float away = length(n - arrivalDir);
    float point = (1.0 - smoothstep(0.0008, 0.0025, away)) + 0.3 * (1.0 - smoothstep(0.0025, 0.012, away));
    col += vec3(1.0, 0.78, 0.45) * point * arrival * 1.5;

    // Atmosphere rim
    float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    float rimLight = 0.15 + 0.85 * smoothstep(-0.35, 0.35, ndl);
    col += vec3(0.25, 0.55, 1.0) * fr * 1.4 * rimLight;

    gl_FragColor = vec4(min(col, vec3(2.0)), fade);
  }
`;

const HALO_VERTEX = `
  precision highp float;
  attribute vec3 position;
  uniform mat4 worldViewProjection;
  uniform mat4 world;
  varying vec3 vW;
  void main() {
    vW = (world * vec4(position, 1.0)).xyz;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

// Additive shell: brightness depends on how close the view ray passes to the planet centre, so it glows just outside
// the planet's limb and fades to nothing at the shell's edge.
const HALO_FRAGMENT = `
  precision highp float;
  varying vec3 vW;
  uniform float fade;
  uniform vec3 camPos;
  uniform vec3 planetCenter;
  uniform float storm;
  uniform float time;
  ${COMMON}

  void main() {
    float r = ${PLANET_RADIUS.toFixed(1)};
    float rh = r * ${HALO_SCALE.toFixed(2)};
    vec3 rd = normalize(vW - camPos);
    vec3 c = planetCenter - camPos;
    float h = length(c - rd * dot(c, rd));
    float g = 1.0 - smoothstep(r * 0.96, rh, h);
    g = g * g;
    // The air is thick along the limb and thin looking straight down: over the face of the planet, which is the
    // day side from under the Crown, only a faint veil is left.
    g *= 0.1 + 0.9 * smoothstep(r * 0.72, r * 0.97, h);
    float sunSide = smoothstep(-0.35, 0.45, dot(normalize(vW - planetCenter), SUN));
    vec3 col = mix(vec3(0.2, 0.5, 1.0), vec3(0.5, 0.8, 1.0), sunSide);
    // Under a stellar storm the Crown's field turns it aside, and what leaks round lights the sky: green curtains
    // all round the limb, night side too.
    vec3 around = normalize(vW - planetCenter);
    float curtain = vnoise(around * 9.0 + vec3(0.0, time * 0.7, time * 0.3));
    float aurora = g * storm * (0.35 + 1.3 * curtain);
    col = mix(col, vec3(0.3, 1.0, 0.55), clamp(storm * 0.85, 0.0, 1.0));
    gl_FragColor = vec4(col, (g * (0.1 + 0.9 * sunSide) * 0.8 + aurora * 0.9) * fade);
  }
`;

function registerShader(name: string, vertex: string, fragment: string): void {
  Effect.ShadersStore[`${name}VertexShader`] = vertex;
  Effect.ShadersStore[`${name}FragmentShader`] = fragment;
}

const CUBE_VERTEX = `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 worldViewProjection;
  uniform mat4 world;
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vP;
  void main() {
    vN = mat3(world) * normal;
    vW = (world * vec4(position, 1.0)).xyz;
    vP = position;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

// A field cube: sunlit concrete; a lit cube also glows along its seams and at a window in each face. It fades out
// with distance before the sky sphere, and discards what it fades out so it never writes depth there.
const CUBE_FRAGMENT = `
  precision highp float;
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vP;
  uniform float fade;
  uniform float lit;
  uniform vec3 camPos;
  ${COMMON}

  void main() {
    vec3 n = normalize(vN);
    float shade = 0.22 + 0.78 * max(dot(n, SUN), 0.0);
    vec3 a = abs(vP);
    float m = max(a.x, max(a.y, a.z));
    vec2 f = m == a.x ? a.yz : (m == a.y ? a.xz : a.xy);
    float e = max(f.x, f.y);
    float seam = smoothstep(0.44, 0.48, e);
    float window = 1.0 - smoothstep(0.06, 0.08, e);
    vec3 col = mix(vec3(0.16, 0.16, 0.18), vec3(0.30, 0.31, 0.34), lit) * shade;
    col += vec3(1.0, 0.78, 0.5) * (seam * 0.9 + window * 0.7) * lit;
    float alpha = fade * (1.0 - smoothstep(360.0, 420.0, length(vW - camPos)));
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

registerShader('spaceStars', STARS_VERTEX, STARS_FRAGMENT);
registerShader('spacePlanet', PLANET_VERTEX, PLANET_FRAGMENT);
registerShader('spaceHalo', HALO_VERTEX, HALO_FRAGMENT);
registerShader('spaceCube', CUBE_VERTEX, CUBE_FRAGMENT);

// The Crown (NARRATIVE.md): a huge spoked ring overhead, the coil of the planet's magnetic shield. Nobody lives on it
// and it has no lights: a dull grey against the black sky, with a sunlit sheen. But the coil runs. A faint violet
// current travels round the ring, and flares when a storm comes off the star.
const CROWN_VERTEX = `
  precision highp float;
  attribute vec3 position;
  attribute vec3 normal;
  uniform mat4 worldViewProjection;
  uniform mat4 world;
  varying vec3 vN;
  varying vec3 vP;
  void main() {
    vN = mat3(world) * normal;
    vP = position;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

const CROWN_FRAGMENT = `
  precision highp float;
  varying vec3 vN;
  varying vec3 vP;
  uniform float fade;
  uniform float storm;
  uniform float time;
  ${COMMON}

  void main() {
    float sheen = pow(max(dot(normalize(vN), SUN), 0.0), 3.0);
    vec3 col = vec3(0.04, 0.044, 0.055) + vec3(0.17, 0.19, 0.24) * sheen;
    // The coil: only the ring itself (the spokes and hub lie inside this radius in their own coordinates).
    float ring = step(74.5, length(vP.xz));
    float current = 0.5 + 0.5 * sin(atan(vP.z, vP.x) * 24.0 - time * 1.5);
    col += vec3(0.38, 0.3, 1.0) * ring * (0.1 + 0.95 * storm) * (0.3 + 0.7 * current);
    gl_FragColor = vec4(col, fade * 0.95);
  }
`;

registerShader('spaceCrown', CROWN_VERTEX, CROWN_FRAGMENT);
