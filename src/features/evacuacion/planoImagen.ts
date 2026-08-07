/**
 * El plano del Salón para el PDF, convertido en imagen.
 *
 * ── El plano del PAPEL no es el de la pantalla ───────────────────────────
 *
 * Son dos dibujos a propósito. El de la pantalla (`Plano2D`) es interactivo:
 * se toca, se amplía, resalta lo elegido, y por eso va en tintes suaves. El del
 * papel es un plano de evacuación de los de colgar en un tablón: trazo negro,
 * flechas rojas y nada que distraiga. Este fichero solo alimenta el PDF; tocar
 * aquí no cambia la pantalla, y al revés tampoco.
 *
 * El SVG viene del CAD del Salón —`plano_documento.svg`— y trae la
 * arquitectura, las flechas de evacuación, los extintores y los rótulos de los
 * puestos A1–B3, todo en vectores. La leyenda la pone el documento.
 *
 * ── Por qué una imagen y no piezas de react-pdf ──────────────────────────
 *
 * `react-pdf` no pinta SVG en crudo: trae sus propias piezas (`Svg`, `Path`,
 * `Rect`) y no entiende una cadena de marcado. El plano son dos mil líneas de
 * CAD, así que se rasteriza.
 */
import planoSvgCrudo from './plano_documento.svg?raw';

/**
 * Cuántos píxeles por punto de PDF. A 1× el plano se ve pastoso al ampliar en
 * pantalla; a 3× pesa poco más y aguanta el zoom y la impresora.
 */
const ESCALA = 3;

/**
 * Devuelve el plano como PNG en un data URI, listo para `<Image src=…>`, y el
 * alto que le toca para el ancho que se le pida.
 *
 * El alto sale del dibujo y no de una proporción escrita a mano: así, si algún
 * día cambia el plano, la caja del PDF se ajusta sola en vez de recortarlo o
 * dejarle una franja en blanco debajo.
 *
 * Solo funciona en el navegador (necesita `Image` y `canvas`), que es donde se
 * generan todos los PDF de la app.
 */
export const planoComoPng = async (
  anchoPt: number
): Promise<{ src: string; ancho: number; alto: number }> => {
  const contenedor = document.createElement('div');
  contenedor.style.cssText =
    'position:fixed;left:-10000px;top:0;width:1200px;height:700px;';
  contenedor.innerHTML = planoSvgCrudo;
  document.body.appendChild(contenedor);

  try {
    const svg = contenedor.querySelector('svg');
    if (!svg) throw new Error('No se ha podido leer el plano del Salón');

    // NADA de dibujar aquí los puestos A1–B3: el SVG del documento YA los
    // trae, en vectores, junto con las flechas y los extintores. Se dibujaron
    // una vez encima y salían DOS veces, la mía ligeramente descolocada
    // respecto a la suya. El plano del papel viene hecho; aquí solo se
    // encuadra y se rasteriza.

    /**
     * La única leyenda que queda, y va DENTRO del dibujo.
     *
     * Debajo del plano había una fila con cinco entradas —flechas, zonas,
     * extintores y los dos equipos— y gastaba un renglón entero para explicar
     * cosas que el propio plano ya dice: las flechas se entienden solas y los
     * puestos llevan su rótulo al lado. El punto rojo no: sin decirlo, un
     * círculo rojo numerado no tiene por qué ser un extintor.
     *
     * Se dibuja en el hueco de abajo a la izquierda, que en este plano está
     * vacío, y en coordenadas de CAD como el resto.
     */
    const caja0 = (svg as unknown as SVGSVGElement).getBBox();
    const lx = caja0.x + 60;
    const ly = caja0.y + caja0.height - 60;

    svg.insertAdjacentHTML(
      'beforeend',
      `<g><circle cx="${lx}" cy="${ly}" r="26" fill="#E2001A"/>` +
        `<text x="${lx + 48}" y="${ly}" dominant-baseline="central" ` +
        `font-family="Helvetica, Arial, sans-serif" font-size="62" ` +
        `fill="#1A1A2E">Extintores</text></g>`
    );

    /**
     * El encuadre lo decide el CONTENIDO, no el `viewBox` que traía el
     * fichero: el CAD viene en un lienzo de 3840 × 2160 con aire de sobra
     * alrededor, y A3 y B3 caen FUERA de él —esos dos puestos están en la
     * calle, recibiendo a la gente, y la calle no está dibujada—. Con el
     * viewBox original, A3 se quedaba fuera de la hoja.
     */
    const caja = (svg as unknown as SVGSVGElement).getBBox();
    const margen = 40;
    const vw = caja.width + margen * 2;
    const vh = caja.height + margen * 2;

    const alto = (anchoPt * vh) / vw;
    const ancho = Math.round(anchoPt * ESCALA);
    const altoPx = Math.round(alto * ESCALA);

    svg.setAttribute(
      'viewBox',
      `${caja.x - margen} ${caja.y - margen} ${vw} ${vh}`
    );
    svg.setAttribute('width', String(ancho));
    svg.setAttribute('height', String(altoPx));

    let marcado = new XMLSerializer().serializeToString(svg);

    // NADA de añadir `xmlns` a mano si ya está: `XMLSerializer` suele ponerlo,
    // y un segundo atributo igual deja el XML mal formado. Un `<img>` con un
    // SVG inválido no avisa — solo dispara `onerror` sin decir por qué.
    if (!/\sxmlns=/.test(marcado)) {
      marcado = marcado.replace(
        /<svg\b/,
        '<svg xmlns="http://www.w3.org/2000/svg"'
      );
    }

    const fuente = `data:image/svg+xml;base64,${btoa(
      new TextEncoder()
        .encode(marcado)
        .reduce((acc, byte) => acc + String.fromCharCode(byte), '')
    )}`;

    const imagen = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se ha podido dibujar el plano'));
      img.src = fuente;
    });

    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = altoPx;

    const ctx = lienzo.getContext('2d');
    if (!ctx) throw new Error('No se ha podido dibujar el plano');

    // Fondo blanco explícito: un PNG con transparencia se ve igual sobre el
    // papel, pero si alguien lo pega en otro sitio aparece a cuadros.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, ancho, altoPx);
    ctx.drawImage(imagen, 0, 0, ancho, altoPx);

    return { src: lienzo.toDataURL('image/png'), ancho: anchoPt, alto };
  } finally {
    contenedor.remove();
  }
};
