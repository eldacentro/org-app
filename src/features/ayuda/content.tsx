import {
  IconAdmin,
  IconAssignment,
  IconCalendarWeek,
  IconClean,
  IconCloudDownload,
  IconDuties,
  IconGroups,
  IconCart,
  IconHelp,
  IconInTerritory,
  IconMapOverview,
  IconPerson,
  IconPodium,
  IconPublishersReports,
  IconRestart,
  IconTalk,
  IconTreasuresPart,
} from '@icons/index';
import { AyudaSection } from '@definition/ayuda';

/**
 * CONTENIDO DE LA AYUDA.
 *
 * Una sección por área de la aplicación, y cada una visible solo para quien
 * tiene ese encargo (ver `visible`). La "Guía general" la ve todo el mundo.
 *
 * Estilo de redacción: llano y directo, nombrando los botones EXACTAMENTE como
 * aparecen en pantalla, con pasos numerados cortos. Nada de jerga técnica.
 *
 * **El icono de cada sección es el MISMO que usa la página en su panel de
 * categoría.** Si en «Predicación» Salidas de predicación se dibuja con
 * `IconInTerritory`, aquí también: un icono distinto para la misma cosa hace
 * dudar de si se está hablando de otra pantalla.
 */

export const AYUDA_SECTIONS: AyudaSection[] = [
  // ════════════════════════════════════════════════════════════════════
  // GUÍA GENERAL (todos)
  // ════════════════════════════════════════════════════════════════════
  {
    id: 'general',
    title: 'Guía general',
    description:
      'Lo esencial para todos: el panel, tu informe, tus asignaciones y cómo cuidar la aplicación.',
    icon: <IconHelp color="var(--accent-main)" />,
    visible: () => true,
    articles: [
      {
        id: 'que-es',
        title: '¿Qué es esta aplicación?',
        blocks: [
          {
            type: 'p',
            text: 'Elda Centro es la aplicación de nuestra congregación. Aquí puedes ver los programas de las reuniones y tus asignaciones, enviar tu informe de predicación cada mes, consultar los documentos de la congregación y mucho más, todo desde tu teléfono, tableta u ordenador.',
          },
          {
            type: 'p',
            text: 'Toda la información viaja cifrada de extremo a extremo: solo la congregación puede leerla. Y lo que hagas se guarda primero en tu dispositivo, así que la aplicación funciona incluso sin conexión; en cuanto vuelvas a tener internet, se pone al día sola.',
          },
          {
            type: 'tip',
            text: 'Puedes instalarla como una app normal: en iPhone, abre la página en Safari, toca el botón de compartir y elige "Añadir a pantalla de inicio". En Android, Chrome te ofrecerá "Instalar aplicación". Así la tendrás con su icono, a un toque.',
          },
        ],
      },
      {
        id: 'panel',
        title: 'El panel de inicio',
        blocks: [
          {
            type: 'p',
            // En el panel de inicio estos tres rótulos SÍ salen en mayúsculas
            // (`.assign-card .txt .lab` y `.section-label .t` los ponen con
            // text-transform), así que aquí van como se leen en pantalla. En
            // el resto de la Ayuda "Mis asignaciones" va en minúsculas, que es
            // como sale en la tarjeta de Reuniones.
            text: 'Al entrar verás tu panel personal. Arriba, "MIS ASIGNACIONES" te avisa si tienes asignaciones pendientes de confirmar o próximas. Debajo, "ESTA SEMANA" muestra las reuniones con su día y hora; si tienes una parte, te la indica ahí mismo.',
          },
          {
            type: 'p',
            text: 'En "EXPLORAR" están las puertas a cada área: Reuniones, Predicación, Congregación, Discursos, Informes y Configuración. Según tus responsabilidades verás más o menos opciones: cada uno ve solo lo que necesita.',
          },
        ],
      },
      {
        id: 'asignaciones',
        title: 'Ver mis asignaciones y los programas',
        blocks: [
          {
            type: 'steps',
            title: 'Para ver los programas de las reuniones:',
            items: [
              'En el panel, toca "Programas semanales" (o entra en Reuniones).',
              'Muévete entre semanas con las flechas o el selector de fechas.',
              'Tus partes aparecen destacadas con tu nombre.',
            ],
          },
          {
            type: 'link',
            to: '/weekly-schedules',
            label: 'Ver los programas semanales',
          },
          {
            type: 'p',
            text: '"Programas semanales" no es solo la reunión: en la misma pantalla, según cada semana, también salen el programa de departamentos, el de exhibidores y el de salidas de predicación. Es el sitio único donde consultar cualquier programa de la congregación.',
          },
          {
            type: 'p',
            text: 'Si te asignan una parte, te llegará también como notificación (si las tienes activadas) y aparecerá en "MIS ASIGNACIONES" del panel. Ahí sale todo lo tuyo: partes de las reuniones, acomodadores, micrófonos, salidas de predicación y también la limpieza del salón cuando le toca a tu grupo.',
          },
          {
            type: 'p',
            text: 'En algunas asignaciones de la reunión de entre semana verás un botón "JW Library": te abre la aplicación JW Library para repasar el contenido de tu parte al momento. Normalmente te lleva a la semana exacta de tu asignación; si en algún caso te abre la Guía de actividades del bimestre en general (sin ir a la semana concreta), es simplemente porque el material de ese mes se importó de otra forma, no es un fallo de tu aplicación.',
          },
          {
            type: 'tip',
            text: 'Si activas "Añadir al calendario" en Mi cuenta, en cada asignación te aparecerá un botón para guardarla en el calendario de tu teléfono, y otro de "Añadir todo al calendario" para meterlas todas de golpe. Así te avisará tu propio calendario.',
          },
          {
            type: 'faq',
            q: '¿Por qué no veo todavía el programa del mes que viene?',
            a: 'Los programas aparecen cuando los hermanos responsables los preparan y publican. Si no está, simplemente aún no se ha publicado.',
          },
        ],
      },
      {
        id: 'informe',
        title: 'Enviar mi informe de predicación',
        blocks: [
          {
            type: 'p',
            text: 'Cada principio de mes toca enviar el informe del mes anterior. Se hace en un minuto:',
          },
          {
            type: 'steps',
            items: [
              'Entra en "Predicación" desde el panel y abre "Informe de predicación".',
              'Arriba puedes mirarlo por "Día", por "Mes" o por "Año". Comprueba que estás en el mes correcto.',
              'Si eres publicador: marca la casilla "Marque la casilla si participó en alguna faceta de la predicación durante el mes". Añade tus cursos bíblicos si diriges alguno.',
              'Si eres precursor: apunta también las horas. Puedes ir metiéndolas día a día en la vista "Día" y la aplicación las suma sola.',
              'Toca "Enviar". ¡Listo! Le llega directamente al secretario.',
            ],
          },
          {
            type: 'link',
            to: '/ministry-report',
            label: 'Abrir mi informe de predicación',
          },
          {
            type: 'tip',
            text: 'No hace falta esperar a fin de mes para sentarse a hacer cuentas: apunta lo del día en la vista "Día" según vas, y el último día solo revisas y envías.',
          },
          {
            type: 'faq',
            q: 'Me equivoqué, ¿puedo corregirlo?',
            a: 'Sí. Una vez enviado, el botón pasa a poner "Deshacer envío": tócalo, corrige y vuelve a enviar. Si el secretario ya lo verificó, coméntaselo para que lo ajuste él.',
          },
        ],
      },
      {
        id: 'registro-servicio',
        title: 'Mi registro de servicio y el año de servicio',
        blocks: [
          {
            type: 'p',
            text: 'Tu historial está en la misma pantalla del informe: cambia arriba a la vista "Año" y verás todos tus informes del año de servicio (que va de septiembre a agosto) con sus totales.',
          },
          {
            type: 'p',
            text: 'Si eres precursor regular verás además tu objetivo anual, las horas que te faltan y tu saldo. Junto al saldo hay una nota que aclara hasta qué mes está contado (el mes en curso no cuenta hasta que envías su informe), así que no te asustes si "parece" que vas peor de lo que vas.',
          },
        ],
      },
      {
        id: 'precursor-auxiliar',
        title: 'Solicitar ser precursor auxiliar',
        blocks: [
          {
            type: 'steps',
            items: [
              'Entra en "Predicación" desde el panel.',
              'Toca "Solicitud de precursor auxiliar".',
              'Elige el mes (o de continuo), revisa y envía.',
            ],
          },
          {
            type: 'link',
            to: '/auxiliary-pioneer-application',
            label: 'Abrir la solicitud',
          },
          {
            type: 'p',
            text: 'La solicitud les llega a los hermanos del comité de servicio, y recibirás la respuesta en la propia aplicación.',
          },
        ],
      },
      {
        id: 'documentos',
        title: 'Documentos',
        blocks: [
          {
            type: 'p',
            text: 'En Congregación → Documentos están los documentos de utilidad de la congregación: los necesarios para los Exhibidores, formularios y cualquier otro documento que tenga que estar en PDF. Van organizados por categorías; tocas uno y se abre. Cuando hay algo nuevo, lo verás indicado.',
          },
          {
            type: 'link',
            to: '/congregation/documentos',
            label: 'Abrir Documentos',
          },
        ],
      },
      {
        id: 'congregacion',
        title: 'Todo lo que hay en "Congregación"',
        blocks: [
          {
            type: 'p',
            text: 'La sección Congregación reúne la vida de la congregación más allá de las reuniones. Esto es lo que puedes encontrar (algunas cosas las ven todos y las editan solo los responsables):',
          },
          {
            type: 'p',
            text: '"Próximos eventos". El calendario de lo que viene: asambleas, la visita del superintendente de circuito, la Conmemoración, campañas especiales y cualquier otro evento. Cada uno muestra sus fechas y horarios, y según el tipo puede traer botones útiles: "JW Library" para abrir el programa del evento y "Google Maps" para llegar al lugar.',
          },
          {
            type: 'p',
            text: '"Grupos de predicación". Los grupos con sus miembros. Los precursores aparecen con su nombre en negrita, y debajo del nombre del responsable pone "Superintendente de grupo" (o "Siervo de grupo") y "Auxiliar del superintendente".',
          },
          {
            type: 'p',
            text: '"Responsabilidades". Quién es quién: los departamentos con su responsable, su auxiliar y su equipo. Para saber a quién acudir para cada cosa.',
          },
          {
            type: 'p',
            text: '"Limpieza del Salón". El programa de limpieza por grupos. Todos pueden consultarlo, y cuando le toca a tu grupo también te aparece en "Mis asignaciones" del panel.',
          },
          {
            type: 'p',
            text: '"Plan de evacuación". El plan de emergencia del Salón del Reino: el plano, la estructura de mando, los equipos y los procedimientos por si alguna vez hay que desalojar. Merece una lectura tranquila una vez, para que el día que haga falta no sea la primera.',
          },
          {
            type: 'p',
            text: '"Documentos". Los PDF de la congregación, por categorías. Cuando hay alguno nuevo que no has abierto, la tarjeta lleva un puntito.',
          },
          {
            type: 'p',
            text: 'Los ancianos ven ahí además "Personas", "Ausencias", "Solicitudes de precursor" y "Visita del superintendente", que son cosas suyas.',
          },
        ],
      },
      {
        id: 'territorios-hermanos',
        title: 'Territorios: pedir, devolver y consultar el mapa',
        blocks: [
          {
            type: 'p',
            text: 'Cualquier publicador puede pedir un territorio desde la propia aplicación, sin tener que hablar antes con nadie. En Congregación → Territorios verás la sección "Mis territorios" con lo que tengas asignado ahora mismo.',
          },
          {
            type: 'link',
            to: '/congregation/territories',
            label: 'Abrir Territorios',
          },
          {
            type: 'steps',
            title: 'Para pedir uno nuevo:',
            items: [
              'Toca "Solicitar territorio" (arriba de la pantalla).',
              'Añade una nota si quieres (por ejemplo, si prefieres una zona) y envía.',
              'Espera: la solicitud le llega a los responsables, y ellos son quienes eligen y te asignan el territorio. Tú no eliges el número ni la zona directamente.',
            ],
          },
          {
            type: 'tip',
            text: 'Solo puedes tener una solicitud pendiente a la vez. Si ya pediste uno y aún no te lo han asignado, espera a que se resuelva antes de pedir otro.',
          },
          {
            type: 'p',
            text: 'Cada territorio asignado aparece como una tarjeta con su zona y número, la fecha en que te lo entregaron y la fecha en que vence. Si es un territorio de campaña especial, lleva la etiqueta "Campaña"; si llevas mucho tiempo con él, puede aparecer marcado como "Atrasado".',
          },
          {
            type: 'steps',
            title: 'Para devolverlo cuando termines:',
            items: [
              'Toca "Entregar" en la tarjeta del territorio.',
              'Elige "Entregar (trabajado)" si lo terminaste, o "Devolver sin trabajar" si no pudiste avanzar.',
              'Añade una nota si quieres y confirma.',
            ],
          },
          {
            type: 'warn',
            text: 'En algunas congregaciones esta opción está reservada a los responsables. Si al tocar "Entregar" ves que el botón está desactivado con el aviso "Solo un responsable puede marcar este territorio como entregado", avísale a quien lleve Territorios para que lo complete él.',
          },
          {
            type: 'p',
            text: 'Si tu congregación lo tiene activado, también puedes ver (sin poder editar) los territorios que llevan tus compañeros de grupo, en la sección "Territorios del grupo".',
          },
          {
            type: 'steps',
            title: 'Ver el territorio (mapa, imagen e información):',
            items: [
              'Toca "Ver territorio" en cualquier tarjeta.',
              'Se abre con tres pestañas: "Mapa", "Imagen" e "Info".',
              'En "Info" están las viviendas, las notas y las direcciones de "No visitar" de ese territorio, cada una con su etiqueta.',
            ],
          },
          {
            type: 'tip',
            text: 'Si tu congregación lo permite, puedes añadir tú mismo una dirección nueva en "Nueva dirección (No visitar)", en esa misma pestaña. Según cómo esté configurado, puede quedar pendiente de que un responsable la apruebe antes de valer para todos.',
          },
          {
            type: 'faq',
            q: '¿Puedo elegir qué territorio quiero?',
            a: 'No directamente: pides uno con "Solicitar territorio" y el responsable decide cuál te da, aunque puedes indicar tu preferencia en la nota de la solicitud.',
          },
        ],
      },
      {
        id: 'sincronizacion',
        title: 'La sincronización (y qué significa cada indicador)',
        blocks: [
          {
            type: 'p',
            text: 'No tienes que hacer nada para sincronizar: todo lo que guardas se sube solo en segundos, y lo que cambian otros te llega solo también. Los indicadores del botón de tu perfil (arriba a la derecha) te cuentan el estado:',
          },
          { type: 'diagram', kind: 'sync' },
          {
            type: 'p',
            text: 'Si quieres confirmarlo tú mismo, abre el menú de tu perfil y toca "Sincronizar datos": en un par de segundos verás "Todo actualizado".',
          },
          {
            type: 'warn',
            text: 'Si el aro naranja o el circulito azul están visibles, no cierres la aplicación todavía: espera unos segundos a que tus cambios terminen de subirse.',
          },
        ],
      },
      {
        id: 'actualizar',
        title: 'Mantener la aplicación actualizada',
        blocks: [
          {
            type: 'p',
            text: 'Cuando hay una versión nueva, te aparece un aviso de "Actualización disponible" con el botón "Actualizar": tócalo y en unos segundos estarás en la última versión. La aplicación además busca novedades sola cada media hora.',
          },
          {
            type: 'steps',
            title: 'Para forzar la comprobación a mano:',
            items: [
              'Abre el menú de tu perfil (arriba a la derecha).',
              'Toca "Acerca de la aplicación".',
              'Toca "Actualizar la aplicación". Si ya estás al día, simplemente se recarga.',
            ],
          },
          {
            type: 'iconrow',
            items: [
              {
                icon: (
                  <IconRestart color="var(--black)" width={22} height={22} />
                ),
                text: 'Actualizar la aplicación: busca e instala la última versión.',
              },
              {
                icon: (
                  <IconCloudDownload
                    color="var(--black)"
                    width={22}
                    height={22}
                  />
                ),
                text: 'Volver a descargar los datos: recupera todo desde el servidor si algo no se ve bien.',
              },
            ],
          },
          {
            type: 'faq',
            q: '¿Y "Volver a descargar los datos"?',
            a: 'Es una herramienta de recuperación: vuelve a traer TODA la información de la congregación desde el servidor. Solo úsala si algo no se ve bien, y ten paciencia porque tarda un poco. Para el día a día no hace falta nunca.',
          },
        ],
      },
      {
        id: 'jw-library',
        title: 'Abrir la reunión en JW Library',
        blocks: [
          {
            type: 'p',
            text: 'En «Programas semanales», cada semana lleva un botón de JW Library. Al pulsarlo se abre esa misma semana dentro de la aplicación JW Library, con el material de la reunión.',
          },
          {
            type: 'tip',
            text: 'Necesitas tener JW Library instalada en el mismo dispositivo. Si no la tienes, el botón no puede hacer nada.',
          },
          {
            type: 'faq',
            q: 'A veces el botón lleva a la semana y otras veces no. ¿Por qué?',
            a: 'El identificador exacto de la semana solo viene cuando el material se ha descargado de JW.org. Si esa semana aún no ha llegado, el enlace abre JW Library pero no puede colocarse en la semana concreta.',
          },
        ],
      },
      {
        id: 'pestana-visita',
        title: 'La pestaña de la visita del superintendente',
        blocks: [
          {
            type: 'p',
            text: 'Cuando se acerca la visita del superintendente de circuito, en «Programas semanales» aparece sola una pestaña llamada «Visita del superintendente» con el programa de esa semana: el día al que se traslada la reunión de entre semana, el discurso de servicio y el discurso especial del fin de semana.',
          },
          {
            type: 'p',
            text: 'La pestaña se abre dos meses antes de que empiece la visita y se va sola el día después de terminar. No hay que hacer nada para que salga ni para que desaparezca.',
          },
          {
            type: 'tip',
            text: 'Ahí tienes lo que te toca saber: los días, los horarios y el programa de esa semana. Lo que organiza el cuerpo de ancianos —las comidas, los acompañantes, las visitas de pastoreo— se lleva aparte, y si te toca algo te lo dirán ellos.',
          },
        ],
      },
      {
        id: 'limpieza-publicador',
        title: 'Cuándo le toca limpiar a mi grupo',
        blocks: [
          {
            type: 'p',
            text: 'Si a tu grupo le toca la limpieza en los próximos días, te sale como una asignación más en «Mis asignaciones», en el inicio. No hay que ir a mirar ninguna lista.',
          },
          {
            type: 'p',
            text: 'Y en «Limpieza del Salón», dentro de Congregación, tienes el calendario completo del mes con el grupo que le toca cada reunión.',
          },
          {
            type: 'link',
            to: '/congregation/limpieza',
            label: 'Abrir Limpieza del Salón',
          },
        ],
      },
      {
        id: 'perfil',
        title: 'Mi cuenta y ajustes personales',
        blocks: [
          {
            type: 'p',
            text: 'En el menú de tu perfil (arriba a la derecha) → "Mi cuenta" tienes tus datos, tus sesiones abiertas (puedes cerrar las que no reconozcas) y varias opciones útiles:',
          },
          {
            type: 'p',
            text: 'Periodos de ausencia. Si vas a estar fuera unas fechas (viaje, salud…), apúntalas aquí. A quien prepare un programa le saldrá un aviso al asignarte algo esos días. Ojo: es un aviso, no un candado — la aplicación deja asignar igual, así que apuntar la ausencia ayuda pero no garantiza nada.',
          },
          {
            type: 'p',
            text: 'Añadir al calendario. Si lo activas, en "Mis asignaciones" te aparecerán botones para guardar cada asignación (o todas de golpe) en el calendario de tu teléfono, con su fecha y hora.',
          },
          {
            type: 'p',
            text: 'En "Mi cuenta" también eliges el tema claro u oscuro y otras preferencias personales. Un apunte para responsables: ahí mismo está "Habilitar exportación a PDF para mi cuenta", que te enciende los botones de exportar solo a ti, sin cambiárselo a nadie más. Para toda la congregación de golpe, eso se hace en Configuración → "Ajustes de congregación".',
          },
        ],
      },
      {
        id: 'problemas',
        title: 'Si algo no va bien',
        blocks: [
          {
            type: 'faq',
            q: 'No me aparece un cambio que hizo otro hermano.',
            a: 'Dale a "Sincronizar datos" en el menú del perfil. Si sigue sin aparecer, comprueba que tienes conexión y que la app está actualizada (Acerca de la aplicación → Actualizar la aplicación).',
          },
          {
            type: 'faq',
            q: 'La aplicación se ve rara o anticuada.',
            a: 'Casi siempre es una versión vieja: menú del perfil → Acerca de la aplicación → "Actualizar la aplicación".',
          },
          {
            type: 'faq',
            q: 'Algo se ve mal incluso después de actualizar.',
            a: 'Usa "Volver a descargar los datos" (en Acerca de la aplicación) para recuperar toda la información fresca del servidor.',
          },
          {
            type: 'faq',
            q: 'Nada de esto lo arregla.',
            a: 'Escríbele a Carlos Saca Jr. contándole qué pasa y, si puedes, con una captura de pantalla. Cuanto más concreto, más rápido se arregla.',
          },
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
    description:
      'Recibir y verificar informes, el S-1, el S-21 y el S-88 de asistencia.',
    icon: <IconPublishersReports color="var(--accent-main)" />,
    // Solo el secretario (que ya engloba a coordinador y administrador). Antes
    // también la veía quien solo lleva el registro de asistencia, y de las
    // nueve cosas que se explican aquí solo podía hacer una: los informes de
    // predicación, el S-1 y el S-21 no le dejan ni entrar. Lo suyo está en la
    // sección "Asistencia a las reuniones".
    visible: (r) => r.isSecretary,
    articles: [
      {
        id: 'flujo-informes',
        title: 'Cómo llegan los informes de los hermanos',
        blocks: [
          {
            type: 'p',
            text: 'Cuando un hermano envía su informe desde su aplicación, te llega al momento, sin papeles ni mensajes. Todo se gestiona en Informes → "Informes de predicación":',
          },
          {
            type: 'steps',
            items: [
              'Elige el mes arriba. Verás a todos los publicadores con el estado de su informe: recibido, pendiente de verificación o sin enviar.',
              'Abre un informe recibido para revisarlo (horas si es precursor, estudios, comentarios).',
              'Si está correcto, toca "Marcar como verificado". Los verificados son los que cuentan para el S-1 y el S-21.',
              'Para quien no usa la aplicación (o se le olvidó), abre su nombre y rellena tú el informe a mano; queda igual que si lo hubiera enviado él.',
            ],
          },
          {
            type: 'link',
            to: '/reports/field-service',
            label: 'Abrir Informes de predicación',
          },
          {
            type: 'tip',
            text: 'El bloque "Informes recibidos" de arriba lleva una barra de cuántos van sobre el total de publicadores, y debajo, en naranja, cuántos están recibidos pero SIN verificar: esos no cuentan en el S-1 hasta que los verifiques.',
          },
          {
            type: 'faq',
            q: 'Un hermano me avisa de que se equivocó en su informe ya enviado.',
            a: 'Puede corregirlo él y reenviarlo, o puedes abrirlo tú y corregirlo directamente. Si ya estaba verificado, revísalo y vuelve a marcarlo.',
          },
          {
            type: 'faq',
            q: '¿Qué es "Informe atrasado"?',
            a: 'Un informe de un mes anterior que llegó después del envío del S-1. Queda marcado para que sepas que ese mes se informó tarde a la sucursal.',
          },
        ],
      },
      {
        id: 'activo-inactivo',
        title: 'Publicador activo e inactivo',
        blocks: [
          {
            type: 'p',
            text: 'La aplicación considera inactivo a quien lleva seis meses seguidos sin informar. No hay que marcarlo a mano: se calcula solo a partir de los informes que van llegando.',
          },
          {
            type: 'p',
            text: 'En cuanto vuelve a entregar un informe, deja de estar inactivo automáticamente. Tampoco hay que deshacer nada.',
          },
          {
            type: 'warn',
            text: 'Estar inactivo no borra nada suyo: sus informes anteriores, su tarjeta S-21 y su historial siguen enteros. Es una etiqueta que ayuda a ver a quién hay que visitar, no una baja.',
          },
        ],
      },
      {
        id: 'informes-redundancia',
        title: 'Un informe no depende de que una sola persona abra la aplicación',
        blocks: [
          {
            type: 'p',
            text: 'Cuando un hermano envía su informe, este queda esperando en el servidor hasta que alguien con permiso abre la aplicación y sincroniza. Ese alguien puede ser el secretario, el coordinador o un administrador — el primero que entre.',
          },
          {
            type: 'p',
            text: 'Quien lo recoge lo convierte en informe de la congregación, y a partir de ahí se sincroniza con todos los demás. Así, si el secretario está de viaje o no abre la aplicación en unos días, el informe no se queda parado.',
          },
          {
            type: 'tip',
            text: 'Si un hermano dice que envió su informe y no lo ves, lo primero es sincronizar. Si aun así no aparece, pídele que abra su informe y compruebe que pone «Enviado».',
          },
        ],
      },
      {
        id: 'creditos-horas',
        title: 'Créditos de horas (LDC, Betel, escuelas…)',
        blocks: [
          {
            type: 'p',
            text: 'Los precursores con privilegios especiales de servicio pueden anotar horas de crédito además de las de predicación. En su informe van separadas: las horas de predicación por un lado y el crédito por otro, y el crédito se desglosa por motivo — "Asignaciones teocráticas", "Escuela de precursor", "Escuela para Evangelizadores del Reino", "Clase de idioma" u "Otro", donde se escribe el motivo a mano.',
          },
          {
            type: 'steps',
            items: [
              'Abre el informe del precursor en el mes correspondiente.',
              'Revisa las entradas de crédito, cada una con su motivo y sus horas (o añádelas tú).',
              'El total del crédito es lo que cuenta para el requisito del precursor, y va a su tarjeta S-21 y a su saldo.',
            ],
          },
          {
            type: 'tip',
            text: 'El motivo ya no se escribe al final del comentario, como se hacía antes con los "25 Hrs. LDC" que venían del programa antiguo. Cada motivo es su propia entrada, así que el comentario queda libre para lo que de verdad haya que explicar.',
          },
          {
            type: 'tip',
            text: 'El crédito cuenta para el requisito del precursor, pero recuerda que en el S-1 las horas de la congregación se informan según las instrucciones de la sucursal, y la aplicación ya lo separa correctamente por ti.',
          },
        ],
      },
      {
        id: 'exportar-s88',
        title: 'El S-88 y el historial mensual',
        blocks: [
          {
            type: 'p',
            text: 'Al lado del registro mensual está el historial por años de servicio, con el número de reuniones, la asistencia total y el promedio de cada mes, calculado solo a partir de lo que se registra.',
          },
          {
            type: 'p',
            text: 'El botón "Exportar" de la barra de arriba saca el S-88 en PDF de una vez, sin más preguntas, listo para archivar o enviar. Ese botón es solo del secretario: quien únicamente lleva el registro de asistencia apunta los números, pero no exporta.',
          },
        ],
      },
      {
        id: 's1-sucursal',
        title: 'El informe a la sucursal (S-1)',
        blocks: [
          {
            type: 'p',
            text: 'En Informes → "Informes a la sucursal" preparas el informe mensual "Predicación y asistencia a las reuniones (S-1)". La aplicación lo rellena sola con los informes verificados del mes: publicadores que informaron, precursores auxiliares y regulares con sus horas y estudios, y la asistencia media.',
          },
          {
            type: 'steps',
            items: [
              'Elige el mes y, en el selector de informe, "Predicación y asistencia a las reuniones (S-1)".',
              'Toca "Generar". Si ya lo habías generado y después ha cambiado algo, el botón pone "Regenerar".',
              'Revisa las cifras (puedes compararlas con los contadores de Informes de predicación).',
              'El botón "JW Hub" te lleva a enviarlo como siempre. Cuando ya lo hayas mandado, marca "Enviado" para que quede constancia; si te equivocaste, "Deshacer envío".',
            ],
          },
          {
            type: 'link',
            to: '/reports/branch-office',
            label: 'Abrir Informes a la sucursal',
          },
          {
            type: 'tip',
            text: 'Verifica los informes ANTES de generar el S-1: solo los verificados entran en las cifras. Si después llega uno tardío, márcalo como "Informe atrasado" y se incluirá solo en el envío del mes siguiente.',
          },
          {
            type: 'p',
            text: 'En el mismo selector tienes el "Análisis de la congregación (S-10)" con la evolución anual.',
          },
        ],
      },
      {
        id: 's21-registros',
        title: 'Registros de publicadores (S-21)',
        blocks: [
          {
            type: 'p',
            text: 'En Informes → "Registros de publicadores" está la tarjeta de cada hermano: sus informes mes a mes del año de servicio, con totales: el equivalente digital del S-21, siempre al día.',
          },
          {
            type: 'steps',
            items: [
              'Busca al hermano en la lista y abre su registro. Desde ahí puedes exportar solo el suyo.',
              'Para sacar varios de golpe, toca "Exportar S-21" en la barra de arriba: se abre "Exportar múltiples registros de publicadores (S-21)", donde eliges entre "Todos los publicadores", "Publicadores específicos" (los vas marcando uno a uno) o las tarjetas de totales de la congregación.',
            ],
          },
          {
            type: 'link',
            to: '/publisher-records',
            label: 'Abrir Registros de publicadores',
          },
          {
            type: 'p',
            text: 'En la misma pantalla está el "Saldo de precursores": el acumulado de horas de cada precursor regular respecto a su objetivo, para animar o ayudar a quien lo necesite.',
          },
        ],
      },
      {
        id: 'solicitudes-precursor',
        title: 'Solicitudes de precursor auxiliar',
        blocks: [
          {
            type: 'p',
            text: 'Cuando un hermano solicita ser precursor auxiliar desde su aplicación, la solicitud llega a Congregación → "Solicitudes de precursor" (la pantalla se titula "Solicitudes de precursor auxiliar"). La ven los ancianos, con dos pestañas: las nuevas y las ya aprobadas.',
          },
          {
            type: 'steps',
            items: [
              'Abre la solicitud para ver el mes (o si es de continuo).',
              'Toca "Aprobar" o "Rechazar". El hermano recibe la respuesta en su aplicación.',
              'Al aprobarla, el nombramiento queda registrado automáticamente en su ficha con sus fechas, y su informe de ese mes ya pedirá horas.',
            ],
          },
        ],
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════
  // ASISTENCIA (quien lleva el registro de asistencia)
  // ════════════════════════════════════════════════════════════════════
  // Aparte de "Informes y asistencia" a propósito: el rol de registro de
  // asistencia solo abre ESTA pantalla. Los informes de predicación, el S-1 y
  // el S-21 le rebotan al inicio, así que explicárselos era enseñarle puertas
  // cerradas. El secretario, que ya es editor de asistencia, ve las dos.
  {
    id: 'asistencia',
    title: 'Asistencia a las reuniones',
    description: 'Apuntar cuántos asisten a cada reunión, mes a mes.',
    icon: <IconGroups color="var(--accent-main)" />,
    visible: (r) => r.isAttendanceEditor,
    articles: [
      {
        id: 'registrar-asistencia',
        title: 'Registrar la asistencia a las reuniones',
        blocks: [
          {
            type: 'p',
            text: 'En Informes → "Registro de asistencia" está el registro mensual, en el bloque "Registros de asistencia". Cada mes tiene una casilla por cada reunión: las de entre semana arriba y las de fin de semana debajo, con la fecha de cada una.',
          },
          {
            type: 'steps',
            items: [
              'Elige el año de servicio y el mes.',
              'Escribe el número de presentes en la casilla de cada reunión.',
              'Ya está: no hay botón de guardar. Los totales y promedios del mes se calculan solos y se sincroniza con los demás al momento.',
            ],
          },
          {
            type: 'link',
            to: '/reports/meeting-attendance',
            label: 'Abrir Registro de asistencia',
          },
          {
            type: 'warn',
            text: 'Importante: la asistencia va por MES NATURAL, como la pide la sucursal. Cada reunión cuenta en el mes de su FECHA. Por ejemplo, si el miércoles 1 de julio hay reunión, esa asistencia va en la primera casilla de JULIO, aunque esa semana empezara en junio. La aplicación ya te enseña las casillas correctas de cada mes; solo apunta cada reunión en su fecha.',
          },
          {
            type: 'faq',
            q: '¿Por qué un mes tiene 4 casillas y otro 5?',
            a: 'Porque tiene tantas casillas como reuniones de ese tipo caen dentro del mes. Un mes con cinco miércoles tendrá cinco casillas de entre semana.',
          },
          {
            type: 'faq',
            q: '¿Y los que siguen la reunión por videoconferencia?',
            a: 'Se pueden apuntar aparte, pero eso lo enciende el secretario: con "Registrar asistencia a reuniones en línea" cada reunión pasa a tener una casilla "En línea" además de la de presentes.',
          },
        ],
      },
    ],
  },
  {
    id: 'entre-semana',
    title: 'Reunión de entre semana',
    description:
      'Preparar, asignar y publicar el programa Vida y Ministerio Cristianos.',
    icon: <IconTreasuresPart color="var(--accent-main)" />,
    visible: (r) => r.isMidweekEditor,
    articles: [
      {
        id: 'ms-materiales',
        title: 'El material llega solo (y cómo traerlo a mano)',
        blocks: [
          {
            type: 'p',
            text: 'La aplicación descarga sola de jw.org el contenido de la guía Vida y Ministerio: las secciones de cada semana (Tesoros de la Biblia, Seamos mejores maestros, Nuestra vida cristiana), los temas, los tiempos y las canciones. Tú no tienes que copiar nada.',
          },
          {
            type: 'steps',
            title: 'Si una semana aún no aparece o quieres forzar la descarga:',
            items: [
              'Entra en Configuración → "Materiales de reunión". Ahí se ve qué hay importado, de dónde vino y qué semanas faltan.',
              'Toca "Importar desde jw.org" (o "Importar desde archivo .jwpub" si tienes el archivo descargado).',
              'Espera a que termine y las semanas nuevas aparecerán en el programa.',
            ],
          },
          {
            type: 'tip',
            text: 'Mejor con .jwpub: si importas la Guía de actividades desde el archivo .jwpub, el botón "JW Library" que ven los hermanos en sus asignaciones los lleva a la SEMANA exacta de su parte. Si solo se importa desde jw.org, ese botón los deja en la Guía de actividades del bimestre, sin ir a la semana concreta. Merece la pena el .jwpub.',
          },
        ],
      },
      {
        id: 'ms-asignar',
        title: 'Asignar las partes de cada semana',
        blocks: [
          {
            type: 'steps',
            items: [
              'Entra en Reuniones → "Reunión de entre semana" y elige la semana.',
              'Toca cada parte (presidente, oraciones, Tesoros, asignaciones estudiantiles, Nuestra vida cristiana…) y elige al hermano de la lista.',
              'Al elegir, la lista te muestra el historial de cada uno (cuándo tuvo su última asignación de ese tipo) para repartir con equilibrio.',
              'Si hay clase auxiliar, verás columnas para la sala principal y la clase auxiliar.',
            ],
          },
          {
            type: 'tip',
            text: '¿Prisa? El botón "Autocompletar" rellena las asignaciones de un rango de semanas repartiendo según el historial. Después solo repasa y ajusta lo que quieras a mano.',
          },
          {
            type: 'p',
            text: 'El engranaje junto al título abre los ajustes de esta reunión sin salir de ella: el día y la hora, si hay clase auxiliar, cómo se escriben los nombres y las "Partes vinculadas" —"Vincular oración de inicio" y "Vincular oración de conclusión"—, para que las oraciones caigan solas en quien lleva la parte de al lado.',
          },
          {
            type: 'faq',
            q: '¿Puedo quitar o cambiar una asignación ya hecha?',
            a: 'Sí: toca la parte y elige a otro hermano, o déjala vacía. Si el programa ya estaba publicado, vuelve a publicar para que el cambio les llegue a todos.',
          },
        ],
      },
      {
        id: 'ms-especiales',
        title: 'Semanas especiales (visita del superintendente, asambleas…)',
        blocks: [
          {
            type: 'p',
            text: 'Cada semana tiene un tipo. Además de la semana normal, puedes marcarla como "Visita del superintendente de circuito", "Asamblea de circuito", "Asamblea regional", "Conmemoración" o "Sin reunión", y la aplicación ajusta sola las partes que tocan (por ejemplo, en la visita del superintendente cambia el día de la reunión y añade su discurso de servicio).',
          },
          {
            type: 'steps',
            items: [
              'En la semana correspondiente, abre el selector del tipo de semana.',
              'Elige el tipo. Las partes que no aplican desaparecen y aparecen las especiales.',
            ],
          },
        ],
      },
      {
        id: 'ms-jwlibrary',
        title: 'Abrir la semana en JW Library mientras preparas',
        blocks: [
          {
            type: 'p',
            text: 'Cada semana lleva un botón de JW Library que abre esa misma reunión en la aplicación de JW Library, con el material delante. Es cómodo para comprobar una parte o el tiempo asignado sin salirte de lo que estás preparando.',
          },
          {
            type: 'tip',
            text: 'Si esa semana aún no ha descargado el material de JW.org, el botón abre JW Library pero no puede colocarse en la semana concreta. Es señal de que todavía falta el material.',
          },
        ],
      },
      {
        id: 'ms-publicar',
        title: 'Publicar el programa (el paso que lo hace visible)',
        blocks: [
          {
            type: 'warn',
            text: 'Hasta que no PUBLICAS, los hermanos no ven nada: las asignaciones que preparas son un borrador privado tuyo. Publicar es lo que las hace llegar a todos.',
          },
          {
            type: 'steps',
            items: [
              'Cuando el programa esté listo, toca "Publicar".',
              'La ventana lista los MESES por año, con una casilla cada uno; los ya publicados llevan un icono al lado. Marca los que quieras y dale a "Publicar".',
              'A cada hermano con asignación le aparece en "Mis asignaciones" (y recibe su notificación).',
            ],
          },
          {
            type: 'p',
            text: 'El botón "Publicar" solo aparece si la congregación está conectada.',
          },
          {
            type: 'link',
            to: '/midweek-meeting',
            label: 'Abrir Reunión de entre semana',
          },
        ],
      },
      {
        id: 'ms-imprimir',
        title: 'Imprimir y exportar (S-140 y S-89)',
        blocks: [
          {
            type: 'steps',
            items: [
              'En la pantalla del programa, toca "Exportar".',
              'Marca lo que quieras sacar: "Plantilla para el programa de la reunión Vida y Ministerio Cristianos (S-140)" para el tablón, y "Asignación para la reunión Vida y Ministerio Cristianos (S-89)" para las tarjetas de las asignaciones estudiantiles. Puedes marcar los dos.',
              'Elige la plantilla de cada uno y el rango de semanas, y dale a "Exportar". La plantilla elegida se guarda para la próxima vez.',
            ],
          },
          {
            type: 'tip',
            text: 'Con la app, muchos hermanos ya no necesitan papel: ven su asignación en su teléfono en cuanto publicas. El S-89 impreso queda para quien lo prefiera.',
          },
        ],
      },
    ],
  },
  {
    id: 'fin-semana',
    title: 'Reunión de fin de semana',
    description: 'Discursos públicos, presidencias, Atalaya y oradores.',
    icon: <IconPodium color="var(--accent-main)" />,
    // La pantalla /weekend-meeting la abren los DOS encargos (App.tsx, ruta
    // protegida con `isWeekendEditor || isPublicTalkCoordinator`), y dentro
    // cada uno edita una parte distinta. Por eso la sección la ven los dos.
    visible: (r) => r.isWeekendEditor || r.isPublicTalkCoordinator,
    articles: [
      {
        id: 'fs-programar',
        title: 'Programar cada fin de semana',
        blocks: [
          {
            type: 'steps',
            items: [
              'Entra en Reuniones → "Reunión de fin de semana" y elige la semana en el panel de la izquierda.',
              'Mira el tipo de semana ("Semana normal", "Asamblea de circuito", "Asamblea regional", "Visita del superintendente de circuito", "Sin reunión"…): de él depende qué partes salen abajo.',
              'Asigna el "Presidente" y, cuando aparezca, la "Oración".',
              'Rellena el bloque "Discurso público" (el artículo siguiente lo cuenta entero).',
              'En "Estudio de La Atalaya" pon el "Conductor" y el "Lector".',
            ],
          },
          {
            type: 'warn',
            text: 'El bloque "Discurso público" solo lo puede rellenar quien coordina los discursos. Si tú programas la reunión pero no llevas los discursos, verás esos campos en gris y no podrás cambiarlos; y al revés.',
          },
          {
            type: 'tip',
            text: '"Autocompletar" rellena de una vez el presidente, la oración y el lector de La Atalaya, y también el orador del discurso público. Si de los oradores se encarga otro hermano, marca "No autocompletar el discurso público" antes de darle.',
          },
          {
            type: 'p',
            text: 'Las canciones vienen con el material. La "Canción de inicio" la puedes cambiar tú; la "Canción de conclusión", solo en la semana de la visita del superintendente. "Borrar todo", al final de la semana, vacía las asignaciones de esa semana.',
          },
        ],
      },
      {
        id: 'fs-visitantes',
        title: 'El discurso público: tipos de orador y la invitación',
        blocks: [
          {
            type: 'p',
            text: 'Arriba del bloque eliges de dónde sale el orador: "Orador local" (de la congregación), "Orador visitante" (de otra congregación, del catálogo) o "Grabación de JW Stream". Si la congregación tiene grupo de idioma, sale además la opción de ese grupo.',
          },
          {
            type: 'steps',
            items: [
              'Elige el tipo de orador.',
              'En "Discurso público" busca el tema por número o por título. Con "Orador visitante", cada tema indica debajo cuántos oradores lo tienen preparado ("Aún no hay oradores" si no lo tiene nadie).',
              'El botón con el atril, a la derecha del campo, abre el "Catálogo de oradores" para elegir directamente por orador en vez de por tema.',
              'Pon el nombre en "Orador".',
            ],
          },
          {
            type: 'tip',
            text: 'Con el orador ya puesto, en la cabecera azul del bloque aparece "Invitación": genera un PDF de invitación con la fecha, la hora, el tema, la dirección del salón y los datos de quien coordina los discursos, listo para enviárselo.',
          },
          {
            type: 'faq',
            q: '¿Y si una semana no hay discurso público?',
            a: 'Marca el tipo de semana correspondiente (asamblea, visita del superintendente, "Sin reunión"…) y la aplicación ajusta las partes.',
          },
          {
            type: 'faq',
            q: 'El hermano que esperaba no puede venir. ¿Hay "orador sustituto"?',
            a: 'No. En Ajustes hay un interruptor llamado "Designar un sustituto para oradores visitantes", pero hoy no abre ningún campo en ninguna pantalla: no hay dónde apuntar al sustituto. Cambia el orador en "Orador" y publica otra vez.',
          },
        ],
      },
      {
        id: 'fs-ajustes',
        title: 'Los ajustes de esta reunión (el engranaje)',
        blocks: [
          {
            type: 'p',
            text: 'El engranaje, junto al título de la página, abre los ajustes de la reunión de fin de semana sin salir de ella: el día y la hora, el "Conductor principal del estudio", si se muestran los sustitutos de conductor, las canciones, cómo se escriben los nombres y el aviso mensual.',
          },
          {
            type: 'p',
            text: 'Abajo, en "Preferencias de asignación", está "Autoasignar presidente para la oración de inicio": con él encendido desaparece el campo de la oración de inicio y la hace el presidente.',
          },
          {
            type: 'tip',
            text: 'Quien coordina los discursos tiene ahí además el interruptor para que el programa de oradores salientes sea visible para toda la congregación.',
          },
        ],
      },
      {
        id: 'fs-publicar',
        title: 'Publicar e imprimir',
        blocks: [
          {
            type: 'warn',
            text: 'Hasta que no PUBLICAS, los hermanos no ven nada: las asignaciones que preparas son un borrador privado tuyo. Publicar es lo que las hace llegar a todos. Publica cuando el programa esté listo y a cada hermano le llegará su parte.',
          },
          {
            type: 'steps',
            items: [
              'Toca "Publicar": la ventana lista los MESES por año, con una casilla cada uno. Marca los que quieras y dale a "Publicar". Los meses ya publicados llevan un icono al lado.',
              'Para el tablón o el archivo: "Exportar" abre "Exportar reunión del fin de semana"; elige "Semana de inicio" y "Semana de finalización" y dale a "Exportar" para sacar el PDF.',
            ],
          },
          {
            type: 'p',
            text: 'El botón "Publicar" solo aparece si la congregación está conectada, y "Exportar" solo si tienes activada la exportación a PDF.',
          },
          {
            type: 'link',
            to: '/weekend-meeting',
            label: 'Abrir Reunión de fin de semana',
          },
        ],
      },
    ],
  },
  {
    id: 'discursos',
    title: 'Discursos y oradores',
    description:
      'El catálogo de oradores, los discursos salientes y el intercambio con otras congregaciones.',
    icon: <IconTalk color="var(--accent-main)" />,
    visible: (r) => r.isPublicTalkCoordinator,
    articles: [
      {
        id: 'disc-catalogo',
        title: 'El catálogo de oradores',
        blocks: [
          {
            type: 'p',
            text: 'En Discursos → "Catálogo de oradores" mantienes la agenda de oradores. La pantalla tiene tres bloques: "Tu congregación" (los nuestros), "Tu circuito" (las congregaciones de tu circuito) y "Otras congregaciones" (las de fuera). Cada congregación se despliega y enseña sus oradores con los discursos que tiene preparados.',
          },
          {
            type: 'steps',
            items: [
              'Para una congregación nueva: toca "Añadir" (arriba a la derecha) y rellena los datos en la ventana "Añadir congregación".',
              'Despliega una congregación, toca "Editar" y usa "Añadir orador" para registrar a sus discursantes, con sus números de discurso preparados. Al terminar, "Hecho".',
              'En "Tu congregación", el lápiz abre el modo de edición, con dos pestañas: "Oradores salientes" (los nuestros que salen fuera) y "Oradores locales".',
              'Los oradores de este catálogo son los que luego aparecen para elegir al programar la reunión de fin de semana.',
            ],
          },
          {
            type: 'tip',
            text: 'El botón "Importar / Exportar" trae y saca el catálogo entero en CSV, y tiene una plantilla para empezar. La última opción del menú, "Vaciar todo el catálogo", borra todos los oradores: solo para empezar de cero.',
          },
          {
            type: 'p',
            text: 'Al programar la reunión con "Orador visitante", cada tema indica debajo cuántos oradores lo tienen preparado. Por eso conviene tener al día los discursos de cada uno: si no, los temas salen con "Aún no hay oradores".',
          },
          {
            type: 'link',
            to: '/speakers-catalog',
            label: 'Abrir Catálogo de oradores',
          },
        ],
      },
      {
        id: 'disc-salientes',
        title: 'Oradores salientes (nuestros oradores fuera)',
        blocks: [
          {
            type: 'p',
            text: 'Cuando un orador nuestro va a dar un discurso a otra congregación, se registra como discurso saliente. Así queda en el programa, el hermano lo ve en sus asignaciones y los ancianos saben quién está fuera cada fin de semana.',
          },
          {
            type: 'p',
            text: 'La página "Oradores salientes" tiene dos pestañas. En "Oradores" ves a los hermanos de la congregación que salen, con sus discursos y su última salida; puedes buscarlos por nombre o por número de discurso y ordenarlos por "Alfabético" o por "Última salida".',
          },
          {
            type: 'steps',
            title: 'Para apuntar una salida (pestaña "Programa"):',
            items: [
              'Elige la semana en la lista de la izquierda.',
              'Toca "Añadir discurso saliente".',
              'Rellena "Discurso público" y "Orador", y abajo la "Congregación anfitriona": con "Seleccionar del catálogo" la eliges de las que ya tienes, o la escribes a mano.',
            ],
          },
          {
            type: 'p',
            text: '"Exportar" saca el PDF de un rango de semanas. "Publicar" no abre ninguna ventana: fuerza la sincronización para que los cambios lleguen ya a los demás.',
          },
          {
            type: 'warn',
            text: 'Si la salida la programó la otra congregación, sale un aviso y los campos quedan bloqueados: hay que hablar con su coordinador de discursos para cambiarla.',
          },
          {
            type: 'tip',
            text: 'Los demás lo consultan en Programas semanales → pestaña "Discursos salientes", que por defecto solo ven los ancianos. Para que lo vea toda la congregación, enciende "Mostrar programa de oradores salientes a todos los usuarios" en el engranaje de la reunión de fin de semana.',
          },
          {
            type: 'link',
            to: '/outgoing-speakers',
            label: 'Abrir Oradores salientes',
          },
        ],
      },
      {
        id: 'disc-lista',
        title: 'La lista de discursos públicos',
        blocks: [
          {
            type: 'p',
            text: 'En Discursos → "Lista de discursos públicos" tienes los temas oficiales numerados. Cada línea lleva ya la fecha en que se dio por última vez aquí y quién lo dio. Es la mejor manera de repartir bien los temas a lo largo del año.',
          },
          {
            type: 'p',
            text: 'Al desplegar un tema ves las veces anteriores que se dio y, debajo, "Oradores disponibles": los hermanos que lo tienen preparado, con el botón "Detalles" para abrir su ficha de orador.',
          },
          {
            type: 'tip',
            text: 'El buscador de arriba encuentra por número, por título o por el nombre del hermano que lo dio. Al lado, el botón cambia entre "Vista de lista" y "Vista de tabla".',
          },
          {
            type: 'p',
            text: '"Importar" trae la lista oficial de temas desde un archivo .jwpub de JW Library: antes de aplicar nada enseña una "Vista previa de importación" con lo que cambiaría (temas nuevos, renombrados, retirados…).',
          },
          {
            type: 'link',
            to: '/public-talks-list',
            label: 'Abrir Lista de discursos públicos',
          },
        ],
      },
      {
        id: 'disc-reconectar',
        title: 'Si los oradores aparecen desvinculados',
        blocks: [
          {
            type: 'p',
            text: 'Los oradores locales del catálogo están enlazados a su ficha de Personas. Si tras algún cambio de datos ves oradores que no encuentran a su persona, hay un arreglo de un toque:',
          },
          {
            type: 'steps',
            items: [
              'En el catálogo, bloque "Tu congregación", toca el lápiz para entrar en modo de edición.',
              'En la pestaña "Oradores salientes" aparece en rojo "Reconectar oradores". Si no aparece, es que no hay nada roto que reconectar.',
              'La aplicación re-empareja cada orador con su ficha por el nombre y te dice cuántos quedaron reconectados.',
            ],
          },
          {
            type: 'p',
            text: 'Si alguno se resiste, se abre la ventana "Oradores que siguen sin reconectarse" y te dice por qué en cada caso: porque la persona está en otra congregación, porque su ficha ya está enlazada a otro orador, porque no hay ninguna que se parezca, o porque hay varias y no está claro cuál es.',
          },
        ],
      },
    ],
  },
  {
    id: 'departamentos',
    title: 'Departamentos',
    description: 'La programación de asignaciones de departamentos.',
    icon: <IconDuties color="var(--accent-main)" />,
    visible: (r) => r.isDepartmentsEditor,
    articles: [
      {
        id: 'dept-programar',
        title: 'Preparar el programa de departamentos',
        blocks: [
          {
            type: 'p',
            text: 'La programación de departamentos reparte las asignaciones de servicio de cada reunión (acomodadores, micrófonos, audio y vídeo, plataforma y demás) semana a semana.',
          },
          {
            type: 'steps',
            items: [
              'Entra en Reuniones → "Departamentos" y elige la semana. La pantalla se titula "Programa de departamentos".',
              'Asigna a los hermanos de cada departamento tocando cada puesto.',
              'Con "Autocompletar" puedes rellenar varias semanas de golpe, repartiendo según el historial; después repasa y ajusta a mano lo que quieras.',
              'Cuando el mes esté listo, toca "Publicar". Entonces a cada hermano le aparece su asignación en "Mis asignaciones", como cualquier otra parte.',
            ],
          },
          {
            type: 'warn',
            text: 'Se publica por MES, aunque las asignaciones vayan por semana: publicar marca todas las semanas de ese mes. Hasta entonces el mes es un borrador y no lo ve nadie más. Una vez publicado el botón pone "Publicado", y desde ahí se puede retirar para volver a dejarlo en borrador. Si quedan puestos sin nadie, te lo dice, pero te deja publicar igual.',
          },
          {
            type: 'link',
            to: '/departments-schedule',
            label: 'Abrir Programa de departamentos',
          },
          {
            type: 'tip',
            text: 'Los cuatro departamentos son "Acomodadores", "Micrófonos", "Multimedia" y "Plataforma". Quién puede llevar cada uno se marca en el apartado "Departamentos" de su ficha de Personas: si un hermano no te aparece para asignar, es que no lo tiene marcado.',
          },
        ],
      },
      {
        id: 'dept-configurar',
        title: 'Configurar los puestos y los turnos',
        blocks: [
          {
            type: 'p',
            text: 'El engranaje junto al título ("Configuración de los departamentos") decide cómo se organiza cada departamento. Está ahí y no en los ajustes de la congregación a propósito: quien lleva los departamentos no tiene por qué tener acceso a aquellos.',
          },
          {
            type: 'steps',
            items: [
              'Abre el engranaje, arriba en la página.',
              'Para cada departamento, elige "Por semana" (las mismas personas toda la semana) o "Por reunión" (unas entre semana y otras el fin de semana).',
              'Si quieres partirlo, enciende "Dividir en dos turnos": uno al principio de la reunión y otro al final.',
              'Guarda. El cuadro de la semana se rehace con los puestos nuevos.',
            ],
          },
          {
            type: 'warn',
            text: 'Cambiar esto no borra nada, pero las asignaciones hechas con la configuración anterior DEJAN DE VERSE mientras esté cambiada. Si te arrepientes, déjalo como estaba y vuelven a aparecer.',
          },
        ],
      },
      {
        id: 'dept-imprimir',
        title: 'Exportar el programa',
        blocks: [
          {
            type: 'p',
            text: 'Si necesitas el programa en papel, el botón "Exportar" de la propia pantalla lo saca en PDF. Solo aparece si tienes la exportación activada.',
          },
          {
            type: 'tip',
            text: 'Si no lo ves, enciéndelo para ti solo en tu cuenta ("Mi cuenta" → "Habilitar exportación a PDF para mi cuenta"): con eso te sale el botón de Departamentos sin abrirle el de las demás pantallas a nadie. Un anciano o el administrador pueden encenderlo para toda la congregación desde "Ajustes de congregación".',
          },
        ],
      },
    ],
  },
  {
    id: 'exhibidores',
    title: 'Exhibidores',
    description:
      'Para el superintendente de servicio: ubicaciones, turnos, asignaciones fijas y el programa mensual.',
    icon: <IconCart color="var(--accent-main)" />,
    visible: (r) => r.isServiceCommittee,
    articles: [
      {
        id: 'exh-configurar',
        title: 'Configurar ubicaciones, turnos y responsables',
        blocks: [
          {
            type: 'p',
            text: 'Entra en Predicación → "Exhibidores" y toca el ENGRANAJE que hay junto al título: eso abre "Configuración de exhibidores", que es donde se prepara todo antes de programar ningún mes. El mismo engranaje te devuelve al programa.',
          },
          {
            type: 'steps',
            title: 'Las cinco pestañas de la configuración:',
            items: [
              '"Ubicaciones": la lista de sitios donde se pone el carrito o la mesa (solo el nombre; no hace falta dirección).',
              '"Turnos": cada turno define en qué días de la semana aparece, su hora de inicio y fin y qué ubicaciones puede usar.',
              '"Responsables": de los hermanos varones que tienen marcada la casilla "Exhibidores" en su ficha de Personas, aquí eliges cuáles pueden ser responsables de turno.',
              '"Asignaciones fijas": la plantilla de los tres hermanos que normalmente hacen cada turno. De ahí salen las asignaciones al preparar un mes nuevo.',
              '"Disponibilidad": una tabla de hermanos por turno con lo que prefiere cada uno. No bloquea nada: sirve para que la aplicación te los recomiende al asignar.',
            ],
          },
          {
            type: 'warn',
            text: 'La "Posición 1" de cada turno es la del responsable, y solo admite a los hermanos que hayas marcado en "Responsables".',
          },
          { type: 'link', to: '/exhibitors', label: 'Abrir Exhibidores' },
        ],
      },
      {
        id: 'exh-programar',
        title: 'El programa del mes',
        blocks: [
          {
            type: 'p',
            text: 'Con la configuración lista, cada turno de cada semana se rellena solo con lo que hayas puesto en "Asignaciones fijas". Solo hace falta tocar un turno cuando ese día en concreto sea distinto de lo habitual.',
          },
          {
            type: 'steps',
            items: [
              'Elige el mes en el panel de la izquierda. Arriba puedes verlo como "Lista" o como "Cuadrícula".',
              'Toca "Autocompletar" para generar de golpe todo el mes según las asignaciones fijas.',
              'Toca un turno concreto: se abre "Asignar turno de exhibidor", con las tres posiciones, la ubicación de ese día y el interruptor "Suspender turno para esta semana".',
              '"Restaurar fijos" (en rojo, dentro de esa ventana) borra el cambio puntual y vuelve a heredar de la plantilla fija. Solo aparece si ese turno tiene un cambio a mano.',
              'Cuando esté listo, toca "Publicar".',
            ],
          },
          {
            type: 'warn',
            text: 'Mientras no lo publiques, el mes es un BORRADOR: no sale en las asignaciones de los hermanos ni en el programa semanal. Una vez publicado el botón pasa a decir "Publicado", y desde ahí puedes "Retirar" el mes para volver a dejarlo en borrador.',
          },
          {
            type: 'tip',
            text: 'Al asignar te avisa de tres cosas: si el turno se queda con menos de tres hermanos, si no has puesto a ningún responsable de turno, y si alguno de los elegidos tiene una ausencia registrada ese día. Al publicar también te dice cuántos turnos quedan sin nadie — puedes publicar igualmente.',
          },
          {
            type: 'p',
            text: '"Exportar" saca el programa del mes en PDF (si tienes activada la exportación a PDF).',
          },
        ],
      },
      {
        id: 'exh-ajustes-mes',
        title: '"Ajustes del mes": verano y cambios que afectan a todo el mes',
        blocks: [
          {
            type: 'p',
            text: 'El botón "Ajustes del mes", encima del programa, sirve para cuando hace falta cambiar algo para un mes entero (por ejemplo, en verano, para adaptar los horarios al calor), sin tocar la configuración de siempre. Cuando ese mes tiene una configuración propia, el botón se pone naranja.',
          },
          {
            type: 'steps',
            items: [
              '"Suspender exhibidores todo el mes": para cuando no va a haber exhibición ese mes entero. Debajo aparece "Texto adicional (opcional)" para explicar el motivo, y ese texto es el que leen los hermanos en Programas semanales.',
              '"Personalizar turnos para este mes": crea una copia de los turnos solo para ese mes, que puedes editar libremente (añadir, quitar, cambiar horas) sin afectar a los demás meses. Una vez personalizado, sale además "Añadir turno excepcional".',
              '"Restaurar a global" deshace la personalización y ese mes vuelve a usar la configuración normal.',
            ],
          },
        ],
      },
      {
        id: 'exh-vista-publicador',
        title: 'Lo que ve un publicador normal',
        blocks: [
          {
            type: 'p',
            text: 'Un publicador no entra a la pantalla de Exhibidores: es solo del comité de servicio. Lo que sí ve es su propio turno en "Mis asignaciones", puesto como "Exhibidores: Responsable de turno" si le toca serlo, o solo "Exhibidores" si no, con la hora, la ubicación y con quién va.',
          },
          {
            type: 'p',
            text: 'El programa completo del mes lo puede consultar, de solo lectura, en Programas semanales → pestaña "Exhibidores". Ahí el responsable de cada turno lleva una chapa que pone "Resp.".',
          },
          {
            type: 'warn',
            text: 'Nada de eso aparece hasta que publicas el mes. En "Mis asignaciones" además solo se enseñan el mes en curso y el siguiente, aunque las asignaciones fijas se repitan para siempre.',
          },
        ],
      },
    ],
  },
  {
    id: 'salidas-predicacion',
    title: 'Salidas de predicación',
    description:
      'Para el superintendente de servicio: ubicaciones, horarios, disponibilidad y el programa mensual.',
    icon: <IconInTerritory color="var(--accent-main)" />,
    visible: (r) => r.isServiceCommittee,
    articles: [
      {
        id: 'sal-configurar',
        title: 'Configurar ubicaciones, horarios y disponibilidad',
        blocks: [
          {
            type: 'p',
            text: 'Entra en Predicación → "Salidas de predicación" y toca el ENGRANAJE que hay junto al título: abre "Configuración de las salidas de predicación", con cuatro pestañas. El mismo engranaje te devuelve al programa.',
          },
          {
            type: 'steps',
            items: [
              '"Ubicaciones": los puntos de salida (por ejemplo, el Salón del Reino).',
              '"Horarios": cada día de la semana tiene un turno de mañana y otro de tarde, cada uno con su hora de salida y un interruptor para activarlo o desactivarlo de forma permanente.',
              '"Disponibilidad de hermanos": qué turnos suele poder cada hermano; se usa para recomendarlo al asignar y para el autocompletado, pero no asigna nada por sí sola.',
              '"Salidas compartidas": si algún turno se comparte con una congregación vecina (por ejemplo, un sábado en un territorio conjunto), se registra aquí.',
            ],
          },
          {
            type: 'p',
            text: 'Los hermanos que salen en estas listas son los VARONES que tienen marcada la casilla "Salidas" en su ficha de Personas.',
          },
          {
            type: 'link',
            to: '/predicacion-salidas',
            label: 'Abrir Salidas de predicación',
          },
        ],
      },
      {
        id: 'sal-programar',
        title: 'El programa del mes',
        blocks: [
          {
            type: 'p',
            text: 'A diferencia de Exhibidores, aquí no hay una plantilla fija que se repite sola: cada salida se asigna a mano (o con autocompletar) usando como pista la disponibilidad que hayas configurado. El mes se elige en el panel de la izquierda, y arriba puedes verlo como "Lista" o como "Cuadrícula".',
          },
          {
            type: 'steps',
            items: [
              'Toca un turno: se abre una ventana con la fecha y la hora. En "Conductor" están primero los "Recomendados (disponibles hoy)" según su disponibilidad y debajo "Otros hermanos".',
              'Elige también el lugar de reunión de esa salida.',
              'Usa "Suspender salida" si ese turno concreto no va a haber salida ("Reactivar salida" lo deshace).',
              '"Autocompletar" (arriba, para todo el mes, o dentro de los ajustes de una semana, solo para esa semana) reparte los turnos entre quienes los tengan marcados como disponibles, procurando no repetir al mismo hermano semana tras semana y dando prioridad a quien lleva más tiempo sin salir.',
              'Cuando esté listo, toca "Publicar".',
            ],
          },
          {
            type: 'warn',
            text: 'Mientras no lo publiques, el mes es un BORRADOR: no le sale a nadie en "Mis asignaciones" ni en el programa semanal. Una vez publicado el botón pasa a decir "Publicado", y desde ahí puedes "Retirar" el mes.',
          },
          {
            type: 'tip',
            text: 'Si un turno no tiene a nadie marcado como disponible, el autocompletado lo deja vacío a propósito: tendrás que asignarlo a mano. Los turnos compartidos con otra congregación también los salta. Y si el hermano que eliges tiene una ausencia registrada ese día, te avisa antes de guardar.',
          },
          {
            type: 'p',
            text: 'Además de los hermanos, en "Conductor" hay tres opciones que no son personas: "Ninguno / Sin asignar", "Compartido: <congregación>" (si ese turno está marcado como compartido) y "Superintendente de circuito" (solo en la semana marcada como suya).',
          },
        ],
      },
      {
        id: 'sal-ajustes-mes-semana',
        title: '"Ajustes del mes" y ajustes de una semana concreta',
        blocks: [
          {
            type: 'p',
            text: 'El botón "Ajustes del mes" funciona igual que en Exhibidores: puedes "Suspender salidas todo el mes" o "Personalizar horarios para este mes" (por ejemplo, para adelantar la salida de la tarde en verano por el calor), con "Restaurar a global" para deshacerlo. Al suspender el mes aparece "Mantener activas estas salidas", para salvar los turnos sueltos que sí vayan a hacerse.',
          },
          {
            type: 'p',
            text: 'Además, cada semana tiene su propio icono de ajustes ("Ajustes de la semana"), con dos cosas exclusivas de esa semana: marcarla como "Semana del superintendente de circuito" (para poder asignarle su propia salida) y, si hace falta, un horario especial solo para esa semana concreta.',
          },
        ],
      },
      {
        id: 'sal-vista-publicador',
        title: 'Lo que ve un publicador normal',
        blocks: [
          {
            type: 'p',
            text: 'Un publicador no entra a esta pantalla: es solo del comité de servicio. Lo que sí ve es su propia salida en "Mis asignaciones", puesta como "Salida de predicación" con la hora y el lugar, y el programa completo en Programas semanales → pestaña "Salidas de predicación".',
          },
          {
            type: 'p',
            text: 'No existe la opción de que un publicador se apunte él mismo a una salida: siempre las asigna el comité de servicio. Y nada de esto aparece hasta que publicas el mes.',
          },
        ],
      },
    ],
  },
  {
    id: 'grupos',
    title: 'Grupos de predicación',
    description:
      'Para superintendentes y auxiliares de grupo: tu grupo y sus informes.',
    icon: <IconGroups color="var(--accent-main)" />,
    visible: (r) => r.isGroupOverseer,
    articles: [
      {
        id: 'grupo-ver',
        title: 'Tu grupo',
        blocks: [
          {
            type: 'p',
            text: 'En Congregación → "Grupos de predicación" están todos los grupos con sus miembros. Cada cabecera lleva el número del grupo, una chapa con cuántos son y, si se le ha puesto, el nombre del grupo. El tuyo va marcado con "Mi grupo".',
          },
          {
            type: 'p',
            text: 'Los precursores salen con el nombre en negrita. Debajo del nombre del responsable pone "Superintendente de grupo" (o "Siervo de grupo" si es siervo ministerial), y debajo del suyo, "Auxiliar del superintendente".',
          },
          {
            type: 'warn',
            text: 'Esta pantalla la ve toda la congregación, pero crear grupos, reordenarlos, cambiar de sitio a un hermano o nombrar responsables es cosa del comité de servicio. Si eres superintendente de grupo y no lo eres también del comité, aquí solo miras.',
          },
          {
            type: 'link',
            to: '/field-service-groups',
            label: 'Abrir Grupos de predicación',
          },
        ],
      },
      {
        id: 'grupo-informes',
        title: 'Los informes de tu grupo',
        blocks: [
          {
            type: 'p',
            text: 'Como responsable de grupo puedes entrar en Informes → "Informes de predicación": quién ha enviado ya el suyo y quién no. Así puedes recordárselo con cariño a quien se le pase, o echarle una mano a quien le cueste la aplicación (su informe también se puede apuntar en papel y pasarlo al secretario, como siempre).',
          },
          {
            type: 'p',
            text: 'La pantalla no se recorta por grupos: entras y ves a toda la congregación. Para quedarte con los tuyos, usa el filtro y elige tu grupo. Hay otro filtro al lado por estado del informe: "Informes no enviados", "Informes pendientes de verificación" e "Informes verificados".',
          },
          {
            type: 'warn',
            text: 'Que lo veas todo no quiere decir que sea tuyo para tocarlo: de los informes del resto de grupos se encarga su responsable, y de cerrar el mes, el secretario.',
          },
        ],
      },
      {
        id: 'grupo-limpieza',
        title: 'La limpieza del salón de tu grupo',
        blocks: [
          {
            type: 'p',
            text: 'El programa de limpieza va por grupos (Congregación → "Limpieza del Salón"). Cuando le toca al tuyo, a cada miembro del grupo le aparece en "Mis asignaciones" como "Limpieza del Salón (Entre semana)" o "(Fin de semana)", así que no hace falta que persigas a nadie: la aplicación avisa sola.',
          },
          {
            type: 'tip',
            text: 'Ese aviso sale con siete días de antelación, no antes: en "Mis asignaciones" la limpieza solo aparece cuando la reunión que toca cae dentro de la semana siguiente.',
          },
        ],
      },
    ],
  },
  {
    id: 'personas',
    title: 'Personas y emergencias',
    description:
      'Fichas de personas, datos de contacto y la lista de emergencias.',
    icon: <IconPerson color="var(--accent-main)" />,
    visible: (r) => r.isPersonViewer,
    articles: [
      {
        id: 'pers-fichas',
        title: 'Las fichas de Personas',
        blocks: [
          {
            type: 'p',
            text: 'En Congregación → Personas está la ficha de cada hermano: sus datos, su condición (publicador bautizado o no bautizado, precursor…), nombramientos, asignaciones que puede recibir, grupo, familia y datos de contacto. Casi todo lo demás de la aplicación bebe de aquí: si algo sale mal en un programa o un informe, muchas veces la causa está en la ficha.',
          },
          {
            type: 'steps',
            items: [
              'Para crear una: "Añadir" (arriba a la derecha) y rellena al menos nombre y condición.',
              'Para editar: abre la ficha, cambia lo que toque y guarda. Los cambios se sincronizan a todos en segundos.',
              'Usa "Filtros" para acotar la lista: en "Categorías" tienes sexo, ungido, archivado, cabeza de familia, publicadores (bautizado, no bautizado, activo, inactivo), precursorado y nombramientos; en "Asignaciones", por partes de la reunión.',
            ],
          },
          { type: 'link', to: '/persons', label: 'Abrir Personas' },
          {
            type: 'warn',
            text: 'Cuidado con eliminar o archivar: si un hermano deja de estar activo, lo correcto es ARCHIVARLO (su historial de informes se conserva). Los archivados no salen en las listas normales; para verlos, activa "Archivado" en el filtro.',
          },
        ],
      },
      {
        id: 'pers-emergencias',
        title: 'Datos de contacto y lista de emergencias',
        blocks: [
          {
            type: 'p',
            text: 'Cada ficha tiene dirección, teléfono y "Contactos de emergencia" (a quién avisar si le pasa algo). Con eso, la aplicación genera un PDF de datos de contacto ordenado por grupos, listo para los responsables.',
          },
          {
            type: 'steps',
            title: 'Para sacarlo:',
            items: [
              'En Personas, toca "Importar/exportar".',
              'Dale al botón rojo "Contactos de emergencia (PDF)".',
            ],
          },
          {
            type: 'tip',
            text: 'Los familiares sin ficha propia de publicador también pueden salir en la lista de emergencias: basta con que estén enlazados como familia de alguien con grupo, y el PDF los coloca en el grupo de su familia automáticamente.',
          },
        ],
      },
      {
        id: 'pers-ausencias',
        title: 'Ausencias y disponibilidad',
        blocks: [
          {
            type: 'p',
            text: 'Las ausencias se apuntan en la ficha de cada persona, y cada hermano puede apuntarse las suyas desde su propio perfil.',
          },
          {
            type: 'warn',
            text: 'Ojo con lo que hacen y lo que no: al asignar, la aplicación AVISA de que ese hermano está fuera ese día, pero no le esconde ni le impide la asignación. Sale el aviso en las partes de las reuniones, en los turnos de exhibidores y en las salidas de predicación. Si a alguien le asignaron estando fuera, lo más probable es que se pasara el aviso por alto.',
          },
          {
            type: 'p',
            text: 'Los ancianos tienen además la página Congregación → "Ausencias" (solo ellos, porque los periodos llevan comentarios), con quién está fuera "Ahora mismo", las "Próximas" y las "Terminadas", un buscador por nombre, grupo o comentario, y un aviso de las ausencias que llevan meses abiertas sin fecha de vuelta: mientras sigan así, esa persona sale como ausente en cualquier programa futuro.',
          },
        ],
      },
    ],
  },
  {
    id: 'territorios',
    title: 'Territorios',
    description:
      'Para responsables: asignaciones, solicitudes, campañas, mapa, S-13 y configuración.',
    icon: <IconMapOverview color="var(--accent-main)" />,
    // La MISMA puerta que el panel de responsables (`useIsTerritoryManager`).
    // Antes era una suma de roles: dejaba fuera al hermano del departamento
    // "Territorios" que no es anciano, y dentro al superintendente de servicio
    // que sí lo es pero no gestiona territorios.
    visible: (r) => r.isTerritoryManager,
    articles: [
      {
        id: 'terr-acceso',
        title: 'Quién es "responsable" de Territorios',
        blocks: [
          {
            type: 'p',
            text: 'Cualquier anciano o miembro del cuerpo de gobierno de la aplicación (admin, secretario, coordinador) ya tiene acceso de gestión de Territorios de forma automática. Además, cualquier hermano que figure como responsable, auxiliar o miembro del departamento "Territorios" en Responsabilidades también lo tiene, aunque no sea anciano.',
          },
          {
            type: 'p',
            text: 'Al entrar a Congregación → Territorios ves lo mismo que cualquier publicador: los tuyos, y el botón "Solicitar territorio". Lo de gestionar está detrás del ENGRANAJE que hay junto al título ("Panel de responsables de territorios"): al tocarlo, la pantalla entera pasa a "Responsables", con sus pestañas, y se vuelve con "Volver".',
          },
          {
            type: 'tip',
            text: 'Cuando hay solicitudes sin resolver, el engranaje lleva un puntito: así se ve desde fuera que hay algo esperando. Y al entrar, el panel abre directamente por "Solicitudes".',
          },
          {
            type: 'link',
            to: '/congregation/territories',
            label: 'Abrir Territorios',
          },
          {
            type: 'tip',
            text: 'No todos los responsables reciben avisos de solicitudes nuevas: eso solo llega al superintendente de servicio, al admin y a los miembros del departamento Territorios. El resto de ancianos con acceso puede gestionar todo igualmente, pero tendrá que entrar a mirar la pestaña "Solicitudes" en vez de esperar un aviso.',
          },
        ],
      },
      {
        id: 'terr-estadisticas',
        title: 'Estadísticas',
        blocks: [
          {
            type: 'p',
            text: 'La primera pestaña del panel de Responsables. De un vistazo, cuatro números: "Asignados" (con su barra de progreso sobre el total), "Trabajados" en el periodo, "Atrasados" y "En descanso".',
          },
          {
            type: 'p',
            text: '"En descanso" son los territorios que están libres pero se devolvieron trabajados hace poco, todavía dentro de los días de descanso que hayas puesto en Configuración. No es que estén mal: es que aún no toca volver a darlos.',
          },
          {
            type: 'p',
            text: 'Debajo, dos listas: "Territorios atrasados", con el botón "Notificar" (avisa al hermano con el mensaje que hayas configurado) y "Entregar"; y "No asignados durante más tiempo", que se puede agrupar por zona y lleva un botón "Asignar" en cada fila.',
          },
        ],
      },
      {
        id: 'terr-asignaciones',
        title: 'Asignaciones',
        blocks: [
          {
            type: 'p',
            text: 'La lista de trabajo del día a día: todos los territorios con su estado, filtrables por "Todos", "Asignados" o "Sin asignar", y con un buscador por territorio o por nombre de publicador.',
          },
          {
            type: 'steps',
            items: [
              'Para asignar uno libre: búscalo y toca "Asignar", elige al publicador (y añade una nota si quieres).',
              'Para devolverlo: toca "Entregar" en su tarjeta.',
              'Puedes editar la nota o borrar una asignación puntual si te equivocaste.',
            ],
          },
        ],
      },
      {
        id: 'terr-solicitudes',
        title: 'Solicitudes',
        blocks: [
          {
            type: 'p',
            text: 'Aquí llegan las peticiones que los publicadores envían con "Solicitar territorio" desde su propia pantalla, con su nombre, la fecha y su nota si escribió alguna.',
          },
          {
            type: 'steps',
            items: [
              'Toca "Asignar territorio" en la solicitud: se abre el diálogo de asignación con el solicitante ya seleccionado, listo para elegir el territorio y confirmar.',
              'Si no procede (ya se resolvió de otra forma, por ejemplo), usa "Descartar".',
            ],
          },
          {
            type: 'tip',
            text: 'La pestaña lleva el número de solicitudes pendientes al lado del nombre, y mientras haya alguna el engranaje de Territorios sale con un puntito para que se vea sin entrar.',
          },
        ],
      },
      {
        id: 'terr-historial',
        title: 'Historial',
        blocks: [
          {
            type: 'p',
            text: 'El registro de todas las asignaciones ya cerradas: quién tuvo cada territorio, cuándo lo devolvió, si lo marcó como trabajado o no, y su nota si la hay. Con buscador por publicador o por territorio, y "Cargar más" para ir viendo el histórico completo.',
          },
        ],
      },
      {
        id: 'terr-territorios-tab',
        title: 'La pestaña Territorios: zonas, etiquetas e importar',
        blocks: [
          {
            type: 'p',
            text: 'Aquí están todos los territorios agrupados por zona, cada uno con su estado (Asignado o Libre) y sus etiquetas de color.',
          },
          {
            type: 'steps',
            title: 'Botones de arriba:',
            items: [
              '"Zonas": crear, renombrar, borrar y reordenar las zonas, y elegir su color.',
              '"Etiquetas": crear y gestionar las etiquetas que se pueden poner a cada territorio (con su color).',
              '"Añadir territorio": crear uno a mano, sin importar nada.',
              '"Importar KML": trae los límites de territorios desde un archivo KML/KMZ (de Google Earth u otra fuente), eligiendo a qué zona van.',
              '"Seleccionar": activa el modo de selección múltiple, con acciones en bloque "Asignar (N)" y "Eliminar (N)". Al terminar, el mismo botón pone "Hecho".',
            ],
          },
          {
            type: 'warn',
            text: 'Eliminar territorios en bloque es una acción destructiva con confirmación aparte; los que ya estén asignados no se tocan aunque los incluyas en la selección.',
          },
        ],
      },
      {
        id: 'terr-mapa-general',
        title: 'El mapa general',
        blocks: [
          {
            type: 'p',
            text: 'Un único mapa con todos los territorios de la congregación agrupados visualmente: puntos verdes para los libres y naranjas para los asignados, con leyenda. Al acercarte, los grupos se separan solos; toca cualquier punto para abrir el detalle de ese territorio.',
          },
          {
            type: 'p',
            text: 'Esta vista de conjunto no tiene vista satélite (solo el mapa de calles); la vista satélite está disponible al abrir un territorio individual, igual que la ven los publicadores.',
          },
        ],
      },
      {
        id: 'terr-enlaces',
        title: 'Enlaces (los territorios que se comparten por fuera)',
        blocks: [
          {
            type: 'p',
            text: 'Desde la ficha de un territorio se puede crear un enlace público para mandárselo a alguien que no tiene cuenta en la aplicación. La pestaña "Enlaces" los reúne todos: de qué territorio es cada uno, con quién se compartió, cuándo se creó y cuándo caduca.',
          },
          {
            type: 'steps',
            items: [
              'Los chips de arriba filtran entre "Activos (N)" y "Todos".',
              '"Ver territorio" abre la ficha del territorio de ese enlace.',
              '"Anular" corta el enlace al momento: quien lo tenga deja de poder abrirlo.',
            ],
          },
          {
            type: 'warn',
            text: 'Quien recibe uno de estos enlaces no necesita cuenta ni contraseña: cualquiera con la dirección entra. Conviene repasarlos de vez en cuando y anular los que ya no hagan falta.',
          },
        ],
      },
      {
        id: 'terr-campanas',
        title: 'Campañas',
        blocks: [
          {
            type: 'p',
            text: 'Para organizar una cobertura especial de un grupo de territorios (por ejemplo, antes de una fecha señalada) por separado del reparto normal.',
          },
          {
            type: 'steps',
            items: [
              'Toca "Crear campaña", ponle un nombre y sus fechas de inicio y fin.',
              'Dentro de la campaña, usa "Añadir territorios" para meter los que quieras cubrir.',
              'Asigna y controla esos territorios exactamente igual que los normales, con sus botones "Asignar" / "Quitar" propios dentro de la campaña.',
              'Cuando termine, toca "Finalizar": devuelve automáticamente todos los territorios de la campaña que sigan abiertos.',
            ],
          },
          {
            type: 'tip',
            text: 'Si no la finalizas a mano, una campaña vencida por fecha se cierra sola y devuelve sus territorios abiertos como trabajados.',
          },
          {
            type: 'warn',
            text: 'Borrar una campaña borra también sus registros de asignación del S-13. No lo hagas sin el visto bueno del superintendente de servicio.',
          },
        ],
      },
      {
        id: 'terr-importar-exportar',
        title: 'Importar/Exportar y el S-13',
        blocks: [
          {
            type: 'p',
            text: 'El "Registro de asignación de territorios (S-13)" se genera aquí mismo, con el historial que ya llevas registrado al asignar y devolver: no hay que anotarlo aparte en ningún otro sitio.',
          },
          {
            type: 'steps',
            title: 'Exportar S-13 (bloque "Formulario S-13 (PDF)"):',
            items: [
              'Elige el "Año de servicio".',
              'Marca "Incluir asignaciones de campaña" si quieres que también salgan.',
              'Toca "Exportar S-13": genera el PDF con el formato oficial.',
            ],
          },
          {
            type: 'tip',
            text: 'Un territorio con más de 4 asignaciones en el año no cabe en su fila: como indica el propio formulario, sigue en una hoja de continuación. La aplicación las añade sola y te avisa de cuántos territorios han necesitado una.',
          },
          {
            type: 'p',
            text: 'También puedes exportar toda la lista a "Excel (.xlsx)" o "CSV (.csv)" (filtrando por todos, asignados, sin asignar o de campaña), y exportar la geometría de los mapas a "Exportar KML" o "Exportar GeoJSON". Para traer territorios nuevos, la importación es solo por KML/KMZ, desde el botón "Importar KML" de la pestaña Territorios.',
          },
        ],
      },
      {
        id: 'terr-configuracion',
        title: 'Configuración',
        blocks: [
          { type: 'p', text: 'Cinco bloques de ajustes del módulo:' },
          {
            type: 'p',
            text: '"Ajustes de asignación": formato de fecha a usar en toda la pantalla, si las campañas cuentan en las estadísticas, y si "asignado" ya cuenta como "trabajado".',
          },
          {
            type: 'p',
            text: '"Dashboard y estadísticas": a partir de cuántos días un territorio se considera atrasado o vencido, el mensaje que se envía al notificar un atraso, el rango de las estadísticas (año de servicio, 12 meses o todo) y si se agrupan por zona.',
          },
          {
            type: 'p',
            text: '"Vista del territorio": qué secciones salen ya desplegadas al abrir un territorio, con un interruptor para cada una: "Información del territorio (incluye direcciones)", "Mapa del territorio" e "Imagen del territorio".',
          },
          {
            type: 'p',
            text: '"Configuración de publicador": "Publicadores pueden devolver territorios", "Ver territorios del grupo" y "Publicadores pueden añadir ubicaciones" (las direcciones de "No visitar").',
          },
          {
            type: 'p',
            text: '"Configuración de ubicaciones": "Ubicaciones requieren aprobación", para que las direcciones que añaden los publicadores no queden definitivas hasta que las repases.',
          },
          {
            type: 'tip',
            text: 'Los cambios no se guardan solos aquí: hay una barra abajo que te dice si tienes "Cambios sin guardar": toca "Guardar" antes de salir.',
          },
        ],
      },
    ],
  },
  {
    id: 'limpieza',
    title: 'Limpieza y actividades',
    description: 'Configurar la rotación de limpieza y los próximos eventos.',
    icon: <IconClean color="var(--accent-main)" />,
    // Las dos pantallas de esta sección se configuran con `isElder || isAdmin`
    // (y `isAdmin` ya entra en `isElder`). Con `isServiceCommittee` se le
    // enseñaba a un superintendente de servicio que no fuera anciano cómo
    // cambiar algo que no puede tocar.
    visible: (r) => r.isElder,
    articles: [
      {
        id: 'limp-config',
        title: 'Configurar la limpieza del salón',
        blocks: [
          {
            type: 'p',
            text: 'En Congregación → "Limpieza del Salón", los ancianos configuran la rotación: qué grupos participan y desde qué fecha arranca el ciclo. A partir de ahí, la aplicación calcula sola qué grupo toca cada semana, todos pueden consultarlo, y a los miembros del grupo que toca les aparece en "Mis asignaciones".',
          },
          {
            type: 'steps',
            items: [
              'Abre el ENGRANAJE que hay junto al título ("Configuración de la limpieza").',
              'Pon la "Fecha de inicio" y el "Grupo de inicio", y marca los "Grupos que participan en la rotación".',
              'Si quieres, escribe unas "Notas generales" (por ejemplo, qué material hay que traer): las ve todo el mundo en la pantalla de Limpieza.',
              'Guarda. El calendario completo se rellena solo, saltando las semanas sin reunión.',
            ],
          },
          {
            type: 'link',
            to: '/congregation/limpieza',
            label: 'Abrir Limpieza del Salón',
          },
        ],
      },
      {
        id: 'limp-rotacion',
        title: 'Cómo se calcula el turno, y cómo cambiarlo',
        blocks: [
          {
            type: 'p',
            text: 'A partir de la fecha de inicio y del grupo con el que empieza, la aplicación va repartiendo un grupo por reunión. No hay que tocar nada mes a mes: el calendario se rellena solo.',
          },
          {
            type: 'steps',
            title: 'Si quieres que un día concreto lo lleve otro grupo:',
            items: [
              'Pulsa esa fecha en el calendario.',
              'Elige el grupo que quieras.',
              'Guarda. Ese día queda fijado a mano y la rotación ya no lo toca.',
            ],
          },
          {
            type: 'p',
            text: 'Las fechas puestas a mano llevan un punto naranja en el calendario, y en la vista de lista ponen «Puesta a mano». Así se distingue de un vistazo lo que decidió alguien de lo que calculó la aplicación.',
          },
          {
            type: 'tip',
            text: 'Para devolver un día a la rotación, ábrelo y elige «Rotación automática» en el selector. Sin eso, un día puesto a mano se queda fijo para siempre y parece que la rotación falla.',
          },
          {
            type: 'faq',
            q: 'He cambiado la fecha de inicio a un día futuro. ¿Se me estropea lo de antes?',
            a: 'No. Todo lo anterior a esa fecha se queda tal cual estaba, incluida la reunión de la misma semana que caiga antes del día que elijas. Lo nuevo empieza a contar desde ahí.',
          },
        ],
      },
      {
        id: 'limp-alternar',
        title: 'Alternar por parejas (que nadie se quede siempre con la misma reunión)',
        blocks: [
          {
            type: 'p',
            text: 'Con un número par de grupos, una rotación normal deja a cada grupo clavado en la misma reunión para siempre: el que limpia entre semana, limpia entre semana toda la vida.',
          },
          {
            type: 'p',
            text: 'Con «Alternar por parejas cada vuelta» activado, al terminar la vuelta los grupos se intercambian de dos en dos —1, 2, 3, 4, 5, 6 y luego 2, 1, 4, 3, 6, 5— y así todos pasan por las dos reuniones.',
          },
          {
            type: 'tip',
            text: 'El interruptor solo aparece si participan cuatro grupos o más y son un número par. Con un número impar la rotación ya alterna sola, y con dos no hay nada que intercambiar.',
          },
        ],
      },
      {
        id: 'limp-sin-reunion',
        title: 'Semanas de asamblea y días sin reunión',
        blocks: [
          {
            type: 'p',
            text: 'Cuando una semana no tiene reunión —asamblea, congreso, Conmemoración— esa casilla del calendario lo dice: pone «Sin reunión» en vez de quedarse en blanco. Un hueco mudo se lee como un fallo de la aplicación.',
          },
          {
            type: 'p',
            text: 'Esas reuniones no cuentan para la rotación: el grupo que le tocaba no pierde su turno, simplemente le toca la siguiente vez que sí haya reunión.',
          },
          {
            type: 'tip',
            text: 'En la semana de la visita del superintendente, la reunión de entre semana se mueve al día de la visita y la limpieza se pinta en el día correcto, no en el miércoles de siempre.',
          },
        ],
      },
      {
        id: 'limp-eventos',
        title: 'Próximos eventos',
        blocks: [
          {
            type: 'p',
            text: 'En Congregación → "Próximos eventos", los ancianos crean y editan los eventos que ve toda la congregación: asambleas, la visita del superintendente, la Conmemoración, campañas y cualquier evento personalizado.',
          },
          {
            type: 'steps',
            items: [
              'Toca "Añadir" y elige el "Tipo de evento".',
              'En "Fecha y hora", di si es de un día o de varios. Si es de varios y cada jornada tiene su horario, rellénalo en "Horario de cada día".',
              'En "Ubicación" puedes poner la dirección y el enlace de Google Maps; en los eventos que lo admiten, también el enlace de JW Library. Con eso, a los hermanos les salen esos botones.',
              'Puedes ponerle una foto de portada.',
              'Toca "Hecho": aparece para todos en Próximos eventos.',
            ],
          },
          {
            type: 'tip',
            text: 'La pantalla tiene también su botón de exportar, para llevarse la lista de eventos en PDF.',
          },
          {
            type: 'link',
            to: '/activities/upcoming-events',
            label: 'Abrir Próximos eventos',
          },
        ],
      },
    ],
  },
  {
    id: 'visita-co',
    title: 'Visita del superintendente de circuito',
    description:
      'Activar la visita, la semana especial, los acompañantes y la documentación.',
    icon: <IconCalendarWeek color="var(--accent-main)" />,
    visible: (r) => r.isElder || r.isAdmin,
    articles: [
      {
        id: 'co-quien',
        title: 'Quién la prepara y quién la ve',
        blocks: [
          {
            type: 'p',
            text: 'La preparan los ancianos, todos, y en cualquier momento del año: no hace falta esperar a que se acerque la fecha ni pedirle nada al coordinador.',
          },
          {
            type: 'p',
            text: 'Esta pantalla es solo de los ancianos, siempre. Los demás hermanos no entran aquí: lo que ellos necesitan les sale en la pestaña «Visita del superintendente» de Programas semanales, dos meses antes de que empiece.',
          },
          {
            type: 'tip',
            text: 'Por eso puedes preparar la visita con toda la antelación que quieras sin que nadie vea nada a medias: hasta que faltan dos meses, para el resto de la congregación es como si no existiera.',
          },
        ],
      },
      {
        id: 'co-activar',
        title: 'Activar una visita',
        blocks: [
          {
            type: 'p',
            text: 'La visita se activa una vez y, a partir de ahí, la aplicación se encarga sola: mueve la reunión de entre semana al día de la visita, cambia el programa de esa semana y avisa a quien corresponda.',
          },
          {
            type: 'steps',
            title: 'Para activarla:',
            items: [
              'Entra en "Visita del superintendente" desde Congregación.',
              'Pulsa "Nueva visita".',
              'En "Semana de la visita", elige el martes en que empieza. Ese día manda: todo lo demás se calcula a partir de él.',
              'Guarda.',
            ],
          },
          {
            type: 'p',
            text: 'El nombre del superintendente no se escribe aquí: sale del que tengas puesto en los ajustes de la congregación, y el mismo vale para todas las visitas.',
          },
          {
            type: 'tip',
            text: 'Si viene un sustituto, marca la casilla "Viene un superintendente sustituto" y rellena "Nombre del sustituto" y "Nombre de su esposa (vacío si soltero)". El programa sale igual, pero con quien de verdad viene.',
          },
          {
            type: 'faq',
            q: '¿Puedo cambiar la fecha después de activarla?',
            a: 'Sí. Cambia el martes y todo lo que cuelga de esa semana se recoloca solo. No hace falta borrar la visita y volver a crearla.',
          },
          {
            type: 'link',
            to: '/congregation/circuit-visit',
            label: 'Abrir Visita del superintendente',
          },
        ],
      },
      {
        id: 'co-semana',
        title: 'Qué cambia esa semana en las reuniones',
        blocks: [
          {
            type: 'p',
            text: 'La reunión de entre semana se traslada al día de la visita — normalmente el martes — y su programa cambia: no hay Estudio bíblico de congregación y el superintendente da el discurso de servicio. El fin de semana lleva su discurso especial.',
          },
          {
            type: 'p',
            text: 'No tienes que tocar nada de eso a mano en los editores de reunión. Al activar la visita, esa semana ya aparece así en «Reunión de entre semana» y en «Reunión de fin de semana».',
          },
          {
            type: 'warn',
            text: 'Los turnos que dependen de la reunión —acomodadores, micrófonos, exhibidores, limpieza— siguen la fecha nueva, no el miércoles de siempre. Si ves un hueco donde antes había alguien, es porque ese día ya no hay reunión.',
          },
        ],
      },
      {
        id: 'co-programa',
        title: 'El programa de la visita: comidas, acompañantes y predicación',
        blocks: [
          {
            type: 'p',
            text: 'Dentro de la visita tienes el programa completo de la semana, en tarjetas: "Programa de comidas" (los anfitriones de cada día), "Programa de predicación" —de miércoles a domingo, con las mismas salidas que ya tienes en "Salidas de predicación"—, "Visitas de pastoreo" (los hermanos a los que va a visitar), "Reuniones especiales" y "Contabilidad", que es solo un recordatorio porque eso se lleva aparte.',
          },
          {
            type: 'warn',
            text: 'Las "Reuniones especiales" no se anuncian hasta que tengan fecha, hora Y lugar. Mientras le falte alguno de los tres, solo la ves tú aquí.',
          },
          {
            type: 'tip',
            text: 'El botón "Exportar" de arriba saca el PDF de la visita, que cabe en una sola hoja. Es el que se reparte a los ancianos y el que se cuelga en el tablón.',
          },
        ],
      },
      {
        id: 'co-documentacion',
        title: 'La documentación que hay que tener lista',
        blocks: [
          {
            type: 'p',
            text: 'La pantalla lleva una lista de lo que el superintendente va a pedir, para que no se quede nada sin preparar:',
          },
          {
            type: 'steps',
            items: [
              'Registro de publicadores (S-21): la tarjeta de informe de cada publicador.',
              'Asistencia a las reuniones (S-88): los registros de entre semana y fin de semana.',
              'Territorios (S-13): el registro y el estado actual.',
              'Estado de la contabilidad: esto va aparte, se revisa con el siervo de cuentas.',
            ],
          },
          {
            type: 'p',
            text: 'Los tres primeros llevan su propio botón "Exportar" ahí mismo: no hace falta ir a la pantalla de cada uno para sacar el PDF.',
          },
        ],
      },
      {
        id: 'co-hermanos',
        title: 'Lo que ven los demás hermanos',
        blocks: [
          {
            type: 'p',
            text: 'Desde dos meses antes, a todos les sale sola una pestaña «Visita del superintendente» en «Programas semanales», y desaparece sola el día después de terminar. En Congregación no les sale nada: esa pantalla es solo tuya.',
          },
          {
            type: 'tip',
            text: 'Por eso no hay que avisar de nada ni publicar nada aparte: en cuanto activas la visita, a su debido tiempo les sale.',
          },
        ],
      },
    ],
  },
  {
    id: 'responsabilidades',
    title: 'Responsabilidades y plan de evacuación',
    description:
      'Quién lleva cada departamento y qué hacer si hay que desalojar el salón.',
    icon: <IconAssignment color="var(--accent-main)" />,
    visible: (r) => r.isElder || r.isAdmin,
    articles: [
      {
        id: 'resp-departamentos',
        title: 'La página de Responsabilidades',
        blocks: [
          {
            type: 'p',
            text: 'Es el cuadro de quién lleva cada departamento del salón: el responsable, su auxiliar y el equipo. Sirve para tenerlo por escrito y para imprimirlo. La página la puede mirar cualquier hermano; cambiarla, solo los ancianos.',
          },
          {
            type: 'steps',
            title: 'Para cambiar un departamento:',
            items: [
              'Entra en "Responsabilidades" desde Congregación.',
              'Toca "Editar": hasta entonces la página es solo de lectura.',
              'Pulsa el departamento que quieras y elige el responsable, el auxiliar y los hermanos del equipo.',
              'Toca "Guardar". Se sincroniza con los demás como todo lo demás. ("Cancelar" deshace lo que hayas tocado.)',
            ],
          },
          {
            type: 'tip',
            text: '"Exportar" saca su propio PDF, pensado para el tablón: cada departamento con su equipo.',
          },
          {
            type: 'link',
            to: '/congregation/responsabilidades',
            label: 'Abrir Responsabilidades',
          },
        ],
      },
      {
        id: 'resp-evacuacion',
        title: 'El plan de evacuación',
        blocks: [
          {
            type: 'p',
            text: 'Recoge las salidas del salón, el punto de reunión de fuera y quién se encarga de qué si hay que desalojar. Es información que casi nunca se usa y que, el día que se usa, tiene que estar a mano y clara. La ve cualquier hermano: el plano se toca para ver el detalle de cada zona, y al lado están "Estructura de mando", "Equipos", "Procedimientos" y "Reglas del plan".',
          },
          {
            type: 'p',
            text: 'Los ancianos tienen además el engranaje junto al título ("Configuración del plan de evacuación"), que es donde se cambia el plan.',
          },
          {
            type: 'warn',
            text: 'Revísalo al menos una vez al año y cada vez que cambie algo del local o de quien tiene asignado un puesto. Un plan con nombres de hermanos que ya no están no sirve de nada.',
          },
          {
            type: 'link',
            to: '/congregation/evacuacion',
            label: 'Abrir Plan de evacuación',
          },
        ],
      },
    ],
  },
  {
    id: 'administracion',
    title: 'Administración',
    description:
      'Cuentas de usuario, copias de seguridad y herramientas de recuperación.',
    icon: <IconAdmin color="var(--accent-main)" />,
    visible: (r) => r.isAdmin || r.isSettingsEditor,
    articles: [
      {
        id: 'admin-cuentas',
        title: 'Cuentas de usuario e invitaciones',
        blocks: [
          {
            type: 'p',
            text: 'En Configuración → "Cuentas de usuario" (la pantalla se titula "Gestión de cuentas de usuario") está quién tiene acceso a la aplicación y con qué rol. Cada rol abre exactamente lo que le corresponde: los programas al que hace programas, los informes al secretario, y así con todo.',
          },
          {
            type: 'link',
            to: '/manage-access',
            label: 'Abrir Cuentas de usuario',
          },
          {
            type: 'warn',
            text: 'Da a cada uno el rol mínimo que necesita. Siempre se puede ampliar después; lo contrario (retirar accesos) es más incómodo.',
          },
        ],
      },
      {
        id: 'admin-nuevo-usuario',
        title: 'Dar de alta a un hermano nuevo en la aplicación',
        blocks: [
          {
            type: 'p',
            text: 'La forma más sencilla es desde su propia ficha de Personas, en dos pasos:',
          },
          {
            type: 'steps',
            items: [
              'Si el hermano no tiene ficha todavía, créala primero (Personas → "Añadir") con su condición correcta (publicador bautizado, no bautizado, anciano, etc.), porque de ahí sale automáticamente lo que va a poder ver.',
              'Abre su ficha y rellena el campo "Dirección de correo electrónico" con el correo que usa en su cuenta de Google.',
              'Guarda. Con eso su petición de entrada queda aprobada de antemano: no tendrás que aceptarla a mano cuando la mande.',
              'Pásale el CÓDIGO DE ACCESO de la congregación. Sin él no puede entrar.',
            ],
          },
          {
            type: 'warn',
            text: 'El correo ahorra la aprobación, no el código. Los datos de la congregación van cifrados de punta a punta: el servidor no tiene la llave y no puede dársela a nadie, así que el hermano tiene que escribir el código de acceso la primera vez en cada dispositivo. Es lo normal, no un fallo.',
          },
          {
            type: 'tip',
            text: 'A partir de la segunda vez ya no se lo pide: la aplicación guarda las llaves en ese dispositivo y entra sola. Solo se le vuelven a pedir si cierra sesión a propósito o si se cambian las llaves de la congregación. Y si algún día quieres retirarle el acceso, basta con borrar el correo de su ficha y guardar.',
          },
          {
            type: 'faq',
            q: '¿Y si el hermano ya tiene ficha pero su petición no se aprueba sola?',
            a: 'Revisa que el correo de su ficha esté escrito exactamente igual que el de su cuenta de Google (mayúsculas/minúsculas no importan, pero sí erratas) y que hayas guardado los cambios.',
          },
        ],
      },
      {
        id: 'admin-ajustes-congregacion',
        title: 'Los ajustes de la congregación',
        blocks: [
          {
            type: 'p',
            text: 'Configuración → "Ajustes de congregación" es el sitio donde se decide cómo funciona la aplicación para toda la congregación. Va en bloques:',
          },
          {
            type: 'steps',
            items: [
              'Los datos de la congregación: nombre, número, número de circuito y dirección del Salón del Reino.',
              '"Materiales de reunión, formularios y programas": las plantillas, cómo se escriben los nombres y el interruptor de la exportación a PDF para todos.',
              '"Predicación": los ajustes del módulo de predicación, entre ellos si los publicadores ven Territorios.',
              '"Superintendente de circuito": su nombre y el de su esposa, que es de donde los toma la visita.',
              '"Grupos de idiomas": los grupos de idioma de la congregación.',
              '"Privacidad de la congregación": el código de acceso, la llave maestra y quién ve qué.',
            ],
          },
          {
            type: 'link',
            to: '/congregation-settings',
            label: 'Abrir Ajustes de congregación',
          },
          {
            type: 'warn',
            text: 'Lo de "Privacidad de la congregación" no es un ajuste más: ahí está el código de acceso que necesita cada hermano para entrar por primera vez en un dispositivo. Cambiarlo obliga a todos a volver a escribirlo.',
          },
        ],
      },
      {
        id: 'admin-copias',
        title: 'Copias de seguridad',
        blocks: [
          {
            type: 'p',
            text: 'La aplicación tiene varias redes de seguridad que funcionan solas: copias locales automáticas en el dispositivo del administrador (diarias, semanales y mensuales), copia a Google Drive si está activada, y copias diarias en el servidor de las tablas más delicadas (los programas de reuniones, entre otras) con 30 días de historial.',
          },
          {
            type: 'p',
            text: 'Todo eso se ve en Configuración → "Ajustes de congregación" → "Importar o exportar datos de congregación", que para el administrador tiene cuatro pestañas: "Manual (JSON)" para sacar o meter una copia completa a mano (por ejemplo, antes de un cambio grande), "Copias locales", "Google Drive" y "Servidor".',
          },
        ],
      },
      {
        id: 'admin-recuperacion',
        title: 'Herramientas de recuperación (pestaña Servidor)',
        blocks: [
          {
            type: 'p',
            text: 'En "Importar o exportar datos de congregación" → pestaña "Servidor" están las herramientas para emergencias:',
          },
          {
            type: 'steps',
            items: [
              'Las copias diarias del servidor (últimos 30 días): elige en "Datos a recuperar" qué tabla quieres (por ejemplo, solo los programas), la "Fecha de la copia", y toca "Restaurar esta copia". Antes de sobrescribir se respalda lo que hay ahora.',
              '"Congelar sincronización de programas": mientras esté congelada, ningún dispositivo salvo el tuyo puede subir cambios de programas, así que puedes restaurar la versión buena sin que nadie la pise. No afecta a informes ni a asistencia.',
              '"Forzar re-descarga de programas": el botón "Forzar re-descarga en todos" hace que TODOS los dispositivos tiren su copia local de programas y se queden con la del servidor. Primero se restaura la versión correcta y luego se pulsa esto para imponerla.',
            ],
          },
          {
            type: 'warn',
            text: 'Estas herramientas son potentes. Antes de usarlas en una emergencia real, respira: exporta una copia manual primero, restaura solo la tabla afectada, y usa el candado si otros dispositivos siguen subiendo datos malos.',
          },
        ],
      },
      {
        id: 'admin-mantenimiento',
        title: 'Buenas prácticas de administrador',
        blocks: [
          {
            type: 'p',
            text: 'Tres hábitos que evitan sustos: revisa de vez en cuando que la versión de todos va al día (el aviso de actualizar llega solo, pero un vistazo no cuesta), exporta una copia manual antes de cualquier cambio grande (importaciones, reorganizar grupos…), y si algo se ve raro en un dispositivo concreto, prueba primero con "Sincronizar datos" (Configuración) y, si sigue igual, con "Volver a descargar los datos" (Configuración → "Acerca de la aplicación").',
          },
        ],
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════
  // GRUPO DE IDIOMA (superintendente del grupo)
  // ════════════════════════════════════════════════════════════════════
  // Su trabajo del día a día ya lo cubren las secciones de reuniones: dentro
  // de su grupo le salen true las banderas de editor de entre semana, de fin
  // de semana y de discursos. Lo único que no cubría nadie es "Ajustes de
  // grupo", que es SUYA y de nadie más — de ahí esta sección, corta a
  // propósito.
  {
    id: 'grupo-idioma',
    title: 'Grupo de idioma',
    description: 'Los ajustes propios de un grupo de idioma.',
    icon: <IconGroups color="var(--accent-main)" />,
    // La misma puerta que `/group-settings` (`isLanguageGroupOverseer`), que
    // también deja pasar al administrador. Si tu congregación no tiene grupos
    // de idioma, esta sección no te dice nada: es la de quien lleva uno.
    visible: (r) => r.isLanguageGroupOverseer,
    articles: [
      {
        id: 'gi-ajustes',
        title: 'Los ajustes de tu grupo',
        blocks: [
          {
            type: 'p',
            text: 'Dentro del grupo, en Configuración tienes "Ajustes de grupo". Es la misma pantalla que los ajustes de la congregación, pero recortada a lo que es del grupo: los datos del grupo, los "Grupos de idiomas" y "Materiales de reunión, formularios y programas".',
          },
          {
            type: 'link',
            to: '/group-settings',
            label: 'Abrir Ajustes de grupo',
          },
          {
            type: 'warn',
            text: 'Lo que NO sale ahí es a propósito: la privacidad de la congregación, los ajustes de predicación y el superintendente de circuito son de toda la congregación, no de un grupo, y se llevan desde "Ajustes de congregación".',
          },
        ],
      },
      {
        id: 'gi-resto',
        title: 'Todo lo demás lo tienes en su sección',
        blocks: [
          {
            type: 'p',
            text: 'Dentro de tu grupo eres a la vez editor de la reunión de entre semana, de la de fin de semana y coordinador de los discursos, así que las secciones de esas tres reuniones son también para ti: lo que cuentan vale igual, solo que aplicado a tu grupo.',
          },
          {
            type: 'tip',
            text: 'Los informes de predicación de los hermanos de tu grupo también los ves tú, en Informes → "Informes de predicación", acotando con el filtro a tu grupo de idioma.',
          },
        ],
      },
    ],
  },
];
