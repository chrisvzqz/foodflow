import { useEffect, useState } from 'react'
import { query, request } from './api'
import { formatQuantity, locations } from './format'

const types = {
  entry: 'Entrada', consumption: 'Consumo', waste: 'Desperdicio',
  adjustment: 'Ajuste', transfer_in: 'Traslado recibido', transfer_out: 'Traslado enviado',
}
const dates = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' })

export default function MovementHistory() {
  const [filters, setFilters] = useState({ product_id: '', type: '' })
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState({ key: null, rows: [], products: [], error: '' })
  const key = JSON.stringify({ filters, revision })
  const loading = result.key !== key

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      request('/inventory/movements' + query(filters), { signal: controller.signal }),
      request('/products', { signal: controller.signal }),
      request('/products?is_active=false', { signal: controller.signal }),
    ]).then(([rows, active, archived]) => {
      if (controller.signal.aborted) return
      const products = [...active, ...archived].sort((a, b) => a.name.localeCompare(b.name, 'es') || a.id - b.id)
      setResult({ key, rows, products, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setResult(previous => ({ ...previous, key, rows: [], error: error.message }))
    })
    return () => controller.abort()
  }, [filters, key])

  const filtered = Boolean(filters.product_id || filters.type)
  return <>
    <div className="page-heading"><div>
      <p className="eyebrow">CADA CAMBIO CUENTA</p>
      <h1>La historia de tu cocina.</h1>
      <p className="subtitle">Entradas, consumos y cambios de ubicación, del más reciente al más antiguo. Incluye productos archivados.</p>
    </div></div>
    <section className="list-panel" aria-labelledby="history-title">
      <div className="list-heading">
        <h2 id="history-title">Historial <span>{loading || result.error ? '—' : result.rows.length}</span></h2>
        <button className="text-button" disabled={loading} onClick={() => setRevision(v => v + 1)}>↻ Actualizar</button>
      </div>
      <div className="filters history-filters">
        <label>Producto<select value={filters.product_id} onChange={e => setFilters(f => ({ ...f, product_id: e.target.value }))}>
          <option value="">Todos los productos</option>
          {result.products.map(product => <option key={product.id} value={product.id}>{product.name} · #{product.id}{product.is_active ? '' : ' (archivado)'}</option>)}
        </select></label>
        <label>Tipo de movimiento<select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
          <option value="">Todos los movimientos</option>
          {Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        {filtered && <button className="text-button" onClick={() => setFilters({ product_id: '', type: '' })}>Limpiar filtros</button>}
      </div>
      {loading ? <div className="state-box" role="status"><span className="spinner" />Cargando movimientos…</div>
        : result.error ? <div className="state-box"><h3>No hemos podido cargar el historial</h3><p role="alert">{result.error}</p><button className="button secondary" onClick={() => setRevision(v => v + 1)}>Reintentar</button></div>
        : result.rows.length === 0 ? <div className="state-box"><h3>{filtered ? 'No hay movimientos con estos filtros' : 'Todavía no hay movimientos'}</h3><p>{filtered ? 'Elige otro producto o tipo de movimiento.' : 'Las operaciones que registres en el inventario aparecerán aquí.'}</p></div>
        : <div className="table-scroll"><table className="history-table"><thead><tr><th>Alimento</th><th>Ubicación</th><th>Movimiento</th><th>Cambio</th><th>Fecha</th></tr></thead><tbody>
          {result.rows.map(movement => <tr key={movement.id}>
            <td data-label="Alimento"><div className="food-cell"><div><strong>{movement.name}</strong><small>Producto #{movement.product_id} · Movimiento #{movement.id}</small></div></div></td>
            <td data-label="Ubicación"><span className={'location-chip ' + movement.location}>{locations[movement.location]}</span></td>
            <td data-label="Movimiento">{types[movement.type]}</td>
            <td data-label="Cambio"><strong className={'quantity movement-change ' + (Number(movement.quantity_change) > 0 ? 'positive' : 'negative')}>{Number(movement.quantity_change) > 0 ? '+' : ''}{formatQuantity(movement.quantity_change)}</strong><span className="unit">{movement.unit}</span></td>
            <td data-label="Fecha"><time dateTime={movement.created_at}>{dates.format(new Date(movement.created_at))}</time></td>
          </tr>)}
        </tbody></table></div>}
      <footer className="list-footer"><span>El cambio indica cuánto se añadió o retiró, no la cantidad final.</span><span>Fechas en tu hora local.</span></footer>
    </section>
    <p className="page-footnote">Cada traslado aparece como una salida del origen y una entrada en el destino.</p>
  </>
}
