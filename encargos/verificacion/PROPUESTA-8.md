# Encargo 8 — lo que decide Carlos

Dos cosas del encargo estaban marcadas como «lo decide Carlos». **No están
implementadas.** En las dos se ha elegido el comportamiento más conservador y
se ha dejado el hueco preparado, no cerrado.

---

## 1. ¿La tira aparece también la semana ANTERIOR?

### Lo que hace hoy

La tira sale **solo en las semanas que el periodo cruza de verdad**. Si la
campaña va del 1 al 30 de septiembre, la primera semana en que se ve es la que
contiene el 1 de septiembre.

### Lo que sí hay ya, y quizá basta

Dentro de esa primera semana, si el periodo **todavía no ha empezado**, la
tira ya dice **«empieza en 2 días»** (o «empieza mañana»). Es decir: el aviso
anticipado existe, pero llega como muy pronto el lunes de la propia semana de
inicio.

Con una campaña que empieza en lunes, eso significa cero aviso previo. Con una
que empieza a mitad de semana, entre uno y seis días.

### La opción a decidir

Extenderlo a la semana anterior: la tira saldría también la semana de antes,
siempre con «empieza en X días» (entre 8 y 14).

**A favor:** una campaña de un mes se prepara, no se improvisa; enterarse el
lunes de que empieza el miércoles llega tarde.

**En contra:** una semana entera con una tira que habla de algo que aún no
pasa, encima de las dos reuniones que sí pasan. Es exactamente el ruido que
este encargo venía a quitar, solo que más suave.

**Punto medio, si se quiere:** que salga la semana anterior **solo desde el
jueves**, cuando la semana en curso ya está resuelta y lo siguiente que se
mira es la que viene.

**Dónde se toca:** `periodoDeLaSemana` en `src/pages/dashboard/index.tsx` — la
condición `inicio <= endOfWeek && fin >= startOfWeek`. Bastaría con adelantar
`endOfWeek` siete días.

---

## 2. ¿Qué pasa si coinciden dos periodos?

### Lo que hace hoy

Se enseña **uno solo: el que termine antes**. El segundo no aparece en la
tarjeta del inicio, pero sigue entero y sin cambios en **Próximos eventos**.

Se ha elegido así porque apilar dos tiras era una propuesta, no una decisión
tomada, y la tarjeta del inicio es justo lo que este encargo venía a
descongestionar. «El que termine antes» porque es el que tiene la información
más urgente: quedan menos días.

### El coste honesto de esta elección

Es una pérdida de visibilidad respecto a hoy: hoy los dos eventos salen (como
renglones, mal, pero salen). Con esto, uno de los dos deja de verse en el
inicio.

En la práctica es raro —dos periodos de ocho días o más solapados—, pero
«raro» no es «nunca»: una campaña de mes y un curso de idioma largo pueden
coincidir.

### Las opciones

1. **Como está**: una sola tira, la que termine antes.
2. **La propuesta original**: apilar como mucho **dos**, ordenadas por fecha
   de fin. Tres o más seguiría sin caber, y habría que decidir otra vez.
3. **Todas**: la tarjeta se estira. Se descarta salvo que Carlos diga lo
   contrario — es volver al problema.

**Dónde se toca:** el mismo `periodoDeLaSemana` en
`src/pages/dashboard/index.tsx`. Ya devuelve la lista ordenada por fecha de
fin y se queda con `.at(0)`; pasar a dos es cambiar eso por `.slice(0, 2)` y
recorrer el resultado en el JSX de la tira.

---

## 3. Una decisión pequeña que se ha tomado sola, por si no gusta

El encargo decía que en Próximos eventos «el caso especial que hoy está atado
a la categoría `SpecialCampaignWeek` **se sustituye** por el umbral».

Se ha hecho **suma en vez de sustitución**: se resume por rango si el evento
es un periodo (≥8 días) **o** si su categoría es «Semana de campaña especial».

El motivo: una campaña especial de exactamente **siete días** es una cita por
el umbral, así que con la sustitución literal habría pasado de tener una línea
de resumen —que es lo que tiene hoy y funciona— a pintar **siete filas con su
hora cada una**. Eso no lo pedía nadie y empeoraba algo que ya estaba bien.

El objetivo del encargo se cumple igual: el evento «Personalizado» de treinta
días deja de pintar treinta filas.

Si Carlos prefiere la sustitución literal, es quitar el segundo término de
`esPeriodo` en
`src/features/activities/upcoming_events/upcoming_event/index.tsx`.

---

## Lo que NO se ha tocado, a propósito

- **Ningún campo nuevo en el esquema sincronizado.** El «quién» por cada campo
  es un encargo aparte. El panel de «Última actualización» usa el `updatedAt`
  que ya existe en cada campo y dice en voz alta, dentro del propio panel, que
  el autor solo se guarda a nivel de registro entero.
- **Programas semanales**: su línea de «Última actualización» se queda como
  estaba.
- `services/worker/*`, `services/dexie/*`, `pages/outgoing_speakers`,
  `features/meetings/schedule_publish` y los `publish_dialog`: hay otro agente
  trabajando en el sistema de publicar.
