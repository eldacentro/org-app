# Verificación del encargo 8

Nada de esto se ha podido comprobar en pantalla: en esta máquina hay un solo
navegador y lo está usando otro agente. Lo que sigue es la lista exacta de lo
que hay que mirar, con la página, el ancho, el rol y lo que se espera ver.

Las tres comprobaciones automáticas sí están hechas y en verde:

| Comprobación | Base | Ahora |
| --- | --- | --- |
| `npm run test:unit` | 498 | **522** (24 nuevas, ninguna rota) |
| `npx tsc --noEmit -p tsconfig.json` | 129 errores | **129** |
| `npm run build` | termina | **termina** |
| `npm run lint` | — | 0 errores, 8 avisos (ninguno en lo tocado) |

---

## Cómo levantar la aplicación con datos de prueba

El modo de prueba **borra la base local y siembra una congregación ficticia**.
Solo arranca en `localhost` (hay un guardián que lo hace imposible en
`eldacentro.com`).

1. `.env.test.local` ya está en la raíz de este árbol de trabajo con
   `VITE_APP_MODE=TEST`. Hace falta porque `.env.local` fija
   `VITE_APP_MODE="PRODUCTION"` y gana sobre cualquier variable de entorno.
2. `npx vite --mode test` — el `--mode test` es lo que da prioridad a
   `.env.test.local`.
3. **Si se queda en el logotipo animado**, no está roto: `FeatureFlagsWrapper`
   está esperando un identificador de instalación de Firebase que no llega.
   Se desatasca desde la consola con
   `import('/src/services/states/app.ts').then(m => m.setIsOnline(false))`.
4. El enrutador es de **hash**: las páginas se abren con `#/ruta`, no con
   `/ruta`. Dentro de la aplicación, `location.hash = '#/...'` navega sin
   recargar — y eso importa, porque **al recargar se vuelve a sembrar la base
   y se pierde cualquier caso montado a mano**.
5. El usuario sembrado sale **sorteado**. Si toca uno sin el rol que hace
   falta, la ruta devuelve al panel de inicio sin decir nada: recargar hasta
   que salga uno que lo tenga (y volver a montar el caso de prueba).

Anchos: **402 px** (un iPhone 16 Pro; por debajo del corte `mobile400`, que
está en 400 px, no pasa nada distinto — 402 es sencillamente el ancho real que
más se usa) y **escritorio**, que empieza en **1200 px**.

---

## Parte 1 — La campaña en el inicio

### Cómo montar un evento de 30 días en modo de prueba

El sembrado de datos de prueba **no crea eventos**, así que hay que crearlo a
mano por la propia interfaz (que además es lo que se quiere comprobar):

1. Abrir `#/activities/upcoming-events` (menú: Actividades → Próximos
   eventos).
2. Botón de añadir evento. Solo sale con rol de **anciano o administrador**;
   si no aparece, recargar hasta que el usuario sorteado lo sea.
3. Rellenar:
   - **Categoría**: «Semana de campaña especial». Repetir después con
     «Personalizado» y un título escrito a mano — es el caso que hoy pinta 30
     filas y el que justifica que la regla sea por duración y no por
     categoría.
   - **Duración**: varios días.
   - **Fecha de inicio**: el día 1 del mes que viene.
   - **Fecha de fin**: el último día de ese mismo mes (30 o 31).
4. Guardar. Para ver la tira en la semana correcta hay que estar en una
   semana que el periodo cruce: si el evento es del mes que viene, se ve al
   entrar en la semana correspondiente, no hoy.

Un atajo útil si se quiere ver hoy mismo: poner el inicio **hace 3 días** y el
fin **dentro de 27**. Así el periodo cruza la semana actual y la tira sale sin
tener que cambiar de semana.

### Qué tiene que pasar en el inicio (`#/` — panel de inicio)

Con el evento de 30 días montado, en la tarjeta **«Programa»** de la sección
«Esta semana»:

