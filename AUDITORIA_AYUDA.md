# Auditoría de la página de Ayuda — encargo para una sesión nueva

## El objetivo

`src/features/ayuda/content.tsx` tiene 17 secciones y 88 artículos. El
contenido se ha ido escribiendo por tandas y **nunca se ha comprobado contra el
código artículo por artículo**. Hay que auditarlo entero hasta que cada frase
sea cierta hoy.

No es escribir más ayuda. Es **verificar** la que hay, corregir lo que ya no es
verdad, y añadir solo lo que falte.

## Por qué hace falta (el fallo que lo destapó)

En «Guía general» → «Todo lo que hay en Congregación» había un párrafo que
decía que cualquier publicador ve el resumen de la visita del superintendente
en esa sección. Era falso: esa tarjeta está tras `isElder`. Lo que ve un
publicador es una pestaña en Programas semanales.

Ya está corregido, pero **es el patrón del problema**: texto escrito cuando la
aplicación funcionaba de otra manera, que sigue ahí porque nadie lo ha vuelto a
mirar. Hay que suponer que casos así los hay a puñados.

Y una advertencia sacada de ese mismo caso: al ir a comprobarlo salió que la
pestaña no tenía ninguna ventana de tiempo —aparecía en cuanto se programaba
la visita, aunque faltara un año—. **Auditar la Ayuda destapa fallos de la
aplicación, no solo del texto.** Cuando pase, arréglalo o dilo; no ajustes el
texto para que describa el fallo.

## El método, artículo por artículo

Para **cada** artículo de **cada** sección, en orden, comprobar cuatro cosas
contra el código. No de memoria, no por lo que parezca razonable:

1. **¿Existe todavía?** La pantalla, el botón y el campo que nombra el
   artículo. Si el texto dice «pulsa "Guardar y publicar"», ese botón tiene que
   existir con ese texto.
2. **¿Lo ve quien dice?** Cruzar el `visible:` de la sección y lo que el
   artículo da por hecho con el gating real: `useCurrentUser`, los `&&` de los
   paneles de categoría (`src/pages/category_dashboards/*/index.tsx`), y los
   hooks de acceso propios de cada módulo (`useIsCircuitVisitManager`,
   `useCircuitVisitForBrothers`, `useTerritoryAccess`…). Ojo: un módulo puede
   tener DOS puertas distintas —una para la página y otra para lo que se
   enseña en Programas semanales— y no tienen por qué coincidir.
3. **¿Se llama así?** Los rótulos que cita el artículo tienen que ser
   literalmente los de pantalla. Buscarlos en el `.tsx` o en `src/locales/es-ES/`.
4. **¿Falta algo de esa pantalla?** Lo que la pantalla hace y el artículo no
   cuenta.

Anotar cada corrección con el fichero y la línea que la justifica. Si algo no
se puede verificar, decirlo en vez de dejarlo pasar.

## Lo que ya está verificado (no repetir)

- **Iconos de sección**: salen del panel de categoría de cada página. Hecho y
  comprobado (commit `bfb1eb0e0`).
- **La uñita** (`borderLeft: 3px`) en avisos y consejos: quitada. Era el único
  sitio de `src/` que quedaba.
- **El Cronómetro de predicación NO existe.** Solo hay cadenas heredadas
  (`tr_timeInServiceDesc` y el texto de bienvenida). No documentarlo ni
  prometerlo. Si aparece mencionado en algún artículo, quitarlo.
- **La visita del superintendente**: reglas cambiadas y verificadas contra el
  código el 2026-08-01. **No las «corrijas» hacia atrás**: la Ayuda dice lo que
  hace el código hoy.
  - La **página** `/congregation/circuit-visit` es SOLO de ancianos, y siempre
    (`useIsCircuitVisitManager` → `isElder`). Un publicador no entra: la tarjeta
    de Congregación está tras `isElder` y la página redirige al inicio.
  - La **pestaña** «Visita del superintendente» de Programas semanales la ve
    todo el mundo, desde **dos meses** antes de que empiece y hasta el día
    después de terminar (`useCircuitVisitForBrothers`,
    `CIRCUIT_VISIT_PREVIEW_DAYS = 60`).
  - Ya NO existen los niveles `elder` ni `public`, ni el caso especial de quien
    tenía algo asignado, ni `CircuitVisitSummary`, ni `useCircuitVisitAccess`.
    Si encuentras texto que los mencione, es texto viejo: quítalo.

## Mapa de roles

