import { describe, expect, it } from 'vitest';
import { AsuntoAncianosType } from '@definition/asuntos_ancianos';
import {
  DIAS_EN_ARCHIVO,
  necesidadesParaBorrar,
  ordenarPendientes,
} from './necesidades';

const necesidad = (
  id: string,
  campos: Partial<AsuntoAncianosType> = {}
): AsuntoAncianosType => ({
  id,
  updatedAt: '',
  _deleted: false,
  titulo: id,
  detalle: '',
  asignadoA: '',
  fechaPosible: '',
  tratadoEl: '',
  propuestoPor: '',
  propuestoEl: '',
  tratadoPor: '',
  acuerdo: '',
  urgente: false,
  ...campos,
});

const AHORA = new Date('2026-11-06T12:00:00Z');
const haceDias = (dias: number) =>
  new Date(AHORA.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();

describe('el archivo de necesidades se vacía solo', () => {
  it('borra solo lo archivado hace más del plazo', () => {
    const lista = [
      necesidad('pendiente'),
      necesidad('reciente', { tratadoEl: haceDias(10) }),
      necesidad('justo', { tratadoEl: haceDias(DIAS_EN_ARCHIVO - 1) }),
      necesidad('vieja', { tratadoEl: haceDias(DIAS_EN_ARCHIVO + 1) }),
      necesidad('ya-borrada', {
        tratadoEl: haceDias(DIAS_EN_ARCHIVO + 50),
        _deleted: true,
      }),
      necesidad('fecha-rara', { tratadoEl: 'no es una fecha' }),
    ];

    expect(necesidadesParaBorrar(lista, AHORA).map((n) => n.id)).toEqual([
      'vieja',
    ]);
  });
});

describe('el orden de lo pendiente', () => {
  it('primero lo que tiene fecha, de la más cercana; luego lo más viejo', () => {
    const lista = [
      necesidad('sin-fecha-nueva', { propuestoEl: '2026-10-01' }),
      necesidad('diciembre', { fechaPosible: '2026/12/01' }),
      necesidad('sin-fecha-vieja', { propuestoEl: '2026-01-01' }),
      necesidad('noviembre', { fechaPosible: '2026/11/20' }),
    ];

    expect(ordenarPendientes(lista).map((n) => n.id)).toEqual([
      'noviembre',
      'diciembre',
      'sin-fecha-vieja',
      'sin-fecha-nueva',
    ]);
  });
});
