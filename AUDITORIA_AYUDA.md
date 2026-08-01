# Auditoría de la página de Ayuda — encargo para una sesión nueva

## El objetivo

`src/features/ayuda/content.tsx` tiene 15 secciones y 82 artículos. El
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

`AyudaRoles` (en `src/definition/ayuda.ts`) expone doce banderas. **Falta
`isLanguageGroupOverseer`**, que sí existe en `useCurrentUser` y no tiene
sección. Decidir si merece una o si su trabajo ya está cubierto.

## Las 15 secciones

| id | visible para | estado |
|---|---|---|
| `general` | todos | ampliada, sin auditar |
| `informes` | secretario, registro de asistencia | ampliada, sin auditar |
| `entre-semana` | editor de entre semana | ampliada, sin auditar |
| `fin-semana` | editor de fin de semana **y coordinador de discursos** | auditada |
| `discursos` | coordinador de discursos | auditada |
| `departamentos` | editor de departamentos | auditada |
| `exhibidores` | comité de servicio | auditada |
| `salidas-predicacion` | comité de servicio | auditada |
| `grupos` | superintendente de grupo | auditada |
| `personas` | quien ve personas | auditada |
| `territorios` | quien gestiona Territorios (`useIsTerritoryManager`) | auditada |
| `limpieza` | anciano | auditada |
| `visita-co` | anciano, admin | nueva |
| `responsabilidades` | anciano, admin | auditada |
| `administracion` | admin, editor de ajustes | auditada |

Ya no queda ninguna «sin tocar»: las ocho de más riesgo están auditadas.

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

`/group-settings` no aparece en ningún artículo. Comprobar qué es y si necesita
uno.

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

Son 82 artículos: **no cabe en una sola sesión de contexto**. Trabaja por
tandas y no intentes abarcarlo todo de una vez.

1. Una **sección entera por tanda**, empezando por las de más riesgo (las
   marcadas «sin tocar» arriba).
2. **Un commit por sección**, diciendo en el mensaje qué se corrigió y por qué.
   Así el trabajo sobrevive aunque se acabe el contexto, y se ve el avance.
3. Al empezar una tanda nueva, `git log --oneline` sobre este fichero dice por
   dónde ibas. Marca en la tabla de arriba la sección como auditada al
   terminarla, en el mismo commit.

Si algo no se puede verificar con el código delante, dilo en el informe en vez
de darlo por bueno. Un artículo que «parece razonable» es exactamente lo que
metió el fallo que originó esta auditoría.

## Cuándo está terminado

Los 82 artículos revisados uno a uno, con las 40 rutas cubiertas, y un informe
de qué se corrigió y por qué —con fichero y línea— en cada caso. `tsc` en 129
(la línea base), lint sin errores y las 456 pruebas pasando.
