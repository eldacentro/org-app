/**
 * La hojita, en imagen en vez de en PDF.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Un PDF que llega por WhatsApp es un adjunto que hay que abrir; una imagen se
 * ve en el propio chat. Para un hermano que solo quiere saber qué parte le toca
 * y qué día, eso es toda la diferencia. Lo que se pierde es un documento para
 * imprimir o archivar, y por eso el formato es un AJUSTE y no una decisión
 * tomada por nosotros: si la letra pequeña no se leyera bien después de que
 * WhatsApp comprima, se vuelve al PDF y ya está.
 *
 * ── Por qué se rasteriza el PDF y no se dibuja la hoja ───────────────────
 *
 * La S-89 es un formulario oficial y no se rediseña NUNCA. Lo que sale de aquí
 * es una foto de la hoja de verdad —la que genera la misma plantilla que la
 * impresión y que el botón de exportar—, no una versión hecha en HTML que se
 * le parezca. Volver a dibujarla sería rehacerla, aunque quedara idéntica: en
 * cuanto la plantilla cambiara, la copia se quedaría atrás sin que nadie se
 * diera cuenta.
 *
 * ── Por qué pdf.js se carga aparte ───────────────────────────────────────
 *
 * Pesa lo suyo, y solo hace falta al mandar una hojita. Con `import()` se queda
 * en un trozo suelto que no lastra el arranque de la aplicación —que se abre de
 * pie en el Salón, muchas veces con mala cobertura— y que el service worker
 * guarda la primera vez que se usa.
 */

/**
 * El lado largo de la imagen, en píxeles.
 *
 * WhatsApp reescala lo que le llega a un máximo de alrededor de 1600 px de
 * lado, así que mandar más grande no da más nitidez: solo da más megas y una
 * recompresión más agresiva. Y mandar menos sí se nota, porque la S-89 lleva
 * líneas de letra pequeña.
 */
const LADO_LARGO = 1600;

let pdfjs: typeof import('pdfjs-dist') | null = null;

/**
 * pdf.js, cargado la primera vez que hace falta.
 *
 * El hilo de trabajo se le señala A MANO, con `?url`. Se probó a no hacerlo
 * —confiando en que pdf.js lo pidiera con `new Worker(new URL(…))` y Vite lo
 * empaquetara solo— y el resultado fue que en la compilación no salía NINGÚN
 * fichero de hilo: sin `workerSrc`, pdf.js se cae a su modo sin hilo y
 * rasteriza en el hilo de la interfaz, o directamente protesta.
 *
 * Ojo con la otra mitad de esto, que es la que casi se cuela: el fichero sale
 * en `.mjs`, y la lista de precarga del service worker solo recogía
 * `.js`/`.css`/… Sin añadir `mjs` a esa lista (ver `workbox.config.ts`),
 * convertir la hojita funcionaba con cobertura y fallaba sin ella — que es
 * justo cuando se reparten, de pie en el Salón, y el único sitio donde no se
 * habría notado antes de desplegar.
 */
const cargarPdfjs = async () => {
  if (pdfjs) return pdfjs;

  const modulo = await import('pdfjs-dist');

  modulo.GlobalWorkerOptions.workerSrc = (
    await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ).default;

  pdfjs = modulo;

  return pdfjs;
};

/**
 * Convierte la PRIMERA página de un PDF en una imagen PNG.
 *
 * Primera y única a propósito: una S-89 suelta ocupa una página, y si algún día
 * ocupara dos, mandar solo la primera en silencio sería peor que cualquier
 * error. Por eso avisa en vez de recortar.
 */
export const hojitaComoImagen = async (pdf: Blob): Promise<Blob> => {
  const lib = await cargarPdfjs();

  // Se guarda la TAREA, no solo el documento: es la tarea la que tiene el hilo
  // del intérprete abierto, y es a ella a la que hay que decirle que lo cierre.
  // Con quince hojitas seguidas, un hilo por hojita sí se nota en un teléfono
  // modesto.
  const tarea = lib.getDocument({ data: await pdf.arrayBuffer() });

  const documento = await tarea.promise;

  if (documento.numPages > 1) {
    await tarea.destroy();

    throw new Error(
      'La hojita ha salido con más de una página; se manda en PDF para no recortarla.'
    );
  }

  const pagina = await documento.getPage(1);

  const medidas = pagina.getViewport({ scale: 1 });
  const escala = LADO_LARGO / Math.max(medidas.width, medidas.height);
  const viewport = pagina.getViewport({ scale: escala });

  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(viewport.width);
  lienzo.height = Math.round(viewport.height);

  const ctx = lienzo.getContext('2d');

  if (!ctx) throw new Error('Este navegador no puede dibujar la hojita.');

  // El fondo, BLANCO y a mano. Un lienzo nace transparente, y una hoja con el
  // fondo transparente se ve negra en cuanto alguien la reenvía como JPEG o la
  // abre en una galería en modo oscuro.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);

  await pagina.render({ canvas: lienzo, canvasContext: ctx, viewport }).promise;

  await tarea.destroy();

  // PNG y no JPEG: la hojita es texto negro sobre blanco, que es justo lo que
  // el JPEG emborrona con su halo alrededor de las letras. WhatsApp la va a
  // recomprimir de todas formas, así que conviene darle la copia más limpia
  // posible para que su pasada parta de ahí y no de una ya estropeada.
  return new Promise<Blob>((resolve, reject) => {
    lienzo.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('No se ha podido convertir la hojita en imagen.'));
    }, 'image/png');
  });
};
