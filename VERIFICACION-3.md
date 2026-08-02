# Verificación del encargo 3 — Ajustes de congregación y seguridad

Rama `worktree-agent-afe2d10ab99cec142`.

Números base al empezar y al terminar: **460 pruebas** (`npm run test:unit`) y
**129 errores** de `npx tsc --noEmit -p tsconfig.json`. No se ha movido ninguno.

Cómo levantar la app con datos de prueba:

```
npx vite --mode test --port 4137
```

Enrutador de **hash**: las direcciones llevan `#`, por ejemplo
`http://localhost:4137/#/congregation-settings`.

Anchos que se citan abajo (los cortes reales del tema):
móvil **375 px**, tableta **768 px**, escritorio **1280 px**.

---

## Punto 1 — La exportación a PDF pasa a ser cosa de cada uno

**Hecho.** Commit «Ver los botones de exportar deja de ser un permiso de
congregación».

Qué se ha cambiado, en corto: el interruptor de congregación ya no existe (ni
el componente ni los textos). Queda el de Mi cuenta y **lo ve todo el mundo**,
sin importar el rol. El valor viejo de congregación se sigue leyendo, pero
**solo como valor de partida** de quien nunca haya tocado el suyo, para que
nadie se quede de golpe sin los botones que tenía.

### 1.1 El interruptor de congregación ya no está — ancho 1280 px

- Página: **Ajustes de congregación** → `#/congregation-settings`.
- Sección **«Materiales de reunión, formularios y programas»**.
- Se espera ver, en ese bloque y en este orden: «Mostrar las fechas exactas en
  los programas de reuniones de entre semana», «Mostrar canciones en los
  programas de reuniones de fin de semana», «Usar nombres para mostrar en los
  programas de reuniones». Después, separado, el bloque de formato de nombre /
  formato de fecha / primer día de la semana.
- **NO se debe ver**: «Habilitar la exportación de programas e informes a PDF».
- **NO se debe ver**: un hueco vacío, una línea de separación suelta ni un
  salto de espacio mayor entre «Usar nombres para mostrar…» y el bloque de
  «Formato de nombre». La separación entre los dos bloques tiene que ser la
  misma de antes (los interruptores de un bloque van a 16 px entre sí y el
  bloque siguiente arranca a 24 px).
- Repetir el mismo vistazo a **768 px** y a **375 px**: en móvil los textos de
  ayuda pasan debajo, pero no debe quedar ninguna fila en blanco.

### 1.2 El interruptor personal lo ve todo el mundo — ancho 1280 px y 375 px

- Página: **Mi cuenta** → `#/user-profile`, bloque **«Ajustes de la
  aplicación»**.
- Se espera ver, en este orden: «Sincronización automática» (con su
  desplegable de intervalo), «Cambio automático de tema», **«Habilitar
  exportación a PDF para mi cuenta»**, y por último «Esquema de color».
- Lo importante: **sale con cualquier rol**. Antes solo lo veían ancianos,
  administradores y el que lleva Departamentos. Ahora tiene que salir también
  con una cuenta de **publicador** y con una cuenta **de bolsillo (pocket)**.
- **NO se debe ver**: que el interruptor desaparezca al entrar con un rol
  pequeño, ni que quede el hueco de un interruptor que no se pinta.

### 1.3 Que el interruptor haga lo que dice

Con el interruptor personal **encendido**, tienen que salir los botones de
exportar en las páginas a las que llegue esa cuenta:

| Página                   | Dirección                      | Qué aparece y desaparece                                                         |
| ------------------------ | ------------------------------ | -------------------------------------------------------------------------------- |
| Reunión de fin de semana | `#/weekend-meeting`            | botón «Exportar» de la barra de título, y dentro del diálogo el botón «Exportar» |
| Departamentos            | `#/departments-schedule`       | botón «Exportar» de la barra de título                                           |
| Exhibidores              | `#/exhibitors`                 | botón «Exportar» de la barra de título                                           |
| Salidas de predicación   | `#/predicacion-salidas`        | botón «Exportar» de la barra de título                                           |
| Próximos eventos         | `#/activities/upcoming-events` | botón «Exportar» de la barra de título                                           |

