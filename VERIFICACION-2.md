# Verificación del encargo 2 — Publicar, en todas partes

Esto no se ha podido mirar en pantalla (había un solo navegador y otro agente
trabajando). Aquí está, paso a paso, lo que hay que comprobar: qué página, con
qué papel, a qué ancho, qué se espera ver y qué NO.

Todo lo automático está en verde: **534 pruebas** (498 de base + 36 nuevas),
**129 errores de tipos** (los preexistentes de siempre) y `npm run build`
termina. Lo que queda es lo que solo se ve mirando.

---

## 0. ANTES DE DESPLEGAR — la única decisión que hay que confirmar

El corte está en **`2026/10`**, en
`src/services/app/meetings_publish.ts` (`MIDWEEK_DRAFT_FROM`,
`WEEKEND_DRAFT_FROM`, `OUTGOING_TALKS_DRAFT_FROM`).

Significa: **todo lo anterior a octubre de 2026 se da por publicado y no cambia
nada**. Septiembre, agosto y lo de antes se siguen viendo exactamente igual que
hoy, sin tocar nada y sin que nadie tenga que publicar.

Se eligió octubre porque hoy es 3 de agosto: agosto está en marcha y septiembre
es el mes que se está repartiendo y que la congregación ya tiene delante, así que
ninguno de los dos puede volverse borrador de golpe.

**Comprueba una cosa antes de desplegar**: abre Reunión de entre semana, Reunión
de fin de semana y Discursos salientes, y mira si **octubre ya está repartido**.

- Si octubre está vacío o a medias → el corte está bien, despliega.
- Si octubre ya está repartido y la congregación ya lo ve → **sube las tres
  constantes a `2026/11`** antes de desplegar. Es un cambio de una línea cada
  una, no hay nada que migrar, y evita que a alguien se le vacíe octubre el día
  del despliegue.

---

## 1. LA COMPROBACIÓN QUE MÁS IMPORTA — un mes sin publicar no se ve

Hay que hacerla **cambiando de vista, no leyendo el código**.

**Preparación** (con la cuenta del responsable, en un mes **futuro**: octubre de
2026 o más adelante):

1. Reunión de entre semana → elige una semana de octubre → Autocompletar (o
   pon dos o tres nombres a mano, uno de ellos el tuyo).
2. Comprueba que el botón de arriba dice **«Publicar»** (en color, no gris) y
   que sale la tira naranja: *«Este mes está en borrador: solo lo ves tú...»*.
3. **No lo publiques todavía.**

**Con un hermano que NO sea responsable** (una cuenta sin `midweek_schedule`,
`weekend_schedule`, `public_talk_schedule` ni administrador; un publicador
normal vale, y un anciano sin rol de programas también):

| Dónde | Qué se espera ver | Qué NO puede aparecer |
|---|---|---|
| Inicio, tarjeta de la próxima reunión | La reunión, sin ninguna parte suya | Ninguna asignación de octubre |
| Mis asignaciones | Nada de octubre | Ni la asignación, ni contada en el globo del menú |
| Programas semanales ▸ Entre semana, semana de octubre | La tarjeta *«Todavía no hay programa publicado para esta semana.»* | Ni un solo nombre |
| Programas semanales ▸ Fin de semana | Lo mismo | Ídem |
| Programas semanales ▸ Discursos salientes | *«Todavía no hay discursos salientes publicados para esta semana.»* | Ninguna salida |
| Notificaciones | Ninguna de esas asignaciones | — |

**Vuelve a la cuenta del responsable y publica** (botón «Publicar» → el diálogo →
«Publicar»). Con el hermano otra vez: **ahora sí** tiene que ver todo lo de
arriba, en los cuatro sitios.

Y la vuelta atrás: **«Retirar»** en el diálogo (el botón rojo, que sale cuando
todo lo marcado ya está publicado) tiene que dejarlo como al principio.

---

## 2. Lo que hoy se ve, se sigue viendo — la comprobación de que no se ha roto nada

Con **cualquier** cuenta, incluida la de un publicador normal:

1. Programas semanales → una semana de **septiembre de 2026** (o de agosto, o de
   julio) → **todo tiene que verse exactamente igual que antes**: los nombres,
   las partes, los discursos salientes. Sin tarjeta de «no hay programa», sin
   tira naranja.
