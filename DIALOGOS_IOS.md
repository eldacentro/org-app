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

1. Cambiar `import { Dialog } from '@mui/material'` por
   `import Dialog from '@components/dialog'`.
2. El componente ya da `fullWidth`, el radio, el fondo y la sombra: quitar de
   `PaperProps` todo lo que solo repita eso. **El `PaperProps` de quien llama
   SE SUMA al del componente**, no lo reemplaza, así que lo que se deje se
   aplica encima.
3. Comprobar que el pie de botones sigue el patrón de la app: Cancelar a la
   izquierda, la acción principal a la derecha.
4. **Abrirlo en el navegador a 402 px de ancho** y comprobar que no se ha
   descolocado nada.

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
