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
en esa sección. Es falso: la tarjeta está tras `isElder` en
`src/pages/category_dashboards/congregation/index.tsx:178`. Lo que un
publicador ve es una pestaña en Programas semanales.

Ya está corregido, pero **es el patrón del problema**: texto escrito cuando la
aplicación funcionaba de otra manera, que sigue ahí porque nadie lo ha vuelto a
mirar. Hay que suponer que casos así los hay a puñados.

## El método, artículo por artículo

Para **cada** artículo de **cada** sección, en orden, comprobar cuatro cosas
contra el código. No de memoria, no por lo que parezca razonable:

1. **¿Existe todavía?** La pantalla, el botón y el campo que nombra el
   artículo. Si el texto dice «pulsa "Guardar y publicar"», ese botón tiene que
   existir con ese texto.
2. **¿Lo ve quien dice?** Cruzar el `visible:` de la sección y lo que el
   artículo da por hecho con el gating real: `useCurrentUser`, los `&&` de los
   paneles de categoría (`src/pages/category_dashboards/*/index.tsx`), y los
   hooks de acceso propios de cada módulo (por ejemplo
   `useCircuitVisitAccess`, que tiene cuatro niveles).
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
- **La visita del superintendente en «Guía general»**: corregida.

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
| `fin-semana` | editor de fin de semana | **sin tocar** |
| `discursos` | coordinador de discursos | **sin tocar** |
| `departamentos` | editor de departamentos | ampliada, sin auditar |
| `exhibidores` | comité de servicio | **sin tocar** |
| `salidas-predicacion` | comité de servicio | **sin tocar** |
| `grupos` | superintendente de grupo | **sin tocar** |
| `personas` | quien ve personas | **sin tocar** |
| `territorios` | anciano, comité, admin | **sin tocar** |
| `limpieza` | anciano, comité | ampliada, sin auditar |
| `visita-co` | anciano, admin | nueva |
| `responsabilidades` | anciano, admin | nueva |
| `administracion` | admin, editor de ajustes | **sin tocar** |

Las marcadas «sin tocar» llevan el contenido original y son las de mayor
riesgo: son las que más tiempo llevan sin mirarse.

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

## Cuándo está terminado

Los 82 artículos revisados uno a uno, con las 40 rutas cubiertas, y un informe
de qué se corrigió y por qué —con fichero y línea— en cada caso. `tsc` en 129
(la línea base), lint sin errores y las 456 pruebas pasando.
