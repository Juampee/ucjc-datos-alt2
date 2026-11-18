# Propuesta de contrato: moneda en los precios y pedidos

**Propone:** Datos B (responsable: Juan Pedro Faba Prados) · **Fecha:** 18/11/2026 · **Estado:** propuesta, pendiente de OK de Compra y Descubrimiento
**Dirigido a:** Compra (emite `pedido-confirmado`), Descubrimiento (precios del catálogo), Datos A, Identidad (solo informativo).

## Qué pedimos

Que la tienda pueda vender en **más de una moneda**. Hoy `total` y `precio` son números sin unidad y todos asumimos euros. Pedimos añadir un campo **opcional** `moneda` y acordar su significado.

## Regla común (vale para todos los eventos que lleven importes)

- `moneda` es un texto con el código ISO 4217 en mayúsculas.
- Valores admitidos en esta versión: `EUR`, `USD`, `GBP`.
- **Opcional**: si no viene, se entiende `EUR`. Así nadie se rompe y no hace falta subir a `@2`.
- **No hay conversión entre monedas.** Todos los importes de un mismo evento están en la misma moneda.
- Los importes siguen siendo números con dos decimales como máximo (p. ej. `19.99`).

## Cambios por evento

### `ucjc:compra:pedido-confirmado@1` — emite Compra

| Campo | Tipo | Obligatorio / opcional | Cambio |
| --- | --- | --- | --- |
| `pedidoId` | texto | obligatorio | sin cambios |
| `usuarioId` | texto | obligatorio | sin cambios |
| `creadoEn` | texto ISO 8601 | obligatorio | sin cambios |
| `total` | número | obligatorio | **ahora en la moneda de `moneda`** (antes «euros») |
| `lineas[]` | lista | obligatorio | `precio` también en esa moneda |
| `moneda` | texto (`EUR`/`USD`/`GBP`) | **opcional** | **nuevo** |

Ejemplo:

```json
{
  "pedidoId": "p-1042", "usuarioId": "u-7", "creadoEn": "2026-11-18T10:15:00Z",
  "moneda": "USD", "total": 59.98,
  "lineas": [{ "productoId": "prod-101", "nombre": "Camiseta UCJC", "precio": 29.99, "cantidad": 2 }]
}
```

### `ucjc:descubrimiento:anadir-al-carrito@1` — emite Descubrimiento

Si el evento lleva el precio del producto, se añade `moneda` (opcional, misma regla) para que Compra sepa en qué moneda está el carrito. Un carrito no mezcla monedas: Compra decide qué hacer si llegan productos en monedas distintas (por ejemplo, rechazar el segundo).

## Qué hace cada pieza

| Pieza | Qué hace |
| --- | --- |
| Compra | Rellena `moneda` en `pedido-confirmado` y calcula `total` en esa moneda. |
| Descubrimiento | Muestra el precio con su moneda y la incluye en `anadir-al-carrito` si aplica. |
| Datos A y B | Guardan `moneda` junto al pedido; si falta, `EUR`. No convierten ni suman monedas distintas. Datos B ya lo hace (release v0.3.0). |
| Identidad | Sin cambios. |

## Por qué es un cambio menor

El campo es opcional y con valor por defecto, así que los emisores y consumidores actuales siguen funcionando sin tocar nada. Si el grupo prefiere un número de contrato nuevo, se publicaría como `@2`, pero no lo creemos necesario.

## Qué necesitamos de vosotros

1. Compra: confirmar que emitirá `moneda` (o que seguirá sin ella y todo es `EUR`).
2. Descubrimiento: confirmar si los precios del catálogo tendrán moneda.
3. Todos: OK en la clase o comentario en el PR del repositorio de contratos.
