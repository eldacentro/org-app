import { describe, expect, it } from 'vitest';
import { DESTINOS } from './destinos';
import { DestinoRoles } from '@definition/destinos';

/**
 * Estas pruebas CONGELAN quién ve qué.
 *
 * El índice de destinos se hizo moviendo las condiciones que ya estaban
 * escritas a mano en los seis paneles de baldosas. Mover código de sitio es
 * justo cuando se cuelan los fallos silenciosos, y aquí un fallo silencioso
 * significa que a un hermano le desaparece una página, o que le aparece una
 * que no puede abrir.
 *
 * Así que la lista de rutas visibles para cada perfil está escrita a mano
 * abajo. Si alguien toca un `visible`, esto se entera.
 *
 * Si añades un destino nuevo, esta prueba fallará: es a propósito. Añádelo a
 * los perfiles que corresponda y así queda dicho quién lo ve.
 */

const NADIE: DestinoRoles = {
  isAdmin: false,
  isElder: false,
  isSecretary: false,
  isPublisher: false,
  isAppointed: false,
  isPersonViewer: false,
  isMidweekEditor: false,
  isWeekendEditor: false,
  isDepartmentsEditor: false,
  isPublicTalkCoordinator: false,
  isAttendanceEditor: false,
  isGroupOverseer: false,
  isLanguageGroupOverseer: false,
  isServiceCommittee: false,
  isMeetingEditor: false,
  isGroup: false,
  enable_AP_application: false,
  verOradoresSalientes: false,
  hayVisitaProxima: false,
};

const con = (cambios: Partial<DestinoRoles>): DestinoRoles => ({
  ...NADIE,
  ...cambios,
});

/**
 * La SEÑA de un destino: su ruta y, si es una pestaña, cuál.
 *
 * Desde que Programas semanales aporta siete vistas, la ruta sola ya no
 * identifica nada —ocho destinos comparten `/weekly-schedules`—. Lo que hay
 * que congelar es a dónde acaba el hermano, y eso incluye la pestaña.
 */
const senal = (d: (typeof DESTINOS)[number]) =>
  d.pestana ? `${d.ruta}?ver=${d.pestana}` : d.ruta;

const rutasVisibles = (roles: DestinoRoles) =>
  DESTINOS.filter((d) => !d.visible || d.visible(roles))
    .map(senal)
    .sort();

/** Lo que ve cualquiera, sin ningún permiso. El suelo de la app. */
const SUELO = [
  '/activities/upcoming-events',
  '/congregation/documentos',
  '/congregation/evacuacion',
  '/congregation/limpieza',
  '/congregation/responsabilidades',
  '/congregation/territories',
  '/field-service-groups',
  '/user-profile',
  '/weekly-schedules',
  // Las cinco pestañas de Programas semanales que ve TODO EL MUNDO. Son la
  // parte de la app que de verdad se mira: los turnos, el programa, quién
  // acomoda. Las otras dos —salientes y visita— dependen de un ajuste y de que
  // haya visita, así que no son suelo.
  '/weekly-schedules?ver=departments',
  '/weekly-schedules?ver=exhibitors',
  '/weekly-schedules?ver=midweek',
  '/weekly-schedules?ver=service_outings',
  '/weekly-schedules?ver=weekend',
].sort();

