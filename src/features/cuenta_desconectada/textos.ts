import { ResultadoReconexion } from '@states/app';

/**
 * Qué decir de cada forma en que puede acabar un intento de reconectar.
 *
 * En un solo sitio para que el aviso de la pantalla y el menú de la cuenta
 * digan exactamente lo mismo. Sin jerga: «el servidor», «tu cuenta de Google»,
 * «no se borra nada» — lo que necesita saber alguien que no sabe qué es una
 * sesión ni por qué se cae.
 */
export const TEXTO_RESULTADO: Record<
  Exclude<ResultadoReconexion, 'atascada'>,
  { titulo: string; texto: string }
> = {
  conectada: {
    titulo: 'Cuenta reconectada',
    texto: 'Sincronizando los últimos cambios…',
  },
  sin_red: {
    titulo: 'Sin internet',
    texto:
      'Este dispositivo no tiene conexión ahora mismo. La cuenta se reconectará sola en cuanto vuelva.',
  },
  servidor: {
    titulo: 'El servidor no contesta ahora mismo',
    texto:
      'No es cosa de tu cuenta. Se seguirá intentando solo; mientras tanto puedes seguir usando la app.',
  },
  reentrar: {
    titulo: 'Hay que volver a entrar',
    texto:
      'La sesión de este dispositivo se ha cerrado. Vuelve a entrar con tu cuenta de Google: no se borra nada.',
  },
  vinculo: {
    titulo: 'Este dispositivo ya no está vinculado',
    texto:
      'Pide a un responsable un código nuevo para volver a vincularlo a tu cuenta.',
  },
};