`AppRoleType` (en `src/definition/app.ts`): admin, coordinator, secretary,
service_overseer, midweek_schedule, weekend_schedule, public_talk_schedule,
attendance_tracking, departments_schedule, publisher, view_schedules, elder,
ms, group_overseers, language_group_overseers.

`AyudaRoles` (en `src/definition/ayuda.ts`) expone ahora catorce banderas. Se
añadieron dos, y las dos por el mismo motivo: la sección se abría por una suma
de roles parecida a la puerta real, no por la puerta.

- **`isTerritoryManager`** — la misma que `useIsTerritoryManager`. Con los roles
  sueltos, Territorios se le escondía al hermano del departamento «Territorios»
  que no es anciano, que es justo quien más la necesita.
- **`isLanguageGroupOverseer`** — su trabajo del día a día SÍ estaba cubierto
  (dentro de su grupo le salen true las banderas de editor), pero «Ajustes de
  grupo» es suya y de nadie más, así que sin la bandera esa pantalla no la
  explicaba nadie.

## Las 17 secciones

| id | visible para | estado |
|---|---|---|
| `general` | todos | auditada |
| `informes` | secretario | auditada |
| `asistencia` | registro de asistencia | **nueva** (salió de `informes`) |
| `entre-semana` | editor de entre semana | auditada |
| `fin-semana` | editor de fin de semana **y coordinador de discursos** | auditada |
| `discursos` | coordinador de discursos | auditada |
| `departamentos` | editor de departamentos | auditada |
| `exhibidores` | comité de servicio | auditada |
| `salidas-predicacion` | comité de servicio | auditada |
| `grupos` | superintendente de grupo | auditada |
| `personas` | quien ve personas | auditada |
| `territorios` | quien gestiona Territorios (`useIsTerritoryManager`) | auditada |
| `limpieza` | anciano | auditada |
| `visita-co` | anciano, admin | auditada |
| `responsabilidades` | anciano, admin | auditada |
| `administracion` | admin, editor de ajustes | auditada |
| `grupo-idioma` | superintendente de grupo de idioma | **nueva** (cubre `/group-settings`) |

**Auditoría terminada (2026-08-01).** Las 15 secciones originales están
comprobadas artículo por artículo contra el código, y hay dos nuevas:
`asistencia` (salió de `informes`, porque quien solo lleva el registro de
asistencia no puede entrar a casi nada de lo que allí se explicaba) y
`grupo-idioma` (la única que cubre `/group-settings`).

## Rutas de la aplicación

Sacadas de `src/App.tsx`. Toda ruta debe estar cubierta por algún artículo:

```
/dashboard/{meetings,ministry,congregation,talks,reports,settings}
/user-profile   /ayuda   /weekly-schedules
/activities/upcoming-events
/congregation/{evacuacion,limpieza,documentos,territories,ausencias}
/congregation/{responsabilidades,circuit-visit}
/ministry-report   /service-year   /auxiliary-pioneer-application
/predicacion-salidas   /exhibitors   /field-service-groups
/public-talks-list   /speakers-catalog   /outgoing-speakers
/persons   /persons/:id   /persons/new
/congregation-settings   /publisher-records   /publisher-records/:id
/pioneer-applications   /pioneer-applications/:id
/reports/{meeting-attendance,field-service,branch-office}
/midweek-meeting   /weekend-meeting   /meeting-materials
/departments-schedule   /group-settings   /manage-access   /manage-access/:id
```

**Cubiertas todas.** `/group-settings` era la única que no estaba: es la misma
pantalla de ajustes en modo grupo, titulada «Ajustes de grupo», y solo entra el
superintendente de grupo de idioma. Tiene sección propia (`grupo-idioma`).
`/congregation-settings` tampoco tenía artículo propio y ahora lo tiene, en
`administracion`. `/service-year` es una redirección a `/ministry-report`.

## Cambios recientes que el contenido puede no reflejar

Repasar `git log` desde `bfb1eb0e0` hacia atrás. Los que más probablemente han
dejado texto obsoleto:

- Normalización de los botones de Configuración («la configuración vive en el
  engranaje, y la barra de abajo es para actuar», commit `01c76fc74`).
- El botón azul: uno por pantalla (`b3a0fafea`).
- Territorios: enlaces públicos compartidos y el aviso de «No visitar»
  (`205a9758c`, `42bf52e79`).
