function e() {
	return new Promise((e, t) => {
		let n = indexedDB.open("ucjc-datos-alt2", 1);
		n.onupgradeneeded = () => {
			let e = n.result;
			e.objectStoreNames.contains("pedidos") || e.createObjectStore("pedidos", { keyPath: "id" }).createIndex("userId", "userId"), e.objectStoreNames.contains("usuarios") || e.createObjectStore("usuarios", { keyPath: "id" }), e.objectStoreNames.contains("roles") || e.createObjectStore("roles", { keyPath: "nombre" }), e.objectStoreNames.contains("sesiones") || e.createObjectStore("sesiones", {
				keyPath: "id",
				autoIncrement: !0
			});
		}, n.onsuccess = () => e(n.result), n.onerror = () => t(n.error);
	});
}
async function t(t, n, r) {
	let i = await e();
	return new Promise((e, a) => {
		let o = i.transaction(t, n), s = r(o.objectStore(t));
		o.oncomplete = () => e(s && "result" in s ? s.result : void 0), o.onerror = () => a(o.error);
	});
}
var n = {
	todos: (e) => t(e, "readonly", (e) => e.getAll()),
	guardar: (e, n) => t(e, "readwrite", (e) => e.put(n)),
	borrarTodo: (e) => t(e, "readwrite", (e) => e.clear()),
	async pedidosGuardados(e) {
		let t = await this.todos("pedidos");
		return e == null ? t : t.filter((t) => t.userId === e);
	},
	sesionesGuardadas: () => n.todos("sesiones"),
	async guardarPedido(e) {
		let t = {
			descuentoEmpleado: 0,
			...e
		};
		return await this.guardar("pedidos", t), t;
	}
};
async function r() {
	if (!(await n.todos("pedidos")).length) {
		for (let e of [
			{
				id: "#123",
				userId: "u1",
				prenda: "Camiseta UCJC",
				estado: "en reparto",
				total: 19.9,
				fecha: "2026-10-12",
				descuentoEmpleado: 0
			},
			{
				id: "#124",
				userId: "u2",
				prenda: "Sudadera UCJC",
				estado: "pagado",
				total: 39.5,
				fecha: "2026-10-14",
				descuentoEmpleado: 10
			},
			{
				id: "#125",
				userId: "u1",
				prenda: "Gorra UCJC",
				estado: "entregado",
				total: 12,
				fecha: "2026-10-20",
				descuentoEmpleado: 0
			},
			{
				id: "#126",
				userId: "u3",
				prenda: "Mochila UCJC",
				estado: "preparando",
				total: 34,
				fecha: "2026-10-28",
				descuentoEmpleado: 15
			}
		]) await n.guardar("pedidos", e);
		await n.guardar("usuarios", {
			id: "u1",
			nombre: "Ana Ruiz",
			email: "ana@ucjc.edu",
			rol: "cliente"
		}), await n.guardar("usuarios", {
			id: "u2",
			nombre: "Luis Pérez",
			email: "luis@ucjc.edu",
			rol: "empleado"
		}), await n.guardar("usuarios", {
			id: "u3",
			nombre: "Marta Gil",
			email: "marta@ucjc.edu",
			rol: "cliente"
		}), await n.guardar("roles", {
			nombre: "cliente",
			permisos: ["ver-pedidos-propios"]
		}), await n.guardar("roles", {
			nombre: "empleado",
			permisos: ["ver-pedidos-propios", "descuento"]
		}), await n.guardar("roles", {
			nombre: "admin",
			permisos: ["*"]
		});
	}
}
var i = (e) => Number(e).toLocaleString("es-ES", {
	style: "currency",
	currency: "EUR"
}), a = (e) => String(e ?? "").replace(/[&<>"']/g, (e) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
})[e]), o = "\n  :host { display:block; font-family: system-ui, -apple-system, \"Segoe UI\", sans-serif; color:#1b2330; }\n  * { box-sizing: border-box; }\n  .wrap { background:#f4f6fb; border-radius:16px; padding:24px; }\n  header { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:20px; }\n  h2 { margin:0; font-size:1.35rem; }\n  .sub { color:#6b7585; font-size:.85rem; margin-top:2px; }\n  .badge { background:#1f3a8a; color:#fff; border-radius:999px; padding:4px 12px; font-size:.75rem; letter-spacing:.04em; }\n  .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:20px; }\n  .kpi { background:#fff; border-radius:12px; padding:14px 16px; box-shadow:0 1px 3px rgba(20,30,60,.08); }\n  .kpi b { display:block; font-size:1.5rem; margin-top:4px; }\n  .kpi span { color:#6b7585; font-size:.78rem; text-transform:uppercase; letter-spacing:.05em; }\n  .card { background:#fff; border-radius:12px; padding:16px; margin-bottom:16px; box-shadow:0 1px 3px rgba(20,30,60,.08); overflow-x:auto; }\n  .card h3 { margin:0 0 12px; font-size:1rem; }\n  table { width:100%; border-collapse:collapse; font-size:.9rem; }\n  th { text-align:left; color:#6b7585; font-weight:600; font-size:.75rem; text-transform:uppercase; letter-spacing:.05em; padding:8px 10px; border-bottom:2px solid #e6eaf2; }\n  td { padding:10px; border-bottom:1px solid #eef1f6; }\n  tr:last-child td { border-bottom:none; }\n  tbody tr:hover { background:#f8faff; }\n  .estado { display:inline-block; padding:3px 10px; border-radius:999px; font-size:.75rem; font-weight:600; }\n  .e-pagado { background:#dbeafe; color:#1e40af; }\n  .e-preparando { background:#fef3c7; color:#92400e; }\n  .e-en-reparto { background:#ede9fe; color:#5b21b6; }\n  .e-entregado { background:#dcfce7; color:#166534; }\n  .e-otro { background:#e5e7eb; color:#374151; }\n  .num { text-align:right; font-variant-numeric:tabular-nums; }\n  .vacio { color:#8a93a3; padding:12px 4px; }\n  .acciones { display:flex; gap:8px; flex-wrap:wrap; }\n  button { font:inherit; font-size:.85rem; border:0; border-radius:8px; padding:8px 14px; cursor:pointer; background:#1f3a8a; color:#fff; }\n  button.sec { background:#e6eaf2; color:#1b2330; }\n  button:hover { filter:brightness(1.1); }\n  .grid2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:16px; }\n  .rol { display:inline-block; background:#eef2ff; color:#3730a3; border-radius:6px; padding:2px 8px; font-size:.75rem; }\n", s = class extends HTMLElement {
	static get observedAttributes() {
		return ["modo", "pedido-id"];
	}
	constructor() {
		super(), this.attachShadow({ mode: "open" }), this._usuarioId = null, this._onPedido = (e) => this._recibirPedido(e.detail), this._onSesion = (e) => this._recibirSesion(e.detail);
	}
	connectedCallback() {
		window.addEventListener("ucjc:compra:pedido-confirmado@1", this._onPedido), window.addEventListener("ucjc:identidad:sesion-cambiada@1", this._onSesion), this._iniciar();
	}
	disconnectedCallback() {
		window.removeEventListener("ucjc:compra:pedido-confirmado@1", this._onPedido), window.removeEventListener("ucjc:identidad:sesion-cambiada@1", this._onSesion);
	}
	attributeChangedCallback() {
		this.isConnected && this.render();
	}
	async _iniciar() {
		await r(), await n.guardar("sesiones", {
			inicio: (/* @__PURE__ */ new Date()).toISOString(),
			modo: this.getAttribute("modo") || "pedido"
		}), this.render();
	}
	async _recibirPedido(e = {}) {
		if (!e.pedidoId) return;
		let t = Array.isArray(e.lineas) && e.lineas[0] ? e.lineas[0].nombre : "—";
		await n.guardarPedido({
			estado: "pagado",
			fecha: (e.creadoEn || (/* @__PURE__ */ new Date()).toISOString()).slice(0, 10),
			id: e.pedidoId,
			total: e.total ?? 0,
			userId: e.usuarioId ?? this._usuarioId ?? null,
			prenda: t,
			lineas: e.lineas || []
		}), this.render();
	}
	async _recibirSesion(e = {}) {
		e.autenticado ? (this._usuarioId = e.usuario?.id ?? null, e.usuario?.id && await n.guardar("usuarios", {
			id: e.usuario.id,
			nombre: e.usuario.nombre || e.usuario.id,
			email: e.usuario.email || "",
			rol: "cliente"
		}), this.render()) : (this._usuarioId = null, this.render());
	}
	async render() {
		let e = this.getAttribute("modo") || "pedido", [t, r, i, a] = await Promise.all([
			n.todos("pedidos"),
			n.todos("usuarios"),
			n.todos("roles"),
			n.todos("sesiones")
		]), s = e === "admin" ? this._vistaAdmin(t, r, i, a) : this._vistaPedido(t);
		this.shadowRoot.innerHTML = `<style>${o}</style><div class="wrap">${s}</div>`, this.shadowRoot.querySelectorAll("[data-accion]").forEach((e) => e.addEventListener("click", () => this._accion(e.dataset.accion)));
	}
	async _accion(e) {
		if (e === "demo") {
			let e = (await n.todos("pedidos")).length + 123;
			await this._recibirPedido({
				pedidoId: `PED-${e}`,
				usuarioId: this._usuarioId || "u-demo",
				creadoEn: (/* @__PURE__ */ new Date()).toISOString(),
				total: +(10 + Math.random() * 50).toFixed(2),
				lineas: [{
					productoId: "prod-101",
					nombre: "Camiseta UCJC",
					precio: 19.99,
					cantidad: 1
				}]
			});
		} else if (e === "reset") {
			for (let e of [
				"pedidos",
				"usuarios",
				"roles",
				"sesiones"
			]) await n.borrarTodo(e);
			await r(), this.render();
		}
	}
	_badge(e) {
		let t = String(e).toLowerCase().replace(/\s+/g, "-");
		return `<span class="estado ${[
			"pagado",
			"preparando",
			"en-reparto",
			"entregado"
		].includes(t) ? `e-${t}` : "e-otro"}">${a(e)}</span>`;
	}
	_filasPedidos(e, t) {
		if (!e.length) return "<tr><td colspan=\"7\" class=\"vacio\">Sin pedidos todavía.</td></tr>";
		let n = (e) => t.find((t) => t.id === e)?.nombre ?? "—";
		return e.map((e) => `
      <tr>
        <td><b>${a(e.id)}</b></td>
        <td>${a(e.prenda)}</td>
        <td>${this._badge(e.estado)}</td>
        <td>${a(n(e.userId))}</td>
        <td>${a(e.fecha)}</td>
        <td class="num">${e.descuentoEmpleado ? a(e.descuentoEmpleado) + " %" : "—"}</td>
        <td class="num">${i(e.total)}</td>
      </tr>`).join("");
	}
	_vistaPedido(e) {
		let t = this.getAttribute("pedido-id"), n = t ? e.filter((e) => e.id === `#${t}` || e.id === t) : e;
		return !t && this._usuarioId ? n = n.filter((e) => e.userId === this._usuarioId) : !t && !this._usuarioId && (n = []), `
      <header><div><h2>Mis pedidos</h2><div class="sub">${a(this._usuarioId ? `Filtrado por ${this._usuarioId}` : "Sin sesión — inicia sesión para ver tus pedidos")}</div></div></header>
      <div class="card"><table>
        <thead><tr><th>ID</th><th>Prenda</th><th>Estado</th><th>Fecha</th><th class="num">Total</th></tr></thead>
        <tbody>${n.map((e) => `<tr><td><b>${a(e.id)}</b></td><td>${a(e.prenda)}</td><td>${this._badge(e.estado)}</td><td>${a(e.fecha)}</td><td class="num">${i(e.total)}</td></tr>`).join("") || "<tr><td colspan=\"5\" class=\"vacio\">Sin pedidos.</td></tr>"}</tbody>
      </table></div>`;
	}
	_vistaAdmin(e, t, n, r) {
		let o = e.reduce((e, t) => e + Number(t.total || 0), 0);
		return `
      <header>
        <div><h2>Panel de datos</h2><div class="sub">Pieza Datos · alternativa2 · IndexedDB</div></div>
        <span class="badge">ADMIN</span>
      </header>
      <section class="kpis">
        <div class="kpi"><span>Pedidos</span><b>${e.length}</b></div>
        <div class="kpi"><span>Ingresos</span><b>${i(o)}</b></div>
        <div class="kpi"><span>Usuarios</span><b>${t.length}</b></div>
        <div class="kpi"><span>Sesiones</span><b>${r.length}</b></div>
      </section>
      <div class="card">
        <h3>Pedidos guardados</h3>
        <table>
          <thead><tr><th>ID</th><th>Prenda</th><th>Estado</th><th>Usuario</th><th>Fecha</th><th class="num">Desc. empleado</th><th class="num">Total</th></tr></thead>
          <tbody>${this._filasPedidos(e, t)}</tbody>
        </table>
      </div>
      <div class="grid2">
        <div class="card">
          <h3>Usuarios (recibidos de Identidad)</h3>
          <table><thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th></tr></thead>
          <tbody>${t.map((e) => `<tr><td>${a(e.id)}</td><td>${a(e.nombre)}</td><td>${a(e.email)}</td><td><span class="rol">${a(e.rol)}</span></td></tr>`).join("") || "<tr><td colspan=\"4\" class=\"vacio\">Sin usuarios.</td></tr>"}</tbody></table>
        </div>
        <div class="card">
          <h3>Roles y permisos</h3>
          <table><thead><tr><th>Rol</th><th>Permisos</th></tr></thead>
          <tbody>${n.map((e) => `<tr><td><span class="rol">${a(e.nombre)}</span></td><td>${a((e.permisos || []).join(", "))}</td></tr>`).join("") || "<tr><td colspan=\"2\" class=\"vacio\">Sin roles.</td></tr>"}</tbody></table>
        </div>
      </div>
      <div class="card">
        <h3>Sesiones guardadas</h3>
        <table><thead><tr><th>#</th><th>Inicio</th><th>Modo</th></tr></thead>
        <tbody>${r.slice(-8).reverse().map((e) => `<tr><td>${e.id}</td><td>${a(new Date(e.inicio).toLocaleString("es-ES"))}</td><td>${a(e.modo)}</td></tr>`).join("")}</tbody></table>
      </div>
      <div class="acciones">
        <button data-accion="demo">Simular evento de Compra</button>
        <button class="sec" data-accion="reset">Restaurar datos de ejemplo</button>
      </div>`;
	}
};
customElements.get("ucjc-pedidos") || customElements.define("ucjc-pedidos", s);
var c = {
	nombre: "datos",
	version: "0.2.0"
};
export { n as datos, c as default };
