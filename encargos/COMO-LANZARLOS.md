# Cómo lanzar los encargos

---

## Lo primero, que es lo que casi se me escapa

**Varias sesiones a la vez NO pueden trabajar en la misma carpeta.** Comparten
los archivos: si dos sesiones editan a la vez, se pisan; y si una cambia de rama,
se la cambia a las otras por debajo. Las ramas no protegen de eso.

La solución de git para esto son los **worktrees**: la misma historia de git, pero
cada rama en su propia carpeta. Cada sesión vive en la suya y no se entera de las
demás.

## Preparar una carpeta por encargo

Para cada encargo que quieras lanzar (aquí el 4 de ejemplo):

```bash
cd /Users/carlossacajr./projects/org-app && git worktree add ../org-app-e4 -b encargo/4-materiales && cp .env.local .env.test.local ../org-app-e4/ && cd ../org-app-e4 && npm install
```

Eso crea `~/projects/org-app-e4`, copia los dos archivos de configuración —que no
viajan en git— e instala las dependencias.

> **Aviso**: cada carpeta se lleva **1 GB** de dependencias. Con cuatro son 4 GB.
> Si vas justo de espacio, lanza dos y luego otros dos.

Cámbiale el número y el nombre a cada uno:

| Encargo | Carpeta | Rama |
|---|---|---|
| 3 · Ajustes | `../org-app-e3` | `encargo/3-ajustes` |
| 4 · Materiales | `../org-app-e4` | `encargo/4-materiales` |
| 5 · Eventos | `../org-app-e5` | `encargo/5-eventos` |
| 6 · Retoques | `../org-app-e6` | `encargo/6-retoques` |
| 7 · Exportar | `../org-app-e7` | `encargo/7-exportar` |

## Qué le dices a cada sesión

Abres una sesión de Claude Code **en esa carpeta** y pegas esto, cambiando solo
el número:

> Lee `encargos/4-materiales.md` y hazlo entero, siguiendo todo lo que dice,
> incluida la sección de cómo se comprueba.
>
> Estás en un worktree, en la rama `encargo/4-materiales`. **No cambies de rama y
> no toques `main`.** Hay otras sesiones trabajando a la vez en otros encargos:
> respeta la sección «Lo que NO se toca» al pie de la letra, porque esos archivos
> son de otro.
>
> Antes de empezar, lee también `CLAUDE.md` y `DESIGN_SYSTEM.md`.
>
> Cuando termines, haz commit de todo en tu rama pero **no la juntes con `main`
> ni hagas push**. Al acabar, dime en dos párrafos qué hiciste y qué comprobaste.

## En qué orden

**Primera tanda — los cuatro independientes, a la vez:** 4, 5, 6 y 7. Ninguno
comparte un solo archivo con otro. Si te ves con ganas, mete también el 3.

**Después, y de uno en uno, conmigo delante:**

- **Encargo 1 (el reparto).** Empieza con una propuesta escrita que tienes que
  aprobar tú, no con código. Y ya lleva dentro el diseño de la rueda.
- **Encargo 2 (publicar).** Cuando el 1 esté cerrado. Los dos cambian cómo se
  siente el mismo botón de la misma barra; si salen a la vez no hay forma de
  saber cuál rompió qué.

## Cuando una sesión termine

Vuelves a la carpeta de siempre y juntas esa rama:

```bash
cd /Users/carlossacajr./projects/org-app && git merge encargo/4-materiales
```

**De una en una, y probando la app entre cada una.** Si dos ramas tocaron algo
parecido, el conflicto sale aquí, que es donde se puede mirar con calma.

Y cuando ya esté juntada y probada, se limpia la carpeta:

```bash
git worktree remove ../org-app-e4
```

## Si prefieres no complicarte

Todo esto es para ir en paralelo. **Si te da igual la velocidad, es más simple ir
de uno en uno** en la carpeta de siempre: una rama, el encargo, juntar, y a por el
siguiente. Sin worktrees, sin copiar nada, sin 4 GB.

Lo paralelo gana tiempo; lo secuencial gana tranquilidad.
