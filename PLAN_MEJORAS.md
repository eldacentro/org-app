# Plan de mejoras — notas de la revisión página por página

*(2 de agosto de 2026. Agrupa las notas de Carlos, dice en qué orden hacerlas y
por qué, y contesta a las preguntas que llevaban dentro.)*

---

## Lo primero: el autocompletado

Es la nota más larga y la más importante, así que va aparte y con nombres y
apellidos del código. **Carlos tiene razón**, y se puede demostrar leyendo el
motor.

### Cómo funciona hoy

Hay **dos motores distintos** en la aplicación, y no se parecen en nada.

**1. El de las reuniones** — entre semana, fin de semana y todo lo que reparte
partes de la reunión. Vive en `services/app/autofill.ts`, pero quien decide de
verdad es `schedulesSelectRandomPerson`, en
[`services/app/schedules.ts:1785`](src/services/app/schedules.ts).

Filtra a los que pueden llevar esa parte y luego prueba **seis reglas en
cascada**. Se queda con el primero que encuentre y para:

| | Regla | ¿Mira QUÉ asignación? |
|---|---|---|
| 1 | Alguien que **nunca** ha tenido nada | **No** |
| 2 | Alguien sin **nada** en ±1 mes | **No** |
| 3 | Alguien sin **nada** en ±2 semanas | **No** |
| 4 | Alguien sin **nada** esa misma semana | **No** |
| 5 | Alguien cuya última asignación **no fue de este tipo** | A medias |
| 6 | El que hace más tiempo que no lleva **esta** asignación | **Sí** |

Ahí está el problema, y es exactamente el que describe Carlos: **las cinco
primeras reglas no saben de qué asignación estamos hablando.** Preguntan «¿ha
tenido este hermano *algo* últimamente?». Si Carlos Saca presidió el miércoles,
la regla 2 lo tacha para la lectura de La Atalaya del domingo, aunque no haya
leído La Atalaya en un año.

Y hay una segunda consecuencia, menos evidente y peor. En una congregación
donde casi todo el mundo lleva algo cada mes, **las reglas 1 a 4 casi nunca
encuentran a nadie**: todos han tenido *algo*. Así que decide la regla 5 — y la
regla 5 acepta **al primero de la lista** que cumpla. Recorre a las personas en
el orden en que están y se queda con el primero. No es un reparto: es el orden
de la lista.

La regla 6, que es la única que reparte de verdad —ordena por «hace cuánto que
no lleva ESTA asignación» y coge al más antiguo— es la **última** y casi nunca
llega a ejecutarse.

De paso: la función se llama `selectRandomPerson` y **no tiene nada de
aleatorio**. Es completamente determinista.

**2. El de los departamentos** — `services/app/deptAutofill.ts`. Este hace otra
cosa, y hace la correcta:

> descarta a quien ya tiene algo esa semana o llevó ese mismo departamento la
> semana pasada, y de los que quedan **ordena por la fecha de su última
> asignación EN ESE DEPARTAMENTO y coge al más antiguo**.

Es decir: la rueda que Carlos quiere **ya existe en esta aplicación**. Solo que
está en Departamentos y no en las reuniones.

### Cómo debería ser

Llevar el criterio de Departamentos a las reuniones. En una frase:

> **De los que pueden llevar esta asignación, el que hace más tiempo que no la
> lleva.** Lo demás son filtros que quitan candidatos, no criterios que decidan.

Concretamente, invertir la cascada: un solo **orden** (rueda por asignación) y
unos pocos **descartes** encima:

- No dos veces en la misma semana. *(Esto sí es transversal: aquí sí importa
  que presidiera el miércoles, porque es la misma semana.)*
- No la misma asignación dos veces seguidas.
- Quien esté **de ausencia** esa semana. **Hoy no se comprueba** —
  `applyAssignmentFilters` no mira `personIsAway`, así que el autocompletado
  puede asignar a alguien que ya avisó de que no está.

Y si un descarte deja la lista vacía, se relaja el descarte —nunca se deja el
hueco sin rellenar—, que es justo lo que ya hace Departamentos.

### Lo que hay que decidir antes de tocar nada

1. **¿La rueda es por asignación o por familia de asignaciones?** Para las
   presidencias y la lectura de La Atalaya, por asignación. Pero las partes de
   estudiante (lectura de la Biblia, revisitas, cursos bíblicos) se sienten
   como un mismo grupo. Mi recomendación: **por asignación**, y si luego se ve
   que hace falta agrupar, se agrupa; agrupar de entrada esconde otra vez el
   problema.
