# Plan de pulido — estado vivo

**Este fichero manda.** No hace falta que nadie diga por dónde seguir: se abre,
se coge lo primero sin terminar, se hace, se marca la casilla y se sube.

Cómo trabajar: `/pulir` (el comando explica el método, el catálogo de los 14
defectos y los guardarraíles). Este fichero solo lleva la cuenta.

Inventario base: **1.408 defectos en 977 ficheros**, medido el 2026-07-30 por
una barrida de 12 agentes. Los recuentos de más abajo son de ese día; se
actualizan al cerrar cada bloque.

---

## 0 · Pendientes de Carlos — VAN PRIMERO

Cosas que él vio y señaló. Estaban diagnosticadas y metidas en el catálogo,
pero sin arreglar.

- [x] **Editar territorio · selector de Zona.** Estaba alimentado con
      `<option>` en crudo, que MUI no estila: se veía nativo y el valor elegido
      caía descolocado. Ahora con `MenuItem`, y la etiqueta pasa DENTRO del
      campo, como los otros campos del mismo diálogo.
- [x] **Informe de predicación · el editor de horas.** Dos vueltas:
      1ª: `MinusButton`/`PlusButton` a redondos, como el `IconButton`
      compartido. Al mirarlo salió que la TABLA DE FORMAS decía lo contrario
      que el código; mandó el código y se corrigió la tabla.
      2ª (Carlos, 2026-07-30): redondos seguían quedando mal, y con razón — el
      problema no era la forma sino la COMPOSICIÓN. Eran tres piezas sueltas en
      una caja de 180px con `space-between`, y 40 + 100 + 40 = 180 exactos: el
      reparto no dejaba ni un píxel entre ellas, **se tocaban**. Y el campo del
      número medía 59 de alto contra 40 de los botones.
      Ahora es UN control (`report/stepper_track.ts`): un carril con la
      superficie y el radio, los dos signos sin dibujo propio dentro, y el
      número con `flex: 1`, que es lo que lo centra de verdad entre los dos y
      no "dentro de su cajita". 4 + 40 + 96 + 40 + 4 = 184.
      Lo del "número sin superficie" del inventario era FALSO: `TimeField` es
      un `TextField` y le alcanza el bloque «EL CAMPO».
      → `components/{plus,minus}_button/`, `report/{hours,standard}_editor/`
- [x] **Informe de predicación · Año.** Fuera los 4 `<linearGradient>` del
      gráfico: en una gráfica el degradado además engaña, porque el ojo lo lee
      como si el valor cambiara a lo alto de la barra cuando lo que mide es la
      altura.
- [x] **Exhibidores · Crear turno.** Las dos horas eran `<TextField
      type="time">`, el control NATIVO del navegador. Pasan al `TimePicker` de
      la app, como ya hacía su pantalla gemela (Salidas). Hizo falta `minWidth:
      0` en las dos columnas: es más ancho que el nativo y desbordaba.
- [x] **Reordenar: se arrastra.** Decidido por Carlos. Los cuatro sitios pasan
      a `@components/drag_handle`, un asa única.
      Mi reparo —arrastrar se pelea con el scroll del dedo— lo resolvía ya la
      app sin saberlo: `handle=".scrollable-icon"` hace que solo arrastre si el
      dedo EMPIEZA sobre el asa; el resto de la fila sigue haciendo scroll.
      Lo que sí se perdía al quitar las flechas era el teclado, que no puede
      arrastrar. Así que el asa es un BOTÓN: se enfoca con el tabulador y, ahí,
      ↑ y ↓ mueven la fila. Una sola cosa en pantalla, las dos formas de usarla.
      De paso, Grupos de predicación —que ya arrastraba— GANA el teclado, que
      nunca tuvo, y su asa deja de ser un icono mudo.
- [ ] **Territorios · DialogZonas y DialogEtiquetas.** Se quedaron a medias:
      solo se les pasaron los radios.

---

## 1 · Lo que NO es cosmético

Rompe algo, no solo se ve mal. **Cerrado salvo lo marcado.**

- [x] Márgenes seguros de iOS en el selector de fecha compartido — metía
      Aceptar/Cancelar bajo la barra del gesto de inicio en TODA la app
