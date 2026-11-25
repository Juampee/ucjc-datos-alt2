/**
 * <ucjc-pedidos> — Pieza DATOS (alternativa2) · DFE (76042) · Tienda UCJC
 *
 * Custom element en Vanilla JS, sin dependencias ni build.
 * Persistencia: IndexedDB (base "ucjc-datos-alt2").
 *
 * Atributos:
 *   (sin modo) o modo="admin" -> panel completo (KPIs, campañas, pedidos, usuarios, roles, sesiones). Es lo que sale en la tienda.
 *   modo="pedido"  -> «Mis pedidos» del usuario con sesión (o un pedido con pedido-id="123")
 *
 * Eventos que CONSUME (canon @1 del PR de contratos):
 *   ucjc:compra:pedido-confirmado@1   { pedidoId, usuarioId, creadoEn, total, lineas[], moneda? }
 *   ucjc:identidad:sesion-cambiada@1  { autenticado, usuario|null, momento? }
 *   ucjc:descubrimiento:campana-cambiada@1 { activa, codigo, etiqueta, momento }  (propuesto, opcional)
 *
 * Campaña de cada pedido: si Descubrimiento ha anunciado una campaña activa, se usa esa;
 * si no, se deduce de la fecha del pedido (Black Friday, San Valentín, Navidad…); si no cae en ninguna, «Normal».
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
    { id: '#124', userId: 'u2', prenda: 'Sudadera UCJC', estado: 'pagado', moneda: 'USD', total: 39.5, fecha: '2026-10-14', descuentoEmpleado: 10 },
    { id: '#125', userId: 'u1', prenda: 'Gorra UCJC', estado: 'entregado', total: 12, fecha: '2026-10-20', descuentoEmpleado: 0 },
    { id: '#126', userId: 'u3', prenda: 'Mochila UCJC', estado: 'preparando', moneda: 'GBP', total: 34, fecha: '2026-10-28', descuentoEmpleado: 15 },
    { id: '#127', userId: 'u1', prenda: 'Sudadera con capucha', estado: 'pagado', total: 19.98, fecha: '2026-11-27', descuentoEmpleado: 0, campana: { codigo: 'black-friday-2026', etiqueta: 'Black Friday' } },
    { id: '#128', userId: 'u3', prenda: 'Taza de graduación', estado: 'entregado', total: 9.95, fecha: '2026-02-14', descuentoEmpleado: 0 },
    { id: '#129', userId: 'u2', prenda: 'Bufanda de punto', estado: 'entregado', moneda: 'USD', total: 16, fecha: '2025-12-20', descuentoEmpleado: 10 },
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

const MONEDAS = ['EUR', 'USD', 'GBP'];
/** Moneda ISO 4217 permitida; si no viene o no se reconoce, se entiende EUR (contrato: campo opcional). */
export const normalizarMoneda = (m) => {
  const c = String(m ?? '').trim().toUpperCase();
  return MONEDAS.includes(c) ? c : 'EUR';
};
const dinero = (n, moneda) =>
  Number(n || 0).toLocaleString('es-ES', { style: 'currency', currency: normalizarMoneda(moneda) });
/** Suma por moneda (no se mezclan monedas distintas): una línea por moneda. */
const ingresosPorMoneda = (pedidos) => {
  const t = {};
  pedidos.forEach((p) => { const m = normalizarMoneda(p.moneda); t[m] = (t[m] || 0) + Number(p.total || 0); });
  const claves = Object.keys(t);
  return claves.length ? claves.map((m) => dinero(t[m], m)).join('<br>') : dinero(0, 'EUR');
};
/* -------------------------------- Campañas -------------------------------- */

/** Black Friday = viernes siguiente al 4.º jueves de noviembre, hasta el Cyber Monday (4 días). */
function rangoBlackFriday(anio) {
  const d = new Date(Date.UTC(anio, 10, 1));
  const primerJueves = 1 + ((4 - d.getUTCDay() + 7) % 7);
  const viernes = primerJueves + 21 + 1;
  const ini = Date.UTC(anio, 10, viernes);
  return [ini, ini + 3 * 86400000];
}

export const CAMPANAS = {
  'black-friday': { etiqueta: 'Black Friday', clase: 'c-bf' },
  'san-valentin': { etiqueta: 'San Valentín', clase: 'c-sv' },
  navidad: { etiqueta: 'Navidad', clase: 'c-nav' },
  rebajas: { etiqueta: 'Rebajas de enero', clase: 'c-reb' },
  'vuelta-campus': { etiqueta: 'Vuelta al campus', clase: 'c-vc' },
  normal: { etiqueta: 'Normal', clase: 'c-normal' },
};