2. **¿Cuánto cuenta el pasado?** Hoy el historial se construye desde TODOS los
   programas guardados. Está bien: la rueda necesita memoria larga.

### Lo tranquilizador

**El autocompletado solo rellena huecos vacíos.** En todos los sitios la
comprobación es `if (valor === '')`. Cambiar las reglas de selección **no puede
mover a nadie que ya esté asignado**, ni reordenar un programa hecho. El
hermano que abra «Reunión de entre semana» mañana no verá nada distinto en lo
que ya está escrito.

Aun así, el encargo obliga a: pruebas automáticas del reparto antes de tocar el
motor, y una comparación en pantalla del «antes / después» sobre un mes real de
prueba.

### El botón «Historial de asignaciones»

Carlos tiene razón otra vez, y por el mismo motivo: si lo que decide es la
rueda de ESA asignación, el historial que hay que enseñar al lado del campo es
el de ESA asignación. Que se llame **«Historial de esta asignación»** y muestre
eso, con el historial completo a un clic para quien lo quiera.

Y entonces sí tiene sentido ponerlo en Departamentos, que es lo que quedó
retirado: **con el historial de ese puesto delante, el botón informa; con el
historial de todo, no decía nada.**

### La rueda en tabla (lo del Excel)

Lo que Carlos describe —una tabla por asignación con el hermano y la fecha, para
confirmar de un vistazo que el reparto va equilibrado— es **la misma
información que usa el motor, pintada**. Va en un sitio discreto (yo lo pondría
como una pestaña dentro de «Historial de asignaciones», no como página propia).

> ⚠️ **La captura del Excel no llegó al mensaje.** El diseño de esa tabla queda
> pendiente de verla. Todo lo demás del plan se puede empezar sin ella.

### Otras recomendaciones sobre el reparto

- **Enseñar por qué.** Al lado de cada nombre autocompletado, «hace 14 semanas»
  o «nunca ha llevado esta parte». Convierte el autocompletado de caja negra en
  una propuesta que se puede revisar, que es lo que de verdad quita el miedo a
  usarlo.
- **Un resumen al terminar.** «18 asignaciones repartidas entre 11 hermanos.
  Sin asignar: 2.» Y avisar de quién lleva mucho sin nada.
- **Que se pueda repetir sin miedo.** Hoy solo rellena huecos; dejarlo así, y
  que el botón lo diga: «Rellenar lo que falta», no «Autocompletar».

---

## Respuesta corta a las otras preguntas que iban dentro de las notas

**¿La configuración de Departamentos se refleja bien en Programas semanales?**
**Sí.** Lo he comprobado: los ocho sitios que pintan puestos preguntan al mismo
sitio (`services/app/departments_slots`), incluido el programa semanal, que usa
`buildDeptSlotGroups` y por eso enseña los rótulos «Entre semana» / «Fin de
semana» / «Principio» / «Final» según se haya configurado. La pestaña de
Departamentos del programa semanal muestra la semana entera, no una reunión, así
que enseñar los dos bloques es lo correcto. No hay nada que arreglar; sí lo meto
como comprobación explícita en el encargo, para dejarlo verificado en pantalla.

**¿El cancionero se actualiza solo por la API?** **No.** Las canciones salen de
`src/locales/{idioma}/songs.json`, que viaja **dentro de la aplicación**: se
actualizan cuando se despliega una versión nueva, no por la API ni por
sincronización. Así que hoy **no hay ninguna forma** de actualizar el cancionero
sin publicar la app. La petición de poder importar el `.jwpub` a mano no es un
plan B: es la única vía que habría si eso deja de mantenerse.

**¿Qué hace el interruptor «Usar nombres para mostrar en los programas»?**
Sustituye el nombre completo por el «nombre para mostrar» de cada persona en los
programas. Y **al activarlo escribe** un nombre para mostrar generado en toda
persona que no lo tenga. Se puede quitar, pero **hay que mirar antes cómo está
hoy**: si está encendido, apagarlo cambia el nombre en todos los programas de
golpe. Va con esa comprobación dentro del encargo.

**¿Cómo avisar cuando alguien se pone de ausencia después de que ya lo
asignaron?** Ya existe todo lo necesario: hay ausencias (`services/app/time_away`)
y hay notificaciones push con detección de cambios en `services/push/diff.ts`.
Mi recomendación, por orden de valor:

