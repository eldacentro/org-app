/**
 * Permiso para recargar sin que salte el aviso del navegador.
 *
 * La app avisa al cerrar la pestaña si hay cambios sin subir ("puede que no se
 * guarden los cambios"). Eso está bien cuando cierra una persona, pero es
 * horrible cuando la recarga la decide la propia app —al aplicar una
 * actualización— porque aparece un diálogo del navegador que nadie ha pedido y
 * que asusta con razón.
 *
 * Nada se pierde en esas recargas: lo pendiente está guardado en la base de
 * datos del dispositivo y se sube en cuanto se pueda. Así que antes de una
 * recarga nuestra se levanta esta bandera y el aviso se calla.
 */

let allowed = false;

export const allowUnload = () => {
  allowed = true;
};

export const isUnloadAllowed = () => allowed;