| Se espera | Se espera NO ver |
| --- | --- |
| La **reunión de entre semana como PRIMER renglón** con su bloque de día | La campaña como primer renglón |
| La reunión de fin de semana como segundo renglón | Ningún renglón de la campaña con bloque de día |
| Una **tira fina** entre la cabecera «Programa» y el primer renglón | La fecha de inicio repetida («1 sep») estando en otra semana |
| En la tira: título del evento + «1-30 de septiembre · quedan 12 días» | Una píldora de hora en la tira |
| Fondo apenas teñido del color de acento, borde del acento | Azul congelado si el tema no es el azul |

Comprobaciones concretas:

1. **La tira no repite la fecha de inicio.** Avanzar de semana (o crear el
   evento cruzando la semana actual con inicio en el pasado): el número de
   días que quedan tiene que **bajar** cada semana; el rango «1-30 de
   septiembre» se queda igual porque es el rango, no una cita.
2. **El primer renglón vuelve a ser la reunión de entre semana**, las cinco
   semanas que dura la campaña. Este es el fallo principal del encargo.
3. **El último día** dice «último día», no «quedan 0 días».
4. **Si el periodo aún no ha empezado** pero cruza esta semana (por ejemplo,
   empieza el miércoles y hoy es lunes), dice «empieza en 2 días»; si empieza
   mañana, «empieza mañana» — nunca «empieza en 1 días».
5. **Cuando el periodo termina a media semana**, la tira sigue ahí pero
   **atenuada** (opacidad 0,55) y dice «terminado», igual que se atenúa una
   reunión que ya pasó. Desaparece al cambiar de semana.
6. **Pulsar la tira** lleva a Próximos eventos.
7. A **402 px**: la tira ocupa el ancho de la tarjeta menos 12 px de margen a
   cada lado; el texto del rango no se desborda ni parte el icono. A
   **escritorio**: la misma tira, sin cambiar de forma.
8. **Cambiar el esquema de color** (Ajustes → color de la aplicación) a verde
   o morado: la tira tiene que seguir al acento nuevo, no quedarse azul.

### Lo que NO puede cambiar (regresiones a vigilar)

Esto es lo importante de comprobar, porque el umbral toca a todos los eventos:

1. **Una asamblea de 2-4 días** sigue saliendo como **renglón normal** con su
   bloque de día en el inicio, y con **una fila por día** en Próximos eventos.
   No le sale tira.
2. **La semana del superintendente de circuito** (6 días) no cambia en nada:
   su tira propia sigue saliendo en el inicio y su agenda por días sigue en
   Próximos eventos.
3. **La Conmemoración** (un día) sigue igual.
4. Un evento de **exactamente 7 días** sigue siendo una cita (renglón normal).
   Uno de **8** ya es un periodo. Ese filo está fijado en
   `src/services/app/upcoming_events_period.test.ts`.

### Próximos eventos (`#/activities/upcoming-events`)

| Caso | Se espera |
| --- | --- |
| Evento «Personalizado» de 30 días | **Una sola línea** con «Todos los días», el rango y «30 días» — antes eran 30 filas |
| «Semana de campaña especial» de 7 días | Sigue con **una sola línea**, como hasta hoy (no se le ha quitado nada) |
| Asamblea de 3 días | Sigue con **tres filas**, una por día, con sus horas |
| Semana del superintendente | Sigue con su agenda de visita |

El **PDF de próximos eventos no cambia**: ya pintaba una fila por evento con
el rango.

---

## Parte 2 — «Última actualización» al pie y abrible

En **Programas semanales NO se toca nada**: ahí sigue enseñando solo la fecha.
Si algo cambia ahí, es un fallo.

### Las cinco páginas

| Página | Ruta |
| --- | --- |
| Responsabilidades | `#/congregation/responsabilidades` |
| Grupos de predicación | `#/field-service-groups` |
| Departamentos | `#/departments-schedule` |
| Reunión de entre semana | `#/midweek-meeting` |
| Reunión de fin de semana | `#/weekend-meeting` |

(Comprobadas contra `src/App.tsx`.)

### Qué se espera en cada una

1. **La línea ya NO está debajo del título.** Al abrir la página, lo segundo
   que se lee es el contenido, no «Última actualización».
2. **Está al final de la columna**, después del editor / de los grupos /
   de las responsabilidades, separada 24 px.
