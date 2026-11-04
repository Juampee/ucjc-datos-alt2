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
 * Eventos que CONSUME (canon @1 del PR de contratos):
 *   ucjc:compra:pedido-confirmado@1   { pedidoId, usuarioId, creadoEn, total, lineas[] }
 *   ucjc:identidad:sesion-cambiada@1  { autenticado, usuario|null, momento? }
 *
 * Nota: la vista admin sigue usando IndexedDB local; ya no depende de
 * listados masivos de usuarios por el bus.
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
    this._usuarioId = null;
    this._onPedido = (e) => this._recibirPedido(e.detail);
    this._onSesion = (e) => this._recibirSesion(e.detail);
  }

  connectedCallback() {
    window.addEventListener('ucjc:compra:pedido-confirmado@1', this._onPedido);
    window.addEventListener('ucjc:identidad:sesion-cambiada@1', this._onSesion);
    this._iniciar();
  }

  disconnectedCallback() {
    window.removeEventListener('ucjc:compra:pedido-confirmado@1', this._onPedido);
    window.removeEventListener('ucjc:identidad:sesion-cambiada@1', this._onSesion);
  }

  attributeChangedCallback() { if (this.isConnected) this.render(); }

  async _iniciar() {
    await sembrarSiVacio();
    await datos.guardar('sesiones', { inicio: new Date().toISOString(), modo: this.getAttribute('modo') || 'pedido' });
    this.render();
  }

  /** Compra → Datos: pedido-confirmado@1 */
  async _recibirPedido(d = {}) {
    if (!d.pedidoId) return;
    const primera = Array.isArray(d.lineas) && d.lineas[0] ? d.lineas[0].nombre : '—';
    await datos.guardarPedido({
      estado: 'pagado',
      fecha: (d.creadoEn || new Date().toISOString()).slice(0, 10),
      id: d.pedidoId,
      total: d.total ?? 0,
      userId: d.usuarioId ?? this._usuarioId ?? null,
      prenda: primera,
      lineas: d.lineas || [],
    });
    this.render();
  }

  /** Identidad → Datos: sesion-cambiada@1 (filtra «Mis pedidos») */
  async _recibirSesion(d = {}) {
    if (!d.autenticado) {
      this._usuarioId = null;
      this.render();
      return;
    }
    this._usuarioId = d.usuario?.id ?? null;
    if (d.usuario?.id) {
      await datos.guardar('usuarios', {
        id: d.usuario.id,
        nombre: d.usuario.nombre || d.usuario.id,
        email: d.usuario.email || '',
        rol: 'cliente',
      });
    }
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
      await this._recibirPedido({
        pedidoId: `PED-${n}`,
        usuarioId: this._usuarioId || 'u-demo',
        creadoEn: new Date().toISOString(),
        total: +(10 + Math.random() * 50).toFixed(2),
        lineas: [{ productoId: 'prod-101', nombre: 'Camiseta UCJC', precio: 19.99, cantidad: 1 }],
      });
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
    let lista = id ? pedidos.filter((p) => p.id === `#${id}` || p.id === id) : pedidos;
    if (!id && this._usuarioId) {
      lista = lista.filter((p) => p.userId === this._usuarioId);
    } else if (!id && !this._usuarioId) {
      lista = [];
    }
    const sub = this._usuarioId
      ? `Filtrado por ${this._usuarioId}`
      : 'Sin sesión — inicia sesión para ver tus pedidos';
    return `
      <header><div><h2>Mis pedidos</h2><div class="sub">${esc(sub)}</div></div></header>
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
