import { describe, expect, it } from 'vitest';
import mod, { datos } from './ucjc-datos.js';

describe('ucjc-pedidos (Datos B)', () => {
  it('exporta metadatos y API datos', () => {
    expect(mod).toEqual({ nombre: 'datos', version: '0.2.0' });
    expect(typeof datos.guardarPedido).toBe('function');
    expect(customElements.get('ucjc-pedidos')).toBeTruthy();
    expect(customElements.get('ucjc-datos')).toBeFalsy();
  });
});
