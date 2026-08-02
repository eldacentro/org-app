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

### 3. La tabla de la rueda

Una tabla por asignación con quién la llevó y cuándo, para confirmar de un
vistazo que el reparto va equilibrado. Sitio discreto: **una pestaña dentro de
«Historial de asignaciones»**, no una página nueva.

> ⚠️ **Carlos iba a adjuntar una captura de su Excel y no llegó al mensaje.**
> **Pídesela antes de diseñar esta parte.** Los puntos 1 y 2 se pueden hacer
> enteros sin ella.

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
