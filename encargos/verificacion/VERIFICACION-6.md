# Verificación en pantalla — Encargo 6 (Retoques)

Rama `worktree-agent-a828c6d68c9e31ffb`.

Nada de esto se ha visto en pantalla: el navegador estaba ocupado por otras
sesiones. Lo que sigue es la lista exacta de lo que hay que mirar, con los
anchos y lo que se espera ver en cada uno.

**Cómo levantarlo:** `npx vite --mode test --port 4137`. El enrutador es de
**hash**, así que las páginas se abren con `#/...`, no con `/...`.

**Los dos anchos:** **402 px** (móvil) y **escritorio** (≥1280). Donde el
cambio tiene un corte en medio, se dice el ancho concreto que hay que probar
además de esos dos.

---

## 1. El catálogo de oradores

Ruta: `#/weekend-meeting` (Reunión de fin de semana) → sección **Discurso
público**. Y la segunda pantalla que monta el mismo componente:
`#/outgoing-speakers` (Oradores salientes) → elegir una semana en la lista
lateral → dentro de cada tarjeta de discurso saliente. Ahí no se ha tocado
nada, pero es donde se comprueba que no se ha roto.

### 1a. Preguntar antes de cambiar de orador

| # | Qué hacer | Qué tiene que pasar |
|---|---|---|
| 1a-1 | Campo **Orador vacío**. Abrir el catálogo (botón del atril) y pulsar un nombre. | **No pregunta nada.** Asigna directamente, como siempre. Se cierra el catálogo y se abre el selector de canciones. |
| 1a-2 | Campo **con orador puesto**. Abrir el catálogo y pulsar un nombre **distinto**. | Sale un diálogo: título **«¿Cambiar el orador?»**, texto **«Ahora mismo está asignado \<el que hay\>. Si continúas, se le quitará la asignación y en su lugar quedará \<el pulsado\>.»**, botones **Cancelar** y **Cambiar el orador**. Los dos nombres tienen que ser los correctos, y salir escritos como en el resto de la app (nombre para mostrar o apellido/nombre, según Ajustes). |
| 1a-3 | En ese diálogo, pulsar **Cancelar**. | **No cambia nada**: ni el orador, ni el discurso. El catálogo sigue abierto. |
| 1a-4 | Volver a pulsar el mismo nombre y confirmar con **Cambiar el orador**. | Se asigna el nuevo orador y su discurso, se cierra el catálogo. |
| 1a-5 | Campo con orador puesto. Abrir el catálogo y pulsar **otro discurso DEL MISMO orador**. | **No pregunta.** Solo cambia el discurso; el orador no se toca, así que no hay nada que avisar. |
| 1a-6 | Repetir 1a-1 a 1a-4 en **Oradores salientes** (`#/outgoing-speakers`). | Igual. El campo de ahí es otro (`outgoing_talks`), y el diálogo tiene que nombrar al discursante de ESA salida, no al de la reunión de fin de semana. |
| 1a-7 | El diálogo, a **402 px**. | A pantalla completa dentro de sus márgenes, sin salirse, y con los botones abajo apilados. Se pinta **por encima** del catálogo, no debajo. |

Ojo con el orden de las capas: el catálogo ya es un diálogo, y la pregunta va
encima. Si se ve el velo del catálogo tapando la pregunta, está mal.

### 1b. El botón del catálogo, fuera del campo

| # | Dónde | Qué tiene que verse |
|---|---|---|
| 1b-1 | `#/weekend-meeting`, campo **Discurso público**, escritorio. | El botón del atril está **fuera del campo, a su derecha**, igual que el de «Historial de asignaciones» al lado del campo de Orador. Dentro del campo ya no hay ningún botón. |
| 1b-2 | Lo mismo a **402 px**. | El campo ocupa el ancho menos el botón; el botón no se sale por el margen derecho. |
| 1b-3 | Un discurso de **título largo** (los que ocupan dos líneas). | El campo crece a lo alto y el botón se queda **arriba, a la altura de la primera línea** (56 px), no centrado sobre las dos ni pegado abajo. |
| 1b-4 | Con un discurso puesto: mirar la **X de limpiar**. | Está en su sitio de siempre, junto a la flecha, sin hueco raro a su izquierda. (Antes iba corrida 90 px para esquivar el botón.) |
| 1b-5 | Poner el tipo de discurso en **«Grabación de JW Stream»**. | El botón del atril **desaparece** y el campo pasa a ocupar el ancho entero, sin dejar el hueco del botón. |
| 1b-6 | Entrar como alguien **sin permiso** de coordinador de discursos públicos (campo en solo lectura). | Igual: no hay botón y no queda hueco. |
| 1b-7 | `#/outgoing-speakers`, dentro de una salida. | Lo mismo que 1b-1 a 1b-4. Y con la salida **sincronizada** (solo lectura), sin botón y sin hueco. |