- Departamentos: una sola caja, sin historial (`3fd1918e7`).
- Materiales de reunión: cadencia por publicación (`656686666`).
- Permiso de exportar PDF para quien solo edita Departamentos (`2b2c42830`).
- Los doce documentos impresos, rehechos: los nombres de fichero cambiaron
  (`231182734`).
- La visita del superintendente: página solo de ancianos y pestaña a dos meses
  (`35d60a69f`). Ver arriba.

Los commits de la Ayuda hasta la fecha: `bfb1eb0e0` (los cinco módulos que
faltaban e iconos), `3ffb45697` (la visita en la Guía general y este
documento), `35d60a69f` (las reglas nuevas de la visita).

## Cómo verificar

`npm run build` y el preview en el puerto 4137 (modo de prueba con datos
ficticios). **La Ayuda filtra por rol**, así que con un solo usuario de prueba
no se ven las secciones de rol: hay que sembrar un usuario por rol, o forzar
las banderas de `useAyuda` temporalmente para verlas renderizadas.

Truco útil: escribir dos letras en el buscador de la Ayuda despliega todos los
artículos a la vez (`forceExpand`), que es la forma rápida de revisarlos.

## Qué NO hay que hacer

- No reescribir por reescribir. Si un artículo es correcto, se queda.
- No añadir temas de diseño interno (tokens, componentes, sistema de PDF). La
  Ayuda es para hermanos que usan la aplicación, no para quien la programa.
- No abreviar en el texto de pantalla: «Número», no «Nro.».
- No prometer lo que no existe.

## Cómo repartir el trabajo

Se hizo por tandas, una sección (o dos pequeñas) por commit, empezando por las
ocho que llevaban el contenido original sin mirar. Los commits de la auditoría,
en orden: `d7f3df037` (fin de semana + discursos), `483e26e9e` (exhibidores),
`f9ab9dfeb` (salidas), `97770c7de` (grupos + personas), `f91ac3e99`
(territorios), `e14ab16f5` (administración), `ed824499d` (departamentos +
responsabilidades), `101308cbd` (limpieza), `228daae36` (visita del
superintendente), `1972a48b7` (entre semana), `4867472fb` (informes +
asistencia), `c9f0ea864` (guía general).

## Fallos de la aplicación que destapó

Nueve, todos arreglados en el commit de su sección:

1. Quien coordina los discursos no tenía tarjeta para llegar a la reunión de
   fin de semana, y el bloque del discurso público SOLO lo puede rellenar él.
2. El buscador de la lista de discursos públicos no encontraba por número.
3. «Mostrar programa de oradores salientes a todos los usuarios» mandaba el
   dato a todos los dispositivos y luego escondía la pestaña a todo el que no
   fuera anciano.
4. `/persons` y `/persons/:id` estaban en las rutas de ancianos, pero
   `/persons/new` no: un editor de reuniones podía crear una persona y luego no
   encontrarla, y la tarjeta de Congregación le rebotaba al inicio.
5. La tarjeta de Territorios en Predicación se abría con un interruptor que
   viene apagado de fábrica y decide otra cosa, así que un anciano fuera del
   comité de servicio se quedaba sin puerta a un módulo que sí gestiona.
6. `/auxiliary-pioneer-application` no tenía NINGUNA puerta en toda la
   aplicación: ni tarjeta, ni botón, ni un `navigate`.
7. «Orador sustituto» está a medias: hay interruptor en Ajustes y hay lectura,
   pero `WM_SubstituteSpeaker` no se escribe en ninguna pantalla, así que no se
   puede apuntar un sustituto. **Sigue así**: se dice en la Ayuda en vez de
   inventar un campo.
8. `publicTalksFilteredState` (en `states/public_talks.ts`) es código muerto:
   no lo consume nadie. **Sigue ahí**, sin tocar.
9. `tr_addServiceTime` («Añadir tiempo de predicación») y `tr_substituteSpeaker`
   («Orador sustituto») son cadenas huérfanas del diccionario, como el
   `tr_timeInServiceDesc` del cronómetro. **Siguen ahí**, sin tocar.

## Terminado

Los artículos revisados uno a uno contra el código, las rutas cubiertas todas,
`tsc` en 129 (la línea base), lint sin errores, las 456 pruebas pasando y
`npm run build` limpio.

Lo que queda, si alguien lo quiere seguir: los tres restos del punto 7 al 9 de
arriba —el sustituto a medias, el átomo muerto y las cadenas huérfanas— se han
dejado como están a propósito. Ninguno rompe nada; limpiarlos es otro encargo,
no este.
