// Babylon-free: a ChamberSpec as a short string for a URL fragment (`#c=...`), and back. Tested by Node.
//
// The spec is first packed into positional arrays (no field names, small integers for roles and faces), written as JSON,
// deflated (raw, with the platform's CompressionStream) and base64url-encoded behind a version tag. Decoding takes a
// stranger's input, so it checks every field and caps the size of the link, of what it inflates to, and of the chamber.
import { AXES, type GravityAxis } from '../gravity/axes.ts';
import {
  checkSpec,
  type ChamberSpec,
  type Face,
  type LeverSpec,
  type Pair,
  type Part,
  type PlacardSpec,
  type Role,
  type Vec,
} from './spec.ts';

/** The tag at the start of an encoded chamber; a format change gets a new one and old links keep their decoder. */
export const SPEC_VERSION = 'v1';
/** The longest encoded chamber accepted, and the most it may inflate to. */
export const MAX_ENCODED_LENGTH = 65536;
export const MAX_PACKED_BYTES = 262144;
export const LIMITS = { parts: 1500, levers: 64, placards: 200, text: 800, coordinate: 2000 };

/** Thrown for any link that is not a sound chamber. */
export class SpecCodecError extends Error {}

const ROLES: Role[] = ['shell', 'alcove', 'exit', 'feature'];
const FACES: Face[] = ['+x', '-x', '+y', '-y', '+z', '-z'];
const SLAB_AXES = ['x', 'y', 'z'] as const;
type Packed = unknown[];

// ---- packing ----------------------------------------------------------------------------------------------------

const roleCode = (r: Role | undefined) => (r === undefined ? null : ROLES.indexOf(r));

function packPart(p: Part): Packed {
  switch (p.kind) {
    case 'slab':
      return [
        's',
        SLAB_AXES.indexOf(p.axis),
        p.lo,
        p.hi,
        p.u,
        p.v,
        roleCode(p.role),
        p.hole ? [...p.hole.u, ...p.hole.v] : null,
      ];
    case 'box':
      return ['b', p.min, p.max, roleCode(p.role)];
    case 'tube':
      return ['t', p.min, p.max, p.open.map((f) => FACES.indexOf(f)), roleCode(p.role)];
    case 'glass':
      return ['g', p.min, p.max];
  }
}

const packPlacard = (p: PlacardSpec): Packed => [
  p.at,
  p.normal,
  p.readAs,
  p.text,
  p.voice === 'margin' ? 1 : 0,
  p.width ?? null,
  p.lineHeight ?? null,
  p.top ?? null,
];

export function packSpec(s: ChamberSpec): unknown {
  return [
    s.accent,
    s.parts.map(packPart),
    s.levers.map((l) => [l.at, l.normal, l.target, l.once ? 1 : 0]),
    s.placards.map(packPlacard),
    [
      s.name,
      s.hint,
      s.spawn,
      s.entranceAxis,
      s.exitAxis,
      s.exitCenter,
      s.exitRadius,
      s.vista ? 1 : 0,
      s.ending ? 1 : 0,
    ],
  ];
}

// ---- unpacking (untrusted) --------------------------------------------------------------------------------------

const fail = (what: string): never => {
  throw new SpecCodecError(`bad chamber link: ${what}`);
};

function num(x: unknown, what: string, limit: number = LIMITS.coordinate): number {
  if (typeof x !== 'number' || !Number.isFinite(x) || Math.abs(x) > limit) fail(what);
  return x as number;
}
function list(x: unknown, what: string, max: number): unknown[] {
  if (!Array.isArray(x) || x.length > max) fail(what);
  return x as unknown[];
}
function tuple(x: unknown, n: number, what: string): number[] {
  const a = list(x, what, n);
  if (a.length !== n) fail(what);
  return a.map((v) => num(v, what));
}
const vec = (x: unknown, what: string) => tuple(x, 3, what) as Vec;
const pair = (x: unknown, what: string) => tuple(x, 2, what) as Pair;
function str(x: unknown, what: string, max = LIMITS.text): string {
  if (typeof x !== 'string' || x.length > max) fail(what);
  return x as string;
}
function axis(x: unknown, what: string): GravityAxis {
  if (typeof x !== 'string' || !AXES.includes(x as GravityAxis)) fail(what);
  return x as GravityAxis;
}
function index(x: unknown, count: number, what: string): number {
  if (typeof x !== 'number' || !Number.isInteger(x) || x < 0 || x >= count) fail(what);
  return x as number;
}
const optRole = (x: unknown, what: string): Role | undefined =>
  x === null ? undefined : ROLES[index(x, ROLES.length, what)];
const optNum = (x: unknown, what: string): number | undefined => (x === null ? undefined : num(x, what));