- [x] `unsupported_browser` y las dos pantallas de arranque
- [x] Tokens que no pintan (`--accent-50`, `--accent-250`, `--accent-350-base`)
- [x] Seis chips construidos pegando hex al color (`${color}15`) → `color-mix`
- [x] Siete iconos negros en modo oscuro dentro de un `IconButton` de MUI
- [x] La lista de normas de Evacuación, con la paleta del plano de fondo
- [x] Dos erratas que dejaban la regla muerta (`'strecth'`, `'Mui-Selected'`)
- [x] Seis fugas de memoria en descargas → `saveAs`
- [x] El interruptor `others` de "nombre para mostrar", que no leía nadie
- [x] Teclado: las 37 casillas del Inicio y la tira de 26 semanas
- [x] Exhibidores: dos desplegables de +100 hermanos sin buscador
- [x] **Teclado: los `div` pulsables.** Medido en el navegador ruta por ruta
      (lo que se puede pulsar con el ratón y no con el teclado), no estimado.
      Salían **~180**, no 69, y estaban concentrados en listas:
      · Registros de publicadores: **90 filas** — la pantalla entera era
        inalcanzable. Y venían de DOS `styled(Box)` idénticos byte a byte, los
        dos llamados `UserCard`, tapando con ese nombre al `@components/
        user_card` de verdad. Ahora hay uno: `@components/card_button`.
      · Salidas de predicación: 62 filas de turno (tres sitios con la misma
        forma). Solo son botón si eres del comité de servicio — una fila que no
        lleva a ningún lado no debe aparecer al tabular.
      · Asistencia: 11 cabeceras de mes. Discursos públicos: 8 filas.
      · Los selectores de mes de las gemelas (`collapsible_selector`), el de
        vista del Informe, el de reunión de Programas semanales, las dos
        tarjetas de importar de Materiales, los plegables de Oradores
        salientes, "Todos los días", "Todos los demás publicadores" y la
        cabecera de grupo de idioma.
      Una fila de TABLA no puede ser un `<button>` (no es HTML válido dentro de
      un `<tr>`), así que ahí va el otro patrón: `tabIndex` + `role` + atender
      a Intro y Espacio a mano.
      **Quedan dos a propósito**: el sol/luna del interruptor de tema (el
      `<input>` de dentro SÍ se alcanza, y ahora además tiene nombre) y las 8
      filas de historial de Discursos públicos, que repiten el mismo toggle de
      la fila de arriba — una segunda parada de tabulador para la misma acción
      es peor que ninguna.
- [x] **Márgenes de iOS.** El "16 de ~94 ficheros con diálogo" del inventario
      era una forma engañosa de contarlo: un diálogo CENTRADO no toca ningún
      borde de la pantalla, así que no necesita el área segura para nada. Solo
      la necesita lo que se ancla al borde del VIEWPORT.
      Contado así, son cinco cosas en toda la app, y tres ya la tenían: la
      bandeja de acciones, el aviso de navegador no compatible y los
      recordatorios (más el selector de fecha, arreglado antes).
      Faltaban dos, y las dos son reales:
      · **El visor de documentos.** Va a PANTALLA COMPLETA en móvil y reparte
        su contenido con `space-between`, así que lo último queda pegado abajo.
        Tenía el área segura ARRIBA y no abajo: en un iPhone el botón de
        descargar caía bajo la barra del gesto de inicio — se veía, pero el
        dedo no llegaba.
      · **El mapa de territorios** usaba `calc(100vh - 150px)` en móvil. En
        Safari de iOS `100vh` es el viewport GRANDE (el que habría con la barra
        de direcciones oculta), así que el mapa salía más alto que lo que se ve
        y su borde inferior quedaba cortado. Ahora `dvh`.
      El detector bueno para esto: buscar `safe-area-inset-top` SIN
      `safe-area-inset-bottom` en el mismo fichero. Los dos que quedan con solo
      arriba anclan al techo, no al suelo, y están bien.
- [x] ~~Traducción de los 5 módulos sin `t()`~~ — **descartado a propósito**:
      la app es solo para Elda Centro, en español. No re-abrir.
