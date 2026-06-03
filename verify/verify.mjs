#!/usr/bin/env node
/**
 * Post-publish smoke test. Importer hver pakke og bekræft at de vigtigste exports
 * faktisk er tilgængelige. Køres af publish.yml efter Changesets har publishet.
 *
 * Bemærk: @bimo-nexus/ui kan ikke testes her uden Angular runtime — UI-pakken
 * smoke-testes separat via build-tjek i CI.
 * @bimo-nexus/testing og @bimo-nexus/cli installeres typisk som devDeps og verificeres
 * via deres egen test-suite før publish.
 */

import { strict as assert } from 'node:assert';

let failed = 0;
const results = [];

function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, ok: false, error: err instanceof Error ? err.message : String(err) });
    console.error(`✗ ${name}: ${err instanceof Error ? err.message : err}`);
  }
}

console.log('\n=== @bimo-nexus/core ===\n');
const core = await import('@bimo-nexus/core');
check('NEXUS_DEFAULTS.TOKEN_HEADER == "X-Bimo-Token"', () => {
  assert.equal(core.NEXUS_DEFAULTS.TOKEN_HEADER, 'X-Bimo-Token');
});
check('NEXUS_DEFAULTS is frozen', () => {
  assert.equal(Object.isFrozen(core.NEXUS_DEFAULTS), true);
});
check('isValidRemoteName accepts camelCase', () => {
  assert.equal(core.isValidRemoteName('myRemote'), true);
  assert.equal(core.isValidRemoteName('Remote-One'), false);
});
check('RegistryError preserves correlationId', () => {
  const err = new core.RegistryError('test', 500, 'req-123');
  assert.equal(err.statusCode, 500);
  assert.equal(err.correlationId, 'req-123');
});

console.log('\n=== @bimo-nexus/client ===\n');
const client = await import('@bimo-nexus/client');
check('RegistryClient constructor requires url+token', () => {
  assert.throws(() => new client.RegistryClient({ registryUrl: '', token: '' }));
});
check('RegistryClient constructs with valid input', () => {
  const c = new client.RegistryClient({ registryUrl: 'http://localhost:3000', token: 'x' });
  assert.ok(c);
});
check('RegistryClient re-exports NEXUS_DEFAULTS', () => {
  assert.equal(client.NEXUS_DEFAULTS.TOKEN_HEADER, 'X-Bimo-Token');
});
check('RegistryWebSocket is exported', () => {
  assert.equal(typeof client.RegistryWebSocket, 'function');
});

console.log('\n=== Summary ===');
console.log(`  Total: ${results.length}  •  Passed: ${results.length - failed}  •  Failed: ${failed}`);
if (failed > 0) {
  console.error('\n✗ Verification FAILED');
  process.exit(1);
}
console.log('\n✓ All published packages verified');
