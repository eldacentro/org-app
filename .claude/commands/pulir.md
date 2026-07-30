---
description: Repaso profundo de una pantalla (y sus diálogos) contra el sistema de diseño
---

# Objetivo

Que **cualquier pantalla de org-app sea indistinguible de las demás**: mismas
formas, mismos estados, mismo movimiento, mismos componentes. No parches, no
"ya que estoy lo dejo parecido": o la pieza que hace falta ya existe y se usa,
o no existe y se crea UNA vez y la usan todos.

Objetivo de esta sesión: **$ARGUMENTS**

Si no se ha indicado nada, elige tú la siguiente pantalla sin repasar y dilo
antes de empezar.

---

## Antes de tocar nada

1. Lee **`DESIGN_SYSTEM.md`** entero. Es la referencia, no un resumen.
   Especialmente §2.3 forma por ROL, §2.4 movimiento, §2.5 estados,
   §6.4 etiquetas, §6.5 campo+botón, §6.6 plurales.
2. Lee **`CLAUDE.md`** (reglas de sincronización E2E: hay incidentes reales de
   pérdida de datos, no toques `services/worker/` ni `services/dexie/` sin
   necesidad).
3. Mira `src/components/` **antes** de escribir un solo `sx`. Casi todo lo que
   vas a necesitar ya está.

---

## El método (esto es lo que más importa)

Lo aprendido a base de fallar en los repasos anteriores. No lo saltes:

- **El grep miente.** Da falsos negativos con `padding: '10px 16px'` (dos
  valores), con estilos en ficheros `.styles`, y con los `sx` dentro de
  diálogos. Úsalo para inventariar, nunca para concluir.
- **Abre CADA diálogo.** Sistemáticamente, lo peor estaba en diálogos. Una
  pantalla no está repasada hasta que has abierto todos los suyos.
- **Mide en el DOM, no a ojo.** Alturas, radios, colores calculados,
  posiciones. Varios fallos reales solo se ven midiendo: dos controles con el
  mismo `top` y `bottom` al píxel, un borde que pasa de 1 a 4px según el
  estado, un icono con `fill` negro heredado.
- **Comprueba en modo oscuro.** Es donde revientan los colores fijos. Se
  cambia con `localStorage.setItem('theme','"dark"')` y recarga.
- **Comprueba en móvil, tablet y escritorio.** Varias veces el arreglo de un
  ancho rompía otro.
- **Si no hay datos para verlo, créalos por la propia interfaz.** Y si la
  pantalla no es accesible en modo de prueba, mira si hay una memoria que
  explique cómo sembrarla antes de inventar un andamio.

---

## El catálogo de defectos

Búscalos todos, en este orden. Los cinco primeros aparecen en **todas** las
pantallas repasadas hasta ahora:

1. **Movimiento que miente.** `translateY(-Npx)`, `scale(...)` o sombra de
   hover en algo que NO se pulsa. Y al revés: lo que sí se pulsa tiene que
   reaccionar, pero con la capa de estado (`--state-hover` / `--state-pressed`),
   nunca levantándose.
2. **El mismo trabajo escrito N veces.** Llevamos encontrados 7 dialectos de
   "chip elegido", 10 de "sección plegable" y 8 de "etiqueta de estado". Antes
   de estilar algo, busca si ya existe el componente.
3. **Radios sueltos.** Todo radio sale de `--shape-*` y se elige por ROL
   (§2.3), no por tamaño. Y ojo a la concentricidad: si algo va DENTRO de otra
   cosa, `radio interior = radio exterior − hueco`.
4. **Tipografía a pelo.** `fontSize` y `fontWeight` en `sx` o `style`. Todo
   texto lleva una clase de la escala.
5. **Colores fijos.** `#hex`, `rgba(...)` y sobre todo `var(--token, #hex)`: el
   respaldo nunca se usa si el token existe, y si no existiera pinta un color
   que ignora el tema oscuro. Excepción legítima: lo que va SOBRE un mapa,
   porque las teselas siempre son claras — pero coméntalo.
6. **Componentes de MUI en crudo** donde la app tiene el suyo: `Button`,
   `Switch`, `Select`, `TextField`, `Tabs`, `Checkbox`, `Badge`, `Dialog`,
   `TimePicker`, `DatePicker`. Y peor todavía: controles **nativos del
   navegador** (`<input type="time">`, `<input type="color">`), que se ven
   distintos en cada sistema operativo.
