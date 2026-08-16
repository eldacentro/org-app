import { saveAs } from 'file-saver';
import { displaySnackNotification } from '@services/states/app';

/**
 * Mandar un fichero por la hoja de compartir del sistema.
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
 * Porque no llega a los dos sitios, y eso se midió en móviles de verdad en vez
 * de suponerlo: en iPhone el texto que acompaña al fichero acaba de pie de foto
 * en el chat, y en Android WhatsApp lo descarta —también con una imagen, que
 * era la esperanza de meterlo todo en un solo envío—. Ver el detalle en la
 * llamada a `navigator.share`, más abajo.
 *
 * Así que el texto va por su lado, con `wa.me`, donde llega siempre y además
 * cae en el chat correcto; y por aquí viaja solo el fichero.
 */
export const compartirFichero = async ({
  blob,
  nombre,
  alCompartir,
}: {
  blob: Blob;
  /** Nombre del fichero, CON su extensión. */
  nombre: string;
  /**
   * Qué hacer cuando el PDF ha salido de la app de verdad.
   *
   * Se llama también en el camino de respaldo (la descarga), porque ahí el
   * fichero también está ya en manos de quien reparte.
   */
  alCompartir?: () => void | Promise<void>;
}): Promise<'compartido' | 'descargado' | 'cancelado' | 'error'> => {
  // El tipo sale del propio blob, que ya sabe lo que es. Escribirlo aquí a
  // mano era lo que hacía que una imagen viajara diciendo que era un PDF —y
  // WhatsApp decide POR EL TIPO si te enseña la foto en el chat o un adjunto
  // que hay que abrir, que es justo lo que se quería cambiar.
  const file = new File([blob], nombre, {
    type: blob.type || 'application/octet-stream',
  });

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
    // SIN `title` y SIN `text`, y las dos ausencias están medidas en móviles
    // de verdad (2026-08):
    //
    //  · En iPhone, la extensión de WhatsApp recoge el `title` y lo planta de
    //    PIE DE FOTO. Aquí ponía «Hojita de Carlos Saca Jr.» —pensado para la
    //    cabecera de la hoja del sistema— y al hermano le llegaba su propio
    //    nombre escrito debajo de su hojita.
    //  · En Android, WhatsApp DESCARTA el texto que acompaña a un fichero, sea
    //    PDF o imagen. Comprobado con la imagen, que era la esperanza: llega
    //    sola igualmente.
    //
    // O sea que el pie de foto no se puede tener en los dos, y una hojita que
    // llega sin decir de qué parte es ni qué día es peor que un toque de más.
    // Por eso el mensaje viaja SIEMPRE por `wa.me` —donde además cae en el chat
    // correcto— y por aquí va solo el fichero.
    await navigator.share({ files: [file] });

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
