import {
  IconAdmin,
  IconAssignment,
  IconCalendarMonth,
  IconCalendarWeek,
  IconClean,
  IconGroups,
  IconHelp,
  IconMap,
  IconPerson,
  IconPublishersReports,
  IconTalk,
} from '@icons/index';
import { AyudaSection } from '@definition/ayuda';

/**
 * CONTENIDO DE LA AYUDA — Fase 1: Guía general (para todos) + secciones de rol
 * en preparación (de momento solo las ve el admin, con su etiqueta).
 *
 * Estilo de redacción: llano y directo, nombrando los botones EXACTAMENTE como
 * aparecen en pantalla, con pasos numerados cortos. Nada de jerga técnica.
 */

export const AYUDA_SECTIONS: AyudaSection[] = [
  // ════════════════════════════════════════════════════════════════════
  // GUÍA GENERAL — todos
  // ════════════════════════════════════════════════════════════════════
  {
    id: 'general',
    title: 'Guía general',
    description: 'Lo esencial para todos: el panel, tu informe, tus asignaciones y cómo cuidar la aplicación.',
    icon: <IconHelp color="var(--accent-main)" />,
    visible: () => true,
    articles: [
      {
        id: 'que-es',
        title: '¿Qué es esta aplicación?',
        blocks: [
          { type: 'p', text: 'Elda Centro es la aplicación de nuestra congregación. Aquí puedes ver los programas de las reuniones y tus asignaciones, enviar tu informe de predicación cada mes, consultar documentos del tablón y mucho más — todo desde tu teléfono, tableta u ordenador.' },
          { type: 'p', text: 'Toda la información viaja cifrada de extremo a extremo: solo la congregación puede leerla. Y lo que hagas se guarda primero en tu dispositivo, así que la aplicación funciona incluso sin conexión; en cuanto vuelvas a tener internet, se pone al día sola.' },
          { type: 'tip', text: 'Puedes instalarla como una app normal: en iPhone, abre la página en Safari, toca el botón de compartir y elige "Añadir a pantalla de inicio". En Android, Chrome te ofrecerá "Instalar aplicación". Así la tendrás con su icono, a un toque.' },
        ],
      },
      {
        id: 'panel',
        title: 'El panel de inicio',
        blocks: [
          { type: 'p', text: 'Al entrar verás tu panel personal. Arriba, la tarjeta "MIS ASIGNACIONES" te avisa si tienes asignaciones pendientes de confirmar o próximas. Debajo, "ESTA SEMANA" muestra las reuniones con su día y hora — y si tienes una parte, te la indica ahí mismo.' },
          { type: 'p', text: 'En "EXPLORAR" están las puertas a cada área: Reuniones, Predicación, Congregación, Discursos, Informes y Configuración. Según tus responsabilidades verás más o menos opciones — cada uno ve solo lo que necesita.' },
        ],
      },
      {
        id: 'asignaciones',
        title: 'Ver mis asignaciones y los programas',
        blocks: [
          { type: 'steps', title: 'Para ver los programas de las reuniones:', items: [
            'En el panel, toca "Programas semanales" (o entra en Reuniones).',
            'Muévete entre semanas con las flechas o el selector de fechas.',
            'Tus partes aparecen destacadas con tu nombre.',
          ] },
          { type: 'p', text: 'Si te asignan una parte, te llegará también como notificación (si las tienes activadas) y aparecerá en "MIS ASIGNACIONES" del panel.' },
          { type: 'faq', q: '¿Por qué no veo todavía el programa del mes que viene?', a: 'Los programas aparecen cuando los hermanos responsables los preparan y publican. Si no está, simplemente aún no se ha publicado.' },
        ],
      },
      {
        id: 'informe',
        title: 'Enviar mi informe de predicación',
        blocks: [
          { type: 'p', text: 'Cada principio de mes toca enviar el informe del mes anterior. Se hace en un minuto:' },
          { type: 'steps', items: [
            'Entra en "Predicación" desde el panel.',
            'Abre "Informe de predicación" y comprueba que está seleccionado el mes correcto.',
            'Si eres publicador: marca la casilla de que participaste en la predicación durante el mes. Añade estudios bíblicos si diriges alguno.',
            'Si eres precursor: indica también tus horas (puedes apuntarlas día a día durante el mes con "Añadir tiempo de predicación", y la app las suma sola).',
            'Toca el botón de enviar. ¡Listo! Le llega directamente al secretario.',
          ] },
          { type: 'tip', text: 'Puedes apuntar tu tiempo durante todo el mes (incluso con el cronómetro integrado) y al final solo revisar y enviar.' },
          { type: 'faq', q: '¿Cómo sé que mi informe llegó?', a: 'Tras enviarlo, el mes queda marcado como "Informe enviado". Si lo abres, verás lo que enviaste.' },
          { type: 'faq', q: 'Me equivoqué, ¿puedo corregirlo?', a: 'Sí: abre el mes, corrige y vuelve a enviar. Si el secretario ya lo verificó, coméntaselo para que lo ajuste él.' },
        ],
      },
      {
        id: 'registro-servicio',
        title: 'Mi registro de servicio y el año de servicio',
        blocks: [
          { type: 'p', text: 'En "Predicación" también está tu historial: todos tus informes, mes a mes, y el resumen del "Año de servicio" (que va de septiembre a agosto).' },
          { type: 'p', text: 'Si eres precursor regular verás además tu objetivo anual, las horas que te faltan y tu saldo. Junto al saldo hay una nota que aclara hasta qué mes está contado — el mes en curso no cuenta hasta que envías su informe, así que no te asustes si "parece" que vas peor de lo que vas.' },
        ],
      },
      {
        id: 'precursor-auxiliar',
        title: 'Solicitar ser precursor auxiliar',
        blocks: [
          { type: 'steps', items: [
            'Entra en "Predicación".',
            'Toca "Solicitud de precursor auxiliar".',
            'Elige el mes (o de continuo), revisa y envía.',
          ] },
          { type: 'p', text: 'La solicitud les llega a los hermanos del comité de servicio, y recibirás la respuesta en la propia aplicación.' },
        ],
      },
      {
        id: 'documentos',
        title: 'Documentos (el tablón digital)',
        blocks: [
          { type: 'p', text: 'En Congregación → Documentos están las cartas y anuncios del tablón, organizados por categorías. Tocas uno y se abre. Cuando hay algo nuevo, lo verás indicado.' },
        ],
      },
      {
        id: 'sincronizacion',
        title: 'La sincronización (y qué significa cada indicador)',
        blocks: [
          { type: 'p', text: 'No tienes que hacer nada para sincronizar: todo lo que guardas se sube solo en segundos, y lo que cambian otros te llega solo también. Los indicadores del botón de tu perfil (arriba a la derecha) te cuentan el estado:' },
          { type: 'steps', title: 'Qué significa cada señal:', items: [
            'Aro naranja: tienes cambios tuyos aún sin subir (se subirán en unos segundos).',
            'Circulito azul girando: tus cambios se están guardando en el servidor ahora mismo.',
            'Puntito verde (unos segundos): acabas de recibir o guardar lo último — estás al día.',
            'Nada: todo tranquilo y guardado.',
          ] },
          { type: 'p', text: 'Si quieres confirmarlo tú mismo, abre el menú de tu perfil y toca "Sincronizar datos": en un par de segundos verás "Todo actualizado".' },
          { type: 'warn', text: 'Si el aro naranja o el circulito azul están visibles, no cierres la aplicación todavía: espera unos segundos a que tus cambios terminen de subirse.' },
        ],
      },
      {
        id: 'actualizar',
        title: 'Mantener la aplicación actualizada',
        blocks: [
          { type: 'p', text: 'Cuando hay una versión nueva, te aparece un aviso de "Actualización disponible" con el botón "Actualizar" — tócalo y en unos segundos estarás en la última versión. La aplicación además busca novedades sola cada media hora.' },
          { type: 'steps', title: 'Para forzar la comprobación a mano:', items: [
            'Abre el menú de tu perfil (arriba a la derecha).',
            'Toca "Acerca de la aplicación".',
            'Toca "Actualizar la aplicación". Si ya estás al día, simplemente se recarga.',
          ] },
          { type: 'faq', q: '¿Y "Volver a descargar los datos"?', a: 'Es una herramienta de recuperación: vuelve a traer TODA la información de la congregación desde el servidor. Solo úsala si algo no se ve bien, y ten paciencia porque tarda un poco. Para el día a día no hace falta nunca.' },
        ],
      },
      {
        id: 'perfil',
        title: 'Mi cuenta y ajustes personales',
        blocks: [
          { type: 'p', text: 'En el menú de tu perfil → "Mi cuenta" puedes ver tus datos, tus sesiones abiertas (y cerrar las que no reconozcas) y tus preferencias. En Configuración puedes cambiar entre tema claro y oscuro y ajustar otras opciones personales.' },
        ],
      },
      {
        id: 'problemas',
        title: 'Si algo no va bien',
        blocks: [
          { type: 'faq', q: 'No me aparece un cambio que hizo otro hermano.', a: 'Dale a "Sincronizar datos" en el menú del perfil. Si sigue sin aparecer, comprueba que tienes conexión y que la app está actualizada (Acerca de la aplicación → Actualizar la aplicación).' },
          { type: 'faq', q: 'La aplicación se ve rara o anticuada.', a: 'Casi siempre es una versión vieja: menú del perfil → Acerca de la aplicación → "Actualizar la aplicación".' },
          { type: 'faq', q: 'Algo se ve mal incluso después de actualizar.', a: 'Usa "Volver a descargar los datos" (en Acerca de la aplicación) para recuperar toda la información fresca del servidor.' },
          { type: 'faq', q: 'Nada de esto lo arregla.', a: 'Escríbele a Carlos Saca Jr. contándole qué pasa y, si puedes, con una captura de pantalla. Cuanto más concreto, más rápido se arregla.' },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // SECCIONES POR ROL — Fase 2+ (en preparación; de momento solo las ve
  // el admin para validar la estructura)
  // ════════════════════════════════════════════════════════════════════
  {
    id: 'informes',
    title: 'Informes y asistencia',
    description: 'Recibir y verificar informes, registros de publicadores, asistencia y S-88.',
    icon: <IconPublishersReports color="var(--accent-main)" />,
    visible: (r) => r.isSecretary || r.isAttendanceEditor,
    comingSoon: true,
    articles: [],
  },
  {
    id: 'entre-semana',
    title: 'Reunión de entre semana',
    description: 'Preparar, asignar y publicar el programa Vida y Ministerio.',
    icon: <IconCalendarWeek color="var(--accent-main)" />,
    visible: (r) => r.isMidweekEditor,
    comingSoon: true,
    articles: [],
  },
  {
    id: 'fin-semana',
    title: 'Reunión de fin de semana',
    description: 'Discursos públicos locales, presidencias y Atalaya.',
    icon: <IconCalendarMonth color="var(--accent-main)" />,
    visible: (r) => r.isWeekendEditor,
    comingSoon: true,
    articles: [],
  },
  {
    id: 'discursos',
    title: 'Discursos y oradores',
    description: 'Coordinar discursantes salientes, oradores visitantes y el catálogo.',
    icon: <IconTalk color="var(--accent-main)" />,
    visible: (r) => r.isPublicTalkCoordinator,
    comingSoon: true,
    articles: [],
  },
  {
    id: 'departamentos',
    title: 'Departamentos',
    description: 'La programación de asignaciones de departamentos.',
    icon: <IconAssignment color="var(--accent-main)" />,
    visible: (r) => r.isDepartmentsEditor,
    comingSoon: true,
    articles: [],
  },
  {
    id: 'grupos',
    title: 'Grupos de predicación',
    description: 'Para superintendentes y auxiliares de grupo: informes y salidas de su grupo.',
    icon: <IconGroups color="var(--accent-main)" />,
    visible: (r) => r.isGroupOverseer,
    comingSoon: true,
    articles: [],
  },
  {
    id: 'personas',
    title: 'Personas y emergencias',
    description: 'Fichas de personas, datos de contacto y lista de emergencias.',
    icon: <IconPerson color="var(--accent-main)" />,
    visible: (r) => r.isPersonViewer,
    comingSoon: true,
    articles: [],
  },
  {
    id: 'territorios',
    title: 'Territorios',
    description: 'Para responsables: zonas, asignaciones, campañas y tarjetas.',
    icon: <IconMap color="var(--accent-main)" />,
    visible: (r) => r.isElder || r.isServiceCommittee,
    comingSoon: true,
    articles: [],
  },
  {
    id: 'limpieza',
    title: 'Limpieza y actividades',
    description: 'Programas de limpieza del salón y actividades de la congregación.',
    icon: <IconClean color="var(--accent-main)" />,
    visible: (r) => r.isElder || r.isServiceCommittee,
    comingSoon: true,
    articles: [],
  },
  {
    id: 'administracion',
    title: 'Administración',
    description: 'Copias de seguridad, restauración, accesos y mantenimiento.',
    icon: <IconAdmin color="var(--accent-main)" />,
    visible: (r) => r.isAdmin || r.isSettingsEditor,
    comingSoon: true,
    articles: [],
  },
];
