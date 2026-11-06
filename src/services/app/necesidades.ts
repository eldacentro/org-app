import { AsuntoAncianosType } from '@definition/asuntos_ancianos';

/**
 * Cuánto se queda una necesidad en el ARCHIVO después de tratarse. Pasado ese
 * tiempo se borra sola: el archivo sirve para mirar atrás unos meses, no para
 * guardarlo todo para siempre.
 */
export const DIAS_EN_ARCHIVO = 180;

/** Las archivadas que ya llevan en el archivo más de `DIAS_EN_ARCHIVO`. */
export const necesidadesParaBorrar = (
  necesidades: AsuntoAncianosType[],
  ahora = new Date()
): AsuntoAncianosType[] => {
  const limite = ahora.getTime() - DIAS_EN_ARCHIVO * 24 * 60 * 60 * 1000;

  return necesidades.filter((necesidad) => {
    if (necesidad._deleted || !necesidad.tratadoEl) return false;

    const tratada = new Date(necesidad.tratadoEl).getTime();

    // Una fecha que no se entiende no borra nada.
    return !Number.isNaN(tratada) && tratada < limite;
  });
};

/**
 * Lo pendiente, en el orden en que se mira: primero lo que tiene fecha
 * posible, de la más cercana a la más lejana; después lo que no la tiene, lo
 * más viejo primero (un tablón ordenado por lo último que llegó entierra justo
 * lo que lleva meses esperando).
 */
export const ordenarPendientes = (
  pendientes: AsuntoAncianosType[]
): AsuntoAncianosType[] =>
  [...pendientes].sort((a, b) => {
    const fa = a.fechaPosible ?? '';
    const fb = b.fechaPosible ?? '';

    if (fa && fb && fa !== fb) return fa.localeCompare(fb);
    if (fa && !fb) return -1;
    if (!fa && fb) return 1;

    return (a.propuestoEl ?? '').localeCompare(b.propuestoEl ?? '');
  });
