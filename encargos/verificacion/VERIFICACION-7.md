# Verificación 7 — El diálogo de exportar reuniones de entre semana

Dos commits en la rama `worktree-agent-adb63ff6b611e0df6`:

- `9d94160ed` — se va la plantilla oficial del S-140 y con ella el selector.
- `e87e98b55` — «Exportar» avisa cuando no hay nada que exportar (corregido
  después: el botón no se apaga, ver el apartado 3).

Números: `npm run test:unit` **460 en verde**, `npx tsc --noEmit` **129 errores**
(los mismos de siempre). Ninguno se ha movido.

---

## 0. Cómo llegar al diálogo

```
npm run dev -- --mode test --port 4137
```

Enrutador de **hash**. La app siembra datos de mentira al arrancar y **necesita
internet** para bajarse los programas: sin red no hay semanas, y sin semanas la
página de entre semana no enseña el botón «Exportar».

**Primero hay que encender el interruptor.** En los datos de prueba la
exportación a PDF viene apagada (`pdf_export_enabled: false` en el esquema), y
con ella apagada el diálogo enseña media cara: sin casillas de S-140 y S-89.

1. `http://localhost:4137/#/congregation-settings`
2. Sección **«Materiales de reunión, formularios y programas»**
3. Interruptor **«Habilitar la exportación de programas e informes a PDF»** → ON
4. `http://localhost:4137/#/midweek` → botón **«Exportar»** de la barra de la
   página.

(La cuenta de prueba es admin + anciano, así que también vale el interruptor
personal de **Mi cuenta → Ajustes de la aplicación**; el resultado es el mismo.)

---

## 1. LA COMPROBACIÓN QUE IMPORTA — el S-140 no ha cambiado ni un pelo

El objetivo del encargo era quitar una opción del diálogo, **no tocar el PDF**.
Hay que demostrarlo con dos archivos, no con confianza.

### Antes

En otra terminal, sobre el código **anterior** al cambio:

```
git worktree add /tmp/s140-antes f7cc2f958        # el commit previo a los dos míos
cd /tmp/s140-antes
ln -s <ruta>/org-app/node_modules node_modules
cp <ruta>/org-app/.env.local .
cp <ruta>/org-app/.env.test.local .
npm run dev -- --mode test --port 4138
```

Ahí, en el diálogo de exportar:

> ⚠️ **En el build viejo hay que elegir «Estándar» a mano.** La preferencia de
> fábrica era `S140_default`, o sea **la oficial**. Si no se toca la pestaña
> «Plantilla S-140», el PDF que sale es el impreso oficial y la comparación no
> vale para nada. Pestaña **«Plantilla S-140» → «Estándar»**.

- Marcar **solo** la casilla del S-140.
- Elegir un rango de **varias semanas** (mejor 4 o más, para que el PDF pase de
  página y se vea el pie y la numeración).
- Exportar y guardar el archivo.

### Después

Lo mismo en el puerto 4137, con el código nuevo: mismo rango exacto de semanas,
misma casilla, y **sin tocar ningún ajuste entre las dos exportaciones** (el
nombre de la congregación, «mostrar nombre corto», la fecha exacta de la reunión
y el número de salas entran todos en el PDF).

### La comparación

Los dos archivos deben llamarse igual —`Programa de la reunión de entre semana
2026-… a 2026-….pdf`— y salir **idénticos**: mismo número de páginas, mismo
contenido, misma maquetación.

```bash
# número de páginas
python3 -c "import re;d=open('antes.pdf','rb').read();print(len(re.findall(rb'/Type\s*/Page[^s]',d)))"
python3 -c "import re;d=open('despues.pdf','rb').read();print(len(re.findall(rb'/Type\s*/Page[^s]',d)))"

# texto, si hay poppler instalado
pdftotext -layout antes.pdf - > /tmp/a.txt
pdftotext -layout despues.pdf - > /tmp/b.txt
diff /tmp/a.txt /tmp/b.txt      # tiene que salir vacío
```

Los bytes NO van a coincidir (react-pdf mete la fecha de creación), así que la
autoridad final es **abrirlos los dos y mirarlos página por página**.

---

## 2. El diálogo, por dentro

Con el interruptor **encendido**:

- [ ] Ya **no hay barra de pestañas**. Antes había dos —«Plantilla S-140» y
      «Plantilla S-89»—; ahora el selector del S-89 se muestra directamente,
      con su rótulo «Plantilla S-89» encima, igual que se veía cuando la
      exportación estaba apagada.
- [ ] **No aparece por ningún lado la lámina del S-140 oficial** ni sus dos
      botones de radio.
- [ ] El **selector del S-89 sigue entero**: sus dos opciones («1 hoja de
      asignación» y «4 hojas de asignaciones»), sus dos láminas, el botón de
      pantalla completa al pasar por encima, y la elección se recuerda al
      cerrar y volver a abrir.
- [ ] Las dos casillas de arriba —S-140 y S-89— siguen donde estaban.

---

