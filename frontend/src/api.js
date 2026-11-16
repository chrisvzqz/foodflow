const messages = {
  'Product not found': 'El producto no existe o está archivado.',
  'Inventory item not found': 'No hay existencias de este producto en esa ubicación.',
  'Insufficient stock at this location': 'No hay cantidad suficiente en esta ubicación.',
  'Insufficient stock at source location': 'No hay cantidad suficiente en la ubicación de origen.',
  'Cannot archive a product with remaining stock': 'Antes de archivar, deja las existencias a cero en todas sus ubicaciones.',
  'Source and destination must be different': 'El origen y el destino deben ser distintos.',
}

export async function request(path, { body, method = 'GET', signal } = {}) {
  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('No se puede conectar con FoodFlow. Comprueba que FastAPI esté arrancado.')
  }
  if (!response.ok) {
    let detail
    try { detail = (await response.json()).detail } catch { /* Respuesta sin JSON. */ }
    if (Array.isArray(detail)) {
      throw new Error('Revisa los campos: la API no acepta alguno de los valores enviados.')
    }
    throw new Error(messages[detail] || `No se pudo completar la operación (${response.status}). Inténtalo de nuevo.`)
  }
  return response.json()
}

export function query(values) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== '' && value !== null && value !== undefined) params.set(key, value)
  }
  return params.size ? `?${params}` : ''
}
