export const locations = { fridge: 'Nevera', freezer: 'Congelador', pantry: 'Despensa' }

export function formatQuantity(value) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 }).format(Number(value))
}

// Comparamos milésimas enteras para no calcular existencias con coma flotante.
export function thousandths(value) {
  const [whole, fraction = ''] = String(value).split('.')
  return BigInt(whole || '0') * 1000n + BigInt(fraction.padEnd(3, '0'))
}

export function validQuantity(value, allowZero = false) {
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(String(value))) return false
  return allowZero || thousandths(value) > 0n
}
