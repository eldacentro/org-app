# org-app — notas para trabajar en este repo

PWA de congregación ("Elda Centro") en React + TypeScript + Vite + MUI + Jotai,
con Dexie (IndexedDB) y sincronización E2E contra `sws2apps-api` (backend
hermano, repo separado).

## Antes de tocar cualquier página o componente de UI

**Lee [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) primero.** Documenta el sistema
de diseño real de la app (tokens de color/radio/sombra, escala tipográfica
completa, espaciado, qué componente de `src/components/` usar en vez de MUI en
crudo, reglas de mayúsculas en español, y el anti-patrón de doble anidado de
tarjetas). Se escribió tras una auditoría completa de consistencia visual de
toda la app (2026-07) y es la referencia para que cualquier página nueva o
modificada sea indistinguible en look & feel de las demás.

Si vas a crear o editar un diálogo, botón, switch, checkbox, banner de
aviso, o cualquier pieza de UI — comprueba primero en ese documento si ya
existe el componente/token correcto antes de reimplementar algo con MUI en
crudo y `sx` a mano.

## Sincronización E2E — cuidado especial

Este repo ha sufrido más de un incidente real de pérdida de datos por bugs en
la capa de sincronización (ver commits y memorias de sesiones anteriores).
Cualquier cambio en `src/services/worker/backupUtils.ts`,
`src/services/dexie/*`, o la lógica de fusión/`updatedAt` merece revisión
extra cuidadosa antes de desplegar — un bug ahí se propaga a **todos los
dispositivos de la congregación**, no solo al que lo introdujo.

## Comandos útiles

- `npx tsc --noEmit -p tsconfig.json` — typecheck. El proyecto tiene un
  puñado de errores preexistentes de tipos en componentes con
  styled-components/emotion (ej. `card_header`, `date_picker`,
  `multi_select`) no relacionados con la lógica de negocio — no son tuyos a
  menos que los hayas causado tú.
- Preview con datos de prueba: `npm run preview` sirve `dist/` en el puerto
  4050 con un modo de "sembrado" de datos ficticios para verificar cambios
  de UI sin tocar datos reales.
