# Encargo 8 — La campaña en el inicio, y «Última actualización»

**Riesgo: bajo.** Dos cosas independientes, las dos ya aprobadas por Carlos.

---

## 1. Una campaña de un mes no es una cita: es un periodo

En septiembre hay una campaña especial que dura **un mes**. Hoy se pinta como
cualquier evento y se come el inicio.

**Ya está medido** lo que hace mal hoy en la tarjeta «Programa» del inicio:

1. Se ordena por la fecha de inicio, así que sale **el primero, por delante de
   las dos reuniones**, las cinco semanas.
2. El bloque de fecha dice **«1 sep»** aunque estés en la semana del 22.
3. Se **repite idéntico** cinco semanas.
4. No se atenúa hasta que acaba el mes entero.

**El umbral, aprobado: 8 días o más, por DURACIÓN y no por categoría.** La
unidad de la app es la semana —la tarjeta se llama «Esta semana», el filtro es
lunes-domingo—, así que un evento de ≤7 días cabe en una semana natural y es
una cita. A partir de 8 cruza sí o sí un límite de semana y su renglón se va a
repetir: deja de ser una cita y pasa a ser el telón de fondo de varias semanas.

Eso deja **fuera** las asambleas (2-4 días) y la visita del superintendente
(6), que son citas y ya tienen su propia agenda: **nada de lo que funciona hoy
cambia**. Vivirá como `isEventPeriod(event)`, junto a `isEventForUser` en
`services/app/upcoming_events.ts`.

**Cómo se enseña.** Una **tira fina**, con la forma que ya tiene la de «Visita
del superintendente de circuito» en `pages/dashboard/index.tsx` (~940-991) —
que es este mismo problema ya resuelto una vez: un evento que dura toda la
semana y no es una cita. Mismo hueco (bajo la cabecera de «Programa», antes de
los renglones), fondo `color-mix(--accent-main 6%)`, borde `--accent-200`.

Sin bloque de día y sin píldora de hora, porque un periodo no tiene una hora:
título + «1-30 de septiembre · quedan 12 días» (o «empieza en 5 días» / «último
día»). **Lo que aporta un periodo no es cuándo es, sino cuánto le queda.**

**NO entra en `agendaItems`**, así que la reunión de entre semana vuelve a ser
el primer renglón.

En **Próximos eventos**, el caso especial que hoy está atado a la categoría
`SpecialCampaignWeek` se sustituye por el umbral, para que valga igual para un
evento «Personalizado» de 30 días (que hoy pinta 30 filas). El PDF no cambia:
ya pinta una fila por evento con el rango.

**Dos detalles que decide Carlos y que hay que dejar preguntados, no
inventados:** si la tira aparece también la semana ANTERIOR con «empieza en X
días», y qué pasa si coinciden dos periodos (la propuesta era apilar como mucho
dos, ordenados por fecha de fin).

---

## 2. «Última actualización», útil de verdad

Hoy es una línea de texto arriba de la página: fecha, hora y nombre. Carlos:
*«ese texto ahí arriba es un poco anti-nuestra-app»*.

**Lo que ya se hizo hoy** (no lo repitas): fuera del cuerpo de ancianos solo se
ve la FECHA, sin hora ni nombre. Está en `components/last_modified_info`.

**Lo que falta, y está aprobado:**

- **Sacarla de arriba.** Que no sea lo segundo que se lee al abrir la página.
  Al **pie**, discreta.
- **Que se pueda abrir.** Al pulsarla, un panel con **qué campos** se cambiaron
  y cuándo: «Presidente y Oración, el 3 de agosto». Eso SÍ se puede: cada campo
  guarda su `updatedAt`.

> **El límite, y hay que respetarlo.** La app guarda **cuándo** se tocó cada
> campo, pero **no quién**. El autor solo existe a nivel de registro entero. Así
> que el panel dice qué y cuándo, y el «quién» sigue siendo el del registro.
> **No añadas un campo nuevo al esquema**: eso es un encargo aparte que Carlos
> quiere hacer al final de todo, y en este repo un campo sincronizado nuevo se
> hace despacio.

Sale en **Responsabilidades**, **Grupos de predicación**, **Departamentos** y
las dos páginas de reuniones. En **Programas semanales NO se toca**: ahí ya
enseña solo la fecha y está bien.

---

## Reglas de la casa

- Rama propia. Un cambio, una comprobación, un commit. Nunca `git add -A`.
- Lee `CLAUDE.md` y `DESIGN_SYSTEM.md` antes de tocar interfaz. Componentes de
  `src/components`, no MUI en crudo.
- No abrevies en la interfaz: «Número», no «Nro.».
- Base: `npm run test:unit` = **498**, `npx tsc --noEmit` = **129 errores
  preexistentes**. Si sube alguno, es tuyo.
- **`npm run build` también**, sin excusa: hoy pasó que `tsc` y las pruebas
  daban verde y el build fallaba por una variable sin usar.
- Donde diga «lo decide Carlos», NO lo implementes: escribe la propuesta y para.