## 3. El botón «Exportar» nunca se apaga, pero dice lo que falta

**Ojo, esto cambió después de escribir la lista.** El primer arreglo apagaba
el botón cuando no había nada marcado. Carlos lo corrigió: el botón tiene que
estar siempre activo, y las dos casillas vuelven a estar para elegir qué sale
— marcar el programa no arrastra las hojitas, ni al revés.

Con el interruptor de PDF **encendido** (ahora está en Mi cuenta, no en los
ajustes de congregación):

- [ ] El diálogo enseña **las dos casillas**: S-140 y S-89. Empiezan sin marcar.
- [ ] «Exportar» sale **activo**, y sigue activo pase lo que pase.
- [ ] Pulsarlo **sin semanas** → aviso «Faltan las semanas», y **el diálogo NO
      se cierra**.
- [ ] Elegir semanas y pulsarlo **sin marcar ninguna casilla** → aviso «No has
      elegido qué exportar», y **el diálogo NO se cierra**. Esto es el fallo
      que se venía a arreglar: antes se pulsaba, no pasaba nada y nadie decía
      por qué.
- [ ] Marcar **solo el S-140** → sale el programa y **ninguna hojita**.
- [ ] Marcar **solo el S-89** → salen las hojitas y **ninguna hoja de programa**.
- [ ] Marcar las dos → salen las dos cosas.
- [ ] Con semanas y casilla marcadas pero un rango **sin nada dentro** → aviso
      «No hay nada que exportar», nombrando lo que falta.
- [ ] «Cancelar» sigue funcionando siempre.

> Comprobado en pantalla el 3 de agosto: solo S-140 → un archivo de 41.025
> bytes; solo S-89 → un archivo de 19.226 bytes. Cada casilla saca lo suyo y
> nada más.

## 3 bis. Con el interruptor APAGADO — esto antes NO funcionaba

Vuelve a `#/congregation-settings` y **apaga** la exportación a PDF. Entra otra
vez en el diálogo desde `#/midweek`.

- [ ] No hay casillas: solo el rango de semanas y el selector del S-89.
- [ ] Elegir un rango de semanas → «Exportar» se **enciende**.
- [ ] Pulsarlo **genera de verdad las hojas S-89** (una sola hoja, o un `.zip`
      si se eligió «1 hoja de asignación» y hay varias).

> En ese modo el botón **nunca exportaba nada**: la comprobación de dentro
> exigía una casilla marcada y en esa pantalla no hay casillas que marcar. Se
> arregló al escribir una sola vez qué se va a generar. Si aquí no sale ningún
> archivo, mira que el rango tenga semanas con estudiantes asignados: sin
> asignaciones no hay S-89 que imprimir (eso sí es de siempre, y sigue siendo
> silencioso — está en la propuesta de rediseño).

---

## 4. Quien tuviera guardada la oficial

La preferencia vivía en `localStorage`, clave `organized_template_S140`. Ahora
ya no se lee: quien la tuviera cae en la Estándar sin enterarse.

Para comprobarlo, en la consola del navegador **antes** de abrir el diálogo:

```js
localStorage.setItem('organized_template_S140', 'S140_default');
```

- [ ] El diálogo abre **sin error** (nada en la consola).
- [ ] Exportar el S-140 da la plantilla **Estándar**, no el impreso oficial.

---

## 5. A 402 px

Con el interruptor encendido, ventana a **402 px** de ancho:

- [ ] El diálogo respeta la muesca. La receta de `DIALOGOS_IOS.md`: inyectar
      márgenes **y alto máximo** a la vez, y medir con `getBoundingClientRect()`
      que el borde de arriba quede por debajo de 59 y el de abajo por encima de
      `innerHeight − 34`.
- [ ] El contenido **se recorre** (el que se desplaza es el `DialogContent`, no
      el Paper) y los dos botones del pie quedan siempre por encima de
      `innerHeight − 34`.
- [ ] Al desaparecer la barra de pestañas el diálogo es más corto que antes; las
      láminas del S-89 siguen centradas y sin desbordar a lo ancho.
- [ ] En escritorio, lo mismo.

---

## 6. Un cabo suelto que decide Carlos

`src/views/meetings/midweek/S140/default/` —el impreso oficial— **sigue en el
repo**, exportado en `src/views/index.ts` como `TemplateS140`, pero ya no lo
llama nadie. No se ha borrado a propósito: el encargo dice que la generación del
PDF no se toca salvo lo mínimo, y `PDF_DESIGN_SYSTEM.md` protege los formularios
oficiales. Si quieres que se vaya, es un borrado limpio de esa carpeta, de la
línea de `views/index.ts` y de la imagen `src/assets/img/S140_default.png` (que
también se quedó sin usuario). Las cadenas de traducción del selector
(`tr_templateS140`, `tr_templateS140DefaultName`, `tr_templateS140AppNormalName`,
`tr_templateS140DescUp2Weeks`) tampoco se han tocado: viven en 54 idiomas y
vienen de arriba.
