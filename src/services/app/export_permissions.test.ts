import { describe, expect, it } from 'vitest';
import {
  canExportAnything,
  canExportSite,
  ExportRoles,
  PDF_EXPORT_SITES,
} from './export_permissions';

/**
 * Quién ve el botón de exportar, y quién ve el interruptor de Mi cuenta.
 *
 * Equivocarse aquí es feo por las dos caras: de MÁS deja exportar a quien no
 * debe, y de MENOS le esconde el interruptor a un anciano o a un secretario
 * que sí debe tenerlo, y se queda sin poder exportar sin entender por qué. Por
 * eso están los perfiles reales uno a uno, y no una comprobación genérica.
 *
 * Los perfiles se construyen con los MISMOS booleanos que calcula
 * `useCurrentUser` a partir del rol; ahí `isAdmin` (admin, coordinador o
 * secretario) da por buenas todas las demás condiciones por dentro, y así se
 * refleja aquí.
 */

const NADIE: ExportRoles = {
  isAdmin: false,
  isElder: false,
  isServiceCommittee: false,
  isMidweekEditor: false,
  isWeekendEditor: false,
  isDepartmentsEditor: false,
  isPublicTalkCoordinator: false,
};

/** Publicador raso: ningún permiso de nada. */
const publicador = NADIE;

/** Anciano sin ninguna asignación de programas. */
const anciano: ExportRoles = { ...NADIE, isElder: true };

/**
 * Secretario. En `useCurrentUser` el secretario ES `isAdmin`, y `isAdmin`
 * cumple todas las demás condiciones por dentro.
 */
const secretario: ExportRoles = {
  isAdmin: true,
  isElder: true,
  isServiceCommittee: true,
  isMidweekEditor: true,
  isWeekendEditor: true,
  isDepartmentsEditor: true,
  isPublicTalkCoordinator: true,
};

/**
 * Un permiso suelto y nada más: el de Departamentos. Es el caso que ya dio
 * problemas esta semana por estar en una lista y no en otra.
 */
const soloDepartamentos: ExportRoles = { ...NADIE, isDepartmentsEditor: true };

/** Superintendente de servicio: comité de servicio, sin ser anciano-admin. */
const comiteServicio: ExportRoles = { ...NADIE, isServiceCommittee: true };

/** Solo el programa de fin de semana. */
const soloFinDeSemana: ExportRoles = { ...NADIE, isWeekendEditor: true };

/** Solo coordinador de discursos públicos. */
const soloDiscursos: ExportRoles = { ...NADIE, isPublicTalkCoordinator: true };

describe('canExportAnything — quién ve el interruptor de Mi cuenta', () => {
  it('un publicador raso NO lo ve', () => {
    expect(canExportAnything(publicador)).toBe(false);
  });

  it('un anciano SÍ lo ve', () => {
    expect(canExportAnything(anciano)).toBe(true);
  });

  it('un secretario SÍ lo ve', () => {
    expect(canExportAnything(secretario)).toBe(true);
  });

  it('con un solo permiso suelto (Departamentos) SÍ lo ve', () => {
    // El fallo de «esconderlo de menos»: no es anciano ni admin, pero tiene
    // una página que exporta, así que el interruptor le sirve para algo.
    expect(canExportAnything(soloDepartamentos)).toBe(true);
  });

  it.each([
    ['comité de servicio', comiteServicio],
    ['solo fin de semana', soloFinDeSemana],
    ['solo discursos públicos', soloDiscursos],
  ])('%s SÍ lo ve', (_nombre, roles) => {
    expect(canExportAnything(roles as ExportRoles)).toBe(true);
  });
});

describe('canExportSite — el Plan de evacuación', () => {
  it('un publicador raso NO puede exportarlo', () => {
    // Era el fallo: la página está abierta a toda la congregación y el botón
    // de exportar salía con ella.
    expect(canExportSite('evacuacion', publicador)).toBe(false);
  });

  it('un anciano sí', () => {
    expect(canExportSite('evacuacion', anciano)).toBe(true);
  });

  it('un administrador sí', () => {
    expect(canExportSite('evacuacion', { ...NADIE, isAdmin: true })).toBe(true);
  });

  it('tener el programa de Departamentos NO da acceso al plan', () => {
    // Cada sitio tiene su propia condición: poder exportar algo no es poder
    // exportarlo todo.
    expect(canExportSite('evacuacion', soloDepartamentos)).toBe(false);
  });
});

describe('el interruptor no se puede desincronizar de la realidad', () => {
  it('nadie ve el interruptor si no ve NINGÚN sitio, y al revés', () => {
    // Ésta es la propiedad que hace que añadir una exportación nueva no exija
    // acordarse del interruptor: la unión se calcula, no se escribe aparte.
    const perfiles = [
      publicador,
      anciano,
      secretario,
      soloDepartamentos,
      comiteServicio,
      soloFinDeSemana,
      soloDiscursos,
    ];

    for (const roles of perfiles) {
      const algunSitio = Object.keys(PDF_EXPORT_SITES).some((site) =>
        canExportSite(site as keyof typeof PDF_EXPORT_SITES, roles)
      );

      expect(canExportAnything(roles)).toBe(algunSitio);
    }
  });
});