/** Deduce la campaña a partir de la fecha del pedido (YYYY-MM-DD o ISO). */
export function campanaDeFecha(fecha) {
  const t = Date.parse(String(fecha || '').slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(t)) return { codigo: 'normal', etiqueta: 'Normal' };
  const f = new Date(t);
  const anio = f.getUTCFullYear(); const mes = f.getUTCMonth() + 1; const dia = f.getUTCDate();
  const [bi, bf] = rangoBlackFriday(anio);
  const c = (id) => ({ codigo: id === 'normal' ? 'normal' : `${id}-${anio}`, etiqueta: CAMPANAS[id].etiqueta });
  if (t >= bi && t <= bf) return c('black-friday');
  if (mes === 2 && dia >= 7 && dia <= 14) return c('san-valentin');
  if ((mes === 12 && dia >= 1) || (mes === 1 && dia <= 6)) return c('navidad');
  if (mes === 1) return c('rebajas');
  if (mes === 9) return c('vuelta-campus');
  return c('normal');
}

/** Campaña guardada en el pedido o, si no la tiene (pedidos antiguos), la que corresponde a su fecha. */
export const campanaDe = (p) => (p && p.campana && p.campana.etiqueta ? p.campana : campanaDeFecha(p && p.fecha));

const claseCampana = (c) => {
  const id = Object.keys(CAMPANAS).find((k) => String(c.codigo || '').startsWith(k));
  return (CAMPANAS[id] || CAMPANAS.normal).clase;
};

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
  td { white-space:nowrap; } td:nth-child(2) { white-space:normal; }
  .campana { display:inline-block; padding:3px 10px; border-radius:999px; font-size:.75rem; font-weight:600; white-space:nowrap; }
  .c-bf { background:#111; color:#fff; }
  .c-sv { background:#fde2e8; color:#9f1239; }
  .c-nav { background:#dcfce7; color:#14532d; }
  .c-reb { background:#ffedd5; color:#9a3412; }
  .c-vc { background:#e0f2fe; color:#075985; }
  .c-normal { background:#e5e7eb; color:#374151; }
  .camp-activa { display:inline-flex; align-items:center; gap:6px; margin-top:6px; font-size:.8rem; color:#6b7585; }
  .reparto { display:flex; flex-wrap:wrap; gap:8px; }
  .reparto span { display:inline-flex; gap:6px; align-items:center; }
`;

class UcjcDatos extends HTMLElement {
  static get observedAttributes() { return ['modo', 'pedido-id']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._usuarioId = null;
    this._onPedido = (e) => this._recibirPedido(e.detail);
    this._onSesion = (e) => this._recibirSesion(e.detail);
    this._campana = null; // campaña activa anunciada por Descubrimiento (campana-cambiada@1)
    this._onCampana = (e) => this._recibirCampana(e.detail);
  }

  connectedCallback() {
    window.addEventListener('ucjc:compra:pedido-confirmado@1', this._onPedido);
    window.addEventListener('ucjc:identidad:sesion-cambiada@1', this._onSesion);
    window.addEventListener('ucjc:descubrimiento:campana-cambiada@1', this._onCampana);
    this._iniciar();
  }

  disconnectedCallback() {
    window.removeEventListener('ucjc:compra:pedido-confirmado@1', this._onPedido);
    window.removeEventListener('ucjc:identidad:sesion-cambiada@1', this._onSesion);
    window.removeEventListener('ucjc:descubrimiento:campana-cambiada@1', this._onCampana);
  }

  /** Descubrimiento → Datos: campana-cambiada@1 (propuesto). Solo marca los pedidos que lleguen mientras esté activa. */
  _recibirCampana(d = {}) {
    this._campana = d.activa && d.etiqueta ? { codigo: String(d.codigo || ''), etiqueta: String(d.etiqueta) } : null;
    this.render();
  }

  attributeChangedCallback() { if (this.isConnected) this.render(); }

  async _iniciar() {
    await sembrarSiVacio();
    await datos.guardar('sesiones', { inicio: new Date().toISOString(), modo: this.getAttribute('modo') || 'admin' });
    this.render();
  }

  /** Compra → Datos: pedido-confirmado@1 */
  async _recibirPedido(d = {}) {
    if (!d.pedidoId) return;
    const primera = Array.isArray(d.lineas) && d.lineas[0] ? d.lineas[0].nombre : '—';
    const fecha = (d.creadoEn || new Date().toISOString()).slice(0, 10);
    await datos.guardarPedido({
      estado: 'pagado',
      fecha,
      campana: this._campana || campanaDeFecha(fecha),
      id: d.pedidoId,
      total: d.total ?? 0,
      moneda: normalizarMoneda(d.moneda),
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
    const modo = this.getAttribute('modo') || 'admin';
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

  _chipCampana(p) {
    const c = campanaDe(p);
    return `<span class="campana ${claseCampana(c)}">${esc(c.etiqueta)}</span>`;
  }

  _avisoCampana() {
    return this._campana
      ? `<div class="camp-activa">Campaña activa: <span class="campana ${claseCampana(this._campana)}">${esc(this._campana.etiqueta)}</span></div>`
      : '';
  }

  _filasPedidos(pedidos, usuarios) {
    if (!pedidos.length) return `<tr><td colspan="9" class="vacio">Sin pedidos todavía.</td></tr>`;
    const nombre = (id) => usuarios.find((u) => u.id === id)?.nombre ?? '—';
    return pedidos.map((p) => `
      <tr>
        <td><b>${esc(p.id)}</b></td>
        <td>${esc(p.prenda)}</td>
        <td>${this._badge(p.estado)}</td>
        <td>${esc(nombre(p.userId))}</td>
        <td>${esc(p.fecha)}</td>
        <td>${this._chipCampana(p)}</td>
        <td class="num">${p.descuentoEmpleado ? esc(p.descuentoEmpleado) + ' %' : '—'}</td>
        <td><span class="rol">${esc(normalizarMoneda(p.moneda))}</span></td>
        <td class="num">${dinero(p.total, p.moneda)}</td>
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
      <header><div><h2>Mis pedidos · Datos B</h2><div class="sub">${esc(sub)}</div>${this._avisoCampana()}</div><span class="badge">DATOS B</span></header>
      <div class="card"><table>
        <thead><tr><th>ID</th><th>Prenda</th><th>Estado</th><th>Fecha</th><th>Campaña</th><th>Moneda</th><th class="num">Total</th></tr></thead>
        <tbody>${lista.map((p) => `<tr><td><b>${esc(p.id)}</b></td><td>${esc(p.prenda)}</td><td>${this._badge(p.estado)}</td><td>${esc(p.fecha)}</td><td>${this._chipCampana(p)}</td><td>${esc(normalizarMoneda(p.moneda))}</td><td class="num">${dinero(p.total, p.moneda)}</td></tr>`).join('') || '<tr><td colspan="7" class="vacio">Sin pedidos.</td></tr>'}</tbody>
      </table></div>`;
  }

  _reparto(pedidos) {
    const n = {};
    // Se agrupa por tipo (p. ej. «Black Friday» y «Black Friday UCJC» cuentan juntos).
    pedidos.forEach((p) => {
      const tipo = Object.keys(CAMPANAS).find((k) => String(campanaDe(p).codigo || '').startsWith(k)) || 'normal';
      (n[tipo] ||= { tipo, total: 0 }).total++;
    });
    return Object.values(n).sort((a, b) => b.total - a.total)
      .map(({ tipo, total }) => `<span><span class="campana ${CAMPANAS[tipo].clase}">${esc(CAMPANAS[tipo].etiqueta)}</span><b>${total}</b></span>`).join('') || '<span class="vacio">Sin pedidos.</span>';
  }

  _vistaAdmin(pedidos, usuarios, roles, sesiones) {
    const ingresos = ingresosPorMoneda(pedidos);
    return `
      <header>
        <div><h2>Panel de datos</h2><div class="sub">Pieza Datos · alternativa2 · IndexedDB</div>${this._avisoCampana()}</div>
        <span class="badge">DATOS B · ADMIN</span>
      </header>
      <section class="kpis">
        <div class="kpi"><span>Pedidos</span><b>${pedidos.length}</b></div>
        <div class="kpi"><span>Ingresos</span><b style="font-size:1.05rem;line-height:1.35">${ingresos}</b></div>
        <div class="kpi"><span>Usuarios</span><b>${usuarios.length}</b></div>
        <div class="kpi"><span>Sesiones</span><b>${sesiones.length}</b></div>
      </section>
      <div class="card">
        <h3>Pedidos por campaña</h3>
        <div class="reparto">${this._reparto(pedidos)}</div>
      </div>
      <div class="card">
        <h3>Pedidos guardados</h3>
        <table>
          <thead><tr><th>ID</th><th>Prenda</th><th>Estado</th><th>Usuario</th><th>Fecha</th><th>Campaña</th><th class="num">Desc. empleado</th><th>Moneda</th><th class="num">Total</th></tr></thead>
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

export default { nombre: 'datos', version: '0.4.1' };