- [ ] Fuga del blob del avatar (`states/settings.ts`) — es un átomo derivado,
      liberarla mal rompe la foto; necesita mirarse aparte

---

## 2 · Barridos (un defecto, toda la app de una vez)

Son los que se encuentran Y se verifican sin abrir la pantalla: el grep prueba
que no queda ninguno, y `tsc` + tests + build prueban que no se rompió nada.
Entre los cinco son el **56%** del total.

- [x] **B1 · Colores fijos** — los 19 `rgba(59,114,196)` del armazón (barra
      superior, cajón, menú de perfil, avisos, botones de acción) iban con el
      azul del tema por defecto CONGELADO. Comprobado en el navegador: con el
      acento en `90,155,74` la píldora seguía proyectando azul. Ahora los cinco
      temas dan su color. También el rojo fijo del aviso de "sin conexión".
      Barrida de tokens fantasma en toda la app: **cero**. Lo de los "nombres
      CSS crudos" del inventario era casi todo FALSO — eran props `color="red"`
      de componentes de la app, que sí mapean a tokens.
- [x] **B2 · Radios** — 396 alias viejos (`--radius-*`, `--r-*`) migrados de
      una vez a la escala por rol, con el valor INTACTO: cada alias tenía un
      equivalente exacto, comprobado token a token en el navegador antes de
      tocar nada. Verificado sobre el diff, par por par, no sólo compilando.
      Lo que sí cambió de aspecto, y era lo que valía la pena:
      · **Los diálogos.** Había CUATRO radios distintos entre los ~30 escritos
        a mano (16, 20, 12, 28) y sólo uno coincidía con `@components/dialog`.
        Todos a `--shape-xl`. Ojo: el mismo patrón (`slotProps.paper`) lo usan
        los `<Menu>`, y ésos NO son diálogos — se quedan en `--shape-sm`.
      · **El esqueleto de carga del Inicio** tenía 15/10/17px inventados donde
        lo real es 12 / píldora / 12: la pantalla saltaba al llegar los datos.
      · El `<Button>` crudo de MUI iba a 17px por el tema, cuando el botón de
        la app es píldora.
      Se queda a propósito el píxel suelto de: las plantillas PDF (`src/views`,
      react-pdf no entiende custom properties), el correo de `firebase/email`
      (ídem los clientes de correo), la pantalla de "sin JavaScript" de
      `index.html` (isla autosuficiente a propósito), el rectángulo de 3px del
      mapa (es un GLIFO de herramienta, no una superficie) y el aviso de enlace
      roto de `main.tsx` (se dibuja sin CSS a propósito).
- [~] **B3 · Tipografía** — el titular del inventario ("41 tamaños a mano")
      resultó **FALSO en su mayor parte**: son dos escalones ×1,15 deliberados
      y documentados (tablet táctil y Programas semanales), y por eso salen los
      medios píxeles (12×1,15 = 13,8 → 13,5). No se tocan.
      Lo que sí había, y era un fallo de verdad: **`label-small-semibold` se
      quedaba fuera del escalón de tablet**. Sus dos hermanas (`-medium`,
      `-regular`) subían a 13,5 y ella se quedaba en 12 — la misma etiqueta con
      distinto peso, una más pequeña que su vecina. Comprobado leyendo el CSSOM
      del navegador, no el fichero. Arreglado.
      Comprobado también que no queda ninguna clase de texto declarada sin CSS
      (el fallo de 2026-07-14 no ha vuelto).
      **Queda**: ~150 `fontSize` a mano en `sx`, casi todos en Exhibidores y
      Salidas. NO es un barrido: cada uno lleva su `fontWeight`/`fontStyle`
      pegado y hay que decidir clase por clase. Y hay un motivo real para
      hacerlo — un `fontSize` en `sx` no crece en tablet (ver DESIGN_SYSTEM §3).
- [x] **B4 · Degradados** — cerrado con matiz: "los 14 fuera" era demasiado
      grueso. Fuera los que caen sobre CONTENIDO (cabeceras, botones, barras de
      gráfica); se quedan los fondos AMBIENTALES (`.screen`, `.glow`, las
      pantallas de arranque, el desvanecido del avatar), que además ya usan
      tokens del tema. Regla escrita en DESIGN_SYSTEM §6.7.
