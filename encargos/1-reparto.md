# Encargo 1 — El reparto de asignaciones

**Riesgo: alto. No se ejecuta en paralelo con nada.**
**Antes de escribir código hay que presentar la propuesta y que Carlos la
apruebe.**

---

## El problema, con nombres del código

El autocompletado de las reuniones reparte mal: use quien use, salen casi
siempre los mismos hermanos, aunque haya más gente disponible.

Quien decide es `schedulesSelectRandomPerson`, en
[`services/app/schedules.ts:1785`](../src/services/app/schedules.ts). Filtra a
los que pueden llevar esa parte y prueba **seis reglas en cascada**, quedándose
con el primero que encuentre:

| | Regla | ¿Mira de qué asignación hablamos? |
|---|---|---|
| 1 | `schedulesPersonNoPart` — nunca ha tenido nada | **No** |
| 2 | `schedulesPersonNoPartWithinMonth` — nada en ±1 mes | **No** |
| 3 | `schedulesPersonNoPartWithin2Weeks` — nada en ±2 semanas | **No** |
| 4 | `schedulesPersonNoPartSameWeek` — nada esa semana | **No** |
| 5 | `schedulesPersonNoConsecutivePart` — su última no fue de este tipo | A medias |
| 6 | `schedulesPersonLatest` — el más antiguo en ESTA asignación | **Sí** |

Dos consecuencias:

1. Las reglas 2, 3 y 4 filtran el historial **solo por persona**
   (`record.assignment.person === person.person_uid`, sin comparar el tipo). Si
   alguien presidió el miércoles, queda tachado para la lectura de La Atalaya
   del domingo aunque lleve un año sin leerla.
2. En una congregación donde casi todos llevan algo cada mes, las reglas 1 a 4
   **no encuentran a nadie**, y decide la 5 — que acepta **al primero de la
   lista** que cumpla (`break` en el primer acierto). No es un reparto: es el
   orden de la lista. La única regla que reparte de verdad, la 6, casi nunca se
   ejecuta.

De paso: la función se llama `selectRandomPerson` y no tiene nada de aleatorio.

## La referencia está dentro de esta misma aplicación

`services/app/deptAutofill.ts` —el autocompletado de Departamentos, que sí
funciona bien— hace lo correcto: descarta a quien ya tiene algo esa semana o
llevó ese departamento la semana pasada, y **ordena a los que quedan por la
fecha de su última asignación EN ESE DEPARTAMENTO, el más antiguo primero.**

Ese es el criterio que hay que llevar a las reuniones. No lo inventes: léelo,
entiéndelo y unifícalo.

## Lo que hay que hacer

### 1. Unificar el criterio (`services/app/schedules.ts`)

Invertir la cascada. Un solo **orden** y unos pocos **descartes**:

- **El orden**: de los que pueden llevar esta asignación, primero el que hace
  más tiempo que no la lleva (y antes que todos, quien nunca la ha llevado).
  Es lo que ya hace `schedulesPersonLatest`; pasa a ser el criterio principal.
- **Los descartes**, encima del orden:
  - No dos veces en la misma semana. *(Aquí sí vale mirar cualquier asignación:
    es la misma semana.)*
  - No la misma asignación dos semanas seguidas.
  - **Quien esté de ausencia esa semana.** Hoy NO se comprueba:
    `applyAssignmentFilters` no mira `personIsAway` (`services/app/persons.ts:884`).
    Es un fallo real, no una mejora.
  - Los que ya hay (aula, sexo, familia para las partes con ayudante, anciano
    para las partes que lo piden) — **no toques ninguno de esos**.
- **Si un descarte deja la lista vacía, se relaja** y se vuelve a intentar. Un
  hueco sin rellenar es peor que una repetición. Departamentos ya lo hace así.

Arregla de paso, sin cambiar el comportamiento:

- `schedulesPersonLatest` tiene un comparador inconsistente: cuando las dos
  fechas están vacías devuelve `-1` en vez de `0`.
- En `schedulesPersonNoConsecutivePart`, la línea
  `lastAssignment.assignment.classroom` sin `?.` reventaría si esa regla se
  alcanzara con alguien sin historial. Hoy no se alcanza porque la regla 1 lo
  impide, pero al reordenar las reglas **eso deja de ser cierto**.

### 2. El botón «Historial de esta asignación»

