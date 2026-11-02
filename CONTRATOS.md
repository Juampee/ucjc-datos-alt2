# Contratos de eventos — pieza Datos (alternativa2)

Formato: `ucjc:<pieza>:<verbo>@1`. El nombre lo pone el emisor; los campos se negocian entre ambos equipos.
**Estado: propuesta inicial (borrador, a negociar mediante PR en el repo central).**

Los eventos se emiten con `window.dispatchEvent(new CustomEvent(nombre, { detail }))`.

| Evento | Emite | Consume | Campos (nombre: tipo, obl./opc.) |
|--------|-------|---------|----------------------------------|
| `ucjc:datos:usuarios-solicitados@1` | Datos | Identidad | `campos: string[]` obl. (campos de usuario que necesitamos: id, nombre, email, rol) |
| `ucjc:identidad:usuarios-listados@1` | Identidad | Datos | `usuarios: {id: string, nombre: string, email: string, rol: string}[]` obl.; `roles: {nombre: string, permisos: string[]}[]` obl. |
| `ucjc:compra:pedido-creado@1` | Compra | Datos | `pedidoId: string` obl.; `total: number` obl.; `userId: string` opc.; `prenda: string` opc. |
| `ucjc:datos:pedido-guardado@1` | Datos | (cualquiera) | `pedidoId: string` obl. |

## Conflictos abiertos

_Ninguno todavía. Abrir un issue por cada desacuerdo con otra pieza._
