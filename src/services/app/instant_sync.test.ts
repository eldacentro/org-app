import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSignalScheduler,
  findNewerTables,
  pickSignalDelay,
  SIGNAL_DELAY_MAX_MS,
  SIGNAL_DELAY_MIN_MS,
} from './instant_sync';
import type { MetadataRecordType } from '@definition/metadata';

/**
 * El "timbre" del sync casi-instantáneo.
 *
 * Está aquí, con las pruebas de datos, y no con las de interfaz, porque cuando
 * esto falla no se rompe nada: la congregación simplemente deja de recibir los
 * cambios al momento y nadie se entera —vuelve al intervalo de siempre—. Es
 * el fallo más caro de detectar de todos, así que las tres decisiones que lo
 * gobiernan se prueban una a una.
 */

const metadata = (
  versions: Record<string, string>
): MetadataRecordType['metadata'] =>
  Object.fromEntries(
    Object.entries(versions).map(([table, version]) => [
      table,
      { version, send_local: false },
    ])
  );

describe('qué tablas de la señal traen algo nuevo', () => {
  it('detecta la tabla que ha avanzado', () => {
    const result = findNewerTables(
      {
        persons: '2026-07-27T19:21:50.481Z',
        sources: '2026-07-27T19:18:43.689Z',
      },
      metadata({
        persons: '2026-07-27T18:00:00.000Z',
        sources: '2026-07-27T19:18:43.689Z',
      })
    );

    expect(result).toEqual(['persons']);
  });

  it('no dispara con la señal de la subida propia (versiones ya iguales)', () => {
    // El dispositivo que acaba de subir recibe su propia señal. Es la barrera
    // anti-bucle: sus versiones ya coinciden, así que no vuelve a sincronizar.
    const version = '2026-07-27T22:26:24.037Z';

    expect(
      findNewerTables({ upcoming_events: version }, metadata({ upcoming_events: version }))
    ).toEqual([]);
  });

  it('ignora una versión remota MÁS VIEJA que la local', () => {
    expect(
      findNewerTables(
        { schedules: '2026-07-01T00:00:00.000Z' },
        metadata({ schedules: '2026-07-27T00:00:00.000Z' })
      )
    ).toEqual([]);
  });

  it('NO despierta al dispositivo por una tabla que su rol no recibe', () => {
    // Un dispositivo que no es del secretario tiene incoming_reports vacío
    // para siempre. Sin esta guarda, cada informe enviado por cualquier
    // publicador —decenas a fin de mes— haría sincronizar a los 30
    // dispositivos de la congregación para nada.
    expect(
      findNewerTables(
        { incoming_reports: '2026-07-27T19:18:52.394Z' },
        metadata({ incoming_reports: '', persons: '2026-07-27T00:00:00.000Z' })
      )
    ).toEqual([]);
  });

  it('aguanta una señal sin tablas, o metadata sin cargar todavía', () => {
    expect(findNewerTables(undefined, metadata({ persons: 'v1' }))).toEqual([]);
    expect(findNewerTables({ persons: 'v2' }, undefined)).toEqual([]);
    expect(findNewerTables({}, metadata({ persons: 'v1' }))).toEqual([]);
  });

  it('ignora un valor que no sea una cadena', () => {
    const tables = { persons: 12345 } as unknown as Record<string, string>;

    expect(findNewerTables(tables, metadata({ persons: '2026-01-01T00:00:00.000Z' }))).toEqual([]);
  });
});

describe('reparto aleatorio del disparo', () => {
  it('se queda dentro de la ventana, incluso en los extremos del sorteo', () => {
    expect(pickSignalDelay(() => 0)).toBe(SIGNAL_DELAY_MIN_MS);
    expect(pickSignalDelay(() => 0.9999)).toBeLessThan(SIGNAL_DELAY_MAX_MS);
    expect(pickSignalDelay(() => 0.5)).toBe(
      SIGNAL_DELAY_MIN_MS + (SIGNAL_DELAY_MAX_MS - SIGNAL_DELAY_MIN_MS) / 2
    );
  });

  it('sigue siendo un reparto, no un valor fijo', () => {
    // Quitar el azar es lo único que NO se puede hacer aquí: son 30
    // dispositivos golpeando el servidor en el mismo instante.
    expect(SIGNAL_DELAY_MAX_MS).toBeGreaterThan(SIGNAL_DELAY_MIN_MS);
  });

  it('la ventana deja margen frente al limitador del backend', () => {
    // El backend limita a 20 peticiones/s POR IP (rateLimit en app.ts), y en
    // el Salón del Reino todos los móviles salen por la misma. Con 30
    // dispositivos, la ventana tiene que dar bastante menos de 20/s;
    // pasarse devuelve TOO_MANY_REQUESTS, que al hermano le llega como un
    // BACKUP_FAILED en rojo. Esta prueba está para que quien estreche la
    // ventana tenga que rehacer la cuenta a conciencia.
    const DISPOSITIVOS = 30;
    const LIMITE_POR_SEGUNDO = 20;

    const ventanaSegundos = (SIGNAL_DELAY_MAX_MS - SIGNAL_DELAY_MIN_MS) / 1000;
    const picoPorSegundo = DISPOSITIVOS / ventanaSegundos;

    // margen de al menos 3x sobre el limitador
    expect(picoPorSegundo).toBeLessThan(LIMITE_POR_SEGUNDO / 3);
  });
});

