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
 * CONTENIDO DE LA AYUDA. Fase 1: Guía general (para todos) + secciones de rol
 * en preparación (de momento solo las ve el admin, con su etiqueta).
 *
 * Estilo de redacción: llano y directo, nombrando los botones EXACTAMENTE como
 * aparecen en pantalla, con pasos numerados cortos. Nada de jerga técnica.
 */

export const AYUDA_SECTIONS: AyudaSection[] = [
  // ════════════════════════════════════════════════════════════════════
  // GUÍA GENERAL (todos)
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
          { type: 'p', text: 'Elda Centro es la aplicación de nuestra congregación. Aquí puedes ver los programas de las reuniones y tus asignaciones, enviar tu informe de predicación cada mes, consultar los documentos de la congregación y mucho más, todo desde tu teléfono, tableta u ordenador.' },
          { type: 'p', text: 'Toda la información viaja cifrada de extremo a extremo: solo la congregación puede leerla. Y lo que hagas se guarda primero en tu dispositivo, así que la aplicación funciona incluso sin conexión; en cuanto vuelvas a tener internet, se pone al día sola.' },
          { type: 'tip', text: 'Puedes instalarla como una app normal: en iPhone, abre la página en Safari, toca el botón de compartir y elige "Añadir a pantalla de inicio". En Android, Chrome te ofrecerá "Instalar aplicación". Así la tendrás con su icono, a un toque.' },
        ],
      },
      {
        id: 'panel',
        title: 'El panel de inicio',
        blocks: [
          { type: 'p', text: 'Al entrar verás tu panel personal. Arriba, la tarjeta "MIS ASIGNACIONES" te avisa si tienes asignaciones pendientes de confirmar o próximas. Debajo, "ESTA SEMANA" muestra las reuniones con su día y hora; si tienes una parte, te la indica ahí mismo.' },
          { type: 'p', text: 'En "EXPLORAR" están las puertas a cada área: Reuniones, Predicación, Congregación, Discursos, Informes y Configuración. Según tus responsabilidades verás más o menos opciones: cada uno ve solo lo que necesita.' },
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
          { type: 'p', text: 'Si te asignan una parte, te llegará también como notificación (si las tienes activadas) y aparecerá en "MIS ASIGNACIONES" del panel. Ahí sale todo lo tuyo: partes de las reuniones, acomodadores, micrófonos, salidas de predicación y también la limpieza del salón cuando le toca a tu grupo.' },
          { type: 'p', text: 'En algunas asignaciones de la reunión de entre semana verás un botón "JW Library": te abre la aplicación JW Library para repasar el contenido de tu parte al momento. Normalmente te lleva a la semana exacta de tu asignación; si en algún caso te abre la Guía de actividades del bimestre en general (sin ir a la semana concreta), es simplemente porque el material de ese mes se importó de otra forma, no es un fallo de tu aplicación.' },
          { type: 'tip', text: 'Si activas "Añadir al calendario" en Mi cuenta, en cada asignación te aparecerá un botón para guardarla en el calendario de tu teléfono, y otro de "Añadir todo al calendario" para meterlas todas de golpe. Así te avisará tu propio calendario.' },
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
          { type: 'p', text: 'Si eres precursor regular verás además tu objetivo anual, las horas que te faltan y tu saldo. Junto al saldo hay una nota que aclara hasta qué mes está contado (el mes en curso no cuenta hasta que envías su informe), así que no te asustes si "parece" que vas peor de lo que vas.' },
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
        title: 'Documentos',
        blocks: [
          { type: 'p', text: 'En Congregación → Documentos están los documentos de utilidad de la congregación: los necesarios para los Exhibidores, formularios y cualquier otro documento que tenga que estar en PDF. Van organizados por categorías; tocas uno y se abre. Cuando hay algo nuevo, lo verás indicado.' },
        ],
      },
      {
        id: 'congregacion',
        title: 'Todo lo que hay en "Congregación"',
        blocks: [
          { type: 'p', text: 'La sección Congregación reúne la vida de la congregación más allá de las reuniones. Esto es lo que puedes encontrar (algunas cosas las ven todos y las editan solo los responsables):' },
          { type: 'p', text: 'PRÓXIMOS EVENTOS. El calendario de lo que viene: asambleas (de circuito, regionales e internacionales), la visita del superintendente de circuito, la Conmemoración, campañas especiales, semanas de precursores, cursos, programas especiales y cualquier otro evento. Cada evento muestra sus fechas y horarios, y según el tipo puede traer botones útiles: "JW Library" para abrir el programa del evento y "Google Maps" para llegar al lugar.' },
          { type: 'p', text: 'GRUPOS DE PREDICACIÓN. Los grupos con su superintendente, auxiliar y miembros. Un detalle útil: los precursores aparecen con su nombre en negrita.' },
          { type: 'p', text: 'RESPONSABILIDADES. Quién es quién: el cuerpo de ancianos, las responsabilidades de cada uno y los departamentos con sus encargados. Para saber a quién acudir para cada cosa.' },
          { type: 'p', text: 'LIMPIEZA DEL SALÓN. El programa de limpieza por grupos. Todos pueden consultarlo, y cuando le toca a tu grupo también te aparece en "MIS ASIGNACIONES" del panel.' },
          { type: 'p', text: 'PLAN DE EVACUACIÓN. El plan de emergencia del Salón del Reino: la estructura de mando, los equipos y lo que hay que saber por si alguna vez hay que desalojar. Merece una lectura tranquila una vez, para que el día que haga falta no sea la primera.' },
          { type: 'p', text: 'VISITA DEL SUPERINTENDENTE. Cuando se acerca una visita del superintendente de circuito (desde unas tres semanas antes y mientras dura), aquí verás el resumen con lo que necesitas saber: fechas, horarios y detalles del programa. Los ancianos ven información más completa, y los responsables la preparan desde aquí mismo.' },
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
            'Puntito verde (unos segundos): acabas de recibir o guardar lo último. Estás al día.',
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
          { type: 'p', text: 'Cuando hay una versión nueva, te aparece un aviso de "Actualización disponible" con el botón "Actualizar": tócalo y en unos segundos estarás en la última versión. La aplicación además busca novedades sola cada media hora.' },
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
          { type: 'p', text: 'En el menú de tu perfil (arriba a la derecha) → "Mi cuenta" tienes tus datos, tus sesiones abiertas (puedes cerrar las que no reconozcas) y varias opciones útiles:' },
          { type: 'p', text: 'PERIODOS DE AUSENCIA. Si vas a estar fuera unas fechas (viaje, salud...), apúntalas aquí. Así los hermanos que preparan los programas lo ven y no te asignan partes esos días. Es la forma más fácil de evitar cambios de última hora.' },
          { type: 'p', text: 'AÑADIR AL CALENDARIO. Si lo activas, en "MIS ASIGNACIONES" te aparecerán botones para guardar cada asignación (o todas de golpe) en el calendario de tu teléfono, con su fecha y hora.' },
          { type: 'p', text: 'Y en Configuración puedes cambiar entre tema claro y oscuro y ajustar otras preferencias personales. Un apunte para responsables: si necesitas imprimir programas o informes, en Configuración → "Ajustes de congregación" → "Materiales de reunión, formularios y programas" está la opción "Habilitar la exportación de programas e informes a PDF"; al activarla te aparecen los botones de exportar en las pantallas correspondientes.' },
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
  // SECCIONES POR ROL: Fase 2+ (en preparación; de momento solo las ve
  // el admin para validar la estructura)
  // ════════════════════════════════════════════════════════════════════
  {
    id: 'informes',
    title: 'Informes y asistencia',
    description: 'Recibir y verificar informes, registrar la asistencia, S-1, S-21 y S-88.',
    icon: <IconPublishersReports color="var(--accent-main)" />,
    visible: (r) => r.isSecretary || r.isAttendanceEditor,
    articles: [
      {
        id: 'flujo-informes',
        title: 'Cómo llegan los informes de los hermanos',
        blocks: [
          { type: 'p', text: 'Cuando un hermano envía su informe desde su aplicación, te llega al momento, sin papeles ni mensajes. Todo se gestiona en Informes → "Informes de predicación":' },
          { type: 'steps', items: [
            'Elige el mes arriba. Verás a todos los publicadores con el estado de su informe: recibido, pendiente de verificación o sin enviar.',
            'Abre un informe recibido para revisarlo (horas si es precursor, estudios, comentarios).',
            'Si está correcto, toca "Marcar como verificado". Los verificados son los que cuentan para el S-1 y el S-21.',
            'Para quien no usa la aplicación (o se le olvidó), abre su nombre y rellena tú el informe a mano; queda igual que si lo hubiera enviado él.',
          ] },
          { type: 'tip', text: 'Los contadores de arriba ("Informes recibidos", "Informes pendientes de verificación") te dicen de un vistazo cuánto falta por hacer del mes.' },
          { type: 'faq', q: 'Un hermano me avisa de que se equivocó en su informe ya enviado.', a: 'Puede corregirlo él y reenviarlo, o puedes abrirlo tú y corregirlo directamente. Si ya estaba verificado, revísalo y vuelve a marcarlo.' },
          { type: 'faq', q: '¿Qué es "Informe atrasado"?', a: 'Un informe de un mes anterior que llegó después del envío del S-1. Queda marcado para que sepas que ese mes se informó tarde a la sucursal.' },
        ],
      },
      {
        id: 'creditos-horas',
        title: 'Créditos de horas (LDC, Betel, escuelas…)',
        blocks: [
          { type: 'p', text: 'Los precursores con privilegios especiales de servicio (construcción/LDC, Betel, escuelas teocráticas…) pueden anotar horas de crédito además de las de predicación. En su informe aparecen separadas: horas de predicación por un lado y crédito por otro, normalmente con un comentario del tipo "40 Hrs. LDC".' },
          { type: 'steps', items: [
            'Abre el informe del precursor en el mes correspondiente.',
            'Revisa las horas de crédito indicadas (o añádelas tú con su comentario).',
            'Al aprobarlas, el crédito se suma automáticamente donde corresponde: su tarjeta S-21, su saldo de precursor y los totales.',
          ] },
          { type: 'tip', text: 'El crédito cuenta para el requisito del precursor, pero recuerda que en el S-1 las horas de la congregación se informan según las instrucciones de la sucursal, y la aplicación ya lo separa correctamente por ti.' },
        ],
      },
      {
        id: 'registrar-asistencia',
        title: 'Registrar la asistencia a las reuniones',
        blocks: [
          { type: 'p', text: 'En Informes → "Registros de asistencia" está el registro mensual. Cada mes tiene una casilla por cada reunión: las de entre semana arriba y las de fin de semana debajo, con la fecha de cada una.' },
          { type: 'steps', items: [
            'Elige el año de servicio y el mes.',
            'Escribe el número de presentes en la casilla de cada reunión (la reunión de esta semana aparece marcada con "Ahora").',
            'Si la congregación registra asistencia en línea por separado, activa "Registrar asistencia a reuniones en línea" en los ajustes rápidos y tendrás una casilla extra por reunión.',
            'Los totales y promedios del mes se calculan solos, y todo se guarda y sincroniza automáticamente.',
          ] },
          { type: 'warn', text: 'Importante: la asistencia va por MES NATURAL, como la pide la sucursal. Cada reunión cuenta en el mes de su FECHA. Por ejemplo, si el miércoles 1 de julio hay reunión, esa asistencia va en la primera casilla de JULIO, aunque esa semana empezara en junio. La aplicación ya te enseña las casillas correctas de cada mes; solo apunta cada reunión en su fecha.' },
          { type: 'faq', q: '¿Por qué un mes tiene 4 casillas y otro 5?', a: 'Porque tiene tantas casillas como reuniones de ese tipo caen dentro del mes. Un mes con cinco miércoles tendrá cinco casillas de entre semana.' },
        ],
      },
      {
        id: 'exportar-s88',
        title: 'El S-88 y el historial mensual',
        blocks: [
          { type: 'p', text: 'Debajo del registro mensual está el "Registro de asistencia a reunión de congregación (S-88)": el historial por años de servicio con número de reuniones, asistencia total y promedio de cada mes, calculado solo a partir de lo que registras.' },
          { type: 'steps', items: [
            'Toca "Exportar" arriba de la página.',
            'Elige "Exportar S-88" y el año o años de servicio.',
            'Se genera el PDF oficial listo para archivar o enviar.',
          ] },
          { type: 'p', text: 'También puedes exportar el "Informe de asistencia a las reuniones (S-3)" del mes desde la misma pantalla.' },
        ],
      },
      {
        id: 's1-sucursal',
        title: 'El informe a la sucursal (S-1)',
        blocks: [
          { type: 'p', text: 'En Informes → "Informes a la sucursal" preparas el informe mensual "Predicación y asistencia a las reuniones (S-1)". La aplicación lo rellena sola con los informes verificados del mes: publicadores que informaron, precursores auxiliares y regulares con sus horas y estudios, y la asistencia media.' },
          { type: 'steps', items: [
            'Elige el mes y toca "Crear informe S-1".',
            'Revisa las cifras (puedes compararlas con los contadores de Informes de predicación).',
            'Cópialas o expórtalas para enviarlas por jw.org como siempre.',
          ] },
          { type: 'tip', text: 'Verifica los informes ANTES de crear el S-1: solo los verificados entran en las cifras. Si después llega uno tardío, quedará como "Informe atrasado" y se suma al mes siguiente según las instrucciones.' },
          { type: 'p', text: 'En la misma zona tienes el "Análisis de la congregación (S-10)" con la evolución anual.' },
        ],
      },
      {
        id: 's21-registros',
        title: 'Registros de publicadores (S-21)',
        blocks: [
          { type: 'p', text: 'En Informes → "Registros de publicadores" está la tarjeta de cada hermano: sus informes mes a mes del año de servicio, con totales: el equivalente digital del S-21, siempre al día.' },
          { type: 'steps', items: [
            'Busca al hermano en la lista y abre su registro.',
            'Para imprimir o archivar: toca "Exportar S-21" en su tarjeta, o usa "Exportar múltiples registros de publicadores (S-21)" para generar varios de golpe (por grupos, precursores, todos…).',
          ] },
          { type: 'p', text: 'Arriba verás también el "Saldo de precursores": el acumulado de horas de cada precursor regular respecto a su objetivo, para animar o ayudar a quien lo necesite.' },
        ],
      },
      {
        id: 'solicitudes-precursor',
        title: 'Solicitudes de precursor auxiliar',
        blocks: [
          { type: 'p', text: 'Cuando un hermano solicita ser precursor auxiliar desde su aplicación, la solicitud llega a "Solicitudes de precursor" (en Congregación). El comité de servicio la revisa ahí mismo:' },
          { type: 'steps', items: [
            'Abre la solicitud para ver el mes (o si es de continuo).',
            'Apruébala o recházala. El hermano recibe la respuesta en su aplicación.',
            'Al aprobarla, el nombramiento queda registrado automáticamente en su ficha con sus fechas, y su informe de ese mes ya pedirá horas.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'entre-semana',
    title: 'Reunión de entre semana',
    description: 'Preparar, asignar y publicar el programa Vida y Ministerio Cristianos.',
    icon: <IconCalendarWeek color="var(--accent-main)" />,
    visible: (r) => r.isMidweekEditor,
    articles: [
      {
        id: 'ms-materiales',
        title: 'El material llega solo (y cómo traerlo a mano)',
        blocks: [
          { type: 'p', text: 'La aplicación descarga sola de jw.org el contenido de la guía Vida y Ministerio: las secciones de cada semana (Tesoros de la Biblia, Seamos mejores maestros, Nuestra vida cristiana), los temas, los tiempos y las canciones. Tú no tienes que copiar nada.' },
          { type: 'steps', title: 'Si una semana aún no aparece o quieres forzar la descarga:', items: [
            'Ve a Reuniones → "Materiales de reunión".',
            'Toca "Importar desde jw.org" (o "Importar desde archivo .jwpub" si lo tienes descargado).',
            'Espera a que termine y las semanas nuevas aparecerán en el programa.',
          ] },
          { type: 'tip', text: 'Mejor con .jwpub: si importas la Guía de actividades desde el archivo .jwpub, el botón "JW Library" que ven los hermanos en sus asignaciones los lleva a la SEMANA exacta de su parte. Si solo se importa desde jw.org, ese botón los deja en la Guía de actividades del bimestre, sin ir a la semana concreta. Merece la pena el .jwpub.' },
        ],
      },
      {
        id: 'ms-asignar',
        title: 'Asignar las partes de cada semana',
        blocks: [
          { type: 'steps', items: [
            'Entra en Reuniones → "Reunión de entre semana" y elige la semana.',
            'Toca cada parte (presidente, oraciones, Tesoros, asignaciones estudiantiles, Nuestra vida cristiana…) y elige al hermano de la lista.',
            'Al elegir, la lista te muestra el historial de cada uno (cuándo tuvo su última asignación de ese tipo) para repartir con equilibrio.',
            'Si hay clase auxiliar, verás columnas para la sala principal y la clase auxiliar.',
          ] },
          { type: 'tip', text: '¿Prisa? El botón "Autocompletar" rellena las asignaciones de un rango de semanas repartiendo según el historial. Después solo repasa y ajusta lo que quieras a mano.' },
          { type: 'faq', q: '¿Puedo quitar o cambiar una asignación ya hecha?', a: 'Sí: toca la parte y elige a otro hermano, o déjala vacía. Si el programa ya estaba publicado, vuelve a publicar para que el cambio les llegue a todos.' },
        ],
      },
      {
        id: 'ms-especiales',
        title: 'Semanas especiales (visita del superintendente, asambleas…)',
        blocks: [
          { type: 'p', text: 'Cada semana tiene un tipo. Además de la semana normal, puedes marcarla como "Visita del superintendente de circuito", "Asamblea de circuito", "Asamblea regional", "Conmemoración" o "Sin reunión", y la aplicación ajusta sola las partes que tocan (por ejemplo, en la visita del superintendente cambia el día de la reunión y añade su discurso de servicio).' },
          { type: 'steps', items: [
            'En la semana correspondiente, abre el selector del tipo de semana.',
            'Elige el tipo. Las partes que no aplican desaparecen y aparecen las especiales.',
          ] },
        ],
      },
      {
        id: 'ms-publicar',
        title: 'Publicar el programa (el paso que lo hace visible)',
        blocks: [
          { type: 'warn', text: 'Hasta que no PUBLICAS, los hermanos no ven nada: las asignaciones que preparas son un borrador privado tuyo. Publicar es lo que las hace llegar a todos.' },
          { type: 'steps', items: [
            'Cuando el programa esté listo, toca "Publicar".',
            'Elige las semanas que quieres publicar y confirma.',
            'A cada hermano con asignación le aparece en "MIS ASIGNACIONES" (y recibe su notificación).',
          ] },
        ],
      },
      {
        id: 'ms-imprimir',
        title: 'Imprimir y exportar (S-140 y S-89)',
        blocks: [
          { type: 'steps', items: [
            'En la pantalla del programa, toca "Exportar".',
            'Elige el rango de semanas y el formato: el programa en PDF (plantilla S-140) para el tablón, o las tarjetas S-89 para las asignaciones estudiantiles.',
          ] },
          { type: 'tip', text: 'Con la app, muchos hermanos ya no necesitan papel: ven su asignación en su teléfono en cuanto publicas. El S-89 impreso queda para quien lo prefiera.' },
        ],
      },
    ],
  },
  {
    id: 'fin-semana',
    title: 'Reunión de fin de semana',
    description: 'Discursos públicos, presidencias, Atalaya y oradores.',
    icon: <IconCalendarMonth color="var(--accent-main)" />,
    visible: (r) => r.isWeekendEditor,
    articles: [
      {
        id: 'fs-programar',
        title: 'Programar cada fin de semana',
        blocks: [
          { type: 'steps', items: [
            'Entra en Reuniones → "Reunión de fin de semana" y elige la semana.',
            'Asigna el presidente y, si corresponde, las oraciones.',
            'En "Discurso público", elige el orador: "Orador local" (de la congregación) u "Orador visitante" (de otra congregación, del catálogo).',
            'Al elegir orador, selecciona su discurso; la aplicación te muestra los que tiene preparados y te avisa si un tema se dio hace poco.',
            'Completa el Estudio de La Atalaya: conductor y lector.',
          ] },
          { type: 'tip', text: 'También aquí funciona "Autocompletar" para presidencias y lectores; los oradores conviene elegirlos a mano, porque dependen de acuerdos con otras congregaciones.' },
        ],
      },
      {
        id: 'fs-visitantes',
        title: 'Oradores visitantes y semanas sin orador',
        blocks: [
          { type: 'p', text: 'Los oradores visitantes salen del catálogo de congregaciones y oradores (ver la sección "Discursos y oradores" si también coordinas eso). Aquí solo los eliges; si el hermano que esperabas falla, usa "Orador sustituto" para dejar constancia del cambio.' },
          { type: 'faq', q: '¿Y si una semana no hay discurso público?', a: 'Marca el tipo de semana correspondiente (asamblea, visita del superintendente, "Discurso público solamente", "Sin reunión"…) y la aplicación ajusta las partes.' },
        ],
      },
      {
        id: 'fs-publicar',
        title: 'Publicar e imprimir',
        blocks: [
          { type: 'warn', text: 'Igual que en la reunión de entre semana: hasta que no tocas "Publicar", nadie ve el programa. Publica cuando esté listo y a cada hermano le llegará su parte.' },
          { type: 'steps', items: [
            'Toca "Publicar" y elige las semanas.',
            'Para el tablón o el archivo: "Exportar" → "Programa de la reunión del fin de semana" en PDF.',
          ] },
        ],
      },
    ],
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