### 1c. El botón «Invitación»

Sale en la cabecera azul de la sección **Discurso público**, solo cuando ya hay
un orador asignado.

| # | Ancho | Qué tiene que verse |
|---|---|---|
| 1c-1 | Escritorio | Botón blanco traslúcido sobre la franja de color, **con forma de píldora** (como todos los botones de la app), con el sobre a la izquierda y el texto «Invitación». Ya no tiene esquinas de 8 px ni letra de 13 px. |
| 1c-2 | Escritorio, pasando el ratón por encima | Se aclara. **No se mueve hacia arriba** (antes subía 1 px, cosa que no hace ningún otro botón). |
| 1c-3 | 402 px | El icono del sobre **no sale**; solo «Invitación». El texto no se parte en dos líneas y la franja no crece de alto. |
| 1c-4 | Cualquiera | Pulsarlo hace **exactamente lo mismo que antes** (genera la invitación). Y pulsarlo **no pliega la sección**. |
| 1c-5 | Con **tema oscuro** | El botón sigue viéndose (ahora el color sale de tokens, antes era un rgba congelado). Comprobar también en los otros temas de color. |

---

## 2. «Estado de los dispositivos» (Gestión de usuarios)

Ruta: `#/manage-access`. La tarjeta sale plegada; hay que pulsarla para
abrirla. Los botones están al final: **Cerrar**, **Ver todos (N)** y
**Actualizar a todos**.

El fallo NO era un `alignItems` que faltara: la fila llevaba
`justifyContent: 'space-between'` con `flexWrap: 'wrap'`, y al no caber en una
línea el grupo de botones bajaba solo y se quedaba pegado a la izquierda con el
hueco a la derecha. Es el mismo caso de Exhibidores de agosto
(`MAQUETACION_MOVIL.md` §2 bis).

| # | Ancho | Qué tiene que verse |
|---|---|---|
| 2-1 | **402 px** | El texto «Versión actual publicada: …» arriba a la izquierda, y debajo los tres botones **a ancho completo, uno encima de otro** (por debajo de 480 px la app estira los botones, y eso es lo de siempre). Ninguno se sale del borde de la tarjeta. |
| 2-2 | **600 px** | Texto arriba; botones debajo, en una o dos líneas, **pegados al margen DERECHO** de la tarjeta. **No debe quedar hueco muerto a la derecha.** Este es el ancho donde más se veía el fallo. |
| 2-3 | **768 px** (una tablet en vertical) | Igual que 2-2. Antes: botones a la izquierda y hasta ~350 px de aire a la derecha. |
| 2-4 | **1000 px** | Igual que 2-2. |
| 2-5 | **Escritorio (≥1200)** | Todo en **una sola línea**: el texto a la izquierda, los tres botones a la derecha, a ras del borde de la tarjeta. |
| 2-6 | Todos | Al ir estrechando la ventana poco a poco, los botones **no saltan de un lado a otro**: se quedan siempre en el margen derecho. |
| 2-7 | Todos | Nada de desbordamiento horizontal: `document.body.scrollWidth === window.innerWidth`. |

**Los demás sitios con la misma forma.** Se barrieron los 27 `sx` de la app que
llevan `space-between` y `flexWrap` juntos. Este era el único que quedaba con
la forma dañina (un GRUPO de controles que envuelve y se queda colgando). No
hace falta mirarlos, pero por si acaso, aquí está por qué se descartaron:

- **Exhibidores** y **Salidas de predicación** — ya se arreglaron en agosto con
  este mismo remedio.
- **Catálogo de oradores**, las dos cabeceras (`my_congregation/header`,
  `other_congregations/header`) — ya usan el remedio: `width: 100%` por debajo
  de su corte, y los botones se meten dentro del bloque del título.
- **Plan de evacuación** (`PlanHeader`) — tiene un solo hijo; `space-between`
  no reparte nada.
- **Datos básicos** de una persona, **Estado espiritual**, **Informes
  recibidos**, **Materiales de reunión**, **Discursos públicos**, la cabecera
  de semana, **Detalles del informe** — son parejas de texto con una etiqueta,
  una casilla o un contador. Ahí quedarse a la izquierda al envolver es lo
  correcto: no son controles.