- [~] **B5 · Redacción** — hecha la parte de los BOTONES, que era la que Carlos
      pidió: una sola forma de escribirlos y un solo verbo por acción.
      · **Fuera las versalitas.** La app se contradecía sola: los botones
        `variant="small"` (61) nunca transformaron nada, así que en la misma
        pantalla convivían "Categorías" y "CANCELAR". Ahora `button-caps` es
        14px / peso 600 / tal como se escribe. `h2-caps` SÍ se queda en
        mayúscula: ahí separan cabecera de contenido, que es otro trabajo.
      · "Guardar cambios" → **"Guardar"** en los 5 sitios. "OK" → "Aceptar"
        (anglicismo). "Añadir orador nuevo" → "Añadir orador".
      · **"clave maestra" contra "llave maestra"**: la app la llamaba de las
        dos formas, y la rara estaba justo en el botón que la establece.
      · **La Ayuda citaba botones que no existen** — decía "Restaurar Fijos" y
        "Restaurar al Global"; y Exhibidores y Salidas, que son gemelas,
        llamaban distinto a la MISMA acción ("al global" / "a global").
      · Title Case en español: ~90 sitios (los 14 turnos de Salidas × 4 copias,
        "Copias Locales", "Sesión Expirada", "Crear Copia Ahora", "Cuerpo de
        Ancianos", "Sin Asignar" en el PDF de invitación…).
      · "..." → "…" en las 8 cadenas que se habían quedado con tres puntos.
      **NO se tocan**, y son a propósito: las cabeceras en inglés del CSV de
      oradores (es el formato de intercambio con otras congregaciones) y
      "Visita del Superintendente" de Documentos (es un DATO ya guardado en el
      servidor; renombrarlo dejaría los documentos existentes descolgados).
      · **Los meses y los días, en minúscula.** En Programas semanales se leía
        "Semana del 27 de Julio al 2 de Agosto" mientras el saludo del Inicio
        —tres toques más allá— decía "Jueves, 30 de julio": esa pantalla usa el
        formateador del navegador, que sí sabe la regla. No eran 7 arrays a
        mano sino **TRECE**, unos en mayúscula y otros en minúscula.
        Ahora los nombres viven en minúscula (diccionario español +
        `@utils/nombres_fecha`) y la mayúscula la pone quien abre la etiqueta,
        con `capitalizarPrimera()`. Se retiró de paso un `monthCase` que ya
        intentaba arreglarlo preguntando "¿estamos en español?" — pero solo en
        una pantalla de las trece.
        Comprobado en el navegador por las dos caras: ni un mes en mayúscula a
        mitad de frase en 14 rutas, ni uno en minúscula abriendo una.
      **Queda**: plurales concatenados y códigos en pantalla.
- [x] **B6 · Accesibilidad** — CERRADO, incluidos los diálogos, que era el
      agujero que quedaba. Se abrieron uno a uno y se midió toda la página
      DESPUÉS de abrirlos (no solo el diálogo), que es como salen también los
      cajones y los cambios de modo. Lo único que apareció: en modo edición de
      Responsabilidades, TODAS las fichas de cargo eran `div` pulsables — la
      pantalla entera sin teclado.
      Los botones de scroll de las pestañas de MUI se quedan como están: son
      `div`, sí, pero las pestañas siguen el patrón ARIA correcto (solo la
      activa en el tabulador, el resto con flechas), así que esos botones son
      un atajo de ratón que no quita nada.
      Antes de esto, mi propia comprobación tenía
      un AGUJERO: excluía `[role=button]` del barrido de "div pulsables", dando
      por hecho que ese papel implicaba ser alcanzable. No lo implica. Había
      tres sitios con `role="button"` y SIN `tabIndex` —el botón de acción de
      la bandeja móvil (que sale en todas las pantallas) y las dos flechas del
      navegador de semanas—: se anunciaban como botón a un lector de pantalla y
      no se podían enfocar ni pulsar con el teclado. Eso es PEOR que un `div` a
      secas, porque prometen algo que no cumplen. Los tres son ya `<button>`.
      Lo anterior sigue en pie: comprobado en el navegador, no con
      `grep`: las 43 rutas de `App.tsx`, contando botones sin nombre
      accesible. Cero.
      El método importa, porque `grep` falló DOS veces:
      · El borrar de la lista de personas (100 botones, uno por hermano) va
        dentro de un `styled(IconButton)` con otro nombre.
      · El buscador compartido, que sale en cinco pantallas, y el icono de
        cuenta de la barra superior, que es un `Box` con `role="button"`.
      Un tercero no era de etiquetar: en `components/table` TODAS las columnas
      se envolvían en un control de ordenar, incluida la de acciones, que no
      tiene título — salía un botón **de 0×0 al que se llega con el tabulador**
      y que ordenaría por una columna que no se ordena. Ahora sin título no hay
      control.
      Las etiquetas dicen SOBRE QUÉ, no sólo qué: las cinco ruedecitas de
      Salidas dicen cada una su semana ("Ajustes de la semana del 29 de junio
      al 5 de julio"), y el borrar de una persona dice a quién borra.
      **Lo que NO cubre esta comprobación**: los diálogos y cajones, que solo
      se abren a mano. Se revisaron los de Salidas (semana y mes), Exhibidores
      y el de categorías de Documentos; el resto queda sin barrer.
- [~] **B7 · MUI en crudo** — MEDIDO BIEN (2026-07-30): no son 108, son **51**,
      y ya no queda ninguno de botón. El recuento viejo contaba etiquetas
      (`<Button`, `<TextField`) sin mirar si venían de `@mui/material` o de
      `@components`. Lo que queda de verdad: TextField 22, Chip 16, Select 8,
      Tabs 3, Checkbox 1, Switch 1.
      Hecha la parte de los BOTONES, que es donde se
      veía. De 108 quedan **cinco** `<Button>` de MUI en toda la app, y los
      cinco son legítimos: son componentes compartidos que CONSTRUYEN su propio
      control sobre la base de MUI (`filter_chip`, `timer_button`, el botón del
      selector de fecha, `account_type`) — eso no es "MUI en crudo en una
      página", eso es la primitiva.
      Lo que se quitó, encontrado tirando del hilo de lo que vio Carlos:
      · Salidas · "¿Deseas ajustar el horario?" — el "Sí" era de la app y el
        "No" un `<Button>` de MUI con el borde, el color y el radio a mano:
        uno píldora, el otro un rectángulo de 12px, y de distinto tamaño.
      · Exhibidores · "Editar"/"Eliminar" de cada turno, y el "Editar" del
        override mensual, que no llevaba NI UN estilo — o sea, con los colores
        por defecto de MUI, que no son los del tema.
      · Salidas · "Suspender/Reactivar salida".
      · El botón de Google del arranque: a píldora, con el movimiento por
        tokens y sin la fuente escrita a mano.
      Los `CircularProgress` sueltos pasan a `IconLoading` (5 de 8). Los otros
      tres se quedan: NO son indicadores de carga, son anillos decorativos
      alrededor de un avatar, con `thickness` y posición absoluta, y el
      componente compartido no sabe hacer eso. Nota: `IconLoading` ES un
      `CircularProgress` por dentro, así que esto nunca se vio distinto — era
      deuda de código, no un fallo visual.

---

## 3 · Pulido pantalla a pantalla

Necesita ojos encima. Orden por impacto, no por comodidad.

- [ ] Borrar los ~19 ficheros muertos del panel viejo (ninguna ruta los monta;
      hoy inflan el recuento de la peor zona)
- [~] **Inicio** — Carlos apostaba a que no había nada, y de forma medible
      casi acierta: ni un radio fuera de escala, ni un color fijo. Pero había
      un fallo que no se ve MIRANDO, sino tabulando: la tarjeta de "Mis
      asignaciones" y las dos filas de reunión eran `div` con `onClick`, o sea
      que con el teclado no se llegaba a ellas. Y en la barra de arriba había
      DOS zonas pulsables pegadas —el logotipo y el nombre— que hacían lo
      mismo, ninguna alcanzable. Ahora las once cosas pulsables del Inicio son
      botones de verdad, con nombre y anillo de foco.
      Ojo con el detalle que casi se me cuela: un `<button>` NO se estira al
      ancho del padre aunque sea `display: flex`, y trae fondo gris de fábrica.
      Lo primero lo cazó una medición; lo segundo, una captura.
      Queda el repaso visual de las pantallas de categoría.
- [~] **`src/components` + armazón** (244) — cada arreglo aquí se cobra en
      decenas de pantallas. Hecho el **barrido de iconos ajenos**: la app tiene
      308 iconos propios y usaba 9 de Material Icons, con OTRO trazo. Fuera los
      que tenían equivalente (`ExpandMoreIcon`, las flechas de
      `scrollable_tabs`, `KeyboardArrowUp/Down`, `ArrowDropDown/Left/Right` del
      selector de fecha).
      Y tirando de ese hilo salieron dos que no importaba nadie: el `Select` y
      el `Autocomplete` enseñaban el **triángulo por defecto de MUI** donde toda
      la app usa su chevrón. Arreglado en los dos componentes compartidos, o
      sea en todas las pantallas de golpe.
      Ojo con un fallo mío: primero puse `IconDown`, que es una flecha CON
      ASTIL —la de "mover abajo"—, no el chevrón. Se vio en una captura, no en
      el código. `IconExpand` es el bueno, y lo usan 17 ficheros contra 5.
      Se quedan a propósito: los círculos de radio de MUI (un radio ES un
      círculo y la app no tiene ese icono) y `PictureAsPdfIcon`/`DirectionsIcon`
      (huecos reales del juego propio).
      **Queda** el resto del repaso de `src/components`.
- [ ] **Mis asignaciones** — la abre cualquier publicador; 44 defectos en dos
      ficheros
- [~] **Documentos** — el inventario decía "127 en 26 ficheros"; son **6
      ficheros y 1.713 líneas**, y midiendo salen 69 marcas, varias de ellas
      datos (la paleta de colores de las categorías no es un color a mano).
      Hecho:
      · **La uñita de la izquierda de cada tarjeta**, que Carlos ya había
        señalado. Era un `::before` de 5px pegado al canto, y la esquina
        redondeada lo cortaba en seco dejando dos muescas. Pasa a la cápsula
        del sistema (`accentSurface`, §6.3).
      · **Tres copias de quince líneas de la misma etiqueta de estado**, y la
        del aviso con el ámbar CONGELADO (`#D97706`) — el `Badge` del sistema
        ya sabía pintar las tres.
      · La tarjeta era un `div` con `onClick`: no se abría con el teclado.
      · `toLocaleDateString()` daba "30/7/2026", el formato del NAVEGADOR,
        distinto del resto de la app.
      · Tres colores congelados más en el visor: una sombra en negro puro y un
        blanco al 80% (los dos invisibles o manchas en modo oscuro) y una
        sombra con el azul del tema por defecto metido a mano.
      · Cuatro `transition: all 0.Xs` a tokens de movimiento.
      **No verificado en pantalla**: la semilla de prueba no trae documentos
      (vienen de Firestore), así que la tarjeta no se pudo VER. Lo que sí se
      vio es `accentSurface` renderizando bien en el diálogo de categorías, que
      usa la misma función.
      **Queda**: `PictureAsPdfIcon` de Material Icons — es un hueco real (la
      app no tiene icono de documento entre sus 308), no un descuido.
- [ ] Exhibidores y Salidas, **pestañas de Programas semanales** (son ficheros
      DISTINTOS de las páginas ya repasadas, con el mismo nombre)
- [ ] **Oradores salientes** — panel lateral entero de divs
- [ ] **Informe de predicación** (`view_switcher`, `month_view`, `day_view`)
- [ ] **Limpieza y Responsabilidades** — los repasos fueron quirúrgicos; siguen
      con MUI en crudo
- [ ] **Visita del CO** — mezcla 40 y 56px en casi todas las filas
- [ ] **Personas** y catálogo de oradores
- [ ] **Importar/exportar** — muy malo, pero solo lo ven administradores
- [ ] **Informes** — estructura sana; su deuda es duplicación
- [ ] Ayuda, Materiales de reunión, Perfil, Recordatorios
- [x] **Territorios** — auditado por fin (27 ficheros, 12.330 líneas). El susto
      era mayor que la realidad: de 213 marcas brutas, **111 eran FALSAS de
      golpe** — mi comprobación de "MUI en crudo" miraba el nombre de la
      etiqueta (`<Button`, `<TextField`) sin mirar de dónde venía, y resulta que
      **ni un solo fichero de Territorios importa esos componentes de MUI**:
      son todos los de la app.
      Y otros tantos son correctos a propósito:
      · **Los 22 colores del mapa.** Los controles flotan sobre las teselas de
        OpenStreetMap y del satélite, que NO cambian con el tema (comprobado:
        no hay teselas oscuras para el modo oscuro). Un control blanco
        translúcido con texto casi negro es legible sobre el mapa en los dos
        modos; con tokens, se volvería invisible en oscuro. Varios ya lo
        llevaban comentado.
      · Los 24 "div pulsables": ya son botones con `component="button"`,
        `aria-label`, `aria-pressed` y anillo de foco, o envuelven un `<input>`
        de verdad. Cero.
      · Los `fontSize` del mapa son el tamaño de los signos +/−, no tipografía;
        y el `16` de Configuración es justo el umbral por debajo del cual
        Safari en iOS hace zoom al enfocar un campo.
      **Lo real, y arreglado**: las 13 transiciones a mano pasan a tokens de
      movimiento, y el cian `#3FA9D9` de Configuración —el ÚNICO de las cinco
      tarjetas con el color escrito a mano, y encima al 0,15 mientras las otras
      cuatro van al 0,10— pasa a `--blue-main`, que existía y era el hueco.
      **No verificado en pantalla**: los territorios vienen de Firestore y la
      semilla de prueba no los trae, así que el módulo no se pudo VER.

---

## 4 · Incoherencias entre pantallas

La misma tarea resuelta de varias maneras. Esto es lo que un repaso pantalla a
pantalla **no puede ver**, por definición. Decisión ya tomada en cada línea.

- [~] **Sección plegable** — hecha la copia GORDA: `MeetingSection`, que la
      usan **14 pantallas** (Programas semanales entero, Responsabilidades, la
      visita del superintendente, Departamentos, Discursos salientes, los dos
      editores). Su cabecera era un `div` con `onClick`: con el ratón se
      plegaba y con el teclado no había manera.
      El disparador va como una CAPA que cubre la franja, no envolviendo el
      contenido, por un motivo concreto: el editor de fin de semana mete un
      botón dentro de la cabecera, y un botón dentro de otro botón no es HTML
      válido. Con la capa debajo, ese botón sigue siendo suyo.
      Lleva `aria-expanded`, así que además ANUNCIA si está abierta.
      Quedan las copias sueltas (spiritual_status, import_export, week_selector,
      delegate_reports, pending_slips, month_item de asistencia…).
- [~] **Elegir persona** — mapeado. NO son 6 maneras arbitrarias: hay tres
      familias con motivo (`person_selector` cuando hace falta historial,
      `AutoComplete` para lo sencillo, `Select` cuando la lista es corta y
      cerrada). El problema es UNO y concreto:
      **Salidas de predicación asigna conductor con un `Select` sin buscador**
      mientras Exhibidores —su página GEMELA, misma acción— ya usa un
      `AutoComplete` con `groupBy`, que conserva los apartados "recomendados /
      otros" Y deja escribir. El comentario que dejé allí lo explica: "con más
      de cien hermanos habilitados hay que recorrer la lista entera con el
      dedo".
      **No lo reescribo a ciegas**: el `Select` de Salidas lleva además tres
      entradas que NO son personas (Ninguno, "Compartido: <congregación>",
      "Superintendente de circuito"), así que no es un cambio de una línea; y
      la semilla de prueba no trae hermanos habilitados para Salidas, así que
      la lista sale con UNA opción y no se puede comprobar que funcione. Es el
      control con el que se asignan las salidas: si se rompe, no se puede
      asignar a nadie.
      **HECHO** (Carlos: "toma la mejor decisión"): Salidas pasa al mismo
      buscador que Exhibidores, con `groupBy`. Las tres entradas que no son
      personas van como opciones SINTÉTICAS en la misma lista, bajo su propio
      apartado — si fueran un control aparte habría dos sitios donde mirar para
      una sola decisión.
      De paso, en ese diálogo los dos campos llevaban el rótulo FUERA, encima,
      cuando la app lo lleva dentro (ver «EL CAMPO»); y el de lugar era un
      `Select` de MUI en crudo, así que el `label` que le puse no pintaba nada.
      Ahora los dos campos son idénticos.
      **Verificado en pantalla** que el buscador se pinta, agrupa y guarda; NO
      verificado con una lista larga de hermanos, porque la semilla de prueba
      no trae ninguno habilitado para Salidas (hay que marcarlo en la ficha de
      cada persona).
      Quedan los dos `<MenuItem>` sueltos con personas (Limpieza y catálogo de
      oradores).
- [x] **Estado vacío** → `@components/empty_state`. No eran "8 copias del
      patrón bueno": eran **SIETE dibujos distintos** que no coincidían en
      nada — borde punteado o sólido, tres radios, tres clases de texto, dos
      tamaños de icono, uno en horizontal, dos sin caja, y uno que era un
      `Typography` a secas. El de Inicio llevaba además el borde en
      `rgba(59,114,196,.15)` —el azul del tema por defecto CONGELADO— y un
      `<svg>` escrito a mano en vez de uno de los 308 iconos de la app.
      Se conserva lo mejor de los siete: el círculo con lavado del acento que
      tenía Avisos. Fuera el borde punteado (significa "aquí se suelta algo").
      Ojo con lo que casi se me escapa: al quitar la caja, el círculo del icono
      quedaba casi del color del fondo y no se veía. Se cazó en una captura, no
      razonando. La caja vuelve por defecto y solo la quitan las de pantalla
      completa.
- [ ] **Elegir un mes** (5) → `@components/month_selector`. Exhibidores y
      Salidas cambian de control según el ancho de la ventana
- [ ] **Elegir una semana** (4) → `week_selector` + `week_navigator`; borrar la
      copia con prefijo `Dept` y la tercera de Oradores salientes
- [x] **Reordenar** (2) → hecho, ver bloque 0: los cuatro sitios a
      `@components/drag_handle`
- [ ] **Confirmar acción destructiva** (3) → `useConfirm()` repintado por
      dentro; luego colapsar las once carpetas `*_delete`
- [ ] **Pie de diálogo** (2) → el pie apilado de `@components/dialog`
- [ ] **Subir un fichero** (5) → `@components/file_picker`
- [x] **Indicador de carga** → 5 de los 8 `CircularProgress` a `IconLoading`.
      Los otros 3 se quedan: NO son indicadores de carga, son anillos
      decorativos alrededor de un avatar, con `thickness` y posición absoluta,
      y el componente compartido no sabe hacer eso.
- [ ] **Contador junto a título** (4) → `@components/badge`
- [ ] **Elegir una hora** (4) → `time_picker` para reloj, `timefield` solo para
      duraciones
- [ ] **Pestañas** (4) → `segmented_control` o `scrollable_tabs`
- [x] **Nombre de una persona** — investigado: NO era el fallo que parecía. El
      ajuste solo promete abreviar en el programa, y muchas llamadas están bien
      (comparadores de ordenación, formularios oficiales). Se retiró el
      interruptor muerto y se cierra

---

## Reglas de este fichero

1. Una casilla se marca **cuando está verificada**, no cuando compila.
2. Si algo se deja a medias, se escribe **qué** se dejó y **por qué**.
3. Si un hallazgo resulta ser falso al mirarlo de cerca, se marca igual y se
   explica — ya ha pasado dos veces y ahorra que el siguiente lo repita.
4. Los recuentos son de la barrida del 2026-07-30; si uno se desvía mucho al
   abrirlo, es que el inventario se equivocó ahí. Vale más lo que se ve.