describe('índice de destinos', () => {
  it('sin ningún permiso solo se ven las páginas abiertas a todos', () => {
    expect(rutasVisibles(NADIE)).toEqual(SUELO);
  });

  it('un publicador añade su informe de predicación y nada más', () => {
    expect(rutasVisibles(con({ isPublisher: true }))).toEqual(
      [...SUELO, '/ministry-report'].sort()
    );
  });

  it('la solicitud de precursor auxiliar depende del AJUSTE, no del rol', () => {
    // No es un permiso: es la bandera de congregación que abre las
    // solicitudes. Un publicador sin ella no la ve; cualquiera con ella, sí.
    expect(rutasVisibles(con({ isPublisher: true }))).not.toContain(
      '/auxiliary-pioneer-application'
    );
    expect(rutasVisibles(con({ enable_AP_application: true }))).toContain(
      '/auxiliary-pioneer-application'
    );
  });

  it('el comité de servicio abre Exhibidores y Salidas de predicación', () => {
    const rutas = rutasVisibles(con({ isServiceCommittee: true }));

    expect(rutas).toContain('/exhibitors');
    expect(rutas).toContain('/predicacion-salidas');
  });

  it('un anciano ve lo suyo, pero NO lo que es del secretario', () => {
    const rutas = rutasVisibles(con({ isElder: true }));

    expect(rutas).toContain('/persons');
    expect(rutas).toContain('/congregation/ausencias');
    expect(rutas).toContain('/congregation/circuit-visit');
    expect(rutas).toContain('/pioneer-applications');
    expect(rutas).toContain('/assignments-balance');
    expect(rutas).toContain('/publisher-records');
    expect(rutas).toContain('/public-talks-list');

    // Del secretario o del admin, no.
    expect(rutas).not.toContain('/reports/branch-office');
    expect(rutas).not.toContain('/reports/field-service');
    expect(rutas).not.toContain('/manage-access');
    // Y editar reuniones tampoco: ser anciano no es ser editor.
    expect(rutas).not.toContain('/midweek-meeting');
    expect(rutas).not.toContain('/weekend-meeting');
  });

  it('el informe a la sucursal se le esconde a un grupo de idioma', () => {
    // `!isGroup` estaba en la condición original y es importante: un grupo de
    // idioma no manda su propio S-1.
    expect(rutasVisibles(con({ isSecretary: true }))).toContain(
      '/reports/branch-office'
    );
    expect(
      rutasVisibles(con({ isSecretary: true, isGroup: true }))
    ).not.toContain('/reports/branch-office');
  });

  it('el coordinador de discursos entra en Reunión de fin de semana', () => {
    // No es editor de fin de semana, pero el bloque "Discurso público" solo lo
    // puede rellenar él y la ruta ya le dejaba pasar.
    expect(rutasVisibles(con({ isPublicTalkCoordinator: true }))).toContain(
      '/weekend-meeting'
    );
  });

  it('Departamentos lo abren dos editores distintos', () => {
    expect(rutasVisibles(con({ isMidweekEditor: true }))).toContain(
      '/departments-schedule'
    );
    expect(rutasVisibles(con({ isDepartmentsEditor: true }))).toContain(
      '/departments-schedule'
    );
  });

  it('un admin lo ve todo menos lo que depende de un ajuste', () => {
    const rutas = rutasVisibles(
      con({
        isAdmin: true,
        isElder: true,
        isSecretary: true,
        isAppointed: true,
        isPersonViewer: true,
        isPublisher: true,
        isMidweekEditor: true,
        isWeekendEditor: true,
        isDepartmentsEditor: true,
        isPublicTalkCoordinator: true,
        isAttendanceEditor: true,
        isGroupOverseer: true,
        isLanguageGroupOverseer: true,
        isServiceCommittee: true,
        isMeetingEditor: true,
      })
    );

    const todas = DESTINOS.map(senal).sort();

    // Las tres que NO dependen de un rol: la solicitud de precursor auxiliar
    // (ajuste de congregación) y la pestaña de la visita (solo existe cuando
    // hay visita programada). Ni siendo admin salen si la condición no se da.
    expect(rutas).toEqual(
      todas.filter(
        (r) =>
          r !== '/auxiliary-pioneer-application' &&
          r !== '/weekly-schedules?ver=circuit_visit'
      )
    );
  });
});

describe('la lista está sana', () => {
  it('no hay ids repetidos', () => {
    const ids = DESTINOS.map((d) => d.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no hay dos destinos que acaben en el mismo sitio', () => {
    // Ruta MÁS pestaña: ocho destinos comparten `/weekly-schedules` y son
    // distintos entre sí. Lo que no puede repetirse es el sitio final.
    const senales = DESTINOS.map(senal);

    expect(new Set(senales).size).toBe(senales.length);
  });

  it('los sinónimos van en minúscula y sin acentos', () => {
    // El buscador normaliza lo que se escribe, no lo que hay aquí: un sinónimo
    // con mayúscula o con tilde no lo encontraría nadie.
    const sucios = DESTINOS.flatMap((d) => d.sinonimos ?? []).filter(
      (s) => s !== s.toLowerCase() || /[áéíóúñ]/.test(s)
    );

    expect(sucios).toEqual([]);
  });
});
