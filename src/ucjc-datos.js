/**
 * <ucjc-pedidos> — Pieza DATOS (alternativa2) · DFE (76042) · Tienda UCJC
 *
 * Custom element en Vanilla JS, sin dependencias ni build.
 * Persistencia: IndexedDB (base "ucjc-datos-alt2").
 *
 * Atributos:
 *   modo="admin"   -> vista de administración (tablas de pedidos, usuarios, sesiones)
 *   modo="pedido"  -> detalle de un pedido (atributo pedido-id="123")
 *
 * Eventos que CONSUME (window, CustomEvent con .detail):
 *   ucjc:compra:pedido-creado@1        { pedidoId, total, ... }
 *   ucjc:identidad:usuarios-listados@1 { usuarios: [...], roles: [...] }
 *
 * Eventos que EMITE:
 *   ucjc:datos:usuarios-solicitados@1  { campos: [...] }
 *   ucjc:datos:pedido-guardado@1       { pedidoId }
 */

const DB_NAME = 'ucjc-datos-alt2';
const DB_VERSION = 1;

/* ------------------------------ Base de datos ----------------------------- */

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pedidos')) {
        const s = db.createObjectStore('pedidos', { keyPath: 'id' });
        s.createIndex('userId', 'userId');
      }
      if (!db.objectStoreNames.contains('usuarios')) {
        db.createObjectStore('usuarios', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('roles')) {
        db.createObjectStore('roles', { keyPath: 'nombre' });
      }
      if (!db.objectStoreNames.contains('sesiones')) {
        db.createObjectStore('sesiones', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(store, modo, fn) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, modo);
    const res = fn(t.objectStore(store));
    t.oncomplete = () => resolve(res && 'result' in res ? res.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

export const datos = {
  todos: (store) => tx(store, 'readonly', (s) => s.getAll()),
  guardar: (store, obj) => tx(store, 'readwrite', (s) => s.put(obj)),
  borrarTodo: (store) => tx(store, 'readwrite', (s) => s.clear()),

  /** pedidos_guardados(id_user) -> [Pedido{id, fecha, estado, ...}] */
  async pedidosGuardados(userId) {
    const todos = await this.todos('pedidos');
    return userId == null ? todos : todos.filter((p) => p.userId === userId);
  },

  /** sesiones_guardadas() -> [Sesion] */
  sesionesGuardadas: () => datos.todos('sesiones'),

  /** guardar_pedido(pedido) */
  async guardarPedido(pedido) {
    const p = { descuentoEmpleado: 0, ...pedido };
    await this.guardar('pedidos', p);
    window.dispatchEvent(
      new CustomEvent('ucjc:datos:pedido-guardado@1', { detail: { pedidoId: p.id } })
    );
    return p;
  },
};

/** Datos de ejemplo de la pantalla mínima de la Hoja A (#123, #124). */
async function sembrarSiVacio() {
  if ((await datos.todos('pedidos')).length) return;
  const demo = [
    { id: '#123', userId: 'u1', prenda: 'Camiseta UCJC', estado: 'en reparto', total: 19.9, fecha: '2026-10-12', descuentoEmpleado: 0 },
    { id: '#124', userId: 'u2', prenda: 'Sudadera UCJC', estado: 'pagado', total: 39.5, fecha: '2026-10-14', descuentoEmpleado: 10 },
    { id: '#125', userId: 'u1', prenda: 'Gorra UCJC', estado: 'entregado', total: 12, fecha: '2026-10-20', descuentoEmpleado: 0 },
    { id: '#126', userId: 'u3', prenda: 'Mochila UCJC', estado: 'preparando', total: 34, fecha: '2026-10-28', descuentoEmpleado: 15 },
  ];
  for (const p of demo) await datos.guardar('pedidos', p);
  await datos.guardar('usuarios', { id: 'u1', nombre: 'Ana Ruiz', email: 'ana@ucjc.edu', rol: 'cliente' });
  await datos.guardar('usuarios', { id: 'u2', nombre: 'Luis Pérez', email: 'luis@ucjc.edu', rol: 'empleado' });
  await datos.guardar('usuarios', { id: 'u3', nombre: 'Marta Gil', email: 'marta@ucjc.edu', rol: 'cliente' });
  await datos.guardar('roles', { nombre: 'cliente', permisos: ['ver-pedidos-propios'] });
  await datos.guardar('roles', { nombre: 'empleado', permisos: ['ver-pedidos-propios', 'descuento'] });
  await datos.guardar('roles', { nombre: 'admin', permisos: ['*'] });
}

/* ------------------------------- Componente ------------------------------- */

const eur = (n) => Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ESTILOS = `
  :host { display:block; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color:#1b2330; }
  * { box-sizing: border-box; }
  .wrap { background:#f4f6fb; border-radius:16px; padding:24px; }
  header { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
  h2 { margin:0; font-size:1.35rem; }
  .sub { color:#6b7585; font-size:.85rem; margin-top:2px; }
  .badge { background:#1f3a8a; color:#fff; border-radius:999px; padding:4px 12px; font-size:.75rem; letter-spacing:.04em; }
  .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:20px; }
  .kpi { background:#fff; border-radius:12px; padding:14px 16px; box-shadow:0 1px 3px rgba(20,30,60,.08); }
  .kpi b { display:block; font-size:1.5rem; margin-top:4px; }
  .kpi span { color:#6b7585; font-size:.78rem; text-transform:uppercase; letter-spacing:.05em; }
  .card { background:#fff; border-radius:12px; padding:16px; margin-bottom:16px; box-shadow:0 1px 3px rgba(20,30,60,.08); overflow-x:auto; }
  .card h3 { margin:0 0 12px; font-size:1rem; }
  table { width:100%; border-collapse:collapse; font-size:.9rem; }
  th { text-align:left; color:#6b7585; font-weight:600; font-size:.75rem; text-transform:uppercase; letter-spacing:.05em; padding:8px 10px; border-bottom:2px solid #e6eaf2; }
  td { padding:10px; border-bottom:1px solid #eef1f6; }
  tr:last-child td { border-bottom:none; }
  tbody tr:hover { background:#f8faff; }
  .estado { display:inline-block; padding:3px 10px; border-radius:999px; font-size:.75rem; font-weight:600; }
  .e-pagado { background:#dbeafe; color:#1e40af; }
  .e-preparando { background:#fef3c7; color:#92400e; }
  .e-en-reparto { background:#ede9fe; color:#5b21b6; }
  .e-entregado { background:#dcfce7; color:#166534; }
  .e-otro { background:#e5e7eb; color:#374151; }
  .num { text-align:right; font-variant-numeric:tabular-nums; }
  .vacio { color:#8a93a3; padding:12px 4px; }
  .acciones { display:flex; gap:8px; flex-wrap:wrap; }
  button { font:inherit; font-size:.85rem; border:0; border-radius:8px; padding:8px 14px; cursor:pointer; background:#1f3a8a; color:#fff; }
  button.sec { background:#e6eaf2; color:#1b2330; }
  button:hover { filter:brightness(1.1); }
  .grid2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:16px; }
  .rol { display:inline-block; background:#eef2ff; color:#3730a3; border-radius:6px; padding:2px 8px; font-size:.75rem; }
`;

class UcjcDatos extends HTMLElement {
  static get observedAttributes() { return ['modo', 'pedido-id']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._onPedido = (e) => this._recibirPedido(e.detail);
    this._onUsuarios = (e) => this._recibirUsuarios(e.detail);
    this._onGuardado = () => this.render();
  }

  connectedCallback() {
    window.addEventListener('ucjc:compra:pedido-creado@1', this._onPedido);
    window.addEventListener('ucjc:identidad:usuarios-listados@1', this._onUsuarios);
    window.addEventListener('ucjc:datos:pedido-guardado@1', this._onGuardado);
    this._iniciar();
  }

  disconnectedCallback() {
    window.removeEventListener('ucjc:compra:pedido-creado@1', this._onPedido);
    window.removeEventListener('ucjc:identidad:usuarios-listados@1', this._onUsuarios);
    window.removeEventListener('ucjc:datos:pedido-guardado@1', this._onGuardado);
  }

  attributeChangedCallback() { if (this.isConnected) this.render(); }

  async _iniciar() {
    await sembrarSiVacio();
    await datos.guardar('sesiones', { inicio: new Date().toISOString(), modo: this.getAttribute('modo') || 'pedido' });
    // Contrato con Identidad: pedimos usuarios y roles (todo lo que necesitamos).
    window.dispatchEvent(new CustomEvent('ucjc:datos:usuarios-solicitados@1', {
      detail: { campos: ['id', 'nombre', 'email', 'rol'] },
    }));
    this.render();
  }

  /** Compra -> Datos: pedido (id) y total. Se completa con lo que haya. */
  async _recibirPedido(d = {}) {
    if (!d.pedidoId) return;
    const existente = (await datos.todos('pedidos')).find((p) => p.id === d.pedidoId) || {};
    await datos.guardarPedido({
      estado: 'pagado',
      fecha: new Date().toISOString().slice(0, 10),
      ...existente,
      id: d.pedidoId,
      total: d.total ?? existente.total ?? 0,
      userId: d.userId ?? existente.userId ?? null,
      prenda: d.prenda ?? existente.prenda ?? '—',
    });
  }

  /** Identidad -> Datos: usuarios y roles. */
  async _recibirUsuarios(d = {}) {
    for (const u of d.usuarios || []) await datos.guardar('usuarios', u);
    for (const r of d.roles || []) await datos.guardar('roles', typeof r === 'string' ? { nombre: r, permisos: [] } : r);
    this.render();
  }

  async render() {
    const modo = this.getAttribute('modo') || 'pedido';
    const [pedidos, usuarios, roles, sesiones] = await Promise.all([
      datos.todos('pedidos'), datos.todos('usuarios'), datos.todos('roles'), datos.todos('sesiones'),
    ]);
    const cuerpo = modo === 'admin'
      ? this._vistaAdmin(pedidos, usuarios, roles, sesiones)
      : this._vistaPedido(pedidos);
    this.shadowRoot.innerHTML = `<style>${ESTILOS}</style><div class="wrap">${cuerpo}</div>`;
    this.shadowRoot.querySelectorAll('[data-accion]').forEach((b) =>
      b.addEventListener('click', () => this._accion(b.dataset.accion)));
  }

  async _accion(a) {
    if (a === 'demo') {
      const n = (await datos.todos('pedidos')).length + 123;
      await this._recibirPedido({ pedidoId: `#${n}`, total: +(10 + Math.random() * 50).toFixed(2), prenda: 'Camiseta UCJC' });
    } else if (a === 'reset') {
      for (const s of ['pedidos', 'usuarios', 'roles', 'sesiones']) await datos.borrarTodo(s);
      await sembrarSiVacio();
      this.render();
    }
  }

  _badge(estado) {
    const k = String(estado).toLowerCase().replace(/\s+/g, '-');
    const cls = ['pagado', 'preparando', 'en-reparto', 'entregado'].includes(k) ? `e-${k}` : 'e-otro';
    return `<span class="estado ${cls}">${esc(estado)}</span>`;
  }

  _filasPedidos(pedidos, usuarios) {
    if (!pedidos.length) return `<tr><td colspan="7" class="vacio">Sin pedidos todavía.</td></tr>`;
    const nombre = (id) => usuarios.find((u) => u.id === id)?.nombre ?? '—';
    return pedidos.map((p) => `
      <tr>
        <td><b>${esc(p.id)}</b></td>
        <td>${esc(p.prenda)}</td>
        <td>${this._badge(p.estado)}</td>
        <td>${esc(nombre(p.userId))}</td>
        <td>${esc(p.fecha)}</td>
        <td class="num">${p.descuentoEmpleado ? esc(p.descuentoEmpleado) + ' %' : '—'}</td>
        <td class="num">${eur(p.total)}</td>
      </tr>`).join('');
  }

  _vistaPedido(pedidos) {
    const id = this.getAttribute('pedido-id');
    const lista = id ? pedidos.filter((p) => p.id === `#${id}` || p.id === id) : pedidos;
    return `
      <header><div><h2>Mis pedidos</h2><div class="sub">Detalle y estado</div></div></header>
      <div class="card"><table>
        <thead><tr><th>ID</th><th>Prenda</th><th>Estado</th><th>Fecha</th><th class="num">Total</th></tr></thead>
        <tbody>${lista.map((p) => `<tr><td><b>${esc(p.id)}</b></td><td>${esc(p.prenda)}</td><td>${this._badge(p.estado)}</td><td>${esc(p.fecha)}</td><td class="num">${eur(p.total)}</td></tr>`).join('') || '<tr><td colspan="5" class="vacio">Sin pedidos.</td></tr>'}</tbody>
      </table></div>`;
  }

  _vistaAdmin(pedidos, usuarios, roles, sesiones) {
    const ingresos = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);
    return `
      <header>
        <div><h2>Panel de datos</h2><div class="sub">Pieza Datos · alternativa2 · IndexedDB</div></div>
        <span class="badge">ADMIN</span>
      </header>
      <section class="kpis">
        <div class="kpi"><span>Pedidos</span><b>${pedidos.length}</b></div>
        <div class="kpi"><span>Ingresos</span><b>${eur(ingresos)}</b></div>
        <div class="kpi"><span>Usuarios</span><b>${usuarios.length}</b></div>
        <div class="kpi"><span>Sesiones</span><b>${sesiones.length}</b></div>
      </section>
      <div class="card">
        <h3>Pedidos guardados</h3>
        <table>
          <thead><tr><th>ID</th><th>Prenda</th><th>Estado</th><th>Usuario</th><th>Fecha</th><th class="num">Desc. empleado</th><th class="num">Total</th></tr></thead>
          <tbody>${this._filasPedidos(pedidos, usuarios)}</tbody>
        </table>
      </div>
      <div class="grid2">
        <div class="card">
          <h3>Usuarios (recibidos de Identidad)</h3>
          <table><thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th></tr></thead>
          <tbody>${usuarios.map((u) => `<tr><td>${esc(u.id)}</td><td>${esc(u.nombre)}</td><td>${esc(u.email)}</td><td><span class="rol">${esc(u.rol)}</span></td></tr>`).join('') || '<tr><td colspan="4" class="vacio">Sin usuarios.</td></tr>'}</tbody></table>
        </div>
        <div class="card">
          <h3>Roles y permisos</h3>
          <table><thead><tr><th>Rol</th><th>Permisos</th></tr></thead>
          <tbody>${roles.map((r) => `<tr><td><span class="rol">${esc(r.nombre)}</span></td><td>${esc((r.permisos || []).join(', '))}</td></tr>`).join('') || '<tr><td colspan="2" class="vacio">Sin roles.</td></tr>'}</tbody></table>
        </div>
      </div>
      <div class="card">
        <h3>Sesiones guardadas</h3>
        <table><thead><tr><th>#</th><th>Inicio</th><th>Modo</th></tr></thead>
        <tbody>${sesiones.slice(-8).reverse().map((s) => `<tr><td>${s.id}</td><td>${esc(new Date(s.inicio).toLocaleString('es-ES'))}</td><td>${esc(s.modo)}</td></tr>`).join('')}</tbody></table>
      </div>
      <div class="acciones">
        <button data-accion="demo">Simular evento de Compra</button>
        <button class="sec" data-accion="reset">Restaurar datos de ejemplo</button>
      </div>`;
  }
}

if (!customElements.get('ucjc-pedidos')) customElements.define('ucjc-pedidos', UcjcDatos);

export default { nombre: 'datos', version: '0.2.0' };
