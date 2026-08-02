# Los catorce diálogos que no pasan por el componente

## El objetivo

`src/components/dialog` pone los márgenes seguros de iOS —muesca arriba, barra
de inicio abajo— y el alto máximo. Catorce pantallas usan el `Dialog` de MUI en
crudo y se lo saltan: en un iPhone su borde se mete debajo de la muesca.

Hay que migrarlas al componente. **Doce de las catorce.**

## Lo que hay que saber antes de empezar (o se rompe)

El 2 de agosto se intentó atajar con una regla global en `index.css` que ponía
los márgenes a todo `.MuiDialog-container > .MuiPaper-root`. **Salió mal y hubo
que revertirla**: alcanzaba también a los diálogos que van A SANGRE y les metía
márgenes donde no debe haberlos. El de ver un territorio —un mapa a pantalla
completa— quedó con un marco feo alrededor.

De ahí la única regla que importa aquí:

> **Un diálogo a pantalla completa NO lleva márgenes.** Ahí el que tiene que
> respetar la muesca es el relleno del contenido, no el marco del diálogo.

Por eso no vale una regla que los pille a todos: hay que ir uno a uno.

## Los catorce, separados

**NO TOCAR — van a pantalla completa (`fullScreen`):**

| Fichero | Qué es |
|---|---|
| `features/territories/DialogVerTerritorio.tsx` | El mapa de un territorio |
| `features/documentos/DialogVerDocumento.tsx` | El visor de documentos |

Si alguna vez se les cuida la muesca, será con relleno interior, nunca con
margen exterior. Y comprobándolo en pantalla.

**MIGRAR — son diálogos normales (doce):**

```
features/circuit_visit/index.tsx
features/circuit_visit/publish_dialog/index.tsx
features/congregation/field_service_groups/group_item/header/index.tsx
features/congregation/limpieza/index.tsx          (el de editar un día)
features/departments_schedule/editor/index.tsx
features/departments_schedule/publish_dialog/index.tsx
features/my_profile/security/index.tsx
features/territories/dialogs/DialogEditarTerritorio.tsx
features/territories/responsables/AsignacionesTab.tsx
pages/departments_schedule/index.tsx
pages/exhibitors/index.tsx
pages/predicacion_salidas/index.tsx
```

## Cómo migrar uno

**NO es cambiar el import.** Esto se comprobó el 2 de agosto y conviene saberlo
antes de estimar: `components/dialog` solo acepta `open`, `onClose`, `children`,
`sx` y `PaperProps`, y **envuelve a sus hijos en un `DialogContent` propio**.

Los diálogos crudos están escritos con la estructura de MUI —`DialogTitle`,
`DialogContent`, `DialogActions`—. Metidos tal cual dentro del componente
quedan con un `DialogContent` dentro de otro: doble relleno, y el pie de
botones fuera de su sitio. Cuántas de esas etiquetas tiene cada uno:

    exhibitors/index.tsx              27
    circuit_visit/publish_dialog       9
    congregation/limpieza/index.tsx    9
    my_profile/security/index.tsx      0   ← este sí es casi directo

Así que cada migración es **rehacer el interior del diálogo**, no cambiar una
línea:

1. Cambiar el import a `@components/dialog`.
2. Quitar `DialogTitle` / `DialogContent` / `DialogActions` y escribir el
   contenido con las piezas de la app: el título con `Typography className="h2"`
   y el pie con la fila de botones estándar —Cancelar a la izquierda, la acción
   principal a la derecha—.
3. De `PaperProps` quitar lo que solo repita lo que ya da el componente (ancho,
   radio, fondo, sombra). **Se SUMA al del componente**, no lo reemplaza, así
   que lo que se deje se aplica encima.
4. **Abrirlo en el navegador a 402 px** y comprobar que no se ha descolocado
   nada. Uno por uno; no vale con mirar dos y suponer el resto.

Empezar por `my_profile/security`, que no usa la estructura de MUI y sirve para
dejar el patrón claro con poco riesgo.

## Cómo comprobar la muesca

Chrome no tiene muesca. Se le inyecta:

```js
await page.addStyleTag({ content: `
  .MuiDialog-container > .MuiPaper-root {
    margin-top: max(16px, 59px) !important;
    margin-bottom: max(16px, 34px) !important;
  }` });
```

Y se mide con `getBoundingClientRect()` que el borde superior quede por debajo
de 59 y el inferior por encima de `innerHeight - 34`. Así se comprobó el
componente compartido el 2 de agosto.

## De uno en uno, y con un commit por diálogo

No los doce de una tanda. Cada uno es una pantalla distinta con su contenido, y
lo que hoy sabemos es que un cambio amplio sin mirar cada pantalla es
exactamente como se rompió el de Territorios.

Un commit por diálogo, diciendo cuál y qué se comprobó.

## Estado

- [x] Los catorce identificados y separados en «migrar» y «no tocar»
- [ ] Los doce migrados
