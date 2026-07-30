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
- [x] **Informe de predicación · el editor de horas.** `MinusButton` y
      `PlusButton` pasan a redondos, como el `IconButton` compartido: eran los
      dos únicos botones de icono cuadraditos de la app. Al mirarlo salió que
      la TABLA DE FORMAS decía lo contrario que el código (ponía que un
      botón-icono es 12px); mandó el código y se corrigió la tabla.
      Lo del "número sin superficie" del inventario era FALSO: `TimeField` es
      un `TextField` y le alcanza el bloque «EL CAMPO».
      → `components/{plus,minus}_button/`, `global/index.css`
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

- [ ] **B1 · Colores fijos** (128) — empezar por los ~19 `rgba(59,114,196)` de
      `global/index.css`: un solo fichero deja el armazón azul en los temas
      verde, morado y naranja
- [ ] **B2 · Radios** (437) — primero `global/index.css` y `src/components`
      (66), luego los seis `shared_styles` de zona, luego el resto
- [ ] **B3 · Tipografía** (194) — primero la escala paralela de
      `global/index.css` (41 tamaños a mano). Sin eso, el Inicio no se puede
      migrar
- [ ] **B4 · Degradados** (14) — quedan 5 en `src` + los de `global/index.css`
- [ ] **B5 · Redacción** (95) — los 7 arrays de meses/días a mano, plurales
      concatenados, códigos en pantalla
- [ ] **B6 · Accesibilidad** (161) — `aria-label` en botones de solo icono
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
