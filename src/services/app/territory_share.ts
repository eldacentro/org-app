import {
  Territory,
  TerritoryLocation,
  TerritoryTag,
  TerritoryZone,
} from '@definition/territories';
import { TerritorySharePayload } from '@definition/territory_shares';
import {
  getZoneColor,
  getZoneName,
  isStillEncrypted,
  territoryLabel,
} from './territories';

/**
 * Construye el contenido de un enlace público. Función PURA: no toca Firebase
 * ni el estado de la app, así que se puede probar de forma aislada.
 *
 * Dos reglas que la gobiernan:
 *
 * 1. **Nada de datos personales de terceros.** No entran el uid ni el nombre
 *    de quien tiene el territorio, ni las fechas de asignación. Quien recibe
 *    el enlace ve el territorio y de qué congregación es, nada más.
 *
 * 2. **El enlace contiene lo que ve quien comparte.** Las notas y las
 *    direcciones se cifran con la clave maestra, que solo tienen ancianos y
 *    administradores. Si quien comparte no la tiene, esos campos siguen
 *    cifrados en su dispositivo, y aquí se OMITEN en vez de colarse como
 *    `enc::U2FsdGVkX1…` en la pantalla del invitado.
 */
export const buildSharePayload = ({
  territory,
  zones,
  tags,
  locations,
  congName,
  now,
}: {
  territory: Territory;
  zones: TerritoryZone[];
  tags: TerritoryTag[];
  locations: TerritoryLocation[];
  congName: string;
  now: string;
}): TerritorySharePayload => {
  const territoryTags = (territory.tags ?? [])
    .map((tagId) => tags.find((t) => t.id === tagId))
    .filter((t): t is TerritoryTag => Boolean(t))
    .map((t) => ({ nombre: t.nombre, color: t.color }));

  const visibleLocations = locations
    .filter((l) => l.territoryId === territory.id && l.aprobada)
    // Sin clave maestra la dirección seguiría cifrada: mejor no enseñar nada
    // que enseñar un blob ilegible.
    .filter((l) => !isStillEncrypted(l.direccion))
    .map((l) => ({
      direccion: l.direccion,
      nota: isStillEncrypted(l.nota) ? undefined : l.nota,
    }));

  return {
    v: 1,
    generatedAt: now,
    label: territoryLabel(territory),
    congName,
    zoneName: getZoneName(territory.zoneId, zones),
    zoneColor: getZoneColor(territory.zoneId, zones),
    geometry: territory.geometry ?? null,
    imageURL: territory.imageURL,
    numeroViviendas: territory.numeroViviendas,
    notas: isStillEncrypted(territory.notas) ? undefined : territory.notas,
    tags: territoryTags,
    locations: visibleLocations,
  };
};

/**
 * Texto canónico del snapshot para calcular su huella. Se ordenan las claves
 * para que dos objetos equivalentes den siempre el mismo hash, y se excluye
 * `generatedAt` (cambia en cada construcción y haría creer que el contenido
 * cambió cuando no lo ha hecho).
 */
export const shareContentFingerprint = (
  payload: TerritorySharePayload
): string => {
  const rest: Omit<TerritorySharePayload, 'generatedAt'> & {
    generatedAt?: string;
  } = { ...payload };
  delete rest.generatedAt;

  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);

    if (value && typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          const item = (value as Record<string, unknown>)[key];
          if (item !== undefined) acc[key] = canonical(item);
          return acc;
        }, {});
    }

    return value;
  };

  return JSON.stringify(canonical(rest));
};

// ─── URL del enlace ─────────────────────────────────────────────────────────

export type ParsedShareLink = {
  congId: string;
  token: string;
  keyB64: string;
} | null;

/**
 * Formato del enlace: `#/t/{congId}/{token}?k={clave}`.
 *
 * Todo va después de la almohadilla a propósito: el navegador nunca envía el
 * fragmento al servidor, así que ni el token ni la clave aparecen en los logs
 * del hosting ni en la cabecera `Referer`. Se parsea a mano para que la página
 * pública no tenga que cargar react-router.
 */
export const parseShareHash = (hash: string): ParsedShareLink => {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [path, search] = raw.split('?');
  const parts = path.split('/').filter(Boolean); // ['t', congId, token]

  if (parts.length < 3 || parts[0] !== 't') return null;

  const keyB64 = new URLSearchParams(search ?? '').get('k') ?? '';

  return { congId: parts[1], token: parts[2], keyB64 };
};

/** Compone la URL para compartir. */
export const buildShareUrl = (
  origin: string,
  congId: string,
  token: string,
  keyB64: string
): string => `${origin}/#/t/${congId}/${token}?k=${keyB64}`;
