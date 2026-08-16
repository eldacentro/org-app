import { saveAs } from 'file-saver';
import { displaySnackNotification } from '@services/states/app';

/**
 * Mandar un PDF por la hoja de compartir del sistema.
 *
 * Estaba en `weekend_editor/pdfShare.ts`, hecho para la invitación al orador
 * visitante. Se saca aquí porque ahora hay dos cosas que comparten PDF y una
 * segunda copia acabaría comportándose distinto justo en los filos de abajo,
 * que son los que costaron encontrarse.
 *
 * ── El filo que decide toda la pantalla de envío ─────────────────────────
 *
 * `navigator.share` SOLO se puede llamar dentro del gesto del usuario. Generar
 * el PDF con react-pdf tarda lo suyo, y en iOS ese rato basta para que el
 * sistema dé el gesto por caducado: la llamada se rechaza con `NotAllowedError`
 * y al hermano no le sale nada al pulsar.
 *
 * Por eso esta función recibe un BLOB ya hecho, no un documento por generar. El
 * PDF se prepara antes —al abrir la hoja de envío, o mientras se manda el
 * anterior en la cola— y el toque solo abre el menú. Si algún día vuelve a
 * aparecer un `await pdf(...)` justo encima de un `share`, es este fallo.
 *
 * ── Y por qué no viaja el mensaje aquí dentro ────────────────────────────
 *
 * La API admite `text` junto a los ficheros, pero WhatsApp lo DESCARTA cuando
 * lo que se comparte es un documento (en Android lo usa de pie de foto solo con
 * imagen y vídeo; en iOS es aún menos fiable, y pasar los dos juntos hace
 * desaparecer destinos de la hoja). Un mensaje que se pierde en silencio es
 * peor que dos toques, así que el texto va por su lado, con `wa.me`, y aquí
 * viaja solo el PDF.
 */
export const compartirPDF = async ({
  blob,
  nombre,
  titulo,
  alCompartir,
}: {
  blob: Blob;
  /** Nombre del fichero, con su `.pdf`. */
  nombre: string;
  /** Lo que se lee en la cabecera de la hoja del sistema. */
  titulo: string;
  /**
   * Qué hacer cuando el PDF ha salido de la app de verdad.
   *
   * Se llama también en el camino de respaldo (la descarga), porque ahí el
   * fichero también está ya en manos de quien reparte.
   */
  alCompartir?: () => void | Promise<void>;
}): Promise<'compartido' | 'descargado' | 'cancelado' | 'error'> => {
  const file = new File([blob], nombre, { type: 'application/pdf' });

  const puedeCompartir =
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (!puedeCompartir) {
    // Escritorio, o un navegador sin la API. No es un error: el PDF se
    // descarga y se adjunta a mano, que es como se hacía hasta ahora.
    saveAs(blob, nombre);

    await alCompartir?.();

    displaySnackNotification({
      header: 'Hojita descargada',
      message:
        'Este navegador no puede compartir ficheros, así que se ha descargado para adjuntarla a mano.',
      severity: 'success',
    });

    return 'descargado';
  }

  try {
    await navigator.share({ files: [file], title: titulo });

    await alCompartir?.();

    return 'compartido';
  } catch (error) {
    // Cerrar la hoja del sistema sin elegir destino NO es un fallo: es
    // arrepentirse. Avisar ahí sería regañar por cambiar de idea.
    if ((error as Error)?.name === 'AbortError') return 'cancelado';

    console.error('Error al compartir la hojita:', error);

    displaySnackNotification({
      header: 'No se ha podido compartir',
      message:
        'Vuelve a intentarlo. Si sigue sin salir el menú, descarga la hojita y adjúntala a mano.',
      severity: 'error',
    });

    return 'error';
  }
};
