# FoodFlow · Frontend

Interfaz de la V0, construida con React, JavaScript y Vite. Utiliza los endpoints existentes de FastAPI; PostgreSQL sigue siendo la fuente de datos. No se guardan existencias en localStorage.

## Arrancar en local

1. Comprueba que PostgreSQL esté arrancado y saludable en Docker Desktop.
2. En una terminal, desde `backend/`: `source .venv/bin/activate` y `python -m uvicorn app.main:app --reload`.
3. En otra terminal, desde `frontend/`: `npm install` (solo la primera vez o al cambiar dependencias), y `npm run dev`.
4. Abre la dirección que muestra Vite, normalmente `http://localhost:5173`.

La configuración de Vite redirige `/api/*` a `http://127.0.0.1:8000/*`. El navegador consulta su mismo origen y el servidor de desarrollo reenvía las peticiones a FastAPI. No requiere ampliar CORS en el backend.

## Qué incluye

- Inventario, búsqueda por nombre, filtro por ubicación y cantidades a cero.
- Catálogo de productos activos, edición de nombre/unidad y archivado con confirmación.
- Productos archivados con búsqueda y restauración.
- Alta de un producto con existencias iniciales opcionales o entrada de uno existente, sin deduplicar nombres automáticamente.
- Entradas, consumos, desperdicios, ajustes (cantidad final) y traslados.
- Carga, listas vacías, errores y reintento; bloqueo de envíos mientras se guarda.
- Cantidades enviadas como texto decimal, aceptando coma o punto y hasta tres decimales. Sin suma/resta de existencias en el navegador.
- Diseño adaptable, formularios etiquetados, navegación por teclado y diálogos con Escape, foco y confirmación explícita.

## Archivos principales

- `src/main.jsx`: punto de entrada de React.
- `src/App.jsx`: navegación, listados, filtros y recarga de datos.
- `src/OperationDialog.jsx`: formularios de operaciones y confirmaciones.
- `src/api.js`: peticiones HTTP y traducción de errores.
- `src/format.js`: ubicaciones, presentación y validación decimal.
- `src/index.css`: estilos generales; `src/App.css`: diseño y adaptación a móvil.
- `vite.config.js`: React y proxy local de la API.

## Comprobar

Desde `frontend/`:

```sh
npm run lint
npm test
npm run build
```

Para probar la integración: crear un producto de prueba con existencias, consumir o desperdiciar parte, ajustar el total, trasladar entre ubicaciones y comprobar los listados. Archivar con cantidad positiva debe mostrar el error de la API; tras dejar todas las ubicaciones a cero debe poder archivarse y restaurarse. Las operaciones válidas modifican PostgreSQL y su historial; no deben repetirse sin tener en cuenta sus cantidades.

`npm run build` genera `dist/`. El proxy es de desarrollo: para publicar el frontend, el servidor de despliegue deberá enrutar `/api` a FastAPI. No se ha configurado hosting ni autenticación. El historial de movimientos se conserva en el backend; no hay un endpoint de consulta del historial en esta versión.

## Tema

El botón de la barra superior alterna modo claro y oscuro. La elección se recuerda en este navegador mediante localStorage; sin elección previa se utiliza el tema del sistema al abrir. No se guardan datos de inventario en ese almacenamiento.