3. Es **pequeña y gris** (`label-small-regular`, `--grey-400`, opacidad 0,7),
   alineada a la izquierda, no ocupa todo el ancho.
4. Si hay campos con marca de tiempo, la línea lleva **un icono de historial a
   la izquierda y va subrayada**; al pasar el ratón por encima se aclara.
5. **Al pulsarla se abre un diálogo** titulado «Última actualización» con:
   - subtítulo «Qué se cambió en esta página y cuándo»;
   - una entrada por día, **lo más reciente arriba**, con los campos de ese
     día enumerados en español («Presidente y Oración de apertura») y debajo
     «el 3 de agosto»;
   - un único botón «Cerrar», abajo a la derecha.
6. Si **no hay nada con marca de tiempo** (una semana que nadie ha tocado),
   la línea sigue siendo una línea: **sin icono, sin subrayado, no se abre**.
   Comprobarlo yendo a una semana futura vacía en Departamentos.

### Por rol

| Rol | En la línea | En el diálogo |
| --- | --- | --- |
| **Anciano / administrador / coordinador / secretario** | fecha **y hora** y el nombre entre paréntesis | la lista de campos + un párrafo final: «El último cambio de la página lo hizo *Fulano*. La aplicación guarda cuándo se tocó cada campo, pero no quién tocó cada uno.» |
| **Publicador (no anciano)** | **solo la fecha** — sin hora y sin nombre | la lista de campos, **sin** el párrafo del nombre |

Esa diferencia por rol ya existía antes de este encargo y **tiene que
conservarse tal cual**. La forma rápida de comprobarla es abrir la reunión de
fin de semana con un usuario sorteado que no sea anciano.

### El caso que de verdad prueba el panel

En **Reunión de entre semana**, con una semana ya autocompletada:

1. Cambiar el **Presidente** por otro hermano.
2. Cambiar la **Oración de apertura**.
3. Bajar al pie y abrir el panel.
4. Tiene que decir **«Presidente y Oración de apertura»** y debajo **«el»** +
   la fecha de hoy — los dos juntos en la misma entrada, porque son del mismo
   día. No dos entradas separadas.
5. Cambiar ahora la **Lectura de la Biblia**: pasa a decir «Presidente,
   Oración de apertura y Lectura de la Biblia» en esa misma entrada.

### Lo que hay que mirar con lupa

1. **Campos compuestos.** «Presidente» son en realidad la sala principal y la
   auxiliar. Cambiar **solo la sala auxiliar** tiene que hacer que aparezca
   «Presidente» con la fecha de hoy, no con la vieja.
2. **Vista de datos.** Si la congregación tiene un grupo de idioma, cambiar
   una asignación **estando en el grupo** y volver a la vista principal: ese
   cambio **no** debe aparecer en el panel de la vista principal. Es el fallo
   que el filtro por `dataView` evita.
3. **Departamentos**: los nombres del panel son «Acomodadores», «Micrófonos»,
   «Multimedia», «Plataforma» — nunca las claves internas
   (`exterior__midweek`, `exterior__t2`).
4. **Responsabilidades**: en el panel salen los **departamentos** por su
   nombre. El cuerpo de ancianos y los cargos **no salen**, y es a propósito:
   no guardan marca de tiempo propia, solo la del registro entero, así que
   nombrarlos sería inventar un dato.
5. **Grupos de predicación**: en el panel sale el **nombre de cada grupo**.

### Anchos

- A **402 px**: el diálogo respeta los márgenes seguros de iOS (arriba y
  abajo) y, si la lista es larga (la reunión de entre semana tiene 18 campos
  posibles), **se puede recorrer** dentro del diálogo sin que el botón
  «Cerrar» quede debajo de la barra de inicio.
- A **escritorio (≥1200 px)**: la línea del pie queda debajo de la columna del
  editor, alineada a la izquierda, sin estirarse a todo el ancho.
- En **ambos**, el cuerpo de la página no debe poder desplazarse en
  horizontal.

### Tema oscuro

Abrir el panel con el tema oscuro puesto: el texto usa `--ink` / `--ink-2` y
el gris `--grey-400`, así que debe leerse igual de bien. Ningún color escrito
a mano.
