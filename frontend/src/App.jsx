import { useEffect, useState } from 'react'
import { query, request } from './api'
import { formatQuantity, locations } from './format'
import OperationDialog from './OperationDialog'
import MovementHistory from './MovementHistory'
import './App.css'

function Mark() {
  return <svg width="29" height="29" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M25 5C13 4 5 11 8 20c3 9 18 7 17-15Z" fill="currentColor"/><path d="M6 28 21 11M13 20l-1-7m5 3h6" stroke="var(--surface)" strokeWidth="1.8" strokeLinecap="round"/></svg>
}
const views = { inventory: 'Inventario', products: 'Productos', archived: 'Archivados', history: 'Historial' }

export default function App() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('foodflow-theme', theme) } catch { /* The theme still works without storage. */ }
  }, [theme])
  const [view, setView] = useState('inventory')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ search: '', location: '' })
  const [result, setResult] = useState({ key: null, rows: [], products: [], error: '' })
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [operation, setOperation] = useState(null)
  const requestKey = JSON.stringify({ view, filters, revision })
  const loading = result.key !== requestKey
  const { rows, products, error: loadError } = result
  const productsReady = !loading && !loadError

  useEffect(() => {
    if (view === 'history') return
    const controller = new AbortController()
    const path = view === 'inventory'
      ? `/inventory${query(filters)}`
      : `/products${query({ search: filters.search, is_active: view !== 'archived' })}`
    Promise.all([
      request(path, { signal: controller.signal }),
      request('/products', { signal: controller.signal }),
    ]).then(([data, active]) => {
      if (controller.signal.aborted) return
      setResult({ key: requestKey, rows: data, products: active, error: '' })
    }).catch(e => {
      if (!controller.signal.aborted) setResult({ key: requestKey, rows: [], products: [], error: e.message })
    })
    return () => controller.abort()
  }, [view, filters, requestKey])

  function navigate(next) {
    setView(next)
    setSearch('')
    setFilters({ search: '', location: '' })
    setNotice('')
  }
  function open(type, item) { setNotice(''); setOperation({ type, item }) }
  function saved(message) {
    setOperation(null)
    setNotice(message)
    setRevision(v => v + 1)
  }
  const zeroCount = rows.filter(r => r.quantity != null && Number(r.quantity) === 0).length
  const hasFilters = Boolean(filters.search || filters.location)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#" className="brand" onClick={e => { e.preventDefault(); navigate('inventory') }}><Mark /><span>foodflow<span className="brand-dot">.</span></span></a>
        <div className="sidebar-caption">TU COCINA, EN ORDEN</div>
        <nav aria-label="Navegación principal">{Object.entries(views).map(([key, label], index) => <button key={key} className={view === key ? 'nav-item selected' : 'nav-item'} aria-current={view === key ? 'page' : undefined} onClick={() => navigate(key)}><span className="nav-symbol" aria-hidden="true">{['▦', '◫', '↶', '◷'][index]}</span>{label}<span className="nav-arrow" aria-hidden="true">↗</span></button>)}</nav>
        <div className="sidebar-bottom"><span className="small-leaf"><Mark /></span><p>Lo que tienes.<br /><strong>Lo que aprovechas.</strong></p><span className="version">INVENTARIO DEL HOGAR · V0</span></div>
      </aside>
      <div className="workspace">
        <header className="topbar"><span>Mi hogar <span className="breadcrumb">/ {views[view]}</span></span><div className="topbar-actions"><button className="theme-toggle" aria-pressed={theme === 'dark'} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span> {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</button><span className="home-badge"><span /> Mi cocina</span></div></header>
        <main>
          {view === 'history' ? <MovementHistory /> : <>
          <div className="page-heading"><div><p className="eyebrow">MENOS DESPERDICIO, MÁS CONTROL</p><h1>{view === 'inventory' ? 'Tu cocina, de un vistazo.' : view === 'products' ? 'Tus alimentos.' : 'Una pausa, no un adiós.'}</h1><p className="subtitle">{view === 'inventory' ? 'Todo lo que tienes y dónde lo guardas. Listo para aprovecharlo.' : view === 'products' ? 'Gestiona tus productos, también los que todavía no tienen existencias.' : 'Conserva su historia y recupéralos cuando vuelvan a tu cocina.'}</p></div>
            <button className="button primary add-button" onClick={() => open('add')} disabled={!productsReady || loading}><span aria-hidden="true">＋</span> Añadir alimentos</button>
          </div>
          {notice && <div className="alert success" role="status">{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}>×</button></div>}
          <section className="overview" aria-label="Resumen de la vista">
            <div className="overview-main"><span className="eyebrow">{view === 'inventory' ? 'EN ESTA VISTA' : 'PRODUCTOS EN ESTA VISTA'}</span><div><strong>{loading || loadError ? '—' : rows.length}</strong><span>{view === 'inventory' ? 'registros de existencias' : view === 'archived' ? 'productos archivados' : 'productos activos'}</span></div></div>
            <div className="overview-secondary"><span className="overview-icon" aria-hidden="true">{view === 'inventory' ? '◎' : '✳'}</span><div><strong>{view === 'inventory' ? loading || loadError ? '—' : `${zeroCount} sin existencias` : view === 'archived' ? 'Su historia sigue aquí' : 'Cada alimento, a su medida'}</strong><p>{view === 'inventory' ? 'Llegar a cero no elimina el producto ni su historial.' : view === 'archived' ? 'Restaura un producto para volver a registrar entradas.' : 'La cantidad y la ubicación se gestionan desde el inventario.'}</p></div></div>
          </section>
          <section className="list-panel" aria-labelledby="list-title">
            <div className="list-heading"><h2 id="list-title">{views[view]} <span>{loading || loadError ? '—' : rows.length}</span></h2><button className="text-button" onClick={() => setRevision(v => v + 1)} disabled={loading}>↻ Actualizar</button></div>
            <form className="filters" onSubmit={e => { e.preventDefault(); setFilters(f => ({ ...f, search: search.trim() })) }}>
              <label className="search-field"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar por nombre</span><input type="search" placeholder="Buscar un alimento…" value={search} onChange={e => setSearch(e.target.value)} /></label>
              {view === 'inventory' && <label className="location-filter"><span className="sr-only">Filtrar por ubicación</span><select value={filters.location} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}><option value="">Todas las ubicaciones</option>{Object.entries(locations).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>}
              <button className="button secondary" type="submit">Buscar</button>
              {hasFilters && <button type="button" className="text-button" onClick={() => { setSearch(''); setFilters({ search: '', location: '' }) }}>Limpiar</button>}
            </form>
            {loading ? <div className="state-box" role="status"><span className="spinner" /> Cargando tu cocina…</div> : loadError ? <div className="state-box"><h3>No hemos podido cargar los datos</h3><p role="alert">{loadError}</p>{notice && <p>La operación anterior se guardó, pero no hemos podido actualizar el listado.</p>}<button className="button secondary" onClick={() => setRevision(v => v + 1)}>Reintentar</button></div> : rows.length === 0 ? <div className="state-box"><span className="empty-icon" aria-hidden="true">{hasFilters ? '⌕' : '♧'}</span><h3>{hasFilters ? 'No hay coincidencias' : view === 'archived' ? 'Todo sigue en tu cocina' : view === 'inventory' ? 'Tu inventario está listo para empezar' : 'Tu primer alimento empieza aquí'}</h3><p>{hasFilters ? 'Prueba con otro nombre o cambia los filtros.' : view === 'archived' ? 'Los productos que archives aparecerán aquí.' : 'Añade un alimento nuevo o registra una entrada de uno existente.'}</p>{view !== 'archived' && <button className="button primary" onClick={() => open('add')}>Añadir alimentos</button>}</div> : <div className="table-scroll"><table><thead><tr><th>Alimento</th>{view === 'inventory' ? <><th>Ubicación</th><th>Cantidad disponible</th></> : <><th>Unidad</th><th>Estado</th></>}<th className="actions-heading">Acciones</th></tr></thead><tbody>{rows.map(item => <tr key={view === 'inventory' ? item.inventory_item_id : item.id}>
              <td data-label="Alimento"><div className="food-cell"><span className="food-avatar" aria-hidden="true">{item.name.slice(0, 1).toUpperCase()}</span><div><strong>{item.name}</strong><small>Producto #{item.product_id || item.id}</small></div></div></td>
              {view === 'inventory' ? <><td data-label="Ubicación"><span className={`location-chip ${item.location}`}><span aria-hidden="true">{item.location === 'pantry' ? '◫' : item.location === 'freezer' ? '❄' : '▥'}</span>{locations[item.location]}</span></td><td data-label="Cantidad"><strong className={Number(item.quantity) === 0 ? 'quantity zero' : 'quantity'}>{formatQuantity(item.quantity)}</strong><span className="unit">{item.unit}</span>{Number(item.quantity) === 0 && <small className="zero-label">Agotado</small>}</td></> : <><td data-label="Unidad">{item.unit}</td><td data-label="Estado"><span className={`status-chip ${view === 'archived' ? 'muted' : ''}`}>{view === 'archived' ? 'Archivado' : 'Activo'}</span></td></>}
              <td data-label="Acciones"><div className="row-actions">{view === 'inventory' ? <>
                <button onClick={() => open('entry', item)}>＋ Entrada</button>
                <select className="action-select" aria-label={`Más acciones para ${item.name} en ${locations[item.location]}`} defaultValue="" onChange={e => { if (e.target.value) open(e.target.value, item); e.target.value = '' }}>
                  <option value="" disabled>Más…</option>
                  <option value="consumption" disabled={Number(item.quantity) === 0}>Consumir</option>
                  <option value="waste" disabled={Number(item.quantity) === 0}>Registrar desperdicio</option>
                  <option value="adjustment">Ajustar cantidad</option>
                  <option value="transfer" disabled={Number(item.quantity) === 0}>Trasladar</option>
                </select>
              </> : view === 'archived' ? <button onClick={() => open('restore', item)}>↶ Restaurar</button> : <><button onClick={() => open('edit', item)}>Editar</button><button onClick={() => open('entry', { ...item, product_id: item.id })}>＋ Entrada</button><button onClick={() => open('archive', item)}>Archivar</button></>}</div></td>
            </tr>)}</tbody></table></div>}
            <footer className="list-footer"><span>Un lugar para cada alimento.</span><span>Nevera · Congelador · Despensa</span></footer>
          </section>
          <p className="page-footnote">Pequeños hábitos. Una cocina que aprovecha más.</p>
          </>}
        </main>
      </div>
      {operation && <OperationDialog key={`${operation.type}-${operation.item?.inventory_item_id || operation.item?.id || 'new'}`} operation={operation} products={products} onClose={() => setOperation(null)} onSaved={saved} />}
    </div>
  )
}