**La reunión de entre semana funciona distinto y así estaba ya** (no lo he
cambiado): el botón «Exportar» de la barra de título sale **siempre**, y lo
que cambia es lo de dentro del diálogo. Con el interruptor encendido salen las
dos casillas (S-140 y S-89) y las dos pestañas de plantilla; con el
interruptor apagado sale solo la plantilla de la S-89, para que se puedan
seguir imprimiendo las hojas de asignación. Comprobar los dos estados.

Con el interruptor **apagado**, ninguno de los botones de la tabla debe
aparecer, y la barra de título **no debe quedar descolocada**: los demás
botones («Autorrelleno», «Publicar») se corren a su sitio sin dejar un hueco
donde estaba «Exportar». Mirar esto sobre todo a **375 px**, que es donde la
barra se apila.

### 1.4 La comprobación que de verdad importa: nadie pierde nada

En el navegador donde esté la cuenta real, **antes de tocar nada**:

1. Consola del navegador → pestaña **Aplicación** → **IndexedDB** → base
   `organized` → tabla **`app_settings`** → único registro → `cong_settings` →
   **`pdf_export_enabled`** → `value`.
2. Si ese `value` es `true`: al desplegar, todo el mundo **sigue viendo** los
   botones de exportar sin hacer nada (es el valor de partida). El que no los
   quiera, los apaga en Mi cuenta.
3. Si ese `value` es `false`: nadie los ve, y **cualquiera** puede encenderlos
   desde Mi cuenta — que es justo lo que antes no podía hacer un publicador ni
   el que lleva Departamentos… salvo que el ajuste de congregación estuviera
   encendido.

Dicho de otro modo: no hay ningún rol que antes pudiera exportar y ahora no
pueda. El que sí cambia es el que **antes no podía activarlo** (publicador,
cuenta de bolsillo, siervo con un solo documento): ahora sí.

Nota para Carlos, por si prefiere otra cosa: esa lectura del valor viejo de
congregación es una decisión que se puede revertir en dos líneas
(`pdfExportEnabledPersonalState`, en `src/states/settings.ts`). Si prefieres
que el ajuste viejo no pinte nada y que todo el mundo parta de «apagado»,
se quita el `?? settings.cong_settings.pdf_export_enabled?.value` y ya está.

---

## Punto 2 — «Usar nombres para mostrar en los programas de reuniones»

## ⛔ NO EJECUTADO — hace falta una decisión de Carlos antes

No he tocado ni una línea de este punto. Aquí está el porqué y qué hay que
mirar.

### 2.1 Por qué no se puede hacer a ciegas

El ajuste vive en `cong_settings.display_name_enabled`, cifrado de extremo a
extremo con los datos de la congregación. **No tengo acceso a los datos reales
de Elda Centro**, así que no puedo saber si hoy está encendido o apagado. Y la
diferencia entre un caso y otro es enorme:

- **Si está apagado**: no hace nada. Se quita el interruptor y no cambia ni un
  nombre en ningún sitio.
- **Si está encendido**: hoy todos los programas de reuniones muestran «S. Mike»
  en vez de «Mike Stevens». Quitarlo cambia el nombre **de golpe en todos los
  programas**, y eso hay que decidirlo antes, no descubrirlo después.

### 2.2 Cómo mirar cómo está hoy (tres formas, la primera basta)

1. **En la propia app, sin tocar nada.** Ajustes de congregación →
   `#/congregation-settings` → sección «Materiales de reunión, formularios y
   programas» → el interruptor **«Usar nombres para mostrar en los programas de
   reuniones»**. Su posición ES el valor. **Mirar y no tocar**: encenderlo
   escribe en la base de datos (ver 2.4).
2. **Por el efecto secundario.** Personas → ficha de cualquier persona: el
   campo **«Nombre para mostrar»** solo se pinta si el ajuste está encendido
   (`features/persons/basic_info/index.tsx`, línea 160). Lo mismo en Ajustes de
   congregación → superintendente de circuito.
3. **En la base de datos.** Consola → Aplicación → IndexedDB → `organized` →
   `app_settings` → `cong_settings.display_name_enabled` → el registro cuyo `type`
   sea `main` (o el identificador del grupo de idioma, si se mira desde un
   grupo) → campo **`meetings`**.

Ojo: el ajuste es **por vista de datos**. La congregación principal (`main`) y
cada grupo de idioma tienen su propio valor, así que si hay grupos de idioma
hay que mirarlos todos.

### 2.3 Qué cambiaría exactamente si se apaga

El valor lo leen **más de treinta sitios**. Los que se ven:

