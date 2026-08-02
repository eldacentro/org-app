# Los diálogos que no pasaban por el componente

## El objetivo

`src/components/dialog` pone los márgenes seguros de iOS —muesca arriba, barra
de inicio abajo— y el alto máximo. Unos cuantos usaban el `Dialog` de MUI en
crudo y se lo saltaban: en un iPhone su borde se metía debajo de la muesca.

**Hecho.** Trece diálogos migrados, uno por commit y comprobado uno a uno.

## Lo que hay que saber (o se rompe)

El 2 de agosto se intentó atajar con una regla global en `index.css` que ponía
los márgenes a todo `.MuiDialog-container > .MuiPaper-root`. **Salió mal y hubo
que revertirla**: alcanzaba también a los diálogos que van A SANGRE y les metía
márgenes donde no debe haberlos. El de ver un territorio —un mapa a pantalla
completa— quedó con un marco feo alrededor.

De ahí la única regla que importa aquí:

> **Un diálogo a pantalla completa NO lleva márgenes.** Ahí el que tiene que
> respetar la muesca es el relleno del contenido, no el marco del diálogo.

Por eso no vale una regla que los pille a todos: hay que ir uno a uno.

## Los que siguen con el Dialog de MUI, y por qué

**NO TOCAR — van a pantalla completa (`fullScreen`):**

| Fichero | Qué es |
|---|---|
| `features/territories/DialogVerTerritorio.tsx` | El mapa de un territorio |
| `features/documentos/DialogVerDocumento.tsx` | El visor de documentos |

Si alguna vez se les cuida la muesca, será con relleno interior, nunca con
margen exterior. Y comprobándolo en pantalla.

**`wrapper/app_modal`** tampoco: no es un diálogo de contenido, es el modal de
arranque de la app.

## Los trece migrados

```
features/circuit_visit/publish_dialog/index.tsx        Publicar la visita
features/congregation/limpieza/index.tsx               Editar el día
features/departments_schedule/publish_dialog/index.tsx Publicar el mes
features/territories/dialogs/DialogEditarTerritorio.tsx Editar territorio
features/territories/responsables/AsignacionesTab.tsx  Editar la nota
pages/exhibitors/index.tsx                             4: asignar turno,
                                                       publicar el mes,
                                                       ajustes del mes,
                                                       crear/editar turno
pages/predicacion_salidas/index.tsx                    5: publicar el mes,
                                                       editar salida,
                                                       ajustes del mes,
                                                       exportar a PDF,
                                                       ajustes de la semana
```

El encargo original nombraba doce ficheros, y seis de ellos no tenían ningún
`Dialog` de MUI: solo PINTABAN diálogos que viven en otro sitio
(`circuit_visit/index.tsx`, `field_service_groups/group_item/header`,
`my_profile/security`, `pages/departments_schedule`), o ya estaban migrados
(`departments_schedule/editor`). En cambio Exhibidores y Salidas contaban como
uno cada uno y llevaban cuatro y cinco dentro. La cuenta buena es la de arriba.

## Cómo se migró uno

**NO es cambiar el import.** `components/dialog` solo acepta `open`, `onClose`,
`children`, `sx` y `PaperProps`, y **envuelve a sus hijos en un `DialogContent`
propio**. Los diálogos crudos están escritos con la estructura de MUI
—`DialogTitle`, `DialogContent`, `DialogActions`—; metidos tal cual quedan con
un `DialogContent` dentro de otro: doble relleno y el pie fuera de su sitio.

Cada migración fue **rehacer el interior**:

1. Cambiar el import a `@components/dialog`.
2. Quitar `DialogTitle` / `DialogContent` / `DialogActions` y escribir el
   contenido con las piezas de la app: el título con `Typography className="h2"`
   y el pie con la fila de botones estándar —Cancelar a la izquierda, la acción
   principal a la derecha—.
3. De `PaperProps` quitar lo que solo repita lo que ya da el componente (ancho,
   radio, fondo, sombra). **Se SUMA al del componente**, no lo reemplaza, así
   que lo que se deje se aplica encima. En Editar territorio se dejó a
   propósito el `maxWidth: 1100px`: es de dos columnas y no cabe en los 560 de
   la escala normal.
4. Abrirlo en el navegador a 402 px y comprobarlo.

**Dos cosas que se aprendieron migrando:**

- **`disableAutoStretch` en el pie.** Sin él, en móvil cada botón pide el 100%
  y flexbox los encoge: dos botones quedan bien así, que es como está el resto
  de la app. Con TRES —Exhibidores "Restaurar fijos", Salidas
  "Autocompletar"— no caben sin partirse el texto, y ahí sí hay que dejarlo.
- **`flexWrap: 'wrap'` en el pie.** Con dos botones a ancho completo, `wrap`
  los parte en dos líneas, uno encima de otro. Si venía del original, quitarlo.

## Cómo comprobar la muesca

Chrome no tiene muesca. Se le inyecta —y hay que inyectar **también el alto
máximo**, no solo los márgenes: si no, un diálogo largo PARECE desbordarse
cuando en el móvil de verdad no lo hace, porque allí `env()` encoge las dos
cosas a la vez—:

```js
await page.addStyleTag({ content: `
  .MuiDialog-container > .MuiPaper-root {
    margin-top: max(16px, 59px) !important;
    margin-bottom: max(16px, 34px) !important;
    max-height: calc(100% - max(32px, 93px)) !important;
  }` });
```

Y se mide con `getBoundingClientRect()` que el borde superior quede por debajo
de 59 y el inferior por encima de `innerHeight - 34`.

En los largos hay que comprobar además que **SE RECORREN**: el que se desplaza
no es el Paper sino el `DialogContent` de dentro, así que se mide
`dc.scrollHeight > dc.clientHeight` y, bajando del todo, que los botones del
pie queden por encima de `innerHeight - 34`.

## Cómo se llegó a cada uno en modo de prueba

Alguno no sale sin más:

- **Territorios** no vive en Dexie sino en Firestore, y en prueba no hay red:
  hay que sembrar los átomos de Jotai a mano con un andamio temporal.
- **Publicar** (Departamentos, Exhibidores, Salidas) no aparece en un mes ya
  pasado: hay que irse a uno futuro. Agosto de 2026 ya cuenta como pasado.
- **Exportar a PDF** depende de un interruptor que en los datos de prueba viene
  apagado.

## Estado

- [x] Los que había, identificados y separados en «migrar» y «no tocar»
- [x] Los trece migrados, un commit por diálogo y comprobado a 402 px
