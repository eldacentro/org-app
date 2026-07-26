/**
 * Pausa de la sincronización con una ficha de persona abierta.
 *
 * Mientras alguien edita una ficha, sincronizar puede traer una versión remota
 * y pisarle lo que está escribiendo — por eso el ciclo periódico y el sync
 * instantáneo se saltan los turnos cuando la ruta es la de una persona.
 *
 * El problema: esa pausa no caducaba. Un móvil que se queda con una ficha
 * abierta en el bolsillo, o un ordenador con esa pestaña de fondo, dejaba de
 * sincronizar POR COMPLETO —ni subía ni bajaba— durante horas o días, sin que
 * nadie lo notara. Y quien tiene la app abierta todo el día en esa pantalla es
 * justo quien más al día debería estar.
 *
 * Ahora la pausa solo vale mientras haya alguien de verdad delante: si pasan
 * unos minutos sin tocar nada, la sincronización se reanuda sola. Nadie está
 * escribiendo, así que no hay nada que pisar.
 */

const IDLE_RESUME_MS = 5 * 60 * 1000;

let lastInteraction = Date.now();

const markInteraction = () => {
  lastInteraction = Date.now();
};

if (typeof window !== 'undefined') {
  // `capture` para enterarse aunque el componente detenga la propagación, y
  // `passive` para no entorpecer el desplazamiento.
  const options = { capture: true, passive: true } as const;

  window.addEventListener('pointerdown', markInteraction, options);
  window.addEventListener('keydown', markInteraction, options);
  window.addEventListener('touchstart', markInteraction, options);
}

/** ¿Hay una ficha de persona abierta Y alguien delante ahora mismo? */
export const isPersonDetailInUse = (pathname: string) => {
  if (!/\/persons\/.+/.test(pathname)) return false;

  return Date.now() - lastInteraction < IDLE_RESUME_MS;
};