- Los programas de entre semana y de fin de semana (nombres de todas las
  asignaciones, estudiante y ayudante incluidos).
- Los desplegables para elegir a alguien al asignar.
- Los **PDF** de los dos programas y las **hojas S-89**.
- El programa **publicado** — el que ven los publicadores y el del enlace
  compartido: se genera con el nombre en el momento de publicar
  (`features/meetings/schedule_publish`). Lo ya publicado **no cambia** hasta
  que se vuelva a publicar; lo nuevo saldría con el nombre completo.
- Departamentos, Exhibidores, Salidas de predicación, discursos salientes,
  catálogo de oradores, panel de la visita del superintendente de circuito,
  historial de asignaciones y el resumen de ausencias.

Lo que **no** cambia: las listas de consulta que ya usan siempre el nombre
completo (grupos de predicación, limpieza, responsabilidades, territorios) y
los formularios oficiales, que lo llevan obligatoriamente.

### 2.4 La trampa: encenderlo escribe en la base de datos

`features/congregation/settings/meeting_forms/display_name/useDisplayName.tsx`
hace dos cosas al **encenderlo**:

1. Guarda el ajuste.
2. Recorre **todas las personas activas** y, a la que no tenga nombre para
   mostrar, le **genera y le guarda uno** («Stevens Mike» → «S. Mike») con
   `dbPersonsBulkSave`. Eso viaja en la sincronización a toda la congregación.

**Apagarlo no deshace esa escritura.** Los nombres para mostrar generados se
quedan guardados en cada persona; simplemente dejan de usarse. Por eso la
comprobación del punto 2.2 dice _mirar y no tocar_: un clic de más para
«comprobar» deja rastro en la tabla de personas de todo el mundo.

### 2.5 La decisión que falta, y es de fondo

El encargo dice dos cosas que, tal cual, no encajan:

- «El ajuste guardado se queda quieto en la base de datos — no lo borres.»
- «Si está encendido, quitarlo cambia el nombre en todos los programas.»

Si solo se retiran los dos interruptores y el valor sigue leyéndose, no cambia
ningún nombre: lo que pasa es que el ajuste **queda congelado para siempre en
lo que estuviera**, sin forma de volver atrás. Para que los nombres vuelvan a
ser completos hay que hacer que la app **deje de leerlo**, no solo de
ofrecerlo.

Entonces, hay dos maneras de hacerlo y hay que elegir:

**A. Retirar el interruptor y dejar de leer el ajuste** (los nombres completos
vuelven en todos los programas). Es lo que pide `PLAN_MEJORAS.md` cuando dice
«apagarlo cambia el nombre en todos los programas de golpe». Se hace poniendo
`displayNameMeetingsEnableState` a `false` fijo, en `src/states/settings.ts`,
y quitando los dos interruptores. El campo de la base de datos se queda
intacto y sigue viajando en la sincronización, como pide el encargo. Es un
cambio de una línea con efecto en toda la app.

**B. Retirar solo los interruptores y seguir leyendo el ajuste.** No cambia
nada visible, pero el ajuste queda clavado en su valor actual sin manera de
cambiarlo. Solo tiene sentido si hoy está **apagado**.

Mi recomendación: **mirar primero** (2.2). Si está apagado, A y B dan lo
mismo y se hace A, que además deja el código más simple. Si está encendido,
avisar a los que llevan los programas antes de desplegar, porque el lunes los
nombres serán otros.

### 2.6 Lo que quedaría por tocar cuando se decida

- `src/states/settings.ts` — `displayNameMeetingsEnableState` (línea 235).
- `src/features/congregation/settings/meeting_forms/index.tsx` — quitar
  `<DisplayName />`.
- `src/features/meetings/weekend_editor/quick_settings/index.tsx` — quitar
  `<DisplayName />` (ese archivo ya está tocado por el punto 3 de este
  encargo).
- Borrar `src/features/congregation/settings/meeting_forms/display_name/`.
- Quitar `tr_useDisplayNameMeeting` y `tr_displayNameMeetingDesc` de los
  idiomas.
- **No tocar**: el campo `display_name_enabled` del esquema ni de
  `backupUtils.ts` (viaja en la sincronización y hay una conversión del
  formato viejo que se tiene que quedar).

---

## Punto 3 — El acceso a Discursos salientes sale de los ajustes rápidos

**Hecho.** Commit «El acceso a Discursos salientes se decide en su propia
página».