function unpackPart(raw: unknown, i: number): Part {
  const a = list(raw, `part ${i}`, 8);
  const w = `part ${i}`;
  switch (a[0]) {
    case 's': {
      const role = optRole(a[6], w);
      if (!role) fail(w);
      const h = a[7] === null ? undefined : tuple(a[7], 4, w);
      return {
        kind: 'slab',
        axis: SLAB_AXES[index(a[1], 3, w)],
        lo: num(a[2], w),
        hi: num(a[3], w),
        u: pair(a[4], w),
        v: pair(a[5], w),
        role: role as Role,
        ...(h && { hole: { u: [h[0], h[1]] as Pair, v: [h[2], h[3]] as Pair } }),
      };
    }
    case 'b': {
      const role = optRole(a[3], w);
      return { kind: 'box', min: vec(a[1], w), max: vec(a[2], w), ...(role && { role }) };
    }
    case 't': {
      const role = optRole(a[4], w);
      if (!role) fail(w);
      return {
        kind: 'tube',
        min: vec(a[1], w),
        max: vec(a[2], w),
        open: list(a[3], w, 6).map((f) => FACES[index(f, 6, w)]),
        role: role as Role,
      };
    }
    case 'g':
      return { kind: 'glass', min: vec(a[1], w), max: vec(a[2], w) };
  }
  return fail(w);
}

function unpackLever(raw: unknown, i: number): LeverSpec {
  const a = list(raw, `lever ${i}`, 4);
  return {
    at: vec(a[0], `lever ${i}`),
    normal: vec(a[1], `lever ${i}`),
    target: axis(a[2], `lever ${i}`),
    ...(a[3] === 1 && { once: true }),
  };
}

function unpackPlacard(raw: unknown, i: number): PlacardSpec {
  const a = list(raw, `placard ${i}`, 8);
  const w = `placard ${i}`;
  const width = optNum(a[5], w);
  const lineHeight = optNum(a[6], w);
  return {
    at: vec(a[0], w),
    normal: vec(a[1], w),
    readAs: axis(a[2], w),
    text: str(a[3], w),
    ...(a[4] === 1 && { voice: 'margin' as const }),
    ...(width !== undefined && { width }),
    ...(lineHeight !== undefined && { lineHeight }),
    ...(a[7] !== null && { top: vec(a[7], w) }),
  };
}

/** Rebuilds a spec from `packSpec`'s output, checking everything. Throws `SpecCodecError`. */
export function unpackSpec(raw: unknown): ChamberSpec {
  const root = list(raw, 'root', 5);
  if (root.length !== 5) fail('root');
  const m = list(root[4], 'meta', 9);
  const spec: ChamberSpec = {
    accent: vec(root[0], 'accent'),
    parts: list(root[1], 'parts', LIMITS.parts).map(unpackPart),
    levers: list(root[2], 'levers', LIMITS.levers).map(unpackLever),
    placards: list(root[3], 'placards', LIMITS.placards).map(unpackPlacard),
    name: str(m[0], 'name', 80),
    hint: str(m[1], 'hint'),
    spawn: vec(m[2], 'spawn'),
    entranceAxis: axis(m[3], 'entrance axis'),
    exitAxis: axis(m[4], 'exit axis'),
    exitCenter: vec(m[5], 'exit centre'),
    exitRadius: num(m[6], 'exit radius'),
    ...(m[7] === 1 && { vista: true }),
    ...(m[8] === 1 && { ending: true }),
  };
  if (spec.accent.some((c) => c < 0 || c > 1)) fail('accent');
  const problems = checkSpec(spec);
  if (problems.length) fail(problems[0]);
  return spec;
}

// ---- bytes ------------------------------------------------------------------------------------------------------

const b64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64 = (text: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) fail('not base64url');
  // A length of 1 mod 4 is impossible for base64: characters were lost or added (a truncated or retyped link).
  if (text.length % 4 === 1) fail('the link is damaged (truncated or altered)');
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Inflates, stopping at `MAX_PACKED_BYTES`: a small link must not be able to expand into a large allocation. */
async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_PACKED_BYTES) {
        await reader.cancel();
        return fail('too large');
      }
      chunks.push(value);
    }
  } catch (e) {
    if (e instanceof SpecCodecError) throw e;
    fail('not compressed data');
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** The chamber as a URL-safe string, tagged with the format version. */
export async function encodeSpec(spec: ChamberSpec): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(packSpec(spec)));
  return `${SPEC_VERSION}.${b64(await deflate(json))}`;
}

/** Decodes and checks a string from `encodeSpec`. Throws `SpecCodecError` for anything that is not a sound chamber. */
export async function decodeSpec(text: string): Promise<ChamberSpec> {
  if (text.length > MAX_ENCODED_LENGTH) fail('link too long');
  const dot = text.indexOf('.');
  if (text.slice(0, dot) !== SPEC_VERSION) fail('unknown version');
  const bytes = await inflate(unb64(text.slice(dot + 1)));
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return fail('not JSON');
  }
  return unpackSpec(raw);
}

/** The key the encoded chamber travels under in the URL fragment: `#c=<encoded>`. */
export const FRAGMENT_KEY = 'c';

/** The encoded chamber in a URL hash such as `#c=v1.abc`, or undefined if the hash carries none. */
export function specFromHash(hash: string): string | undefined {
  const m = /^#c=(.*)$/.exec(hash);
  return m ? m[1] : undefined;
}
