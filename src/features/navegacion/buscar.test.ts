import { describe, expect, it } from 'vitest';
import { buscarDestinos, buscarDocumentos, normalizar } from './buscar';
import { DestinoRoles } from '@definition/destinos';

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

const con = (c: Partial<DestinoRoles>): DestinoRoles => ({ ...NADIE, ...c });

const rutas = (termino: string, roles: DestinoRoles) =>
  buscarDestinos(termino, roles).map((r) => r.destino.ruta);

describe('buscar destinos', () => {
  it('NO enseña lo que el hermano no puede abrir', () => {
    // Este es EL fallo que hay que evitar: un resultado que al pulsarlo da con
    // una puerta cerrada. Un publicador raso no EDITA Exhibidores.
    expect(rutas('exhibidores', NADIE)).not.toContain('/exhibitors');

    // Y al del comité de servicio sí se lo enseña.
    expect(rutas('exhibidores', con({ isServiceCommittee: true }))).toContain(
      '/exhibitors'
    );
  });

  it('a quien solo MIRA le enseña la pestaña, no la página de editar', () => {
    // El fallo que se vio en marcha: un publicador buscaba "exhibidores" y no
    // le salía nada, cuando lo que quiere —los turnos de la cartelera— lo
    // tiene en Programas semanales y lo puede ver de siempre.
    const r = buscarDestinos('exhibidores', NADIE);

    expect(r).toHaveLength(1);
    expect(r[0].destino.ruta).toBe('/weekly-schedules');
    expect(r[0].destino.pestana).toBe('exhibitors');
  });

  it('quien puede las dos cosas ve PRIMERO mirar y después editar', () => {
    const r = buscarDestinos('exhibidores', con({ isServiceCommittee: true }));

    expect(r).toHaveLength(2);
    expect(r[0].destino.pestana).toBe('exhibitors');
    expect(r[1].destino.ruta).toBe('/exhibitors');
  });

  it('la pestaña de la visita solo sale si hay visita', () => {
    expect(rutas('visita del superintendente', NADIE)).toEqual([]);

    const r = buscarDestinos(
      'visita del superintendente',
      con({ hayVisitaProxima: true })
    );

    expect(r[0].destino.pestana).toBe('circuit_visit');
  });

  it('los salientes salen a todos si el ajuste los publica', () => {
    expect(rutas('oradores salientes', NADIE)).toEqual([]);

    expect(
      buscarDestinos('oradores salientes', con({ verOradoresSalientes: true }))
    ).toHaveLength(1);
  });

  it('encuentra sin tildes y en cualquier caja', () => {
    const roles = con({ isPublisher: true });

    expect(rutas('PREDICACION', roles)).toContain('/ministry-report');
    expect(rutas('predicación', roles)).toContain('/ministry-report');
    expect(rutas('Predicacion', roles)).toContain('/ministry-report');
  });

  it('encuentra por sinónimo lo que no se llama así', () => {
    // Quien busca los turnos del carrito escribe "cartelera", no
    // "exhibidores"; y quien busca el S-21 no escribe "registros".
    expect(rutas('cartelera', con({ isServiceCommittee: true }))).toContain(
      '/exhibitors'
    );
    expect(rutas('s-21', con({ isSecretary: true }))).toContain(
      '/publisher-records'
    );
    expect(rutas('s-88', con({ isSecretary: true }))).toContain(
      '/reports/meeting-attendance'
    );
  });

  it('lo que empieza por lo escrito sale antes que lo que solo lo contiene', () => {
    const r = buscarDestinos('personas', con({ isElder: true }));

    expect(r[0].destino.ruta).toBe('/persons');
  });

  it('el nombre gana al sinónimo', () => {
    // "documentos" es el nombre de una página Y un sinónimo de otra cosa: la
    // página tiene que salir primero.
    const r = buscarDestinos('documentos', NADIE);

    expect(r[0].destino.ruta).toBe('/congregation/documentos');
  });

  it('con la caja vacía no devuelve nada', () => {
    expect(buscarDestinos('', con({ isAdmin: true }))).toEqual([]);
    expect(buscarDestinos('   ', con({ isAdmin: true }))).toEqual([]);
  });
});

describe('buscar documentos', () => {
  const DOCS = [
    { id: '1', nombre: 'Turnos julio', categoria: 'Exhibidores' },
    { id: '2', nombre: 'Instrucciones', categoria: 'Exhibidores' },
    { id: '3', nombre: 'Programa de limpieza', categoria: 'Limpieza' },
    { id: '4', nombre: 'Exhibidores 2026', categoria: 'General' },
  ];

  it('encuentra por CATEGORÍA lo que no lo dice en su nombre', () => {
    // Es medio motivo de que el buscador exista: "Turnos julio" no dice
    // "Exhibidores" por ningún lado, pero está en esa categoría.
    const r = buscarDocumentos('exhibidores', DOCS).map((d) => d.nombre);

    expect(r).toContain('Turnos julio');
    expect(r).toContain('Instrucciones');
  });

  it('el que lo lleva en el nombre sale antes que el de la categoría', () => {
    const r = buscarDocumentos('exhibidores', DOCS).map((d) => d.nombre);

    expect(r[0]).toBe('Exhibidores 2026');
  });

  it('también encuentra por nombre a secas', () => {
    expect(buscarDocumentos('limpieza', DOCS).map((d) => d.id)).toEqual(['3']);
  });

  it('un documento que coincide por nombre Y por categoría sale UNA vez', () => {
    // "Programa de limpieza" está además en la categoría "Limpieza": si el
    // filtro se escribiera como dos pasadas, saldría duplicado.
    expect(buscarDocumentos('limpieza', DOCS)).toHaveLength(1);
  });

  it('con la caja vacía no devuelve nada', () => {
    expect(buscarDocumentos('', DOCS)).toEqual([]);
  });
});

describe('normalizar', () => {
  it('quita tildes y baja a minúsculas', () => {
    expect(normalizar('Predicación')).toBe('predicacion');
    expect(normalizar('SALÓN')).toBe('salon');
  });
});
