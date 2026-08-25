import { createStore } from 'jotai';
import type { MultiPolygon, Polygon } from 'geojson';
import type {
  Territory,
  TerritoryLocation,
  TerritoryTag,
  TerritoryZone,
} from '@definition/territories';
import type { TerritorySharePayload } from '@definition/territory_shares';
import {
  territoriesState,
  territoryLocationsState,
  territorySettingsState,
  territoryTagsState,
  territoryZonesState,
} from '@states/territories';
import { DEFAULT_TERRITORY_SETTINGS } from '@definition/territories';

/**
 * CONVIERTE UN ENLACE COMPARTIDO EN LO QUE LA APP YA SABE PINTAR.
 *
 * El invitado que abre un enlace veía una página aparte: otro diseño, otras
 * pestañas, otro comportamiento. Se mantenían dos vistas del mismo territorio y
 * cada arreglo había que hacerlo dos veces —o se hacía en una y la otra se
 * quedaba atrás, que es lo que pasaba—.
 *
 * En vez de copiar la vista, aquí se copia el DATO: el contenido del enlace se
 * traduce a las mismas piezas que maneja la app (un territorio, su zona, sus
 * etiquetas y sus direcciones) y se siembran en un store de jotai propio del
 * invitado. A partir de ahí se monta `DialogVerTerritorio`, el mismo componente
 * que ve un publicador con cuenta, en modo solo lectura.
 *
 * El store es SUYO, no el de la app: aquí no hay sesión, ni base de datos
 * local, ni sincronización, y nada de lo que se siembre debe poder tocar el
 * estado real de nadie.
 *
 * Lo que el enlace no trae —quién lo tiene asignado, el historial, la clave
 * maestra— simplemente no está, y la vista ya sabe no enseñar eso cuando no
 * puede gestionarse (`canManage={false}`).
 */

/** Ids fijos: dentro de este store solo existe un territorio y una zona. */
const ZONA_ID = 'zona-compartida';
const TERRITORIO_ID = 'territorio-compartido';

export const construirStorePublico = (payload: TerritorySharePayload) => {
  const zona: TerritoryZone = {
    id: ZONA_ID,
    nombre: payload.zoneName,
    color: payload.zoneColor,
    orden: 0,
    updatedAt: payload.generatedAt,
  };

  const tags: TerritoryTag[] = payload.tags.map((tag, i) => ({
    id: `tag-${i}`,
    nombre: tag.nombre,
    color: tag.color ?? 'var(--accent-main)',
    updatedAt: payload.generatedAt,
  }));

  const territorio: Territory = {
    id: TERRITORIO_ID,
    zoneId: ZONA_ID,
    // El enlace trae la etiqueta YA COMPUESTA —«45 — Centro»—, y
    // `territoryLabel` la compone a partir de `numero` y `nombre`. Va entera
    // en `numero` y sin `nombre`, que es el caso en el que esa función
    // devuelve el número tal cual: así el invitado lee exactamente el mismo
    // rótulo que se ve dentro de la app, sin recomponerlo ni duplicarlo.
    numero: payload.label,
    geometry: (payload.geometry ?? null) as Polygon | MultiPolygon | null,
    imageURL: payload.imageURL,
    notas: payload.notas,
    numeroViviendas: payload.numeroViviendas,
    tags: tags.map((t) => t.id),
    // Los trozos llegan sin id (el enlace no los necesita para nada más), así
    // que se les pone uno de andar por casa para poder pintarlos en lista.
    secciones: payload.secciones?.map((seccion, i) => ({
      id: `seccion-${i}`,
      nombre: seccion.nombre,
      color: seccion.color,
      geometry: seccion.geometry as Polygon | MultiPolygon,
    })),
    openAssignmentId: null,
    updatedAt: payload.generatedAt,
  };

  const locations: TerritoryLocation[] = payload.locations.map((loc, i) => ({
    id: `loc-${i}`,
    territoryId: TERRITORIO_ID,
    etiqueta: 'NO_VISITAR',
    direccion: loc.direccion,
    nota: loc.nota,
    // El enlace solo lleva las aprobadas; marcarlas como tales evita que la
    // vista las pinte como «pendiente de revisar», que aquí no significa nada.
    aprobada: true,
    addedBy: '',
    createdAt: payload.generatedAt,
    updatedAt: payload.generatedAt,
  }));

  const store = createStore();

  // Los ajustes del invitado NO son los de la congregación: aquí no hay
  // publicadores, así que nadie puede proponer direcciones. Con los ajustes por
  // defecto le salía el formulario de «Nueva dirección (No visitar)», que sin
  // sesión ni clave maestra no podía hacer nada más que fallar.
  store.set(territorySettingsState, {
    ...DEFAULT_TERRITORY_SETTINGS,
    publishersCanAddLocations: false,
    updatedAt: payload.generatedAt,
  });

  store.set(territoryZonesState, [zona]);
  store.set(territoryTagsState, tags);
  store.set(territoriesState, [territorio]);
  store.set(territoryLocationsState, locations);

  return { store, territorio };
};