describe('agrupado de señales en ráfaga', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('dispara una sola vez, a su hora', () => {
    const fire = vi.fn();
    const scheduler = createSignalScheduler(fire);

    expect(scheduler.schedule(3000)).toBe('scheduled');
    expect(scheduler.isPending()).toBe(true);

    vi.advanceTimersByTime(2999);
    expect(fire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fire).toHaveBeenCalledTimes(1);
    expect(scheduler.isPending()).toBe(false);
  });

  it('una señal nueva NO retrasa el disparo que ya estaba esperando', () => {
    // Esta es la prueba del arreglo. Antes cada señal reprogramaba el timer
    // con un retraso nuevo: con varios hermanos editando a la vez, el disparo
    // se posponía indefinidamente y el dispositivo se quedaba sin sync
    // instantáneo justo cuando más movimiento había.
    const fire = vi.fn();
    const scheduler = createSignalScheduler(fire);

    scheduler.schedule(3000);

    // dos señales más mientras el disparo espera
    vi.advanceTimersByTime(1000);
    expect(scheduler.schedule(3000)).toBe('already-pending');

    vi.advanceTimersByTime(1000);
    expect(scheduler.schedule(3000)).toBe('already-pending');

    vi.advanceTimersByTime(999);
    expect(fire).not.toHaveBeenCalled();

    // Con el comportamiento viejo la última señal habría movido el disparo a
    // t=5000; con el nuevo cae a los 3000 ms exactos desde la PRIMERA.
    vi.advanceTimersByTime(1);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('una ráfaga larga no deja al dispositivo sin sincronizar', () => {
    // Reconstrucción del caso real: señales cada 2 s durante un minuto (varios
    // editando a la vez) con un retraso sorteado de 4 s.
    const fire = vi.fn();
    const scheduler = createSignalScheduler(fire);

    for (let segundo = 0; segundo < 60; segundo += 2) {
      scheduler.schedule(4000);
      vi.advanceTimersByTime(2000);
    }

    expect(fire.mock.calls.length).toBeGreaterThan(0);
  });

  it('tras disparar admite una señal nueva', () => {
    const fire = vi.fn();
    const scheduler = createSignalScheduler(fire);

    scheduler.schedule(1000);
    vi.advanceTimersByTime(1000);
    expect(fire).toHaveBeenCalledTimes(1);

    expect(scheduler.schedule(1000)).toBe('scheduled');
    vi.advanceTimersByTime(1000);
    expect(fire).toHaveBeenCalledTimes(2);
  });

  it('una señal que llega DESPUÉS de cancelar no revive el disparo', () => {
    // El manejador de la señal es asíncrono: lee la metadata de Dexie antes de
    // decidir. Una señal a medias cuando se desmonta la escucha llegaba
    // después del cancel y programaba un ciclo sobre un planificador muerto.
    const fire = vi.fn();
    const scheduler = createSignalScheduler(fire);

    scheduler.cancel();
    scheduler.schedule(1000);

    vi.advanceTimersByTime(10000);
    expect(fire).not.toHaveBeenCalled();
    expect(scheduler.isPending()).toBe(false);
  });

  it('cancelar deja el disparo sin efecto (desmontaje del hook)', () => {
    const fire = vi.fn();
    const scheduler = createSignalScheduler(fire);

    scheduler.schedule(3000);
    scheduler.cancel();

    vi.advanceTimersByTime(10000);
    expect(fire).not.toHaveBeenCalled();
    expect(scheduler.isPending()).toBe(false);
  });
});