### 3.1 La rueda de la reunión de fin de semana — ancho 1280 px

- Página: **Reunión de fin de semana** → `#/weekend-meeting` → icono de la
  **rueda** en la barra de título.
- Se espera ver, de arriba abajo y con sus líneas de separación:
  1. Día y hora de la reunión, conductor del estudio (si es editor de fin de
     semana), «Mostrar canciones en los programas de reuniones de fin de
     semana», «Usar nombres para mostrar en los programas de reuniones».
  2. **«Mostrar advertencia de asignación repetida – mensual»** — y nada más
     en ese bloque.
  3. «Preferencias de asignación» con su lista.
- **NO se debe ver**: «Mostrar programa de oradores salientes a todos los
  usuarios».
- **NO se debe ver**: dos líneas de separación seguidas, ni una línea al final
  del todo, ni un bloque vacío donde estaba el interruptor. Tienen que quedar
  **dos** líneas de separación en todo el panel, las mismas que antes.
- Comprobarlo con una cuenta de **coordinador de discursos públicos** (es la
  que antes lo veía) y con una que no lo sea: los dos tienen que ver
  exactamente el mismo panel.
- Repetir a **375 px**: el panel se abre a pantalla casi completa; que no
  quede un espacio en blanco entre la advertencia mensual y «Preferencias de
  asignación».

### 3.2 El interruptor sigue existiendo donde le toca

- Página: **Ajustes de congregación** → `#/congregation-settings` → sección
  **«Privacidad de la congregación»**.
- Se espera ver **«Mostrar programa de oradores salientes a todos los
  usuarios»**, con su texto de ayuda, y que **se pueda cambiar** si la cuenta
  es coordinador de discursos públicos (si no, sale en modo solo lectura).
- Es decir: el interruptor **no se ha perdido**, solo ha salido de la rueda.

---

## Punto 4 — El aviso del código de acceso

**Hecho.** Commit «El aviso del código de acceso decía lo que nadie iba a
leer».

### 4.1 El texto — ancho 1280 px

- Página: **Ajustes de congregación** → `#/congregation-settings` → sección
  **«Privacidad de la congregación»** → interruptor **«Acceso sin código de
  acceso»** (solo sale con cuenta de administrador y con la congregación
  conectada).
- El texto de ayuda tiene que terminar **exactamente** así:

  > …al entrar con Google, la app se lo entrega sola a cualquier hermano ya
  > aprobado en la congregación. Quien maneja datos sensibles sigue
  > escribiendo su llave maestra, que nunca se entrega.

- **NO se debe ver** la frase que empezaba por «ATENCIÓN: al activarlo, el
  código de acceso queda guardado en el servidor (cifrado)…».
- **NO se debe ver** un punto suelto, un espacio doble ni una línea huérfana
  al final del párrafo.
- A **375 px**: el texto ocupa ahora dos o tres líneas menos; comprobar que el
  interruptor y su ayuda siguen alineados como los de arriba y abajo.

La frase estaba en **dos** idiomas del repo, `es-ES` y `en`; los dos quedan
igualados. Ningún otro idioma tenía la clave `tr_codelessAccessDesc`.

---

## Punto 5 — Blindar el cambio de la llave maestra

## ⛔ NO IMPLEMENTADO — propuesta para que Carlos la valore

El encargo pide expresamente proponer antes de tocar. Aquí está la propuesta,
con lo que he encontrado al mirar el código de verdad.

### 5.1 Lo que hay hoy

Ajustes de congregación → «Privacidad de la congregación» → «Llave maestra de
la congregación» → botón **«Cambiar llave maestra»**. Solo administradores.
El diálogo (`congregation_privacy/master_key_change/`) tiene ya tres campos:
llave actual, llave nueva y repetir la nueva.

Y aquí están los cuatro agujeros, por orden de gravedad:

1. **La llave actual se pide y no se comprueba.** El campo existe, pero
   `useMasterKeyChange.tsx` nunca lo usa: para descifrar la llave del servidor
   usa la que ya está guardada en el dispositivo (`congMasterKeyState`).
   Se puede escribir cualquier cosa en ese campo y el cambio se hace igual.
   Es un campo que aparenta una seguridad que no existe.
2. **Si algo no cuadra, no pasa nada y no se dice nada.** Cuando falta un
   campo, la nueva tiene menos de 16 caracteres o las dos nuevas no coinciden,
   la función hace `return` sin más: el botón «Guardar» no responde y no sale
   ningún mensaje. Quien lo usa no sabe si ha fallado o si no ha pulsado bien.