1. **Un aviso en la propia página del programa**, donde ya está el responsable:
   una tira arriba, «2 asignaciones chocan con una ausencia», y el campo marcado.
   Esto no depende de notificaciones ni de que nadie mire el móvil.
2. **Una notificación al responsable** cuando alguien registra una ausencia que
   pisa una asignación **ya publicada** — que es cuando de verdad importa.
3. Nada automático. **Que la app no desasigne a nadie sola.** Avisa y decide una
   persona.

---

## El plan: siete carriles

Los he agrupado **por los archivos que tocan**, no por temas, que es lo que
decide si dos cosas se pueden hacer a la vez sin pisarse.

### Carril 1 — El reparto
> El motor de autocompletado, el botón «Historial de esta asignación» y la
> tabla de la rueda.

Archivos: `services/app/schedules.ts`, `services/app/autofill.ts`,
`services/app/deptAutofill.ts`, `features/meetings/assignments_history*`.

**Riesgo: alto.** Es lógica de negocio compartida. Va con pruebas automáticas
obligatorias. **Necesita que Carlos apruebe el diseño antes de escribir código**,
y la captura del Excel para la tabla.

### Carril 2 — Publicar, en todas partes
> Llevar el sistema de Departamentos —diálogo que confirma, avisa de lo que
> falta, y botón que queda en «Publicado»— a Reunión de entre semana, Reunión de
> fin de semana, Discursos salientes, Exhibidores, Salidas, Visita del
> superintendente. Más: aviso cuando se cambia algo ya publicado, aviso si se
> asigna a alguien de ausencia, y el resto de la página de Discursos salientes
> (las etiquetas de conteo y el ajuste que se trae de Reunión de fin de semana).

Archivos: `services/app/*_publish.ts`, los `publish_dialog` de cada módulo, y
las barras de acciones de las páginas de programa.

**Riesgo: alto**, pero de otro tipo: publicar decide **qué ve la congregación**.
Un fallo aquí esconde un programa entero. La regla de oro del encargo: *lo que
hoy se ve, se sigue viendo* — igual que se hizo con `DEPTS_DRAFT_FROM`.

Es el carril más grande. Se puede partir en dos si hace falta.

### Carril 3 — Ajustes y seguridad
> Exportación a PDF: quitar el interruptor de congregación y dejar solo el
> individual, que le salga a cualquiera que pueda exportar. Quitar «Usar
> nombres para mostrar». Quitar el párrafo de ATENCIÓN del código de acceso.
> Blindar el cambio de llave maestra.

Archivos: `features/congregation/settings/**`,
`features/my_profile/app_settings`, `weekend_editor/quick_settings`.

**Riesgo: medio.** Dos de estos cambian el cifrado o los nombres impresos. Los
dos llevan una comprobación previa dentro del encargo.

### Carril 4 — Materiales de reunión e importaciones
> Importar el cancionero desde un `.jwpub` a mano. Que los Discursos públicos se
> vean y se puedan importar también desde Materiales de reunión. Que en todos
> los casos se vea cuándo se importó y de dónde. Y arreglar el informe de «qué
> se está actualizando» al importar discursos, que hoy no dice nada cuando el
> archivo es el mismo.

Archivos: `features/meeting_materials/**`, `pages/meeting_materials/**`,
`services/app/meeting_materials`, `services/dexie/songs.ts`.

**Riesgo: medio.** Importar sobrescribe. Aplica la regla que ya está escrita en
la memoria del proyecto: **una tabla vacía en un archivo nunca borra nada.**

### Carril 5 — Próximos eventos y el Programa del inicio
> Que el horario por varios días solo salga en asambleas. Que una campaña
> especial de un mes se vea bien en el inicio sin comerse la pantalla. Que la
> reunión de precursores solo la vean ancianos, precursores y administradores, y
> que se llame «Reunión de precursores y ancianos» — la del superintendente de
> circuito no se toca.

Archivos: `features/meetings/event_editor/**`, `definition/upcoming_events.ts`,
la tarjeta de Programa del inicio.

**Riesgo: bajo.** Ojo con una cosa: es **ocultar información por rol**, y ahí
hay que mirar los dos sitios (Próximos eventos y el inicio), no solo uno.

### Carril 6 — Retoques
> El botón del Catálogo de oradores, fuera del campo y con confirmación antes de
> cambiar a un orador ya puesto. El botón «Invitación», con el estilo de la app.
> Los botones de «Estado de los dispositivos», centrados. La etiqueta del número
> de congregación cuando no hay número. «Ver **esta** reunión completa».

