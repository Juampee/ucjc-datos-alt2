import { describe, expect, it } from 'vitest';
import mod, { datos, normalizarMoneda } from './ucjc-datos.js';

describe('ucjc-pedidos (Datos B)', () => {
  it('exporta metadatos y API datos', () => {
    expect(mod).toEqual({ nombre: 'datos', version: '0.3.0' });
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
});