- **Perfil**, **Datos de la persona**, **Contactos de emergencia** — dos campos
  de texto que ocupan la línea entera al envolver, así que no dejan hueco.
- **Oradores salientes** — es del encargo 2, no se toca (y además es un nombre
  con etiquetas, no un grupo de botones).

---

## 3. La etiqueta del número de congregación

Ruta: `#/speakers-catalog`.

| # | Dónde | Qué tiene que verse |
|---|---|---|
| 3-1 | Pestaña **Otras congregaciones**, una congregación **con** número. | Igual que antes: el nombre y, al lado, la píldora gris con el número. |
| 3-2 | Una congregación **sin** número (se añade una a mano sin rellenarlo, o se le borra el número desde Editar). | **No sale ninguna píldora.** Antes quedaba un rectángulo gris de 16 px vacío, que se leía como una raya. |
| 3-3 | Lo mismo a **402 px**. | El nombre no queda descolgado ni deja un hueco donde estaba la píldora. |
| 3-4 | Pestaña **Mi congregación**, con el **número de circuito vacío** (Ajustes → datos de la congregación). | **No sale la píldora de circuito.** Antes decía «Circuito:» y se acababa ahí. |
| 3-5 | Pestaña **Mi congregación**, con circuito puesto. | Sale «Circuito: N», como siempre. |

Los demás datos opcionales de la misma tarjeta, ya comprobados leyendo el
código, **no se han tocado a propósito**:

- Correo y teléfono de los dos coordinadores: ya estaban guardados por longitud
  (no se pintan si están vacíos).
- Los bloques de la pestaña **Información de la congregación** —dirección,
  número de circuito, horarios de las dos reuniones— llevan la etiqueta
  escrita («Número de circuito»), así que con el dato vacío **siguen diciendo
  algo**: que ese dato falta. Eso informa; una caja gris sin nada dentro, no.
  Si al verlo en pantalla se prefiere que tampoco salgan, es un cambio de
  criterio, no un fallo.

---

## 4. «Ver esta reunión completa»

Ruta: `#/weekly-schedules` → pestaña **Visita del superintendente** (solo sale
en una semana de visita del CO).

| # | Dónde | Qué tiene que verse |
|---|---|---|
| 4-1 | Sección **Reunión de entre semana** | El botón dice **«Ver esta reunión completa»** y lleva a la pestaña de entre semana. |
| 4-2 | Sección **Reunión de fin de semana** | El botón dice **«Ver esta reunión completa»** y lleva a la de fin de semana. |
| 4-3 | **402 px** | El texto, más largo que antes, **no se parte en dos líneas** ni se sale de la píldora. Si se partiera, hay que mirarlo. |

---

## 5. Departamentos — comprobación (aquí NO se ha cambiado nada)

Esto es una **verificación**, no un arreglo. Leyendo el código, la
configuración se refleja bien en los cinco sitios: todos preguntan a
`services/app/departments_slots` y ninguno lleva claves escritas a mano. Falta
verlo.

### Dónde se cambia la configuración

`#/departments-schedule` → engranaje → **Configuración de departamentos**. Por
cada departamento hay dos controles:

- Un selector de dos: **«Por semana»** / **«Por reunión»**.
- Un interruptor: **«Dividir en dos turnos»**.

Aviso importante del propio diálogo: **cambiar esto no borra nada, pero las
asignaciones hechas con la configuración anterior dejan de verse mientras esté
cambiada** (cambia la clave con la que se guardan). Al dejarlo como estaba,
vuelven. Conviene hacer estas pruebas **en modo de prueba**, no con datos
reales.

### Preparación antes de cada combinación

1. Poner la configuración de **Micrófonos** (o del departamento que se elija) en
   la combinación de la fila.
2. En `#/departments-schedule`, elegir una semana y **rellenar todos los
   puestos** que aparezcan.
3. **Publicar el mes** (si no, el programa semanal y el inicio no lo enseñan a
   nadie más, y las asignaciones no llegan).
4. Mirar los cinco sitios de la tabla.

### La matriz

Puestos base de cada departamento: Acomodadores = Exterior / Interior;
Micrófonos = Micro 1 / Micro 2; Multimedia = Vídeo / Audio; Plataforma =
Encargado.

