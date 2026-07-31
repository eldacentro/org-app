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
- [x] **Territorios · DialogZonas y DialogEtiquetas.** Cerrados. Lo que había
      debajo de los radios:
      · **Cuatro `<input type="color">` a pelo** — los únicos de toda la app.
        Ese control no lo dibuja la app, lo dibuja el sistema, y al pulsarlo se
        abre el selector del sistema operativo: mil millones de colores para
        elegir uno de DIEZ. `PALETA_COLORES` ya existía y ya se usaba para ir
        proponiendo el siguiente al crear, pero no se le enseñaba a nadie.
        Ahora la paleta ES el selector (`@components/color_picker`): diez
        pastillas, la elegida con su marca, y botones de verdad a los que se
        llega tabulando.
      · **"3 territorio(s)"** en seis sitios de cuatro ficheros → `@utils/plural`.
      · Los botones de solo icono, que eran `Button variant="small"`, a
        `@components/icon_button`, y su etiqueta dice de QUÉ zona ("Borrar la
        zona Elda - Urbano", no "Borrar zona").
      · El formulario de añadir era una rejilla de doce columnas con los
        tamaños a ojo: dejaba la pastilla pegada al margen y el botón flotando
        en un hueco vacío. Ahora es una fila que se ordena sola.
      · El color inicial de Etiquetas estaba a fuego (`'#EC4899'`).
      · Y el gordo, que salió tirando del hilo: **`PaperProps` REEMPLAZABA** al
        del componente `Dialog` en vez de sumarse, y lo primero que se llevaba
        por delante era la sombra. **Once diálogos** —los nueve de Territorios,
        las categorías de Documentos y las responsabilidades— pasaban su
        `PaperProps` solo para cambiar el ancho máximo y se quedaban PLANOS
        sobre el fondo mientras el resto de la app levantaba los suyos.
        Arreglado en el componente, así que los once a la vez. Comprobado
        montando el diálogo en una pantalla accesible (Territorios no carga en
        modo de prueba): sombra puesta, ancho propio respetado.

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
- [x] **Fuga del blob del avatar** (`states/settings.ts`). `createObjectURL` no
      es una función pura: cada llamada RESERVA memoria para el blob y solo la
      suelta `revokeObjectURL`. Se llamaba dentro de un átomo derivado sin
      liberar nunca la anterior, así que cada recálculo —y se recalcula al
      cambiar CUALQUIER ajuste, no solo la foto— dejaba otra copia en memoria
      hasta recargar la página.
      Ahora se guarda el búfer junto a su URL: si es el mismo búfer no se crea
      nada, y si cambió se libera la vieja. El aviso del plan era acertado
      (liberarla mal rompe la foto), así que la anterior se suelta en el
      siguiente turno del bucle de eventos y no a la vez: en ese instante
      todavía hay un `<img>` pintando la URL vieja.
      **No verificado en marcha**: el usuario de prueba no tiene foto, así que
      la fuga no se puede provocar en modo de prueba (medido: cero llamadas a
      `createObjectURL` paseando por la app).

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
      **Y un peso que mentía**: `body-small-semibold` iba a 450 mientras su
      hermana `body-small-medium` iba a 500 — el semibold más ligero que el
      medium, al revés que en el resto de la escala. Peor: Figtree está en
      cortes ESTÁTICOS, así que 450 no dibuja un 450, redondea. Medido con el
      mismo texto: 450 y 500 miden lo mismo (165,09) y 550 y 600 también
      (166,77), o sea que las dos clases se veían IDÉNTICAS y ninguna era
      semibold. Por eso la semana elegida de Programas semanales no se leía
      como elegida. Corregido a 600 —un solo corte de la fuente— en
      `index.css`, que es donde sobrevive a `npm run generate:css`.
      **Los `fontSize` a mano: 76 AJUSTADOS A LA ESCALA.** Eran 140 (no ~150) y
      82 estaban en las dos páginas gemelas. Lo grave no era el escalón de
      tablet: era que esas dos páginas usaban CINCO tamaños (11, 12, 13'5, 14 y
      16) donde la escala de la app tiene 12, 13, 15 y 16. O sea que el mismo
      tipo de texto se veía de un tamaño en Exhibidores y de otro en el resto.
      Ajustados al valor más cercano, con los empates hacia abajo para no
      provocar desbordes: 13'5→13 (42), 14→13 (15), 11→12 (19). Quedan 13, 12 y
      16, todos en escala.
      Comprobado que no se rompe nada: cero desbordes de texto y cero scroll
      horizontal en las dos páginas, en escritorio y en móvil, en vista de
      lista y de cuadrícula.
      Y mirándolo salió otro que no era mío: la columna de lugar tenía
      `minWidth: 120px` FIJO, así que en un móvil de 375 las tres columnas no
      cabían y esa se salía 1px del relleno de la fila. Ahora encoge y corta
      con puntos.
      **Y lo que faltaba por ver, que salió mirando Mis asignaciones: 150 de
      esas declaraciones NO PINTABAN NADA.** Todo `<Typography>` de la app
      lleva una clase de texto —la que le pasen o `body-regular`—, y esa clase
      declara tamaño, peso, espaciado, interlineado y caja de mayúsculas. La
      clase y la que genera `sx` valen lo mismo, así que decide el orden de la
      hoja y `global.css` va la última: el `sx` perdía siempre.
      Ni error ni aviso. 54 pesos, 26 interlineados, 26 espaciados, 21 cajas de
      mayúsculas y 21 tamaños escritos y tirados a la basura. La baldosa de
      fecha de Mis asignaciones pedía su abreviatura a 8px extranegrita en
      mayúscula y se veía a 15px, peso normal y tal cual.
      Por eso los que SÍ funcionaban llevaban `!important` (6) o iban en
      `style=` en línea (124) — entre ellos los 65 de Exhibidores y Salidas, o
      sea que aquel ajuste a la escala sí surtió efecto.
      Arreglado en el componente: sube la especificidad de esas nueve
      propiedades cuando vienen en `sx`. Regla en DESIGN_SYSTEM §6.4d.
      **Comprobado que activar las 150 no rompe nada**: se midió el recuento de
      desbordes con y sin el arreglo en nueve pantallas, en escritorio y en
      móvil, y sale EXACTAMENTE el mismo (1/0/0/0/7/1 y 3/13/24).
      **Queda**: pasar a CLASES los que se apartan de la escala sin motivo.
      Ahora ya es un trabajo distinto, porque ya se ve lo que hacen.
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
      **Cerrado (2026-07-31)**: quedaban DOS plurales con paréntesis
      ("3 número(s)", "5 documento(s)") → `@utils/plural`. Y un código de
      programador que se le estaba enseñando al usuario: `TAB_DATA_EMPTY`, en
      rojo, en las quince pantallas que usan las pestañas desplazables cada vez
      que una lista llegaba vacía. Ahora no se pinta nada —quien decide qué
      decir cuando no hay nada es la pantalla, que sabe de qué va— y el aviso
      vive donde le toca: en la consola, y solo en desarrollo.
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
      **REABIERTO y vuelto a cerrar (2026-07-31): faltaba la lista de
      Personas.** Se comprobó de una forma nueva —preguntándole a React por sus
      props (`__reactProps$`) qué elementos tienen `onClick` y no se pueden
      enfocar— en vez de por el aspecto, y salieron las **100 fichas de la
      lista de personas**: la pantalla entera, otra vez, sin teclado. El
      barrido anterior había arreglado la lista de Registros de publicadores y
      dio por hecho que la de Personas era la misma; no lo es.
      Va en `@components/user_card`, o sea que lo hereda también la lista de
      solicitudes. Y va como CAPA que cubre la tarjeta, no envolviéndola,
      porque dentro hay otro botón —el de borrar—: un botón dentro de otro no
      es HTML válido. El de borrar lleva `position: relative` para quedar por
      encima; comprobado con `elementFromPoint` que pulsar el icono llega al
      icono y pulsar el cuerpo llega a la ficha, que si se cruzaran se borraría
      a alguien queriendo abrirlo.
      La etiqueta es el NOMBRE de la persona: cien "Abrir" seguidos no dicen a
      quién se abre.
      Y con el mismo método, cuatro cabeceras más que tampoco se alcanzaban:
      la del panel de semanas ABIERTO (la plegada ya se arregló en su día; ésta
      solo se pliega en pantalla estrecha, que es donde nadie la miró), el
      botón de ordenar las semanas —un icono suelto, mudo—, las doce filas de
      mes del selector, y el aviso de hojitas pendientes del editor de entre
      semana. Las tres últimas pueden ser el botón entero; la del panel
      necesita la capa que cubre, porque a su derecha van `actions`.
      **Falsos positivos que hubo que descartar midiendo**: los envoltorios de
      campo de Departamentos y de Discursos salientes (su `input` sí se
      alcanza, así que el control se puede usar) y las píldoras `MiniChip` —
      MUI le engancha un manejador al elemento raíz de un `Chip` aunque no sea
      pulsable.
      Recorridas diez pantallas con el método nuevo; cero mudos de verdad.
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
      **Los `TextField` (2026-07-31).** De los 14 que contaba el recuento,
      **cinco eran legítimos**: son el `renderInput` de un `Autocomplete`, y
      ahí tiene que ser el de MUI —esos ficheros importan los dos, el de la app
      con su nombre y el de MUI como `MuiTextField`, que es justo lo correcto—.
      Los otros nueve pasan al de la app y ganan lo que les faltaba: la elipsis
      cuando el valor no cabe (antes se cortaba en seco), el color apagado del
      campo vacío y el de los iconos.
      Para que entraran los cuatro que NO son de ancho completo hubo que
      arreglar el componente: `fullWidth` estaba clavado DESPUÉS del
      `{...props}`, así que ganaba siempre y un campo que solo debe ocupar su
      hueco no podía usarlo. Ahora es `props.fullWidth ?? true` — mismo
      comportamiento para los 60 sitios que ya lo usaban, y una salida para los
      que la necesitan.
      Comprobado escribiendo en uno: 358×56, `text-overflow: ellipsis`, valor
      en `--black`.
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
      **Los `Select` (2026-07-31).** Quedaban cinco de MUI en crudo en
      páginas: dos en Exhibidores, dos en Salidas y uno en Limpieza. Y en
      Salidas convivían con el de la app EN EL MISMO FICHERO —importaba los
      dos—, así que dos desplegables del mismo diálogo se dibujaban distinto.
      Los cinco al de la app, que además les da el chevrón en vez del triángulo
      de MUI, el panel del menú con su sombra y la flecha centrada de verdad
      (§6.4d de esta misma vuelta). Hizo falta convertir el valor a `string`
      en tres sitios, porque el de la app lo tipa como `unknown`.
      **Los `Autocomplete` (2026-07-31).** Quedaban siete de MUI en crudo, y
      se veían distintos: el triángulo de Material en vez del chevrón de la
      app, y el panel de opciones sin su radio ni su borde. Los siete al
      componente de la app —o a `autocomplete_multiple` los dos que eligen
      varios, que además pintan lo elegido con el `MiniChip` en vez de un
      `Chip` gris escrito a mano—.
      El cambio es quitar el `renderInput` y pasar `label`/`multiline`, porque
      el tipo del componente es `Omit<AutocompleteProps, 'renderInput'>`. Hubo
      que anotar los tipos de las funciones, como ya hacen los otros diez
      consumidores: el componente admite `freeSolo`, así que MUI tipa el valor
      como `T | string`.
      Comprobado en Responsabilidades: campo de 56 con radio 12 y fondo de la
      app, y `organized-icon-expand` en vez del triángulo.
      **La fuente (2026-07-31).** Había SEIS `fontFamily: 'Figtree'` escritos
      a mano en la app. La fuente se hereda —comprobado en el navegador— así
      que parecían redundantes… y al quitarlos aparecieron **diecisiete
      píldoras de Responsabilidades escritas en el Roboto de fábrica de
      Material**: el `Chip` de MUI no recoge la fuente del tema, y esas seis
      líneas lo estaban tapando sin que nadie lo supiera.
      El tema ya declara `typography.fontFamily` y vale para todo lo demás; un
      `styleOverrides` de `MuiChip` tampoco gana. La regla acaba en
      `global/index.css`, que se carga la última, y ahí sí. Comprobado: cero
      elementos en Roboto en cinco pantallas.
      Se queda la del PDF de responsabilidades: react-pdf no hereda nada del
      navegador y ahí la fuente hay que declararla.
      **Los `Chip` (2026-07-30).** Eran 16, y de esos, ocho eran INSIGNIAS de
      estado escritas a mano: "Suspendido/Suspendida" copiado SEIS veces entre
      Exhibidores y Salidas con los mismos tokens, "En preparación" en Ayuda y
      "Semana del superintendente" en Salidas. Significado fijo → `Badge`
      (§6.4). Los ocho que quedan NO son insignias: son controles que se pulsan
      (elegir turno, alternar simple/compleja), las etiquetas del propio
      `Autocomplete` de MUI, o `mini_chip`, que es la primitiva.
      **Los 22 `TextField` de MUI no son un fallo visual**, y esto es útil
      saberlo: medido en el navegador, uno crudo y uno de la app salen
      IDÉNTICOS —mismo radio, mismo fondo, mismo alto— porque el bloque «EL
      CAMPO» apunta a las clases de MUI y alcanza a los dos. Es deuda de
      código, no algo que se vea.
      Los `CircularProgress` sueltos pasan a `IconLoading` (5 de 8). Los otros
      tres se quedan: NO son indicadores de carga, son anillos decorativos
      alrededor de un avatar, con `thickness` y posición absoluta, y el
      componente compartido no sabe hacer eso. Nota: `IconLoading` ES un
      `CircularProgress` por dentro, así que esto nunca se vio distinto — era
      deuda de código, no un fallo visual.

---

## 3 · Pulido pantalla a pantalla

Necesita ojos encima. Orden por impacto, no por comodidad.

- [x] **Los ficheros muertos** — no eran ~19: eran **133**, y el panel viejo
      solo aporta 23 de ellos. Medidos, no contados a ojo: se sigue el grafo de
      importaciones desde `main.tsx` y `App.tsx` (más `new URL(...)`, que es
      como se carga el worker de la sincronización) y se marca lo que no
      alcanza nadie.
      Lo gordo que había debajo: `whats_new` entero, la vista mensual de
      reuniones, el cronómetro de predicación, medio catálogo de oradores
      (accesos por congregación, alternar visibilidad, añadir en línea), el
      selector de hora por deslizamiento, `multi_select`, `feature_flag` y
      cinco ilustraciones.
      **Se conservan siete a propósito**: los cuatro `types/*.d.ts` (los
      consume tsc por configuración, no por import), el doble de pruebas
      `test/appDbStub.ts`, y los dos scripts de migración de Territorios —
      tocan datos reales y borrarlos tira un camino de recuperación.
      **El efecto de verdad**: los errores de tsc bajan de **419 a 129**. Casi
      trescientos vivían en ficheros que nadie monta, o sea que la línea base
      que llevaba meses tapando fallos reales (el de Limpieza salió de ahí) era
      en sus dos terceras partes ruido de código muerto.
      Comprobado: build limpio, 438 pruebas, cero errores de eslint, y nueve
      pantallas recorridas en el navegador.
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
      **Cerrado (2026-07-31)** el repaso de las pantallas de categoría. Lo que
      había: dos círculos con `50%` en vez del token, cuatro blancos escritos a
      mano en el esqueleto de carga (van sobre la tarjeta de marca, donde un
      gris desaparecería, así que el blanco apagado es correcto — ahora es un
      token) y, el de verdad, **el azul de marca CONGELADO** en un bloque del
      Inicio: `rgba(59,114,196,.06)` y `.12` al pasar el ratón. La app deja
      elegir esquema de color —azul, verde, morado, naranja, rojo— y ese trozo
      se quedaba azul con los otros cuatro. Comprobado poniendo el esquema en
      verde: el Inicio entero cambia.
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
- [x] **Mis asignaciones** — el inventario decía 44 defectos; medidos son 8, y
      de esos 8 la mitad eran falsos otra vez (el `Select` y el `Button` son de
      la app, no de MUI; el "color a fuego" estaba dentro de un comentario que
      dice que se quitó).
      Lo real: las transiciones a mano pasan a tokens de movimiento —y una
      animaba `border-color` en una caja que ya no tiene borde—, el `7.5px` de
      la abreviatura de las de departamento se va (medido: "SEM." ocupa 21,8 en
      una baldosa de 46, o sea que cabía a 8), y el fichero `indextypes.ts`
      recupera su punto.
      **Y tirando de ese hilo salió lo gordo, que no es de esta pantalla sino
      de toda la app** — ver la línea de abajo.
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
- [x] Exhibidores y Salidas, **pestañas de Programas semanales** — ocho
      transiciones a mano y dos círculos con `50%`. Cero colores a fuego: esos
      ficheros ya estaban con tokens.
- [x] **Oradores salientes** — el "panel lateral entero de divs" estaba ya
      arreglado (cayó con el repaso de la tarjeta). Lo que quedaba, medido:
      · **Las filas de semana del panel no se alcanzaban con el teclado**, y
        elegir semana es LA acción de ese panel: sin semana no se programa
        nada. No lo cazó el barrido porque viven dentro de un `Collapse` y solo
        existen con el mes desplegado — lo que no está pintado no se mide.
        Ahora son botones, con `aria-current` en la elegida.
      · **El decimocuarto array de meses a mano** ('ene.', 'feb.'…), el único
        que además se saltaba la traducción: en cualquier idioma que no fuera
        español seguía diciendo "ene.". Al diccionario.
      · Un `&:hover` cuyas DOS ramas del ternario devolvían el mismo color, o
        sea un efecto escrito que no existía. Ahora usa `--state-hover`.
      · `transition: 'all 0.15s'` → tokens y propiedades concretas.
- [x] **Informe de predicación** — tres cosas: un `fontSize: '17px'` que no
      existe en la escala (a 16, y hasta el arreglo de §6.4d ni se veía: la
      clase mandaba y salía a 15), dos transiciones a mano —una con `all`, que
      animaba también el relleno y el radio— y el punto de "hay informe" con
      `borderRadius: '50%'` en vez del token.
- [x] **Limpieza y Responsabilidades** — medidos: cero colores a fuego, cero
      radios a mano. Lo que había eran tres transiciones (dos con `all`) y el
      `Select` de MUI de Limpieza, ya convertido más arriba.
- [x] **Visita del CO** — medido hoy: cero colores a fuego, cero transiciones
      a mano, cero radios, cero tamaños fuera de escala. Lo de "40 y 56px en
      casi todas las filas" se arregló en el repaso de márgenes de esa página.
- [x] **Personas** y catálogo de oradores — lo gordo fue de teclado (las 100
      fichas, arriba). Lo demás: once transiciones a mano en siete ficheros,
      todas a tokens.
- [x] **Importar/exportar** — no era "muy malo": tres naranjas congelados
      (`rgba(255,152,0,…)`, que no siguen al tema) a `color-mix` sobre
      `--orange-main`, un círculo con `50%` y una transición.
- [x] **Informes** — confirmado que la estructura está sana: solo dos
      transiciones a mano en toda la zona. La duplicación que menciona el
      inventario es de lógica, no de estilo, y no es este trabajo.
- [x] Ayuda, Materiales de reunión, Perfil, Recordatorios — dos círculos con
      `50%`, cinco transiciones (dos con `all` y una con curva de rebote) y un
      naranja congelado en el aviso de notificación.
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
      **Cerrado (2026-07-31).** La lista de "copias sueltas" que había aquí
      estaba desfasada: barridas todas las cabeceras plegables de la app con un
      detector que busca `onClick` de plegar en un elemento que no es botón, y
      quedaban SEIS, no las de esa lista — las doce filas de mes del selector de
      reuniones y las doce del de Departamentos, la cabecera del panel abierto,
      el aviso de hojitas, la cabecera de mes del panel de Oradores salientes
      (que tenía puesto el anillo de foco sin ser botón, o sea un anillo que
      nadie podía llegar a ver) y las píldoras de disponibilidad de Exhibidores,
      que son interruptores y ahora dicen `aria-pressed`.
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
      **Cerrado (2026-07-31)**: los dos que quedaban NO son el mismo caso. El
      de Limpieza elige GRUPO de limpieza, no persona — lista corta y cerrada,
      que es justo donde la regla dice `Select`. Y el del catálogo elige entre
      los oradores DE LA PROPIA congregación (una o dos docenas de ancianos y
      siervos), no entre los cien y pico publicadores: no es el caso de Salidas.
      Los dos se quedan como están, y ahora está escrito por qué.
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
- [x] **Elegir un mes** — cerrado con matiz: no eran 5 copias del mismo
      control, eran DOS controles distintos para dos trabajos distintos, y uno
      de ellos estaba roto.
      · **El roto**: Exhibidores y Salidas pintaban OTRO selector a partir de
        1200px — una barra lateral de 280px, pegajosa, con desplegable de año y
        lista de los doce meses. Cien líneas a mano, con sus radios y sus
        títulos propios, COPIADAS enteras entre las dos páginas. La misma
        tarea, dos controles, y cuál te tocaba dependía de lo ancho que
        tuvieras la ventana. Fuera las dos: se queda el compartido, que es el
        que ya usaban ellas mismas en móvil y Limpieza del salón a cualquier
        ancho. 215 líneas menos.
      · **El que se queda**: el de Informes (`service_year_month_selector`) es
        otro control a propósito. Ahí el mes es un FILTRO dentro de un
        formulario, no la navegación de la página, y encima lo que se elige es
        el año de SERVICIO, no el natural. Ya está hecho con el `Select` y el
        `MenuItem` de la app. Convertirlo en el panel plegable grande sería
        empeorarlo.
- [x] **Elegir una semana** — cerrado con matiz, y el inventario volvía a
      exagerar. No hay tres copias del mismo control:
      · `weekly_schedules/week_selector` es la TIRA horizontal de semanas, y es
        distinta a propósito (tiene su nota explicando por qué no usa las
        pestañas de MUI). La usan las seis pestañas de Programas semanales,
        Oradores salientes incluida — o sea que no había "una tercera copia".
      · `meetings/week_selector` y `departments_schedule/week_selector` son el
        MISMO dibujo, sí, pero porque los dos son ya `CollapsibleSelector` +
        `ScrollableTabs`: lo compartido está compartido, y lo que queda propio
        de cada uno son sus datos y, en el de reuniones, ordenar y borrar
        asignaciones en bloque. Fundirlos sería inventar un componente para
        ahorrar tres líneas de JSX.
      Lo que SÍ estaba mal era el rótulo: el panel de reuniones se titulaba
      "Reuniones" —el nombre de la sección— cuando dentro no hay más que la
      lista de semanas, mientras el de Departamentos, que es el mismo panel con
      la misma lista, decía "Semanas". Arreglado.
- [x] **Reordenar** (2) → hecho, ver bloque 0: los cuatro sitios a
      `@components/drag_handle`
- [~] **Confirmar acción destructiva** — hecha la parte que se VE; queda la
      que no.
      `useConfirm()` se pintaba su propio papel con `Dialog` de MUI en crudo
      —radio, fondo, borde, sombra, velo—, repitiendo lo que `@components/dialog`
      ya hace, y por eso se quedaba fuera de cualquier arreglo que se hiciera
      allí (los márgenes seguros de iOS, por ejemplo). Ahora usa el compartido.
      Y las seis carpetas `*_delete` que son SOLO una confirmación (sin campos)
      llevan ya el mismo pie. Las otras cinco no se tocan y no es pereza: pedir
      el nombre escrito a mano, volver a autenticarse o decidir qué pasa con
      los miembros del grupo no es "confirmar", es un formulario.
      **Queda**: colapsar esas seis carpetas en llamadas a `useConfirm()`. Ya
      es puramente mecánico —se ven idénticas—, así que no corre prisa.
- [x] **Pie de diálogo** → `@components/dialog_footer`. Eran dos idiomas y
      NINGUNO era minoritario: apilado a lo ancho (las once `*_delete`, enviar
      el informe, el aviso de modo de prueba…) contra fila a la derecha
      (Territorios, Documentos, Limpieza y veinticinco ficheros más). Borrar un
      grupo y borrar un territorio —el mismo acto, con el mismo riesgo— se
      pedían de dos formas distintas según la pantalla.
      Se quedan los dos, porque cada uno tiene razón en su sitio: apilado y a
      lo ancho es lo correcto en un móvil (dos objetivos grandes para el
      pulgar) y en fila a la derecha lo es en escritorio (un "Cancelar" de
      496px no parece un botón, parece una barra). El pie es uno solo y cambia
      con el SITIO, no con la pantalla que lo use.
      En el código va siempre primero la acción y después "Cancelar"; en fila
      se le da la vuelta con `row-reverse`. Una forma de escribirlo, las dos
      convenciones. Medido: a 1280 salen en fila con Eliminar a la derecha, a
      24px del canto; a 393 se apilan, los dos a 281 de ancho y Eliminar
      arriba.
- [x] **Subir un fichero** — eran 7, no 5, y el problema no era el aspecto.
      Los tres dibujos que hay (panel en Documentos, botón con el nombre del
      fichero en Importar KML, acción de barra en Importar .jwpub) están bien
      cada uno en su sitio; un componente único tendría que saber pintar los
      tres y acabaría siendo un botón con cinco props para disfrazarlo.
      Lo igual en los siete —y lo que estaba mal en DOS— es la fontanería: un
      `<input type="file">` solo avisa cuando su valor CAMBIA, así que si
      eliges un fichero y luego vuelves a elegir EL MISMO, no pasa nada. Cinco
      lo arreglaban a mano; Documentos y el CSV de oradores, no.
      Ahora hay `useFilePicker` (`@components/file_picker`), que se queda con
      el input escondido y vacía el valor siempre. Comprobado en el navegador
      con un fichero de verdad: llega al diálogo y el input queda vacío.
      De paso, el recuadro de Documentos era de borde PUNTEADO sin admitir
      arrastrar y soltar (no hay un `onDrop` en toda la pantalla).
- [x] **Indicador de carga** → 5 de los 8 `CircularProgress` a `IconLoading`.
      Los otros 3 se quedan: NO son indicadores de carga, son anillos
      decorativos alrededor de un avatar, con `thickness` y posición absoluta,
      y el componente compartido no sabe hacer eso.
- [x] **Contador junto a título** → `@components/count_badge`, no `badge`.
      Dos de los cinco ya compartían dibujo, pero escondido DENTRO de
      `tab_label_with_badge`, así que solo lo tenían las pestañas. Los otros
      metían el número en el propio texto, cada uno con su puntuación:
      "Personas: 100" con dos puntos, "Tu circuito (12)" y "Otras
      congregaciones (8)" con paréntesis. Y el número dentro de la frase no es
      cuestión de gusto: deja de ser un dato y pasa a ser parte del título, así
      que no se puede mirar de un vistazo.
      La chapa sale a su propio componente y la usan los tres.
      NO es `@components/badge`, que es la píldora de un ESTADO ("Suspendido",
      "Asignado a Juan"). Un estado se lee, un contador se cuenta.
      De paso, era de ancho FIJO de 24 y "100" pide 22: cabía por un píxel a
      cada lado y con una cifra más se salía. Ahora el 24 es un mínimo: medido,
      una y dos cifras miden 24 las dos —el salto de 9 a 10 sigue sin moverse—,
      tres miden 30 y cuatro, 36.
      El contador del encabezado de un grupo de predicación se queda como está:
      va sobre el color del grupo, y ahí una chapa clara no se leería.
- [x] **Elegir una hora** — el reparto ya era casi correcto: siete pantallas
      usan `time_picker` (el reloj) y el editor de horas del informe usa
      `timefield` (la duración), que es lo suyo. El sitio equivocado era la
      **visita del superintendente**: pintaba la hora de una reunión y de una
      visita de pastoreo con `TimeField`, o sea el campo de DURACIONES —se
      escribe a mano, pone "0:00" de marcador y no abre ningún reloj—.
      El dato se sigue guardando como texto `HH:mm`, que es lo que se
      sincroniza; el puente son `textoAHora`/`horaATexto` en `@utils/date`.
      Con prueba propia (`utils/hora.test.ts`), porque lo que devuelve el
      conversor se escribe en el registro y viaja a todos los dispositivos: un
      cero perdido o un `Invalid Date` colándose de vuelta se lleva la hora de
      una reunión.
- [x] **Pestañas** — cerrado con matiz. Los tres componentes que hay NO son
      tres copias: `scrollable_tabs` se apoya en `tabs` (le coge el panel) y
      `segmented_control` es otra cosa —la píldora de dos o tres vistas—. Están
      en capas, que es como debe ser.
      Lo que sí estaba mal eran las configuraciones de Exhibidores y Salidas:
      usan el `<Tabs>` de MUI a pelo (su contenido se pinta en otro sitio, así
      que los componentes con panel no les sirven) y tenían el MISMO bloque de
      57 líneas copiado, de las que solo 11 diferían —el estado y las
      etiquetas—. Ahora el estilo vive en `@components/tabs/app_tabs_sx`. 97
      líneas fuera, 13 dentro.
      Y las etiquetas iban ESCRITAS en mayúsculas ("TURNOS", "ASIGNACIONES
      FIJAS") justo debajo de un `textTransform: 'none'` — o sea que la regla
      no servía de nada porque la mayúscula no estaba en el estilo, estaba en
      el texto. Se les escapó al barrido de versalitas por eso mismo.
- [x] **Nombre de una persona** — investigado: NO era el fallo que parecía. El
      ajuste solo promete abreviar en el programa, y muchas llamadas están bien
      (comparadores de ordenación, formularios oficiales). Se retiró el
      interruptor muerto y se cierra

---

## 5 · Dónde vive la configuración — CERRADO

No había regla: los dos controles se usaban para las dos cosas.

  · engranaje → diálogo: Grupos de predicación, Reunión de fin de semana
  · engranaje → otra pantalla: Territorios
  · botón abajo → diálogo: Limpieza, Evacuación, Departamentos
  · botón abajo → otra pantalla: Exhibidores, Salidas

Y dos lo llamaban distinto ("Gestionar categorías", "Importar / Exportar").

Regla elegida (ver DESIGN_SYSTEM.md §6.4a): **la barra de abajo es para HACER
cosas con el contenido; el engranaje, para cambiar cómo funciona la pantalla.**
No depende de si abre diálogo o pantalla — eso no se ve desde fuera.

Movidas seis: Limpieza, Evacuación, Departamentos, Exhibidores, Salidas y las
categorías de Documentos. Se queda abajo "Importar / Exportar" del catálogo de
oradores, que mueve datos y no configura nada.

---

## 6 · El botón azul relleno — CERRADO

Recuento de los 30 ficheros con `<NavBarButton>` (57 botones). El sistema
estaba **mucho mejor** de lo que parecía: 25 de las 30 pantallas ya cumplían,
y las tres que usan `main={!monthIsPublished}` —Departamentos, Exhibidores,
Salidas— lo hacen exactamente bien, con el azul apagándose solo al publicar.

Regla escrita en DESIGN_SYSTEM.md §6.4c: **uno por pantalla, y es a lo que
vienes**. Nunca navegar, nunca cambiar de vista, nunca destruir.

Tres arreglados:

  · Mi cuenta → "Cerrar sesión" era azul relleno Y rojo
  · Ficha de usuario → "Eliminar" igual
  · Lista de discursos públicos → el azul era el conmutador lista/tabla, y
    dejaba en gris a "Importar", que sí es una acción

Dos que **no** se tocan aunque exporten: Registros de publicador (S-21) y
Asistencia (S-88). Ahí exportar es el producto de la pantalla y está solo.

**Dos falsas alarmas del primer barrido**, anotadas para no repetirlas: mi
detector no cerraba los botones escritos `></NavBarButton>` y se comía el
siguiente, así que marcaba como azules a "Descalificar", "Reordenar grupos" y
"Exportar" de entre semana — ninguno lo era. Y antes de eso, `\bmain\b` casaba
con `var(--accent-main)`. Los inventarios a ojo de este fichero hay que
medirlos siempre.

---

## Reglas de este fichero

1. Una casilla se marca **cuando está verificada**, no cuando compila.
2. Si algo se deja a medias, se escribe **qué** se dejó y **por qué**.
3. Si un hallazgo resulta ser falso al mirarlo de cerca, se marca igual y se
   explica — ya ha pasado dos veces y ahorra que el siguiente lo repita.
4. Los recuentos son de la barrida del 2026-07-30; si uno se desvía mucho al
   abrirlo, es que el inventario se equivocó ahí. Vale más lo que se ve.
