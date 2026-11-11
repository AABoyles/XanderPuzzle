import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTENDANT, CUBE_SERIAL, cubeLabel, darkFraction, descentAlarm, dutyLine, endCard, MASS_RELEASED, NOT_RECOVERED,
  planetLights, PREDECESSOR, stormLine, MARGIN_SIGN, recoveryLine, winTitle, workLog,
} from '../src/narrative.ts';

test('the attendant serial stays AT-0417, one above the reveal crate', () => {
  assert.equal(ATTENDANT, 'AT-0417');
  assert.equal(PREDECESSOR, 'AT-0416');
  assert.equal(MARGIN_SIGN, '\u2014 416');
});

test('cube serials are four digits', () => {
  assert.ok(CUBE_SERIAL.test('0112'));
  for (const bad of ['112', '01120', 'CUBE 0112', '']) assert.ok(!CUBE_SERIAL.test(bad), bad);
});

test('log lines name the cube, the attendant and the recovery count', () => {
  assert.equal(cubeLabel('0112'), 'CUBE 0112');
  assert.equal(dutyLine('0112'), 'CUBE 0112 · ATTENDANT AT-0417 PRINTED · ON DUTY');
  assert.equal(recoveryLine(3), 'ATTENDANT LOST. REPLACEMENT PRINTED. RECOVERIES THIS CYCLE: 3.');
});

test('the win title sets the cube, or completes the schedule after the last one', () => {
  assert.equal(winTitle('0112', false), 'CUBE 0112 SET');
  assert.equal(winTitle('0131', true), 'SCHEDULE COMPLETE');
});

test('the work log counts shifts, compares the record and sends the attendant on', () => {
  assert.equal(
    workLog({ time: 12.34, shifts: 4, next: '0113' }),
    '4 SHIFTS LOGGED · 12.3s (NEW RECORD)\nCROWN LOAD BALANCED.\nATTENDANT RECLAIMED. REPRINT AT CUBE 0113.',
  );
  assert.equal(
    workLog({ time: 15, best: 10.2, shifts: 1, next: '0113' }),
    '1 SHIFT LOGGED · 15.0s (RECORD 10.2s)\nCROWN LOAD BALANCED.\nATTENDANT RECLAIMED. REPRINT AT CUBE 0113.',
  );
  assert.match(workLog({ time: 9, best: 10, shifts: 2 }), /NEW RECORD\)\nCROWN LOAD BALANCED\.\nTHANK YOU FOR YOUR CONTINUED ALIGNMENT\.$/);
});

test('more of the field has gone dark with each chamber', () => {
  assert.ok(Math.abs(darkFraction(0, 14) - 0.15) < 1e-12);
  assert.ok(Math.abs(darkFraction(13, 14) - 0.65) < 1e-12);
  for (let i = 1; i < 14; i++) assert.ok(darkFraction(i, 14) > darkFraction(i - 1, 14));
  assert.ok(Math.abs(darkFraction(0, 1) - 0.15) < 1e-12);
});

test('the planet stays dark until Act III, then lights up chamber by chamber', () => {
  for (let i = 0; i < 9; i++) assert.equal(planetLights(i, 9, 14), 0);
  assert.ok(Math.abs(planetLights(9, 9, 14) - 0.2) < 1e-12);
  for (let i = 10; i < 14; i++) assert.ok(planetLights(i, 9, 14) > planetLights(i - 1, 9, 14));
  assert.equal(planetLights(13, 9, 14), 1);
  // No Act III (the sandbox, or a missing chamber id) means no lights.
  assert.equal(planetLights(5, -1, 14), 0);
});

test('the Descent: alarms escalate with each lever, then the attendant is not recovered', () => {
  assert.equal(descentAlarm(0, '0147'), 'ATTENDANT, THIS SHIFT IS NOT ON SCHEDULE. PLEASE RETURN TO YOUR STATION.');
  // The last alarm names the mechanism: out of trim, off the schedule, printer off, so nobody is printed back.
  assert.match(descentAlarm(1, '0147'), /^CUBE 0147 OUT OF TRIM · REMOVED FROM SCHEDULE · PRINTER OFFLINE\./);
  assert.match(descentAlarm(1, '0147'), /RECOVERY SUSPENDED\.$/);
  assert.equal(descentAlarm(5, '0147'), descentAlarm(1, '0147'));
  assert.equal(NOT_RECOVERED, 'ATTENDANT NOT RECOVERED.');
  assert.equal(MASS_RELEASED, 'BALLAST MASS RELEASED. REPLACEMENT NOT SCHEDULED.');
  assert.equal(endCard(3, '0147'), 'CUBE 0147 DARK.\nRECOVERIES THIS CYCLE: 3\nLIGHTS ON THE SURFACE: ONE MORE.');
  assert.equal(endCard(0), 'RECOVERIES THIS CYCLE: 0\nLIGHTS ON THE SURFACE: ONE MORE.');
});

test('the storm log says what the Crown is for, and how much of it is left', () => {
  assert.equal(stormLine(0.85), 'STELLAR STORM. CROWN SHIELD HOLDING AT 85%.');
  assert.equal(stormLine(1 - darkFraction(19, 21)), 'STELLAR STORM. CROWN SHIELD HOLDING AT 38%.');
});
