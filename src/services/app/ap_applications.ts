import type { APHours, APRecordType } from '@definition/ministry';

/**
 * Solicitudes de precursorado auxiliar: lo que hace falta para verlas bien en
 * la lista del comité de servicio.
 *
 * El caso que lo motiva: a veces un hermano envía la solicitud DOS veces —le da
 * dos veces al botón, o no está seguro de que haya salido y la repite—. En la
 * lista salían dos tarjetas idénticas, con el nombre y la fecha de envío y nada
 * más, así que ni se veía que eran lo mismo ni había forma de quitar una: la
 * única salida era que los tres del comité la rechazaran, y eso además le dice
 * al hermano que se la han rechazado.
 */

type Solicitud = Pick<
  APRecordType,
  'request_id' | 'person_uid' | 'months' | 'continuous' | 'submitted'
>;

const mesesDe = (solicitud: Solicitud): string[] =>
  Array.isArray(solicitud.months) ? solicitud.months.filter(Boolean) : [];

/**
 * ¿Piden lo mismo, aunque sea en parte?
 *
 * Dos solicitudes del mismo hermano se pisan si comparten algún mes. Una
 * «continua» pide de su primer mes en adelante, así que se pisa con cualquier
 * otra que pida ese mes o uno posterior.
 */
const sePisan = (a: Solicitud, b: Solicitud): boolean => {
  if (a.person_uid !== b.person_uid) return false;

  const mesesA = mesesDe(a);
  const mesesB = mesesDe(b);

  if (mesesA.length === 0 || mesesB.length === 0) return false;

  if (mesesA.some((mes) => mesesB.includes(mes))) return true;

  const desdeA = a.continuous ? mesesA.toSorted().at(0) : undefined;
  const desdeB = b.continuous ? mesesB.toSorted().at(0) : undefined;

  if (desdeA && mesesB.some((mes) => mes >= desdeA)) return true;
  if (desdeB && mesesA.some((mes) => mes >= desdeB)) return true;

  return false;
};

/**
 * Las solicitudes que REPITEN otra anterior del mismo hermano.
 *
 * Se marca la que llegó después, nunca la primera: la primera es la solicitud;
 * la segunda es la que sobra. Se mira contra TODAS —también las ya aprobadas—,
 * porque repetir una solicitud que ya está aprobada es igual de repetida.
 */
export const solicitudesRepetidas = (solicitudes: Solicitud[]): Set<string> => {
  const repetidas = new Set<string>();

  // De la más antigua a la más nueva; a igual fecha, por id, para que el
  // resultado no dependa del orden en que lleguen.
  const ordenadas = [...(solicitudes ?? [])].sort(
    (a, b) =>
      (a.submitted ?? '').localeCompare(b.submitted ?? '') ||
      a.request_id.localeCompare(b.request_id)
  );

  ordenadas.forEach((solicitud, indice) => {
    const anterior = ordenadas
      .slice(0, indice)
      .some((previa) => sePisan(previa, solicitud));

    if (anterior) repetidas.add(solicitud.request_id);
  });

  return repetidas;
};

/**
 * «octubre», «octubre y noviembre», «octubre, noviembre y diciembre», o «desde
 * octubre» si es continua. Con el año solo cuando no es el de hoy.
 *
 * `monthNames` son los doce nombres tal como los da la app (en minúscula en
 * español); el mes llega como 'YYYY/MM'.
 */
export const mesesDeLaSolicitud = (
  solicitud: Pick<APRecordType, 'months' | 'continuous'>,
  monthNames: string[],
  hoy = new Date()
): string => {
  const meses = (Array.isArray(solicitud.months) ? solicitud.months : [])
    .filter((mes) => /^\d{4}\/\d{2}$/.test(mes))
    .toSorted();

  if (meses.length === 0) return '';

  const nombre = (mes: string) => {
    const [año, numero] = mes.split('/').map(Number);
    const texto = monthNames[numero - 1] ?? mes;

    return año === hoy.getFullYear() ? texto : `${texto} de ${año}`;
  };

  if (solicitud.continuous) return `desde ${nombre(meses[0])}`;

  const nombres = meses.map(nombre);

  if (nombres.length === 1) return nombres[0];

  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
};

/**
 * Las horas que pide una solicitud: 30, o 15 en los meses en que se puede.
 *
 * Todo lo que enseñe o guarde las horas pasa por aquí, porque las solicitudes
 * enviadas ANTES de que existiera el campo no lo traen, y una solicitud sin
 * horas no es una solicitud sin decidir: es la de siempre, la de 30. Escrito
 * así, un valor raro —de una importación, de un dispositivo más nuevo— tampoco
 * puede colarse en la pantalla.
 */
export const horasDeLaSolicitud = (
  solicitud: Pick<APRecordType, 'hours'> | undefined | null
): APHours => (solicitud?.hours === 15 ? 15 : 30);