7. **Desalineación por altura.** Dos causas que ya han aparecido dos veces
   cada una y no se ven a ojo:
   - Un campo mide 56px **solo si lleva la etiqueta dentro**. Un `Select`
     suelto no la lleva y sale más bajo que el `TextField` de al lado.
   - Un contenedor flex sin `alignItems` **estira** el botón (40px) al alto
     del campo (56px). Entonces comparten borde superior e inferior al píxel,
     el ojo los lee como un solo objeto, y los dos radios distintos cantan.
     Lo mismo hace `flex: 1` del `TimePicker` compartido, que gana al `width`.
8. **Dos convenciones de etiqueta mezcladas** en la misma pantalla: unas
   fuera del campo y otras dentro. Elige una por pantalla y justifícala (a
   veces la de fuera es obligatoria: un grupo de casillas no puede llevar la
   etiqueta dentro de ningún campo).
9. **Accesibilidad.** `<Box onClick>` en vez de `<button>` (ni teclado ni
   lector de pantalla), iconos sin `color` explícito dentro de un `IconButton`
   de MUI (el `color` del padre no llega al `fill` del SVG), botones de solo
   icono sin `aria-label`.
10. **Texto.** Plurales concatenados (`${n} territorios` escribe "1
    territorios"), rótulos que dicen lo mismo dos veces, códigos que no
    entiende nadie (una "(C)" suelta), y mayúsculas donde la app usa caja
    normal.

---

## Incoherencias entre pantallas (no solo dentro de una)

Esto es lo que más se nota al usar la app y lo que un repaso página a página
se salta. Cuando encuentres **la misma tarea resuelta de dos maneras**,
únificala:

- **Reordenar.** Hay dos mecanismos para el mismo trabajo: arrastrar con
  `react-sortablejs` (Grupos de predicación) y flechas arriba/abajo
  (Documentos → gestionar categorías, y Responsabilidades). Hay que decidir
  cuál es EL de la app y pasarlo todo a ese. Ten en cuenta que una lista que
  además hace scroll en el móvil es delicada de arrastrar.
- **Elegir de una lista, confirmar, borrar, avisar, estado vacío,** cabecera
  de sección, contador… mismo criterio: una sola manera.

---

## Puntos de partida conocidos

Ya detectados y sin arreglar. No te limites a estos:

- **Documentos**: sigue teniendo la uñita a la izquierda, y su diálogo de
  categorías usa flechas para ordenar.
- **Territorios**: los diálogos de **Zonas** y de **Etiquetas** se quedaron a
  medias (solo se les pasaron los radios).
- **Exhibidores → Crear turno**: "Hora de inicio" y "Hora de finalización" son
  `<TextField type="time">`, o sea el control **nativo del navegador**, no el
  `TimePicker` de la app.
- Pantallas aún sin repasar a fondo: Personas, Informes, Discursos,
  Programas de fin de semana, Asistencia, Ayuda, Ajustes.

---

## Flujo de trabajo

1. **Una pantalla cada vez.** Inventario primero (qué defectos y cuántos),
   luego arreglar, luego verificar.
2. **Enséñamelo antes de subir.** Capturas o medidas concretas de lo que
   cambió. Explica el *porqué* de cada cambio, no solo el qué.
3. **Solo al aprobar, subir.** Commits separados por tema, mensaje en español
   explicando la causa del fallo, no solo el síntoma.
4. Si un arreglo se repite en 3+ sitios, **haz el componente** y actualiza
   `DESIGN_SYSTEM.md` con la regla.

---

## Guardarraíles

- `npx tsc --noEmit -p tsconfig.json`, `npm run test:unit`, `npm run build` y
  `npx eslint` tienen que pasar. Hay errores de tipos **preexistentes**:
  compruébalo con `git stash` antes de atribuírtelos, y dilo.
- **Nada de andamios olvidados.** Si expones algo en `window` para poder
  verlo, guárdalo con `typeof window !== 'undefined'` (vitest corre en Node y
  si no tumba los tests) y **quítalo antes de commitear**. Revisa
  `git status` al final: solo deben aparecer ficheros del alcance.
- No cambies comportamiento de datos ni de sincronización mientras arreglas
  aspecto. Si encuentras un fallo de lógica, **repórtalo**, no lo mezcles.
- Si algo no lo puedes ver, **dilo**. No cambies a ciegas 100 valores en un
  fichero de 4.000 líneas y lo des por verificado.
