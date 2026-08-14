import { Destino } from '@definition/destinos';

/**
 * TODOS los sitios a los que se puede ir en la app, en una sola lista.
 *
 * DATO PURO: aquí no entra ni un icono ni un componente. El icono de cada
 * destino está en `iconos.tsx`, emparejado por `id`. Así esta lista —que es
 * quién-ve-qué— se puede probar en Node, que es lo que pide
 * `vitest.config.ts`.
 *
 * Hoy lo consume el BUSCADOR. El siguiente paso es que lo consuman también
 * los seis paneles de baldosas, que a día de hoy siguen teniendo su propia
 * copia de las condiciones en el JSX.
 *
 * Mientras eso no pase, hay dos listas y pueden discrepar: si alguien cambia
 * una condición en un panel y no aquí, el buscador enseñará un resultado que
 * no se puede abrir —o esconderá una página a quien sí puede entrar—. Por eso
 * el orden fue este y no al revés: primero el índice y su prueba, que fija
 * quién ve qué; después los paneles, que es un cambio en la navegación
 * principal de toda la congregación y merece su propia comprobación.
 *
 * Ver `definition/destinos.ts` para el porqué de todo esto.
 *
 * ── Las condiciones están COPIADAS, no reinventadas ───────────────────────
 *
 * Cada `visible` es la condición que ya tenía esa baldosa en su panel, tal
 * cual. Si alguna estaba mal, seguirá mal —eso es lo correcto para este
 * cambio: mover código, no cambiar quién ve qué—. Lo que sí gana la app es que
 * a partir de ahora está escrita UNA vez.
 *
 * `src/features/navegacion/destinos.test.ts` congela esa lista por rol, así
 * que si alguien cambia una condición sin querer, la prueba lo dice.
 *
 * ── Los sinónimos ─────────────────────────────────────────────────────────
 *
 * No son etiquetas visibles: son las palabras por las que un hermano BUSCARÍA
 * eso. Un publicador que quiere ver los turnos de la cartelera escribe
 * "cartelera", no "exhibidores"; y quien busca el S-21 escribe "S-21", no
 * "registros de publicadores". Sin esto el buscador solo sirve para quien ya
 * sabe cómo se llaman las cosas, que es justo quien no lo necesita.
 */

