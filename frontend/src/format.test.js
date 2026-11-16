import test from 'node:test'
import assert from 'node:assert/strict'
import { validQuantity, thousandths, formatQuantity } from './format.js'
import { query, request } from './api.js'

test('cantidades: límites de PostgreSQL, cero en ajustes y errores comunes', () => {
  assert.equal(validQuantity('999999999.999'), true)
  for (const value of ['1000000000', '0.0001', '-1', 'NaN', 'Infinity', '', '1e3']) assert.equal(validQuantity(value), false, value)
  assert.equal(validQuantity('0'), false)
  assert.equal(validQuantity('0.000', true), true)
  assert.equal(thousandths('0.1') + thousandths('0.2'), thousandths('0.300'))
  assert.equal(thousandths('0.301') > thousandths('0.300'), true)
  assert.equal(formatQuantity('1.500'), '1,5')
})

test('filtros: conserva false y codifica nombres', () => {
  assert.equal(query({ search: 'arroz & leche', is_active: false, location: '' }), '?search=arroz+%26+leche&is_active=false')
  assert.equal(query({ search: '', location: null }), '')
})

test('cliente API: envía cantidades como texto y traduce errores del backend', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  let captured
  globalThis.fetch = async (url, options) => { captured = { url, options }; return new Response(JSON.stringify({ quantity: '0.500' }), { status: 200 }) }
  await request('/inventory/entries', { method: 'POST', body: { quantity: '0.500' } })
  assert.equal(captured.url, '/api/inventory/entries')
  assert.equal(JSON.parse(captured.options.body).quantity, '0.500')
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Insufficient stock at this location' }), { status: 409 })
  await assert.rejects(request('/inventory/wastes'), /cantidad suficiente/)
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: [{ loc: ['body', 'quantity'] }] }), { status: 422 })
  await assert.rejects(request('/products'), /Revisa los campos/)
  globalThis.fetch = async () => { throw new TypeError('Network error') }
  await assert.rejects(request('/inventory'), /FastAPI/)
})
