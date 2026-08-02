# Encargo 5 — Próximos eventos y el Programa del inicio

**Riesgo: bajo. Se puede hacer en paralelo con los encargos 3, 4, 6 y 7.**

Tres cosas de los eventos. La tercera oculta información según el rol, así que
hay que hacerla en **los dos sitios** donde se ve, no solo en uno.

---

## 1. El horario por varios días, solo en asambleas

En Próximos eventos, al crear un evento se puede poner un horario distinto por
cada día (`dailyTimes`, en `definition/upcoming_events.ts`). Eso **solo tiene
sentido en una asamblea**, que es donde cada jornada empieza y acaba a horas
distintas.

Que esa opción **solo aparezca** cuando la categoría sea de asamblea:
`AssemblyWeek`, `ConventionWeek`, `InternationalConventionWeek`. En lo demás,
fuera.

Los eventos ya guardados que tengan `dailyTimes` sin ser asamblea **no se
tocan**: siguen enseñándose como estén. Se quita la opción de ponerlo, no lo
puesto.

## 2. Una campaña especial de un mes, sin fastidiar el inicio

En septiembre habrá una campaña especial (`SpecialCampaignWeek`) que dura **un
mes entero**. Hoy un evento largo se pinta como cualquier otro y se come la
pantalla del inicio y de Programa.

**Propón el diseño a Carlos antes de implementarlo.** La idea que yo defendería:
un evento que dura semanas **no es una cita, es un periodo**. Y un periodo se
enseña distinto — una tira fina y persistente que dice qué campaña es y cuánto
queda, en vez de una tarjeta de evento repetida cada día. Que no compita con lo
que sí pasa esa semana.

Mira cómo se pintan hoy en el inicio y en Programa antes de decidir el umbral a
partir del cual un evento pasa a ser «periodo» — y que sea **por duración**, no
por categoría, para que valga también para lo que venga después.

## 3. La reunión de precursores, solo para quien va

Hay dos cosas distintas que se llaman parecido. **No las confundas:**

| | Quién la ve hoy | Quién debe verla |
|---|---|---|
| La **reunión de precursores** normal (`PioneerWeek`) | Todos | **Solo ancianos, precursores y administradores** |
| La reunión de precursores **del superintendente de circuito** (`meeting_pioneers`, en `definition/circuit_visit.ts`) | Todos | **Todos — no se toca** |

Dos cambios en la primera:

- **Renombrarla a «Reunión de precursores y ancianos».**
- **Restringirla por rol**: ancianos, precursores (de cualquier tipo) y
  administradores.

Y hay que hacerlo en **los dos sitios donde sale**:

- **Próximos eventos**
- **La tarjeta de Programa del inicio** (`pages/dashboard/`)

Hacerlo solo en uno es peor que no hacerlo: da la sensación de estar oculto
mientras sigue a la vista en el otro.

**Un aviso sobre esto.** Ocultar por rol en la interfaz no es seguridad: el dato
sigue sincronizándose a todos los dispositivos. Está bien —es lo que se pide y
es coherente con el resto de la app—, pero **no lo describas como privacidad** ni
en la interfaz ni en el commit. Es orden, no secreto. (Hay una deuda conocida
sobre esto en la memoria «org-app role enforcement gap».)

## Lo que NO se toca

- La reunión de precursores de la visita del superintendente de circuito.
- El módulo de Visita del superintendente en general — es del encargo 2 y del 6.
- La sincronización.

## Cómo se comprueba

1. En modo de prueba (`vite --mode test --port 4137`, enrutador de **hash**),
   **cambiando de rol**: comprueba con una cuenta que no sea anciano ni precursor
   que la reunión de precursores no aparece **ni en Próximos eventos ni en el
   inicio**, y que la del superintendente sí.
2. Crea un evento de cada categoría y comprueba que el horario por días solo
   sale en las tres de asamblea.
3. Crea una campaña de un mes y **enseña una captura del inicio a Carlos** antes
   de dar el punto por cerrado. Este es de los que hay que ver, no describir.
4. `npm run test:unit` (base **456**) y `npx tsc --noEmit` (base **129 errores
   preexistentes**).

## Reglas de la casa

- Rama propia. Un cambio, una comprobación en pantalla, un commit. Nunca
  `git add -A`.
- `DESIGN_SYSTEM.md` antes de tocar interfaz; componentes de `src/components`.
- No abrevies en la interfaz: «Número», no «Nro.».
- Datos de prueba en todo lo que circule.
