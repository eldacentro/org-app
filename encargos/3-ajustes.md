# Encargo 3 — Ajustes de congregación y seguridad

**Riesgo: medio. Se puede hacer en paralelo con los encargos 4, 5, 6 y 7.**

Cuatro cosas sueltas de la página de Ajustes. Dos de ellas parecen inocentes y
no lo son: una cambia los nombres de todos los programas y la otra toca el
cifrado. Las dos llevan una comprobación previa **obligatoria**.

---

## 1. La exportación a PDF pasa a ser cosa de cada uno

Hoy hay dos interruptores:

- En Ajustes de congregación: **«Habilitar la exportación de programas e informes
  a PDF»** (`tr_pdfExportEnabled`, en `locales/es-ES/congregation.json:591`).
- En Mi cuenta: **«Habilitar exportación a PDF para mi cuenta»**
  (`features/my_profile/app_settings/index.tsx:87`).

**Quita el de congregación.** Que quede solo el individual, y que **le aparezca a
cualquiera que pueda exportar un programa** — los responsables y asignados
correspondientes, no solo a quien lo tenga hoy. Cada uno decide si quiere ver
los botones de exportar, sin pedirle permiso a nadie.

Comprueba antes **quién depende hoy del interruptor de congregación**: busca todo
lo que lo lea y asegúrate de que al quitarlo nadie pierde la exportación que ya
tenía. Si el de congregación está apagado y el individual también, al quitar el
primero la gente **no** debe quedarse sin poder activarlo.

## 2. Quitar «Usar nombres para mostrar en los programas de reuniones»

Carlos no sabe qué hace y no lo quiere. **Sí hace algo, y hay que mirarlo antes
de quitarlo:**

- Sustituye el nombre completo por el «nombre para mostrar» de cada persona en
  los programas (`displayNameMeetingsEnableState`, en `states/settings.ts:235`,
  leído en `states/settings.ts:198-201`).
- **Al activarlo escribe en la base de datos**: genera y guarda un nombre para
  mostrar en toda persona que no lo tenga
  (`features/congregation/settings/meeting_forms/display_name/useDisplayName.tsx`).

**Antes de tocar nada, averigua cómo está hoy en la congregación real.** Si está
encendido, quitarlo cambia el nombre en **todos** los programas de golpe, y eso
hay que decírselo a Carlos antes, no después. Si está apagado, no hace nada y se
puede quitar sin más.

Al quitarlo: fuera el interruptor de Ajustes de congregación **y** el de los
ajustes rápidos de Reunión de fin de semana
(`features/meetings/weekend_editor/quick_settings/index.tsx`, el componente
`DisplayName`). El ajuste guardado se queda quieto en la base de datos — no lo
borres, que viaja en la sincronización.

## 3. También sale de los ajustes rápidos: el acceso a Discursos salientes

En ese mismo archivo —`weekend_editor/quick_settings/index.tsx`— está
`OutgoingTalkAccess`. **Quítalo de ahí.** Su sitio es la página de Discursos
salientes, y ahí lo pone el encargo 2; tú solo lo retiras.

**Ese archivo es tuyo y de nadie más en esta tanda.** Los dos componentes que
quitas de él son estos dos y ninguno más.

## 4. El aviso del código de acceso

En `locales/es-ES/congregation.json:451` (`tr_codelessAccessDesc`) hay un párrafo
que termina así:

> «ATENCIÓN: al activarlo, el código de acceso queda guardado en el servidor
> (cifrado), de modo que los datos compartidos —programas, nombres y
> asignaciones— dejan de tener cifrado de extremo a extremo.»

**Quita esa última frase.** El resto del texto se queda: explica lo que hace y
que la llave maestra nunca se entrega, que es lo útil.

Mira si la misma frase está en otros idiomas del repo y quítala también.

## 5. Cambiar la llave maestra no puede ser tan fácil

Hoy se cambia sin fricción. La llave maestra cifra los datos sensibles de la
congregación; cambiarla mal es un incidente serio.

**Propón a Carlos qué protecciones poner antes de implementarlas.** Lo que yo
pondría, para que lo valore:

- Un diálogo que **explique la consecuencia real**, no un «¿estás seguro?»: quién
  deja de poder entrar y qué tiene que hacer cada uno después.
- **Escribir la llave actual** para poder cambiarla. Que no baste con tener la
  sesión abierta.
- **Escribir la llave nueva dos veces.** Una llave mal tecleada no da un error:
  da datos ilegibles.
- Un aviso de que **todos los dispositivos van a tener que volver a
  introducirla**, con cuántos hay ahora mismo.
- Dejarlo **anotado** —quién la cambió y cuándo—, que es lo único que permite
  entender después qué pasó.

Mira antes `services/encryption/` y sus pruebas (`encryption.test.ts`), que ya
cubren el reparto entre código de acceso y llave maestra: **si tocas algo de ahí,
esas pruebas tienen que seguir pasando.**

## Lo que NO se toca

- La lógica de cifrado en sí. Aquí se añade fricción en la interfaz, no se
  cambia cómo se cifra.
- La sincronización (`services/worker/*`, `services/dexie/*`).
- `pages/outgoing_speakers/index.tsx` — es del encargo 2.

## Cómo se comprueba

1. En modo de prueba (`vite --mode test --port 4137`, enrutador de **hash**),
   página por página: que los interruptores que se quitan no dejan un hueco ni
   un separador suelto en la lista de ajustes.
2. Que quien podía exportar sigue pudiendo, y que quien no podía puede activarlo
   desde Mi cuenta.
3. `npm run test:unit` (base **456**, incluye las de cifrado) y
   `npx tsc --noEmit` (base **129 errores preexistentes**).

## Reglas de la casa

- Rama propia. Un cambio, una comprobación en pantalla, un commit. Nunca
  `git add -A`.
- `DESIGN_SYSTEM.md` antes de tocar interfaz; componentes de `src/components`.
- No abrevies en la interfaz: «Número», no «Nro.».
- Datos de prueba en todo lo que circule.
