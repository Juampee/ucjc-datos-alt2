import { describe, expect, it } from 'vitest';
import mod, { datos, normalizarMoneda, campanaDeFecha, campanaDe } from './ucjc-datos.js';

describe('ucjc-pedidos (Datos B)', () => {
  it('exporta metadatos y API datos', () => {
    expect(mod).toEqual({ nombre: 'datos', version: '0.4.0' });
    expect(typeof datos.guardarPedido).toBe('function');
    expect(customElements.get('ucjc-pedidos')).toBeTruthy();
    expect(customElements.get('ucjc-datos')).toBeFalsy();
  });

  it('moneda: EUR, USD y GBP; si falta o no se reconoce, EUR', () => {
    expect(normalizarMoneda('usd')).toBe('USD');
    expect(normalizarMoneda('GBP')).toBe('GBP');
    expect(normalizarMoneda(undefined)).toBe('EUR');
    expect(normalizarMoneda('XXX')).toBe('EUR');
  });

  it('campaña según la fecha del pedido', () => {
    expect(campanaDeFecha('2026-11-27')).toEqual({ codigo: 'black-friday-2026', etiqueta: 'Black Friday' });
    expect(campanaDeFecha('2026-11-30').etiqueta).toBe('Black Friday');
    expect(campanaDeFecha('2026-11-26').etiqueta).toBe('Normal');
    expect(campanaDeFecha('2025-11-28').etiqueta).toBe('Black Friday');
    expect(campanaDeFecha('2026-02-14').etiqueta).toBe('San Valentín');
    expect(campanaDeFecha('2026-12-20').etiqueta).toBe('Navidad');
    expect(campanaDeFecha('2027-01-03').etiqueta).toBe('Navidad');
    expect(campanaDeFecha('2027-01-15').etiqueta).toBe('Rebajas de enero');
    expect(campanaDeFecha('2026-09-10').etiqueta).toBe('Vuelta al campus');
    expect(campanaDeFecha('2026-10-12')).toEqual({ codigo: 'normal', etiqueta: 'Normal' });
    expect(campanaDeFecha(undefined).etiqueta).toBe('Normal');
  });

  it('la campaña guardada en el pedido manda sobre la fecha', () => {
    expect(campanaDe({ fecha: '2026-10-12', campana: { codigo: 'black-friday-2026', etiqueta: 'Black Friday' } }).etiqueta).toBe('Black Friday');
    expect(campanaDe({ fecha: '2026-02-10' }).etiqueta).toBe('San Valentín');
  });
});