3. **Los demás dispositivos se quedan rotos y sin avisar.** Cada
   sincronización descifra la llave del servidor con la que tiene guardada
   (`services/worker/backupUtils.ts`). Con la llave cambiada, eso falla — pero
   la app **no pide la llave nueva**, porque solo la pide cuando el campo local
   está vacío (`useCongregationEncryption.tsx`). Resultado: al resto de
   hermanos con llave maestra les deja de funcionar la sincronización sin que
   nadie les diga por qué. (Los que entren en un dispositivo nuevo o hayan
   cerrado sesión sí la piden bien: la guardada se descarta sola al fallar.)
4. **No queda constancia de nada.** Ni quién la cambió, ni cuándo. Si algo se
   tuerce, no hay por dónde empezar.

El texto del diálogo tampoco ayuda: «Te sugerimos cambiar el código solo si se
sospecha acceso no autorizado» — no dice qué le va a pasar a la gente.

### 5.2 Lo que propongo, por orden de valor

**a) Comprobar de verdad la llave actual.** Es un cambio de dos líneas y es lo
que más aprieta: comparar lo escrito con `congMasterKeyState` antes de seguir
(o, mejor, intentar descifrar con ella la llave del servidor, que es la prueba
real). Si no coincide, mensaje claro en el campo. Sin esto, el campo miente.

**b) Decir qué va a pasar, con nombres y números.** Antes de guardar, un paso
de confirmación que diga, en lugar de «¿estás seguro?»:

> Vas a cambiar la llave maestra de la congregación. **N hermanos** con llave
> maestra tendrán que escribir la nueva la próxima vez que abran la app, en
> **cada uno de sus dispositivos**. Hasta que lo hagan, su aplicación dejará de
> sincronizarse. Apunta la llave nueva antes de continuar: si se pierde, no
> hay forma de recuperar los datos cifrados.

El número **N sale del servidor y es real**: `apiCongregationUsersGet` ya
devuelve los usuarios de la congregación con sus sesiones abiertas
(`CongregationUserType.sessions`); se cuentan las sesiones de los que tengan
un rol de `VIP_ROLES`, que son exactamente los que necesitan llave maestra.
Y se puede enseñar la lista de nombres, que es lo que de verdad hace pensar.

**c) Que el botón diga por qué no se puede pulsar.** Mensaje bajo cada campo:
«Escribe la llave maestra actual», «Al menos 16 caracteres», «Las dos no
coinciden». Nada de un botón que no reacciona.

**d) Arreglar el agujero 3, que es el que va a doler.** Si la sincronización
falla al descifrar la llave maestra, que la app **borre la llave guardada y
vuelva a pedirla**, en vez de fallar en silencio. Esto es lo único de la
propuesta que toca fuera del diálogo, y toca cerca de la sincronización, así
que iría en su propio commit y con las pruebas de cifrado delante.

**e) Dejarlo anotado.** Guardar quién y cuándo. Lo más barato: un campo nuevo
en los ajustes de congregación (`cong_master_key_changed_by` /
`_changed_at`), que viaja solo en la sincronización y se puede enseñar debajo
del botón: «Cambiada por Carlos S. el 2 de agosto de 2026». Si se quiere que
quede en el servidor y no se pueda tocar desde el cliente, hace falta tocar el
backend (`sws2apps-api`), y eso ya es otro encargo.

### 5.3 Lo que NO haría

- **No tocar `services/encryption/`.** Nada de lo de arriba lo necesita: es
  fricción en la interfaz y una comprobación, no un cambio de cifrado. Las
  pruebas de `encryption.test.ts` (el reparto código de acceso / llave
  maestra) seguirían pasando sin tocarlas.
- **No re-cifrar nada.** Cambiar la llave maestra no re-cifra los datos: solo
  vuelve a envolver con la contraseña nueva la llave real, que sigue siendo la
  misma. Conviene decirlo en el diálogo, porque es la razón de que el cambio
  sea instantáneo y de que baste con que cada uno escriba la nueva.

**Orden que propongo si Carlos dice que sí:** (a) + (c) juntos, que son el
diálogo y no tienen riesgo; luego (b), que necesita una llamada al servidor;
luego (d), con cuidado; y (e) al final, o nunca, si parece de más.
