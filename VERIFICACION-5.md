# Verificación del encargo 5 — Próximos eventos y el Programa del inicio

Rama `worktree-agent-a7c51108249a02c08`.

Yo no he podido mirar ninguna de estas pantallas (hay un solo navegador y
cinco sesiones a la vez). Esto es la lista exacta de lo que hay que ver, con
el rol con el que hay que verlo.

---

## 0. Preparar el modo de prueba

```
npm run dev -- --mode test --port 4137
```

Se abre en `http://localhost:4137/#/`. **Enrutador de hash**: las rutas llevan
`#` delante (`http://localhost:4137/#/activities/upcoming-events`).

Dos cosas del modo de prueba que hay que saber antes de empezar:

- **Borra y vuelve a sembrar la base local 5 segundos después de cada carga.**
  Cualquier cosa que toques por consola se pierde al recargar. Por eso los
  cambios de rol de más abajo se hacen **sin recargar**: la pantalla se entera
  sola.
- La cuenta sembrada es siempre **`admin` + `elder` + `secretary`**, o sea, lo
  ve todo. Para probar el caso contrario hay que quitarle el rol a mano.

### Cambiar de rol sin recargar

Espera a que la app termine de sembrar (el panel de Inicio ya con datos), abre
la consola del navegador y pega:

```js
// Publicador raso: ni anciano, ni precursor, ni administrador.
const { default: appDb } = await import('/src/indexedDb/appDb.ts');
await appDb.app_settings.update(1, {
  'user_settings.cong_role': ['publisher'],
});
```

La pantalla se actualiza sola (las tablas se leen con `useLiveQuery`). Si el
menú lateral pierde de golpe las secciones de anciano, el cambio ha entrado.

Para volver a ser anciano, lo mismo con
`['admin', 'elder', 'publisher', 'secretary']`.

(Se usa `update` con la ruta entre comillas, y no `put`, porque `app_settings`
tiene la clave dentro del propio registro y `put(objeto, 1)` la rechaza.)

Para el caso «precursor que no es anciano», después de dejar el rol en
`['publisher']`:

```js
// Hace precursor regular a la persona vinculada a la cuenta.
const { default: appDb } = await import('/src/indexedDb/appDb.ts');
const s = await appDb.app_settings.get(1);
const p = await appDb.persons.get(s.user_settings.user_local_uid);
p.person_data.enrollments.push({
  id: crypto.randomUUID(),
  _deleted: false,
  updatedAt: new Date().toISOString(),
  enrollment: 'FR',
  start_date: new Date(new Date().getFullYear(), 0, 1).toISOString(),
  end_date: null,
});
await appDb.persons.put(p);
```

---

## 1. El horario por varios días, solo en asambleas

**Pantalla:** Congregación → Próximos eventos (`#/activities/upcoming-events`).
**Rol:** anciano o administrador (el rol sembrado por defecto vale).

Toca «Añadir» y ve cambiando el «Tipo de evento». En «Fecha y hora» pon
duración **«Varios días»** y un rango de 3 días o más.

**Tiene que salir** el bloque «Horario de cada día» (una fila por jornada, con
hora de inicio y de fin) en estas tres, y solo en estas tres:

- Asamblea de circuito
- Asamblea regional
- Asamblea internacional

**NO debe salir** en ninguna otra. Comprueba al menos estas cuatro, que son
las que se ponen a «Varios días» con facilidad:

- Campaña especial
- Curso de idioma
- Semana de mantenimiento del Salón del Reino
- Personalizado

Comprueba también el cambio **en caliente**: con el bloque a la vista en una
asamblea de varios días, cambia el tipo de evento a «Campaña especial» sin
cerrar el formulario — el bloque tiene que desaparecer en ese momento, y no al
guardar.

**Lo que NO puede pasar:** que un evento ya guardado pierda sus horarios. Si
tienes a mano un evento antiguo de varios días que no sea asamblea y tenga
horas distintas por día, su **tarjeta** (la de la lista, no el formulario)
tiene que seguir enseñándolas igual que antes. Se ha quitado la forma de
ponerlos, no lo puesto.

---

## 2. El nombre de la reunión

**Pantallas:** Próximos eventos y el desplegable «Tipo de evento» del
formulario.

Donde antes decía **«Reunión de precursores»** ahora tiene que decir
**«Reunión de precursores y ancianos»**. Tres sitios:

1. El desplegable «Tipo de evento» al crear (ordenado alfabéticamente: ahora
   le toca otro lugar en la lista, entre las erres).
2. El título de la tarjeta del evento en la lista.
3. El renglón del evento en la tarjeta de «Programa» del Inicio.

**Lo que NO cambia:** la reunión con los precursores de la **visita del
superintendente de circuito** se sigue llamando «Reunión con los precursores»
(la crea la página de la Visita, no este desplegable).

---

## 3. La reunión de precursores y ancianos, solo para quien va

Antes de empezar: con el rol por defecto (anciano/administrador), **crea un
evento** de tipo «Reunión de precursores y ancianos» con fecha **dentro de la
semana en curso** (lunes a domingo), para que salga también en el Inicio.

Y crea **otro evento cualquiera** de esta semana —una «Campaña especial», por
ejemplo— que sirva de control: ese lo tiene que ver todo el mundo siempre.

### 3.a — Anciano / administrador (rol sembrado por defecto)