export const DESTINOS: Destino[] = [
  // ── Reuniones ────────────────────────────────────────────────────────────
  {
    id: 'weekly-schedules',
    clave: 'tr_viewAssignmentsSchedule',
    nombre: 'Programas semanales',
    ruta: '/weekly-schedules',
    categoria: 'reuniones',
    sinonimos: ['programa', 'horario', 'semana', 'reunion'],
  },
  // ── Las PESTAÑAS de Programas semanales ──────────────────────────────────
  //
  // Esto es media app y faltaba entero. Programas semanales no es una página:
  // son siete vistas, y son las que MIRA todo el mundo. La página suelta de
  // cada cosa —`/exhibitors`, `/midweek-meeting`…— es la de EDITAR, y la ven
  // cuatro hermanos.
  //
  // Sin esto, un publicador buscaba "exhibidores" y no le salía nada: el
  // buscador solo conocía la página de editar, que él no puede abrir. Y era
  // justo lo que había pedido el encargo — «si es solo publicador, que le
  // muestre ir a Programas semanales en la pestaña de Exhibidores; y si tiene
  // permisos, las dos cosas».
  //
  // Van DELANTE de su página de editar a propósito: a igual coincidencia gana
  // el orden de esta lista, y mirar es lo que puede hacer todo el mundo.
  // Quien además edita tiene la otra fila justo debajo.
  //
  // El `donde` está escrito a mano en las catorce porque se llaman igual de
  // dos en dos, y ahí el nombre solo no distingue nada. Sale tanto en los
  // resultados como en el mapa de la caja vacía, así que se escribe corto y
  // sin repetir la categoría —que en el mapa ya la dice la cabecera del
  // grupo—: «En Programas semanales» y «Editar».
  {
    id: 'ver-midweek',
    clave: 'tr_midweekMeeting',
    nombre: 'Reunión de entre semana',
    ruta: '/weekly-schedules',
    pestana: 'midweek',
    categoria: 'reuniones',
    donde: 'En Programas semanales',
    sinonimos: ['entresemana', 'vida y ministerio', 'programa', 'ver'],
  },
  {
    id: 'ver-weekend',
    clave: 'tr_weekendMeeting',
    nombre: 'Reunión de fin de semana',
    ruta: '/weekly-schedules',
    pestana: 'weekend',
    categoria: 'reuniones',
    donde: 'En Programas semanales',
    sinonimos: ['finde', 'domingo', 'atalaya', 'programa', 'ver'],
  },
  {
    id: 'ver-outgoing',
    clave: 'tr_outgoingTalks',
    nombre: 'Oradores salientes',
    ruta: '/weekly-schedules',
    pestana: 'outgoing',
    categoria: 'reuniones',
    donde: 'En Programas semanales',
    // La misma condición que la pestaña: anciano o admin siempre, y el resto
    // solo si el ajuste publica el programa de salientes.
    visible: (r) => r.isElder || r.isAdmin || r.verOradoresSalientes,
    sinonimos: ['salientes', 'ir a otra congregacion', 'ver'],
  },
  {
    id: 'ver-departments',
    nombre: 'Departamentos',
    ruta: '/weekly-schedules',
    pestana: 'departments',
    categoria: 'reuniones',
    donde: 'En Programas semanales',
    sinonimos: ['acomodadores', 'audio', 'video', 'micros', 'ver'],
  },
  {
    id: 'ver-circuit-visit',
    nombre: 'Visita del superintendente',
    ruta: '/weekly-schedules',
    pestana: 'circuit_visit',
    categoria: 'reuniones',
    donde: 'En Programas semanales',
    // La pestaña solo existe dentro de su ventana, así que el resultado
    // tampoco: llevar a una pestaña que no está deja al hermano en la primera.
    visible: (r) => r.hayVisitaProxima,
    sinonimos: ['circuito', 'superintendente', 'visita', 'ver'],
  },
  {
    id: 'ver-service-outings',
    clave: 'tr_fieldServiceOutings',
    nombre: 'Salidas de predicación',
    ruta: '/weekly-schedules',
    pestana: 'service_outings',
    categoria: 'reuniones',
    donde: 'En Programas semanales',
    sinonimos: ['salidas', 'puntos de encuentro', 'ver'],
  },
  {
    id: 'ver-exhibitors',
    nombre: 'Exhibidores',
    ruta: '/weekly-schedules',
    pestana: 'exhibitors',
    categoria: 'reuniones',
    donde: 'En Programas semanales',
    sinonimos: ['cartelera', 'expositores', 'carrito', 'turnos', 'ver'],
  },

  // ── Y las páginas de EDITAR de esas mismas cosas ─────────────────────────
  {
    id: 'midweek-meeting',
    clave: 'tr_midweekMeeting',
    nombre: 'Reunión de entre semana',
    ruta: '/midweek-meeting',
    categoria: 'reuniones',
    media: true,
    donde: 'Editar',
    visible: (r) => r.isMidweekEditor,
    sinonimos: ['entresemana', 'vida y ministerio', 's-140', 'editar'],
  },
  {
    id: 'weekend-meeting',
    clave: 'tr_weekendMeeting',
    nombre: 'Reunión de fin de semana',
    ruta: '/weekend-meeting',
    categoria: 'reuniones',
    media: true,
    donde: 'Editar',
    // También el coordinador de discursos: la ruta ya le deja entrar y el
    // bloque "Discurso público" solo lo puede rellenar él.
    visible: (r) => r.isWeekendEditor || r.isPublicTalkCoordinator,
    sinonimos: ['finde', 'domingo', 'atalaya', 'editar'],
  },
  {
    id: 'departments-schedule',
    nombre: 'Departamentos',
    ruta: '/departments-schedule',
    categoria: 'reuniones',
    donde: 'Editar',
    visible: (r) => r.isMidweekEditor || r.isDepartmentsEditor,
    sinonimos: ['acomodadores', 'audio', 'video', 'micros', 'plataforma'],
  },
  {
    id: 'assignments-balance',
    nombre: 'Reparto de asignaciones',
    ruta: '/assignments-balance',
    categoria: 'reuniones',
    visible: (r) => r.isElder || r.isAdmin,
    sinonimos: ['equilibrio', 'cuantas veces', 'estadisticas'],
  },

  // ── Predicación ──────────────────────────────────────────────────────────
  {
    id: 'territories',
    nombre: 'Territorios',
    ruta: '/congregation/territories',
    categoria: 'predicacion',
    sinonimos: ['mapa', 'zonas', 'campana'],
  },
  {
    id: 'exhibitors',
    nombre: 'Exhibidores',
    ruta: '/exhibitors',
    categoria: 'predicacion',
    donde: 'Editar',
    visible: (r) => r.isServiceCommittee,
    sinonimos: ['cartelera', 'expositores', 'carrito', 'turnos', 'editar'],
  },
  {
    id: 'predicacion-salidas',
    nombre: 'Salidas de predicación',
    ruta: '/predicacion-salidas',
    categoria: 'predicacion',
    donde: 'Editar',
    visible: (r) => r.isServiceCommittee,
    sinonimos: ['salidas', 'grupos', 'puntos de encuentro', 'editar'],
  },
  {
    id: 'ministry-report',
    clave: 'tr_report',
    nombre: 'Informe de predicación',
    ruta: '/ministry-report',
    categoria: 'predicacion',
    visible: (r) => r.isPublisher,
    sinonimos: ['horas', 'cursos', 'mi informe', 'entregar'],
  },
  {
    id: 'auxiliary-pioneer-application',
    clave: 'tr_applicationAuxiliaryPioneer',
    nombre: 'Solicitud de precursor auxiliar',
    ruta: '/auxiliary-pioneer-application',
    categoria: 'predicacion',
    visible: (r) => r.enable_AP_application,
    sinonimos: ['precursorado', 'auxiliar', 'solicitar'],
  },

  // ── Congregación ─────────────────────────────────────────────────────────
  {
    id: 'persons',
    clave: 'tr_persons',
    nombre: 'Personas',
    ruta: '/persons',
    categoria: 'congregacion',
    visible: (r) => r.isPersonViewer || r.isElder,
    sinonimos: ['hermanos', 'publicadores', 'fichas', 'anadir persona'],
  },
  {
    id: 'ausencias',
    nombre: 'Ausencias',
    ruta: '/congregation/ausencias',
    categoria: 'congregacion',
    visible: (r) => r.isElder,
    sinonimos: ['viajes', 'fuera', 'no esta'],
  },
  {
    id: 'field-service-groups',
    clave: 'tr_fieldServiceGroups',
    nombre: 'Grupos de predicación',
    ruta: '/field-service-groups',
    categoria: 'congregacion',
    sinonimos: ['grupo', 'superintendente de grupo', 'auxiliar de grupo'],
  },
  {
    id: 'responsabilidades',
    nombre: 'Responsabilidades',
    ruta: '/congregation/responsabilidades',
    categoria: 'congregacion',
    sinonimos: ['departamentos', 'quien lleva', 'encargados'],
  },
  {
    id: 'evacuacion',
    nombre: 'Plan de evacuación',
    ruta: '/congregation/evacuacion',
    categoria: 'congregacion',
    sinonimos: ['emergencia', 'salidas de emergencia', 'incendio'],
  },
  {
    id: 'circuit-visit',
    nombre: 'Visita del superintendente',
    ruta: '/congregation/circuit-visit',
    categoria: 'congregacion',
    donde: 'Editar',
    visible: (r) => r.isElder,
    sinonimos: ['circuito', 'superintendente', 'visita'],
  },
  {
    id: 'limpieza',
    nombre: 'Limpieza del Salón',
    ruta: '/congregation/limpieza',
    categoria: 'congregacion',
    sinonimos: ['limpiar', 'salon del reino', 'turnos de limpieza'],
  },
  {
    id: 'documentos',
    nombre: 'Documentos',
    ruta: '/congregation/documentos',
    categoria: 'congregacion',
    sinonimos: ['pdf', 'cartelera', 'tablon', 'archivos'],
  },
  {
    id: 'pioneer-applications',
    clave: 'tr_pioneerApplications',
    nombre: 'Solicitudes de precursor',
    ruta: '/pioneer-applications',
    categoria: 'congregacion',
    visible: (r) => r.isElder,
    sinonimos: ['precursorado', 'solicitudes'],
  },
  {
    id: 'upcoming-events',
    nombre: 'Próximos eventos',
    ruta: '/activities/upcoming-events',
    categoria: 'congregacion',
    sinonimos: ['asamblea', 'congreso', 'conmemoracion', 'eventos'],
  },

  // ── Discursos ────────────────────────────────────────────────────────────
  {
    id: 'public-talks-list',
    clave: 'tr_publicTalksList',
    nombre: 'Lista de discursos públicos',
    ruta: '/public-talks-list',
    categoria: 'discursos',
    visible: (r) => r.isElder || r.isWeekendEditor || r.isPublicTalkCoordinator,
    sinonimos: ['bosquejos', 'temas', 'discursos publicos'],
  },
  {
    id: 'speakers-catalog',
    nombre: 'Catálogo de oradores',
    ruta: '/speakers-catalog',
    categoria: 'discursos',
    visible: (r) => r.isAppointed || r.isPublicTalkCoordinator,
    sinonimos: ['oradores', 'congregaciones', 'telefonos'],
  },
  {
    id: 'outgoing-speakers',
    clave: 'tr_outgoingTalks',
    nombre: 'Oradores salientes',
    ruta: '/outgoing-speakers',
    categoria: 'discursos',
    donde: 'Editar',
    visible: (r) => r.isAppointed || r.isPublicTalkCoordinator,
    sinonimos: ['salientes', 'ir a otra congregacion'],
  },

  // ── Informes ─────────────────────────────────────────────────────────────
  {
    id: 'meeting-attendance',
    clave: 'tr_meetingAttendanceRecord',
    nombre: 'Registro de asistencia',
    ruta: '/reports/meeting-attendance',
    categoria: 'informes',
    visible: (r) =>
      r.isAttendanceEditor || r.isElder || r.isSecretary || r.isGroupOverseer,
    sinonimos: ['asistencia', 's-88', 'cuantos vinieron'],
  },
  {
    id: 'publisher-records',
    clave: 'tr_publishersRecords',
    nombre: 'Registros de publicadores',
    ruta: '/publisher-records',
    categoria: 'informes',
    visible: (r) => r.isElder || r.isSecretary,
    sinonimos: ['s-21', 'tarjeta', 'historial'],
  },
  {
    id: 'field-service-reports',
    clave: 'tr_fieldServiceReports',
    nombre: 'Informes de predicación',
    ruta: '/reports/field-service',
    categoria: 'informes',
    visible: (r) =>
      r.isSecretary || r.isGroupOverseer || r.isLanguageGroupOverseer,
    sinonimos: ['informes del mes', 'recoger informes', 'horas'],
  },
  {
    id: 'branch-office-report',
    clave: 'tr_branchOfficeReport',
    nombre: 'Informes a la sucursal',
    ruta: '/reports/branch-office',
    categoria: 'informes',
    visible: (r) => (r.isAdmin || r.isSecretary) && !r.isGroup,
    sinonimos: ['s-1', 'betel', 'sucursal', 'enviar informe'],
  },

  // ── Configuración ────────────────────────────────────────────────────────
  {
    id: 'user-profile',
    clave: 'tr_myProfile',
    nombre: 'Mi cuenta',
    ruta: '/user-profile',
    categoria: 'ajustes',
    sinonimos: ['perfil', 'mis datos', 'tema', 'modo oscuro', 'ausencias'],
  },
  {
    id: 'congregation-settings',
    clave: 'tr_congregationSettings',
    nombre: 'Ajustes de congregación',
    ruta: '/congregation-settings',
    categoria: 'ajustes',
    visible: (r) => r.isAdmin || r.isElder,
    sinonimos: ['configuracion', 'horarios', 'nombre de la congregacion'],
  },
  {
    id: 'manage-access',
    clave: 'tr_manageAccess',
    nombre: 'Cuentas de usuario',
    ruta: '/manage-access',
    categoria: 'ajustes',
    visible: (r) => r.isAdmin,
    sinonimos: ['usuarios', 'permisos', 'invitar', 'acceso'],
  },
  {
    id: 'meeting-materials',
    clave: 'tr_meetingMaterials',
    nombre: 'Materiales de reunión',
    ruta: '/meeting-materials',
    categoria: 'ajustes',
    visible: (r) => r.isMeetingEditor,
    sinonimos: ['descargar', 'jw.org', 'guia de actividades', 'atalaya'],
  },
];

/** Un destino por su id. Para no repetir el `find` por ahí. */
export const destinoPorId = (id: string) => DESTINOS.find((d) => d.id === id);
