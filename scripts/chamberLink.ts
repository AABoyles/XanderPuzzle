// Prints a shareable link for a chamber spec. Run with Node 22.6+:
//   node --experimental-strip-types scripts/chamberLink.ts vault            (a converted chamber in src/level/specs/)
//   node --experimental-strip-types scripts/chamberLink.ts my-chamber.json  (a ChamberSpec as JSON)
// Set BASE to the page's address (default: the dev server).
import { readFileSync } from 'node:fs';
import { decodeSpec, encodeSpec } from '../src/level/specCodec.ts';
import type { ChamberSpec } from '../src/level/spec.ts';

const arg = process.argv[2];
if (!arg) {
  console.error('usage: chamberLink.ts <chamber id | spec.json>');
  process.exit(1);
}
let spec: ChamberSpec;
if (arg.endsWith('.json')) {
  spec = JSON.parse(readFileSync(arg, 'utf8')) as ChamberSpec;
} else {
  const module = (await import(`../src/level/specs/${arg}.ts`)) as Record<string, ChamberSpec>;
  spec = Object.values(module)[0];
}
const encoded = await encodeSpec(spec);
await decodeSpec(encoded); // refuse to print a link the game would reject
console.log(`${process.env.BASE ?? 'http://localhost:5173/'}#c=${encoded}`);
console.error(`${spec.name}: ${encoded.length} characters`);