2. Mis asignaciones → lo de septiembre sigue ahí.
3. En la página de Reunión de entre semana, con una semana de septiembre
   elegida: **el botón de publicar no aparece** (ese mes no se publica a mano) y
   **no sale ninguna tira** de aviso.

Si algo de esto falla, el corte está mal puesto: vuelve al punto 0.

---

## 3. Reunión de entre semana y Reunión de fin de semana

Cuenta: responsable de esa reunión (`midweek_schedule` / `weekend_schedule`, o
administrador). Ancho: **1280** primero, luego **375**.

**El botón** (arriba a la derecha, junto a Exportar y Autocompletar):

- Mes sin publicar → **«Publicar»**, en color.
- Mes publicado → **«Publicado»**, apagado (sigue pulsable: sirve para retirar).
- Mes anterior al corte → **no está**.
- Se ve **sin cuenta conectada** (antes solo salía estando conectado). En modo
  de prueba tiene que salir igual.

**El diálogo** (las casillas por año y mes, que ya existían):

- Al marcar meses aparece abajo, en azul: *«Al publicarlo, cada hermano verá su
  parte de la reunión de... en "Mis asignaciones" y en el programa semanal...»*.
- Si al mes le faltan partes principales, en naranja: *«Hay N partes principales
  sin nadie asignado...»*. Cuenta presidencia, oración inicial y final, tesoros,
  perlas, lectura de la Biblia y el conductor y lector del estudio bíblico (en el
  fin de semana: presidencia, oración, orador, conductor y lector de La Atalaya).
  **Las semanas canceladas y las de asamblea/congreso no cuentan**: comprueba que
  una semana de asamblea no dispara el aviso.
- Si alguien de ese mes tiene una **ausencia apuntada** en sus fechas, en
  naranja y **por su nombre**: *«Ana Pérez tiene una ausencia apuntada en las
  fechas que se van a publicar.»* (Para probarlo: ficha de una persona →
  ausencia que cubra la semana que le has asignado.)
- Si todo lo marcado ya está publicado, el botón principal es **«Retirar»**, en
  rojo, y el texto de arriba cambia a lo que pasa al retirar.
- A 375 px el diálogo tiene que caber sin desbordar a lo ancho; la tira de años
  se desplaza sola en horizontal.

**La tira de aviso de la página** (debajo del título, nunca un diálogo):

1. Mes en borrador → naranja: *«Este mes está en borrador: solo lo ves tú...»*.
2. Mes publicado y con cambios desde entonces → naranja, con el número: *«Este
   mes está publicado. Has hecho 2 cambios desde entonces.»* y un botón
   **«Volver a publicar»**. Para probarlo: publica, cambia un nombre, y mira que
   el número sube; pulsa «Volver a publicar» y **la tira tiene que desaparecer**.
3. Alguien con ausencia apuntada en una fecha que tiene asignada → naranja, con
   los nombres, y la frase *«Nadie se desasigna solo: mira si hay que
   cambiarlo.»* Esta es la dirección contraria (la ausencia se apuntó DESPUÉS de
   asignarle): comprueba que **la aplicación no desasigna a nadie sola** y que
   **no manda ninguna notificación** por esto.
4. Mes publicado y sin cambios → **no sale nada**. (Que no haya tira es tan
   importante como que la haya: si saliera siempre, dejaría de leerse.)

**Para el responsable, el borrador se sigue viendo**: en Programas semanales, en
un mes sin publicar, él ve el programa entero con la tira naranja *«Mes sin
publicar. Esto es un borrador: solo lo ves tú...»* encima. En el fin de semana,
el **coordinador de discursos públicos** también lo ve (edita el orador sin ser
el responsable de la reunión).

---

## 4. Discursos salientes (`Oradores salientes`)

Cuenta: coordinador de discursos públicos (`public_talk_schedule`) o
administrador. Ancho: **1280** y **375**.

1. **El botón «Publicar» ya no fuerza una sincronización**: abre un diálogo, como
   en Departamentos. Dice **«Publicado»** cuando el mes ya lo está y desaparece
   en los meses anteriores al corte.