Archivos: `weekend_editor/public_talk_selector`, `weekend_editor/speakers_catalog`,
`congregation/app_access/devices_status`, `pages/persons/speakers_catalog`,
`weekly_schedules/circuit_visit`.

**Riesgo: bajo.** Lo de los botones descentrados tiene que empezar por
**averiguar qué lo movió**, no por añadir un `alignItems` — ya pasó en agosto
con Exhibidores y la causa era otra.

### Carril 7 — El diálogo de exportar
> Quitar la plantilla oficial del S-140 y dejar la nuestra. Y rehacer el diálogo:
> hoy pulsar «Exportar» sin nada marcado no dice nada.

Archivos: `features/meetings/midweek_export/**`.

**Riesgo: bajo**, con una salvedad importante: **no se rediseña ningún
formulario oficial.** Aquí se quita una plantilla, no se toca su contenido.

---

## ¿Se pueden hacer a la vez?

**Sí, y es buena idea** — pero no las siete. Los carriles están definidos para
que **no compartan archivos**, que es la única forma de que no se pisen. Con dos
salvedades que van escritas dentro de los encargos:

- `weekend_editor/quick_settings/index.tsx` lo toca solo el **carril 3** (quita
  dos interruptores). El carril 2 pone uno de ellos en Discursos salientes, pero
  no abre ese archivo.
- `pages/outgoing_speakers/index.tsx` es **entero del carril 2**. Nadie más lo
  abre.

**Cómo lo haría:**

**Primera tanda, a la vez** — los cuatro independientes y de riesgo bajo o medio:

    Carril 4 (materiales)   Carril 5 (eventos)   Carril 6 (retoques)   Carril 7 (exportar)

**Segunda tanda** — el carril 3 (ajustes) puede entrar aquí también; son cuatro
o cinco sesiones a la vez, que es un número razonable de revisar.

**Los dos grandes, de uno en uno y con Carlos delante:**

- **Carril 1 (el reparto)** — primero la propuesta escrita, Carlos la aprueba, y
  luego el código. No se empieza a la vez que nada.
- **Carril 2 (publicar)** — cuando el 1 esté cerrado, porque los dos cambian
  cómo se siente el mismo botón de la misma barra.

**Lo que NO haría nunca en paralelo:** el 1 y el 2. Los dos tocan la experiencia
de «preparo un programa y lo suelto», y si salen a la vez es imposible saber cuál
rompió qué.

### Reglas para todas las sesiones

Van repetidas en cada encargo, pero aquí también:

1. **Una rama por carril.** Nada directo a `main`. Se juntan de uno en uno.
2. **Un cambio, una comprobación en pantalla, un commit.** Es la lección escrita
   en `MAQUETACION_MOVIL.md`, y viene de haber roto dos cosas el mismo día por
   cambios amplios sin mirar.
3. **`npm run test:unit` y `npx tsc --noEmit`** antes de cada commit. La base son
   **456 pruebas** y **129 errores de tipos preexistentes** — si sube alguno de
   los dos números, es tuyo.
4. **Nunca `git add -A`.** Un commit se llevó por delante `global.css` así.
5. **Leer `DESIGN_SYSTEM.md` antes de tocar interfaz**, y usar los componentes
   de `src/components` en vez de MUI en crudo.
6. **En lo que circule, datos de prueba.** Nunca nombres reales de la
   congregación en capturas ni en documentos.
7. **No abreviar en la interfaz.** «Número», no «Nro.».

---

## Los encargos

Uno por carril, listos para pegar en una sesión nueva, en [`encargos/`](./encargos):

| | Encargo | Riesgo | ¿Paralelo? |
|---|---|---|---|
| 1 | [El reparto](./encargos/1-reparto.md) | Alto | **No** — solo, y con aprobación previa |
| 2 | [Publicar](./encargos/2-publicar.md) | Alto | **No** — después del 1 |
| 3 | [Ajustes y seguridad](./encargos/3-ajustes.md) | Medio | Sí |
| 4 | [Materiales e importaciones](./encargos/4-materiales.md) | Medio | Sí |
| 5 | [Eventos y Programa](./encargos/5-eventos.md) | Bajo | Sí |
| 6 | [Retoques](./encargos/6-retoques.md) | Bajo | Sí |
| 7 | [El diálogo de exportar](./encargos/7-exportar.md) | Bajo | Sí |