| Pantalla | Qué se espera ver |
|---|---|
| Inicio → tarjeta «Programa» | El renglón «Reunión de precursores y ancianos» |
| Próximos eventos | La tarjeta «Reunión de precursores y ancianos» |

### 3.b — Publicador raso (`cong_role = ['publisher']`, sin inscripciones)

| Pantalla | Qué se espera ver |
|---|---|
| Inicio → tarjeta «Programa» | **NO** aparece la reunión de precursores y ancianos. Sí siguen la reunión de entre semana, la de fin de semana y el evento de control |
| Próximos eventos | **NO** aparece la tarjeta de la reunión de precursores y ancianos. Sí el resto de eventos |

Las dos pantallas, en la misma sesión y con el mismo rol. **Este es el punto
que hay que mirar con más cuidado**: si desaparece en una y sigue en la otra,
el cambio está mal hecho y hay que decírmelo.

### 3.c — Precursor que NO es anciano

Rol `['publisher']` + la inscripción `FR` del apartado 0.

| Pantalla | Qué se espera ver |
|---|---|
| Inicio → tarjeta «Programa» | **SÍ** aparece la reunión de precursores y ancianos |
| Próximos eventos | **SÍ** aparece |

Si quieres apurar: repítelo con `enrollment: 'AP'` y una inscripción que
empiece el día 1 de **este** mes y acabe el último día de **este** mes — un
precursor auxiliar del mes en curso también tiene que verla. Y con una `AP`
que acabara **el mes pasado**, no.

### 3.d — Lo que NO se toca: la visita del superintendente

Con el rol de publicador raso puesto, y con una visita del superintendente
activada en la semana que se esté mirando:

| Pantalla | Qué se espera ver |
|---|---|
| Inicio → tarjeta «Programa» | La **«Reunión con los precursores»** de la visita **SÍ** se ve, como siempre. También la de ancianos y siervos ministeriales |
| Próximos eventos | La tarjeta de la semana de la visita, con su agenda día a día completa |

Si al quitar el rol desapareciera algo de la visita, es un fallo mío.

### 3.e — Un borde que conviene saber

«Anciano» se pregunta con `isElder`, que es lo que usa el resto de la
aplicación, y ese devuelve `false` en las **cuentas de bolsillo** aunque la
persona sea anciana. O sea: un anciano que entrara con cuenta de bolsillo no
vería esta reunión, salvo que además sea precursor.

No lo he cambiado porque es la misma regla con la que esa cuenta ya no ve
ninguna otra pantalla de anciano, y salirme de ella aquí crearía una excepción
que nadie más sigue. Si te encuentras con un caso real, dímelo y se ajusta.

### 3.f — El PDF

**No ha cambiado a propósito.** Con el botón de exportar de Próximos eventos
(solo lo ven los ancianos), el PDF **sigue llevando** la reunión de precursores
y ancianos. Lo digo aquí para que no parezca un olvido: quien exporta es un
anciano y decide qué imprime. Si prefieres que también salga fuera del PDF, se
cambia en dos líneas.

---

## 4. Nada de esto puede haber roto lo de al lado

Un repaso rápido, con el rol por defecto:

- **Inicio**, tarjeta «Programa»: las dos reuniones de la semana en su sitio y
  en orden por fecha, la cuenta atrás corriendo, la tira de la visita del
  superintendente si toca.
- **Próximos eventos**: la Conmemoración con su hora (o sin ella, si está
  marcada «hora por confirmar»), una asamblea con su foto de portada, sus
  botones de JW Library y Google Maps, y su agenda día a día.
- **Ayuda → Próximos eventos** (visible solo para ancianos): los dos párrafos
  nuevos —el del horario de cada día y el de quién ve la reunión de precursores
  y ancianos— se leen bien y no rompen la maquetación de la sección.

---

## 5. Punto 2 — lo que hay que MIRAR para decidir (no está implementado)

**No he tocado nada de esto.** La propuesta va aparte; esto es solo cómo ver el
problema con tus propios ojos antes de decidir.

Con el rol por defecto, crea una **«Campaña especial»** de **varios días** que
vaya del **1 al 30 de septiembre de 2026**. Después mira:

**En el Inicio, tarjeta «Programa»** (hay que mirarlo en septiembre; para verlo
hoy, crea la campaña abarcando la semana en curso y tres semanas más):

1. El renglón de la campaña sale **el primero de todos**, por delante de la
   reunión de entre semana y la de fin de semana. Se ordena por la fecha de
   inicio, y el 1 de septiembre es anterior a cualquier reunión de las semanas
   siguientes.
2. El bloque de fecha de la izquierda dice **«1 sep»** aunque estés mirando la
   semana del 22 al 28. Es una fecha que ya pasó.
3. Y se repite **las cinco semanas** que dura, idéntico.

**En Próximos eventos**: aquí la campaña ya se pinta bien —una sola línea,
«Todos los días», «1-30 de septiembre», «30 días»—. Pero eso está atado a la
categoría «Campaña especial», no a la duración. Para verlo, crea un evento
**«Personalizado»** de 30 días: pinta **30 filas** con su divisor entre ellas,
una tarjeta de varias pantallas de alto.

Esos cuatro son los defectos concretos sobre los que va la propuesta.

---

## 6. Los dos números

Al terminar mi trabajo:

- `npm run test:unit` → **460 pruebas en verde** (las mismas que al empezar).
- `npx tsc --noEmit -p tsconfig.json` → **129 errores** (los mismos
  preexistentes; ninguno nuevo).