2. **El diálogo** dice, si el mes tiene salidas a medias: *«De las 5 salidas del
   mes: 2 sin orador; 1 sin discurso asignado; 1 sin congregación, así que
   tampoco tienen fecha.»* Comprueba los tres casos por separado. (No hay ningún
   campo de "fecha confirmada" en los datos: la fecha de una salida se calcula
   con el día de reunión de la congregación de destino, así que "sin
   congregación" ES "sin fecha".)
3. Si el mes no tiene ninguna salida: *«Este mes no tiene todavía ninguna salida
   que publicar»* y **no hay botón de publicar**.
4. La **tira de aviso** de la página funciona igual que en las reuniones (los
   cuatro casos del punto 3).
5. **Las etiquetas de conteo**: en cada tarjeta de orador, «Discursos
   preparados» e «Historial de salidas» llevan ahora **la chapa del sistema**
   (`CountBadge`, el rectangulito con el número al lado del rótulo) y **ya no** el
   número dentro de la frase entre paréntesis. Mira que la chapa queda alineada
   con el rótulo y que a 375 px no empuja la flecha de desplegar fuera de la
   tarjeta.
6. **El engranaje del título** (nuevo aquí) abre *«Configuración de los discursos
   salientes»* con el interruptor **«Mostrar los discursos salientes a toda la
   congregación»**. Comprueba que:
   - Cambiarlo aquí lo cambia también en **Ajustes ▸ Privacidad de la
     congregación** (es el mismo dato, no una copia).
   - Con el interruptor apagado, un hermano que no sea anciano ni administrador
     **no ve la pestaña de Discursos salientes** en Programas semanales.
   - Quien no sea coordinador de discursos públicos ve el interruptor **de solo
     lectura** (no lo puede cambiar).

---

## 5. Departamentos (lo único que se ha tocado de un módulo que ya publicaba)

Cuenta: responsable de departamentos. En el diálogo de publicar, además del
aviso de puestos sin nadie que ya había, tiene que salir el de **ausencias, por
su nombre**, igual que en los otros. Lo demás de esa página no se ha tocado:
comprueba de pasada que publicar y retirar siguen funcionando igual.

---

## 6. Repaso de anchos

Las tres páginas nuevas del encargo (entre semana, fin de semana, oradores
salientes) a **375**, **768** y **1280**:

- Las tiras de aviso ocupan el ancho y el texto no se corta.
- La tira de «Volver a publicar» pone el botón debajo del texto cuando no cabe
  al lado (envuelve, no se sale).
- Ninguna página desplaza en horizontal.

---

## 7. Lo que NO tiene que pasar (la lista de "si ves esto, algo está mal")

- Que un mes **anterior a octubre de 2026** pida publicarse, salga en borrador o
  deje de verse. Eso es el fallo grave: la regla es que lo que hoy se ve se
  sigue viendo.
- Que un hermano vea una asignación de un mes sin publicar en **cualquiera** de
  los cuatro sitios (inicio, Mis asignaciones, programa semanal, notificación).
- Que publicar la **reunión de fin de semana** enseñe también los **discursos
  salientes** de ese mes (son dos publicaciones distintas, de dos responsables
  distintos).
- Que el botón diga «Publicado» sin que el mes lo esté del todo: **con una sola
  semana del mes sin publicar tiene que seguir diciendo «Publicar»**.
- Que la aplicación **desasigne a alguien sola** por una ausencia, o que mande
  una notificación por eso. Solo avisa.
- Que salga la tira de «has hecho N cambios» en un mes que no se ha tocado desde
  que se publicó.

---

## 8. Lo que se ha dejado fuera a propósito (no hay que buscarlo)

- **El aviso de «has cambiado N cosas desde que se publicó» en Exhibidores,
  Salidas y Visita del superintendente.** Esos tres guardan el "publicado" sin
  fecha (una lista de meses, o un booleano), así que no hay contra qué comparar.
  Ponerle fecha es cambiar el esquema sincronizado de tres módulos que ya
  funcionan, y eso merece su propio paso. En los tres nuevos sale gratis, porque
  la marca lleva su propia fecha.
- **El aviso de ausencias en el diálogo de Exhibidores y Salidas.** Mismo motivo
  de prudencia: sus asignaciones tienen forma propia y sus páginas son enormes.
  Departamentos sí lo lleva ya.
- **Marcar el campo concreto** que choca con una ausencia dentro del editor. Se
  avisa en la tira de la página, con los nombres; señalar además la casilla es
  trabajo del editor de cada reunión y no entraba aquí.
- **La notificación al responsable** cuando una ausencia pisa una asignación ya
  publicada. El encargo la pone la segunda en valor y pide empezar por el aviso
  en la página, que es lo que se ha hecho.