Hoy se llama «Historial de asignaciones» y enseña todo lo que ha llevado la
persona. Si lo que decide el reparto es la rueda de ESA asignación, lo útil al
lado del campo es el historial de ESA asignación.

- Renómbralo a **«Historial de esta asignación»**.
- Que muestre por defecto solo esa asignación, con el historial completo a un
  clic (una pestaña o un enlace, no otro botón).
- **Ponlo también en Departamentos**, en cada puesto. Se había quitado a
  propósito porque enseñar «todo lo que ha llevado» no decía nada; con el
  historial del puesto delante sí informa.

### 3. «La rueda» — comprobar que el reparto va equilibrado

**No copies la hoja de cálculo.** Carlos la enseñó como referencia de lo que
quiere SABER, y ha dicho expresamente que no la quiere tal cual: leerla es
difícil. Aquí está por qué, y qué hacer en su lugar.

#### Qué era la hoja, y por qué cuesta leerla

Una rejilla: una fila por hermano, una columna por «vuelta» —un paso completo
por la lista—, y en la celda la fecha en que le tocó. En «Oraciones» son dos por
reunión, así que la lista tarda unos tres meses en darse la vuelta y cada
columna abarca un trimestre.

El fallo de raíz: **las columnas no son tiempo, son vueltas**, y cada vuelta dura
lo que dura. Dos celdas de la misma columna pueden estar a dos meses la una de la
otra. Así que la rejilla **hay que interpretarla**: contar huecos, comparar
fechas a mano, acordarse de cuántas semanas tiene una vuelta. Con 25 filas y 6
columnas ya no se lee de un vistazo, y en un móvil no se lee en absoluto.

#### Qué preguntas contesta de verdad

Debajo de la hoja hay cuatro preguntas, y ninguna necesita una rejilla:

1. ¿Va equilibrado, o hay a quien le toca el doble que a otro?
2. ¿A quién le toca ahora?
3. ¿A quién se están saltando?
4. ¿Cuándo le tocó a este hermano la última vez?

#### La solución

**Dos niveles. Ninguno es una rejilla.**

**Nivel 1 — el resumen.** Lo primero que se ve al abrir la pestaña: una línea por
asignación, y en cada una el dato que contesta la pregunta 1 de golpe:

```
Oración inicial (entre semana)   24 hermanos · entre 2 y 4 veces este año   ✓
Oración final (entre semana)     24 hermanos · entre 2 y 4 veces            ✓
Lectura de La Atalaya             6 hermanos · entre 1 y 9 veces            ⚠
Presidencia (fin de semana)       8 hermanos · entre 3 y 5 veces            ✓
```

**El margen entre el que menos y el que más lo dice todo.** Estrecho, va
equilibrado; ancho, no. Eso es lo que la hoja obligaba a deducir contando
huecos, y aquí es un número. Y de paso contesta algo que la hoja nunca contestó:
**cuál de todas las asignaciones es la que está desequilibrada**, sin abrirlas
una a una.

**Nivel 2 — la rueda de una asignación.** Al pulsar una línea, la lista de
hermanos **ordenada por a quién le toca antes** — el que hace más tiempo que no
la lleva, arriba:

```
1  Francisco Rosas      hace 34 semanas · 17 dic        1 vez
2  Plauxides Máñez      hace 21 semanas · 4 feb         2 veces
3  Ginés Ortega         hace 20 semanas · 11 feb        2 veces
   ...
24 Henry Atta           hace 4 semanas · 1 jul          4 veces
```

Tres cosas que esto hace y la rejilla no:

- **Contesta las preguntas 2 y 3 sin leer nada**: quien está arriba es a quien le
  toca, y a quien se han saltado **flota solo** hasta arriba. En la rejilla eso
  era un hueco que había que cazar.
- **Es el mismo orden que usa el autocompletado.** No es una vista aparte que hay
  que creerse: es el motor, enseñado. Si el reparto va torcido, aquí se ve por
  qué.
- **Cabe en un móvil**, porque es una lista y no una tabla de seis columnas.

**La línea de tiempo, para el que quiera mirar.** Al lado de cada hermano, una
tira fina con un punto por cada vez que le tocó, **con el tiempo real de eje** y
el mismo eje para todos:

```
Francisco Rosas    ·  ·                                          hace 34 sem
Henry Atta                    ·    ·   ·      ·                  hace 4 sem
                   └─────────────────────────────────────┘
                   ago 2025                          ago 2026
```

