import { FullnameOption } from '@definition/settings';
import { buildPersonFullname } from './common';

/**
 * "Personas" sintéticas del superintendente de circuito y su esposa.
 *
 * El superintendente no es (ni debe ser) una fila de la tabla `persons`: su
 * nombre vive en Ajustes → Superintendente de circuito, y meterlo como persona
 * lo arrastraría a informes, reuniones, estadísticas de publicadores y demás,
 * donde no pinta nada. Pero SÍ tiene que poder recibir territorios y quedar en
 * el registro (S-13 incluido).
 *
 * La solución es la que la app ya usa en Salidas de predicación: guardar en el
 * campo de `person_uid` un valor centinela que no existe en `persons`, y
 * resolverlo a nombre en el único punto donde se traduce uid → nombre. Ver
 * `src/utils/service_outings.ts` (genera 'CIRCUIT_OVERSEER') y
 * `ServiceOutingsMeeting.tsx` (lo desdobla).
 *
 * Cualquier código que haga `persons.find(p => p.person_uid === uid)` con uno
 * de estos valores encontrará `undefined`: usa `isCircuitOverseerUid()` para
 * saltarte push, correos y avisos, que no tienen destinatario real.
 */

/** Mismo literal que ya usa Salidas de predicación — no cambiarlo. */
export const CO_UID = 'CIRCUIT_OVERSEER';

export const CO_SPOUSE_UID = 'CIRCUIT_OVERSEER_SPOUSE';

export const isCircuitOverseerUid = (uid: string): boolean =>
  uid === CO_UID || uid === CO_SPOUSE_UID;

/**
 * Nombre completo de la esposa del superintendente.
 *
 * En Ajustes solo se guarda su nombre de pila (el campo se llama literalmente
 * "Nombre de la esposa"), así que adopta el apellido del marido — el mismo
 * contrato que ya asume `buildVisitGreeting` en la visita del CO. Si no hay
 * apellido del marido, se queda con el nombre suelto.
 */
export const buildCoSpouseFullname = (
  spouseName: string,
  coLastname: string,
  option?: FullnameOption
): string => {
  const first = (spouseName ?? '').trim();
  if (first.length === 0) return '';

  return buildPersonFullname((coLastname ?? '').trim(), first, option);
};
