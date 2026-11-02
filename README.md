# Pieza DATOS — alternativa2 · Tienda UCJC (DFE 76042)

Implementación **alternativa2** de la pieza **Datos** (compite en A/B testing con la alternativa1).

## Equipo

| # | Integrante |
|---|------------|
| 1 | Juan Pedro Fabo…  |
| 2 | Pablo bLANCO |
| 3 | Gonzalo Civera |

**Responsable:** Juan Pedro Fabo…

**Custom element:** `<ucjc-datos>`

## Qué POSEE la pieza

1. Número de identificación del pedido.
2. Mostrar detalles de pedido y estado.
3. Recibir el pedido.

## Qué NO posee

| Cosa | Equipo dueño |
|------|--------------|
| Permisos, roles y datos de usuarios | Identidad |
| Stock y prendas (catálogo) | Descubrimiento |
| Devoluciones y pago | Compra |

## Uso

```html
<ucjc-datos modo="admin"></ucjc-datos>      <!-- vista de administración -->
<ucjc-datos modo="pedido" pedido-id="123"></ucjc-datos>
<script type="module" src="https://<url-de-la-release>/src/ucjc-datos.js"></script>
```

Demo local: `python3 -m http.server 8000` y abrir `http://localhost:8000`.

## Datos (IndexedDB `ucjc-datos-alt2`)

- `pedidos`: `id, userId, prenda, estado, total, fecha, descuentoEmpleado`
- `usuarios` y `roles`: recibidos de Identidad (por seguridad, Identidad nos pasa los datos de usuario).
- `sesiones`: sesiones guardadas.

API JS (`import { datos } from './src/ucjc-datos.js'`): `pedidosGuardados(idUser)`, `sesionesGuardadas()`, `guardarPedido(pedido)`.

## Contratos

Ver [CONTRATOS.md](CONTRATOS.md). Formato: `ucjc:<pieza>:<verbo>@1`.

## Seguimiento

Estimaciones y tiempos reales en [TIEMPOS.md](TIEMPOS.md).

## Estructura

```
ucjc-datos-alt2/
├── src/ucjc-datos.js   # custom element <ucjc-datos> (único archivo que cargará el shell)
├── index.html          # demo local de la pieza sola, con datos fijos
├── package.json
├── README.md           # este archivo
├── CONTRATOS.md        # eventos ucjc:<pieza>:<verbo>@1 (propuesta)
└── TIEMPOS.md          # estimaciones y tiempos reales
```

Cuando el shell defina su contrato de carga, solo habrá que adaptar la URL del script de la release (`src/ucjc-datos.js` en el tag correspondiente).