Esto es lo que sustituye a la rejilla y la mejora: **un hueco en la línea es un
hueco de verdad**, medido en semanas, no una celda vacía que hay que interpretar.
Y como el eje es común, mirando la columna se ve de un golpe quién se amontona y
quién no aparece. En móvil, la tira se cae y quedan el nombre, el «hace X» y el
conteo.

#### Detalles a conservar de la hoja

- Los que ya no están salen **en gris al final**, no desaparecen. La rueda tiene
  memoria, y saber que a alguien dejó de tocarle es información.
- En la hoja los nombres llevan un prefijo (`--`, `-`, ninguno) que marca algo
  del hermano. **Pregúntale a Carlos qué significan.** Probablemente la app ya lo
  sabe y no hace falta el prefijo, pero puede que quiera ver la rueda separada
  por ese criterio.

#### Dónde va

Una pestaña dentro de **«Historial de asignaciones»**. Carlos pidió que fuera
discreto —«nada prominente, por si alguna vez se quiere revisar»— y eso se
respeta: no es una página del menú.

#### Lo que NO hay que hacer

- **Una rejilla de vueltas.** Ni «mejorada», ni con colores, ni con la rejilla
  como opción secundaria. Se descartó por un motivo concreto: sus columnas no son
  tiempo.
- **Un historial ordenado por fecha.** Ya existe y no contesta ninguna de las
  cuatro preguntas.
- **Inventar una nota de «justicia» de 0 a 10.** El margen «entre 2 y 4 veces» es
  un dato comprobable; una puntuación es una opinión de la aplicación.

**Enséñale a Carlos los dos niveles montados con datos de prueba antes de darlo
por bueno.** Esto es de lo que hay que ver, no describir.

### 4. Enseñar por qué (recomendado, propón antes de hacerlo)

Al lado de cada nombre recién autocompletado, «hace 14 semanas» o «nunca ha
llevado esta parte», y un resumen al terminar («18 asignaciones entre 11
hermanos; 2 sin asignar»). Convierte el autocompletado en una propuesta
revisable en vez de una caja negra.

## Lo que NO se toca

- **Los filtros de quién puede llevar cada parte.** Anciano, siervo ministerial,
  varón, aula, familia: eso está bien y no es lo que falla.
- **Nada que mueva asignaciones ya escritas.** Compruébalo: en todos los sitios
  el autocompletado solo entra `if (valor === '')`. Ese contrato se mantiene, y
  es lo que hace que este cambio sea seguro — el hermano que abra «Reunión de
  entre semana» mañana no verá cambiar nada de lo ya puesto.

## Cómo se comprueba

**Obligatorio, y antes de tocar el motor:**

1. **Pruebas automáticas nuevas** en `services/app/schedules.test.ts` (créalo si
   no existe), con una congregación ficticia:
   - Con N hermanos elegibles y N semanas seguidas, **cada uno lleva la
     asignación exactamente una vez** antes de que se repita ninguno.
   - Presidir el miércoles **no impide** leer La Atalaya el domingo siguiente.
   - Llevar la misma asignación **sí** impide llevarla la semana siguiente.
   - Alguien de ausencia esa semana no sale — y si TODOS están de ausencia, el
     hueco se rellena igualmente en vez de quedarse vacío.
   - Con historial vacío no revienta nada.
2. **Antes / después en pantalla.** En modo de prueba
   (`vite --mode test --port 4137`, enrutador de **hash**: `#/midweek`),
   autocompleta tres meses con el motor viejo, apunta cuántas veces sale cada
   hermano, repite con el nuevo y **enseña las dos tablas a Carlos**. Si el
   reparto nuevo no está más repartido, el cambio no vale.
3. `npm run test:unit` (base: **456 pruebas**) y `npx tsc --noEmit` (base: **129
   errores preexistentes**). Si sube alguno de los dos números, es tuyo.

## Reglas de la casa

- Rama propia. Nada directo a `main`.
- Un cambio, una comprobación, un commit. Nunca `git add -A`.
- Lee `DESIGN_SYSTEM.md` antes de tocar interfaz; usa `src/components`, no MUI
  en crudo.
- No abrevies en la interfaz: «Número», no «Nro.».
- En capturas y documentos, **datos de prueba**, nunca nombres reales.
