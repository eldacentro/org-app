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
- [ ] **Reordenar, dos maneras.** Arrastrar con `react-sortablejs` (Grupos de
      predicación, 2 ficheros) frente a flechas arriba/abajo (Documentos →
      categorías, Responsabilidades, 2 ficheros). Hay que elegir UNA. Ojo: una
      lista que además hace scroll en el móvil es delicada de arrastrar.
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
- [ ] **Teclado: los 69 casos restantes**, en pantallas de menos tráfico
- [ ] **Márgenes de iOS: el resto.** Solo 16 ficheros de ~94 con diálogo los
      tienen en cuenta. Peligroso solo cuando algo se ancla abajo.
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
      **Queda**: los 7 arrays de meses/días a mano, plurales concatenados,
      códigos en pantalla.
- [~] **B6 · Accesibilidad** — 150 botones de solo icono se quedaron con
      etiqueta. Los cuatro de desplegar la llevan DINÁMICA (dice "Ocultar" o
      "Mostrar" según cómo esté), y el de borrar de la lista de personas dice a
      quién borra, porque si no son cien "Eliminar" seguidos.
      **Aviso**: buscarlos con `grep` NO basta. Mi patrón sólo veía
      `<IconButton>` escrito tal cual, y el de la lista de personas —que son
      100, uno por hermano— se escapó porque está envuelto en un
      `styled(IconButton)` con otro nombre. Lo cazó el navegador, contando
      botones sin nombre accesible. **Falta pasar esa cuenta por el resto de
      las rutas**; sólo se comprobaron Inicio, Personas e Informe.
- [ ] **B7 · MUI en crudo** (108) — el último: `confirm_dialog` primero, que es
      lo más reutilizado y lo que menos se parece a la app

---

## 3 · Pulido pantalla a pantalla

Necesita ojos encima. Orden por impacto, no por comodidad.

- [ ] Borrar los ~19 ficheros muertos del panel viejo (ninguna ruta los monta;
      hoy inflan el recuento de la peor zona)
- [ ] **Inicio** y pantallas de categoría (206) — la primera pantalla de todas
      las sesiones y la única que no comparte nada con el sistema
- [ ] **`src/components` + armazón** (244) — cada arreglo aquí se cobra en
      decenas de pantallas
- [ ] **Mis asignaciones** — la abre cualquier publicador; 44 defectos en dos
      ficheros
- [ ] **Documentos** (127 en 26 ficheros: la peor densidad, 4,9 por fichero)
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
- [ ] **Territorios** — nunca se auditó por zona (se quedó fuera del reparto
      del inventario); hace falta la barrida antes de planificarlo

---

## 4 · Incoherencias entre pantallas

La misma tarea resuelta de varias maneras. Esto es lo que un repaso pantalla a
pantalla **no puede ver**, por definición. Decisión ya tomada en cada línea.

- [ ] **Sección plegable** (5 formas, ~18 copias) → `@components/accordion`.
      Es el dibujo más copiado de la app y **ninguna copia funciona con
      teclado**. `card_header` no lo importa nadie: se borra
- [ ] **Elegir persona** (6) → `@components/autocomplete` para lo sencillo,
      `person_selector` cuando haga falta historial
- [ ] **Estado vacío** (8) → extraer `@components/empty_state`; el patrón bueno
      ya está escrito dos veces idéntico
- [ ] **Elegir un mes** (5) → `@components/month_selector`. Exhibidores y
      Salidas cambian de control según el ancho de la ventana
- [ ] **Elegir una semana** (4) → `week_selector` + `week_navigator`; borrar la
      copia con prefijo `Dept` y la tercera de Oradores salientes
- [ ] **Reordenar** (2) → *ver bloque 0*
- [ ] **Confirmar acción destructiva** (3) → `useConfirm()` repintado por
      dentro; luego colapsar las once carpetas `*_delete`
- [ ] **Pie de diálogo** (2) → el pie apilado de `@components/dialog`
- [ ] **Subir un fichero** (5) → `@components/file_picker`
- [ ] **Indicador de carga** (4) → quitar los 8 `CircularProgress` de MUI
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
