import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

// Carga wompi/Code.gs con un Utilities mínimo para probar sus funciones puras.
const ctx = {
  console,
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' },
    Charset: { UTF_8: 'utf8' },
    computeDigest: (_alg, text) => [...createHash('sha256').update(text, 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b))
  }
};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../wompi/Code.gs', import.meta.url), 'utf8'), ctx);

const secret = 'prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z';
const event = () => ({
  event: 'transaction.updated',
  data: { transaction: { id: '1234-1610641025-49201', status: 'APPROVED', amount_in_cents: 4490000, customer_email: 'Juan@Example.com' } },
  signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum: '' },
  timestamp: 1530291411
});

test('checksum de Wompi = SHA256(valores + timestamp + secreto)', () => {
  const ev = event();
  const expected = createHash('sha256').update('1234-1610641025-49201APPROVED4490000' + '1530291411' + secret).digest('hex');
  assert.equal(ctx.wompiChecksum(ev, secret), expected);
  ev.signature.checksum = expected.toUpperCase();
  assert.equal(ctx.verifyWompiEvent(ev, secret), true);
});

test('rechaza firma alterada o sin secreto', () => {
  const ev = event();
  ev.signature.checksum = ctx.wompiChecksum(ev, secret);
  ev.data.transaction.amount_in_cents = 100;
  assert.equal(ctx.verifyWompiEvent(ev, secret), false);
  assert.equal(ctx.verifyWompiEvent(event(), ''), false);
});

test('los días se acumulan desde el vencimiento vigente', () => {
  const day = 86400000;
  const now = Date.UTC(2026, 9, 1);
  assert.equal(ctx.newAccessUntil(0, now, 30), now + 30 * day);
  assert.equal(ctx.newAccessUntil(now + 10 * day, now, 30), now + 40 * day);
  assert.equal(ctx.newAccessUntil(now - 5 * day, now, 30), now + 30 * day);
  assert.equal(ctx.normEmail('  Juan@Example.COM '), 'juan@example.com');
});
