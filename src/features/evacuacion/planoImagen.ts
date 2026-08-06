/**
 * El plano del Salón, convertido en una imagen que react-pdf sí sepa poner.
 *
 * ── Por qué hace falta esto ──────────────────────────────────────────────
 *
 * `react-pdf` NO pinta SVG en crudo: trae sus propias piezas (`Svg`, `Path`,
 * `Rect`) y no entiende una cadena de marcado. Y el plano del salón ES una
 * cadena de marcado —`PLANO_BASE_SVG`, sesenta y tantos `rect` y `path`
 * sacados del CAD— sobre la que la app dibuja después las zonas, los puestos,
 * las salidas y los extintores.
 *
 * Había dos caminos: volver a dibujarlo con las piezas de react-pdf, o pasar
 * por una imagen. Redibujarlo significa tener el plano escrito DOS veces, y a
 * la segunda vez que alguien mueva un extintor las dos copias dejan de
 * coincidir sin que nadie se entere. Así que se rasteriza: el dibujo sigue
 * viviendo en un solo sitio, `Plano2D`, y el PDF enseña exactamente lo que
 * enseña la pantalla.
 *
 * ── Cómo ────────────────────────────────────────────────────────────────
 *
 * `renderToStaticMarkup` monta el componente sin eventos ni refs y devuelve su
 * marcado. De ahí se recorta el `<svg>` —el componente trae además sus
 * controles de zoom, que en papel no pintan nada— y se pasa por un `<img>` y
 * un `<canvas>`.
 *
 * El SVG se sirve como data URI en base64 y no como texto plano: con acentos
 * ("SALA B" no, pero sí los rótulos que vengan del plan) el `<img>` se queda
 * en blanco sin decir por qué.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import Plano2D from './Plano2D';

/**
 * Cuántos píxeles por punto de PDF. A 1× el plano sale de 532 pt de ancho y se
 * ve pastoso al ampliar en pantalla; a 3× pesa poco más y aguanta el zoom y la
 * impresora.
 */
const ESCALA = 3;

/** El plano es apaisado 2,3:1 — la razón por la que la hoja va en vertical. */
export const PLANO_RATIO = 180 / 78.65;

/**
 * Devuelve el plano como PNG en un data URI, listo para `<Image src=…>`.
 *
 * Solo funciona en el navegador (necesita `Image` y `canvas`), que es donde se
 * generan todos los PDF de la app.
 */
export const planoComoPng = async (anchoPt = 532): Promise<string> => {
  const marcado = renderToStaticMarkup(
    createElement(Plano2D, { seleccion: null, onSelect: () => {} })
  );

  const inicio = marcado.indexOf('<svg');
  const fin = marcado.lastIndexOf('</svg>');
  if (inicio === -1 || fin === -1) {
    throw new Error('No se ha podido extraer el plano del Salón');
  }

  let svg = marcado.slice(inicio, fin + '</svg>'.length);

  // El componente lo dimensiona con CSS al 100% de su caja; aquí no hay caja,
  // así que se le da su tamaño real. El viewBox ya viene puesto.
  svg = svg.replace(
    /<svg /,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${anchoPt * ESCALA}" height="${
      (anchoPt / PLANO_RATIO) * ESCALA
    }" `
  );

  // Los rótulos del plano ("SALA B", "PLATAFORMA", los números de extintor)
  // heredaban la fuente de la página. Dentro de un `<img>` no hay página, así
  // que sin esto el navegador cae a su serif por defecto y el plano del PDF
  // sale con otra letra que el de la pantalla.
  svg = svg.replace(
    /<svg /,
    '<svg font-family="Helvetica, Arial, sans-serif" '
  );

  const fuente = `data:image/svg+xml;base64,${btoa(
    new TextEncoder()
      .encode(svg)
      .reduce((acc, byte) => acc + String.fromCharCode(byte), '')
  )}`;

  const imagen = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se ha podido dibujar el plano'));
    img.src = fuente;
  });

  const lienzo = document.createElement('canvas');
  lienzo.width = anchoPt * ESCALA;
  lienzo.height = Math.round((anchoPt / PLANO_RATIO) * ESCALA);

  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('No se ha podido dibujar el plano');

  // Fondo blanco explícito: un PNG con transparencia sobre el papel se ve
  // igual, pero si alguien lo pega en otro sitio aparece a cuadros.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

  return lienzo.toDataURL('image/png');
};