| Combinación | Cuántos puestos por departamento de dos | Cómo se agrupan en pantalla | Etiqueta larga (PDF, Mis asignaciones, Inicio) |
|---|---|---|---|
| **A. Por semana, un turno** (lo de siempre, por defecto) | 2 | **Un solo grupo, sin rótulo** | «Exterior», «Interior» |
| **B. Por reunión, un turno** | 4 | Dos grupos: **«Entre semana»** y **«Fin de semana»** | «Exterior · Entre semana», «Exterior · Fin de semana» |
| **C. Por semana, dos turnos** | 4 | Dos grupos: **«Principio»** y **«Final»** | «Exterior · Principio», «Exterior · Final» |
| **D. Por reunión y dos turnos** | 8 | Cuatro grupos: **«Entre semana · Principio»**, **«Entre semana · Final»**, **«Fin de semana · Principio»**, **«Fin de semana · Final»** | «Exterior · Entre semana · Principio», … |

En pantalla (editor y pestaña de Programas semanales) la etiqueta de cada campo
va **limpia** —«Exterior», «Micro 1»— y el sufijo lo dice el rótulo del grupo.
En el PDF, en «Mis asignaciones» y en el inicio va la **etiqueta larga**, con
el sufijo dentro, porque ahí no hay grupo que lo diga. Eso es a propósito.

### Los cinco sitios × las cuatro combinaciones

Marcar cada celda.

| Sitio | Ruta | Qué mirar | A | B | C | D |
|---|---|---|---|---|---|---|
| **1. Editor de Departamentos** | `#/departments-schedule` | El número de campos por departamento y los rótulos de grupo de la columna «Cómo se agrupan». Los campos, con la etiqueta limpia. | ☐ | ☐ | ☐ | ☐ |
| **2. Pestaña de Departamentos en Programas semanales** | `#/weekly-schedules` → pestaña **Departamentos** | Los mismos grupos y los mismos rótulos que en el editor, con los nombres asignados. | ☐ | ☐ | ☐ | ☐ |
| **3. «Mis asignaciones»** | El panel que se abre desde la barra de arriba, en cualquier página (con la sesión de alguien asignado) | Que salga la asignación, en el **día correcto**, y con la **etiqueta larga**. Ver las notas de abajo. | ☐ | ☐ | ☐ | ☐ |
| **4. El inicio** | `#/` (la página de inicio) | La asignación aparece en la fila de la reunión que toca, escrita «Micrófonos (Micro 1 · Entre semana)». | ☐ | ☐ | ☐ | ☐ |
| **5. Exportación a PDF** | `#/departments-schedule` → exportar | Una fila por puesto, con la **etiqueta larga**, y el mismo número de filas que campos hay en el editor. | ☐ | ☐ | ☐ | ☐ |

Y los dos anchos, al menos en los sitios 1 y 2: **402 px** y **escritorio**.
Con la combinación **D** (ocho campos por departamento) es donde más fácil es
que algo se desborde o que los rótulos de grupo se amontonen.

### Lo que hay que mirar con lupa en cada combinación

- **A (por defecto).** Es la clave de que esto sea seguro: con la configuración
  por defecto las claves son **exactamente las de hoy**, así que **todo lo ya
  asignado antes tiene que seguir viéndose igual**. Si en A falta algo que
  antes estaba, hay un problema serio.
- **B (por reunión).** En «Mis asignaciones» y en el inicio, la asignación de
  «Entre semana» tiene que salir **solo** en la reunión de entre semana, y la
  de «Fin de semana» **solo** en la de fin de semana. Que no salgan las dos en
  las dos.
- **A y C (por semana).** Al revés: la misma asignación tiene que salir en
  **las dos** reuniones, porque cubre la semana entera.
- **C y D (dos turnos).** El rótulo es «Principio» y «Final», en ese orden. Y
  en «Mis asignaciones», el **compañero de puesto** que se nombra tiene que ser
  el del mismo turno y la misma reunión, no el del otro.
- **Volver de D a A.** Al dejarlo como estaba, las asignaciones de A tienen que
  **reaparecer** tal cual (no se borra nada; solo cambia la clave). Esta es la
  prueba que más tranquiliza.

### Sitios que no están en la lista de cinco, pero también preguntan

Si hay tiempo, con la combinación **D**:

- **Autocompletar** el mes de departamentos: tiene que proponer los ocho
  puestos, no dos.
- **Página de Departamentos**, el contador de «lo que falta» del mes: la cuenta
  tiene que subir con los puestos nuevos.
- **Actividad de una persona** (ficha de la persona): sus puestos de
  departamento salen con la etiqueta larga.
- **Notificaciones** de asignación: nombran el puesto con la etiqueta larga.

---

## Números

Antes y después del encargo, iguales:

- `npm run test:unit` → **460 pruebas en verde**
- `npx tsc --noEmit -p tsconfig.json` → **129 errores** (los preexistentes)
