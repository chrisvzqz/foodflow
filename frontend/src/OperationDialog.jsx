import { useEffect, useId, useRef, useState } from 'react'
import { request } from './api'
import { formatQuantity, locations, thousandths, validQuantity } from './format'

const titles = {
  add: 'Añadir alimentos', edit: 'Editar producto', entry: 'Registrar entrada',
  consumption: 'Registrar consumo', waste: 'Registrar desperdicio', adjustment: 'Ajustar cantidad',
  transfer: 'Trasladar alimentos', archive: 'Archivar producto', restore: 'Restaurar producto',
}
const endpoints = { entry: 'entries', consumption: 'consumptions', waste: 'wastes', adjustment: 'adjustments', transfer: 'transfers' }

export default function OperationDialog({ operation, products, onClose, onSaved }) {
  const { type, item } = operation
  const dialog = useRef(null)
  const heading = useId()
  const [mode, setMode] = useState('new')
  const [name, setName] = useState(item?.name || '')
  const [unit, setUnit] = useState(item?.unit || 'units')
  const [productId, setProductId] = useState(String(item?.product_id || products[0]?.id || ''))
  const [location, setLocation] = useState(item?.location || 'fridge')
  const [destination, setDestination] = useState(item?.location === 'pantry' ? 'fridge' : 'pantry')
  const [quantity, setQuantity] = useState(type === 'adjustment' ? item.quantity : '')
  const [withStock, setWithStock] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)
  const selected = products.find(p => String(p.id) === productId)
  const actionUnit = type === 'add' && mode === 'existing' ? selected?.unit : unit
  const needsQuantity = !['edit', 'archive', 'restore'].includes(type) && !(type === 'add' && mode === 'new' && !withStock)

  useEffect(() => { dialog.current.showModal() }, [])

  async function submit(event) {
    event.preventDefault()
    if (submitting.current) return
    setError('')
    const normalized = quantity.trim().replace(',', '.')
    if (needsQuantity && !validQuantity(normalized, type === 'adjustment')) {
      setError('Introduce una cantidad válida, con hasta 9 dígitos enteros y 3 decimales. Solo el ajuste admite cero.')
      return
    }
    if (['consumption', 'waste', 'transfer'].includes(type) && thousandths(normalized) > thousandths(item.quantity)) {
      setError('La cantidad supera las existencias disponibles.')
      return
    }
    if (type === 'transfer' && destination === item.location) {
      setError('Selecciona un destino diferente al origen.')
      return
    }
    let path, method = 'POST', body
    if (type === 'add') {
      if (mode === 'existing') {
        if (!selected) { setError('Selecciona un producto activo.'); return }
        path = '/inventory/entries'
        body = { product_id: selected.id, location, quantity: normalized }
      } else {
        path = '/products'
        body = { name: name.trim(), unit: unit.trim() }
        if (withStock) body.initial_inventory = { location, quantity: normalized }
      }
    } else if (type === 'edit') {
      path = `/products/${item.id}`
      method = 'PUT'
      body = { name: name.trim(), unit: unit.trim() }
    } else if (type === 'archive' || type === 'restore') {
      path = `/products/${item.id}/${type}`
    } else {
      path = `/inventory/${endpoints[type]}`
      body = { product_id: item.product_id, quantity: normalized }
      if (type === 'transfer') {
        body.source_location = item.location
        body.destination_location = destination
      } else body.location = location
    }
    submitting.current = true
    setSaving(true)
    try {
      await request(path, { method, body })
      onSaved(type === 'add' ? 'Alimentos guardados.' : `${titles[type]}: operación completada.`)
    } catch (e) { setError(e.message) }
    finally { submitting.current = false; setSaving(false) }
  }

  return (
    <dialog ref={dialog} aria-labelledby={heading} onCancel={e => { e.preventDefault(); if (!saving) onClose() }}>
      <form onSubmit={submit}>
        <header className="dialog-heading"><div><span className="eyebrow">FOODFLOW</span><h2 id={heading}>{titles[type]}</h2></div>
          <button type="button" className="icon-button" aria-label="Cerrar formulario" onClick={onClose} disabled={saving}>×</button>
        </header>
        <fieldset disabled={saving}>
          {type === 'add' && <div className="segmented" aria-label="Tipo de alta">
            <button type="button" aria-pressed={mode === 'new'} onClick={() => setMode('new')}>Producto nuevo</button>
            <button type="button" aria-pressed={mode === 'existing'} onClick={() => setMode('existing')}>Ya lo tengo registrado</button>
          </div>}
          {type === 'add' && mode === 'existing' && <label>Producto<select value={productId} onChange={e => setProductId(e.target.value)} required>
            <option value="" disabled>Selecciona un producto</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} · {p.unit} · #{p.id}</option>)}
          </select><small>Se añadirá cantidad al producto seleccionado. No se creará uno nuevo.</small></label>}
          {(type === 'edit' || (type === 'add' && mode === 'new')) && <>
            <label>Nombre del alimento<input autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Por ejemplo, arroz integral" pattern=".*\S.*" /></label>
            <label>Unidad de medida<input list="units" required maxLength={30} value={unit} onChange={e => setUnit(e.target.value)} pattern=".*\S.*" />
              <datalist id="units">{['units', 'kg', 'g', 'l', 'ml'].map(u => <option key={u} value={u} />)}</datalist>
              <small>units = unidades. También puedes escribir otra unidad.</small>
            </label>
            {type === 'edit' && <p className="form-note">La unidad pertenece a todas las ubicaciones del producto. Cambiarla no convierte las cantidades existentes.</p>}
          </>}
          {item && type !== 'edit' && <div className="item-summary"><strong>{item.name}</strong>
            {item.location && <span>{locations[item.location]} · {formatQuantity(item.quantity)} {item.unit} disponibles</span>}
          </div>}
          {type === 'archive' && <p>El producto se ocultará en todas sus ubicaciones. Solo se puede archivar si no tiene cantidades positivas. Se conservará su historial.</p>}
          {type === 'restore' && <p>El producto volverá a estar activo y podrás registrar nuevas entradas.</p>}
          {type === 'add' && mode === 'new' && <label className="check-label"><input type="checkbox" checked={withStock} onChange={e => setWithStock(e.target.checked)} /> Añadir existencias iniciales</label>}
          {needsQuantity && <>
            {(type === 'add' || type === 'entry') && <label>¿Dónde lo guardas?<select value={location} onChange={e => setLocation(e.target.value)}>{Object.entries(locations).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>}
            {type === 'transfer' && <label>Ubicación de destino<select value={destination} onChange={e => setDestination(e.target.value)}>{Object.entries(locations).filter(([v]) => v !== item.location).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>}
            <label>{type === 'adjustment' ? 'Cantidad real que hay ahora' : 'Cantidad'}{actionUnit && <span className="label-unit"> · {actionUnit}</span>}
              <input required inputMode="decimal" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0,500" autoComplete="off" />
              <small>{type === 'adjustment' ? 'Es el total final, no lo que quieres sumar o restar. Admite cero.' : 'Usa coma o punto, con hasta tres decimales.'}</small>
            </label>
          </>}
        </fieldset>
        {error && <div className="alert error" role="alert">{error}</div>}
        <footer className="dialog-footer"><button type="button" className="button secondary" disabled={saving} onClick={onClose}>Cancelar</button>
          <button className={`button ${type === 'archive' || type === 'waste' ? 'danger' : 'primary'}`} disabled={saving}>{saving ? 'Guardando…' : type === 'add' ? 'Guardar alimentos' : 'Confirmar'}</button>
        </footer>
      </form>
    </dialog>
  )
}
