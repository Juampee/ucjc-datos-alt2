# Contratos de eventos — pieza Datos B (ucjc-datos-alt2)

Los contratos oficiales están firmados en https://github.com/cesar-andress/tienda-ucjc-contratos (carpeta eventos/, tag v0.2.0). Este fichero solo resume los que consume Datos B. Si hay diferencia, manda el repositorio de contratos.

Formato del nombre: `ucjc:<pieza>:<verbo>@1`. Los eventos viajan con `window.dispatchEvent(new CustomEvent(nombre, { detail }))`.

## Eventos que escucha Datos B (custom element `ucjc-pedidos`)

| Evento | Emite | Consume | Contrato firmado |
| --- | --- | --- | --- |
| `ucjc:compra:pedido-confirmado@1` | Compra | Datos A y Datos B | ucjc-compra-pedido-confirmado@1.md |
| `ucjc:identidad:sesion-cambiada@1` | Identidad | Compra, Datos A y Datos B | ucjc-identidad-sesion-cambiada@1.md |

Datos B no emite ningún evento.

## `ucjc:compra:pedido-confirmado@1` — campos de `detail`

| Campo | Tipo | Obligatorio / opcional |
| --- | --- | --- |
| `pedidoId` | texto | obligatorio (lo genera Compra) |
| `usuarioId` | texto | obligatorio |
| `creadoEn` | texto ISO 8601 | obligatorio |
| `total` | número (euros) | obligatorio |
| `lineas` | lista | obligatorio |

Cada elemento de `lineas[]`: `productoId` (texto), `nombre` (texto), `precio` (número) y `cantidad` (número), todos obligatorios.

Qué hace Datos B: guarda el pedido en IndexedDB con estado "pagado" y lo muestra en "Mis pedidos" si `usuarioId` coincide con el usuario de la sesión.

## `ucjc:identidad:sesion-cambiada@1` — campos de `detail`

| Campo | Tipo | Obligatorio / opcional |
| --- | --- | --- |
| `autenticado` | booleano | obligatorio |
| `usuario` | objeto o `null` | obligatorio (`null` si `autenticado` es `false`) |
| `momento` | texto ISO 8601 | opcional |

Campos de `usuario` (cuando no es `null`): `id` (texto, obligatorio), `email` (texto, obligatorio) y `nombre` (texto, opcional).

Qué hace Datos B: filtra "Mis pedidos" por `usuario.id` y vacía la lista cuando `autenticado` es `false`.

## Eventos descartados (no forman parte de @1)

Estos nombres de nuestro borrador antiguo ya no se usan: `ucjc:compra:pedido-creado@1` (sustituido por `pedido-confirmado@1`), `ucjc:identidad:usuarios-listados@1`, `ucjc:datos:usuarios-solicitados@1` y `ucjc:datos:pedido-guardado@1`. Roles y permisos no viajan por el bus: son de Identidad.

## Campo `moneda` en `pedido-confirmado@1` (propuesta, pendiente de firma)

Datos B ya lo soporta desde la release v0.3.0: guarda `moneda`, la muestra en una columna y suma los ingresos por moneda. Si el campo no viene, se entiende `EUR`. Texto completo de la petición al resto de grupos: [CONTRATO-MONEDA.md](CONTRATO-MONEDA.md).

## Campaña de cada pedido (desde v0.4.0)

Datos B muestra en qué campaña se hizo cada pedido (Black Friday, San Valentín, Navidad, Rebajas de enero, Vuelta al campus o Normal):

1. Si Descubrimiento ha emitido `ucjc:descubrimiento:campana-cambiada@1` con `activa: true`, los pedidos que lleguen mientras dure se guardan con esa campaña (`codigo` + `etiqueta`). Este contrato sigue **propuesto**: Datos B solo lo escucha, no exige nada nuevo a nadie.
2. Si no, se deduce de `creadoEn` con el calendario: Black Friday (viernes tras el 4.º jueves de noviembre → Cyber Monday), San Valentín (7–14 feb), Navidad (1 dic–6 ene), Rebajas de enero (7–31 ene), Vuelta al campus (septiembre).
3. Fuera de esas fechas: **Normal**.

No se añade ningún campo a `pedido-confirmado@1`.

## Estado

Firmado el 2026-11-04 (OK oral y release v0.2.0 que escucha ambos eventos). Responsable de Datos B: Juan Pedro Faba Prados.
