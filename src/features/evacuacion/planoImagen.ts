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
 * El plano se monta en un contenedor SUELTO —fuera de la página, sin pintarse—
 * con el mismo React que usa la app, se coge su `<svg>`, se serializa y se pasa
 * por un `<img>` y un `<canvas>`.
 *
 * El primer intento fue `renderToStaticMarkup` de `react-dom/server`, que
 * parecía lo natural. No vale: Vite lo sirve como dependencia optimizada
 * aparte y arrastra SU copia de React, así que en cuanto el componente usa un
 * hook salta «Invalid hook call» — dos Reacts en la misma página no comparten
 * el dispatcher. Con `createRoot` es el React de siempre y el problema no
 * existe.
 *
 * `flushSync` es imprescindible: `render` es asíncrono por defecto y sin él se
 * lee el contenedor todavía vacío.
 *
 * El SVG se sirve como data URI en base64 y no como texto plano: con acentos
 * ("SALA B" no, pero sí los rótulos que vengan del plan) el `<img>` se queda
 * en blanco sin decir por qué.
 */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
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
  const contenedor = document.createElement('div');
  // Fuera de la vista pero CON tamaño: un contenedor de 0×0 hace que el SVG,
  // que se dimensiona al 100% de su caja, salga de 0×0 y el lienzo en blanco.
  contenedor.style.cssText =
    'position:fixed;left:-10000px;top:0;width:1200px;height:600px;';
  document.body.appendChild(contenedor);

  const raiz = createRoot(contenedor);
  let svg: string;

  try {
    flushSync(() => {
      raiz.render(
        createElement(Plano2D, { seleccion: null, onSelect: () => {} })
      );
    });

    const nodo = contenedor.querySelector('svg');
    if (!nodo) throw new Error('No se ha podido extraer el plano del Salón');

    svg = new XMLSerializer().serializeToString(nodo);
  } finally {
    // Desmontar en un tick aparte: React se queja si se hace durante el render.
    setTimeout(() => {
      raiz.unmount();
      contenedor.remove();
    }, 0);
  }

  const ancho = Math.round(anchoPt * ESCALA);
  const alto = Math.round((anchoPt / PLANO_RATIO) * ESCALA);

  // Un solo retoque de la etiqueta de apertura, y NADA de añadir `xmlns`:
  // `XMLSerializer` ya lo pone, y un segundo atributo igual deja el XML mal
  // formado. Un `<img>` con un SVG inválido no avisa de nada — solo dispara
  // `onerror` sin decir por qué, que es donde se fue un buen rato.
  //
  // Del tamaño: el componente se dimensiona al 100 % de su caja, y dentro de
  // un `<img>` no hay caja. Se le da el suyo; el `viewBox` ya viene puesto.
  //
  // De la letra: los rótulos del plano ("SALA B", "PLATAFORMA", los números de
  // extintor) heredaban la fuente de la página. Sin esto el navegador cae a su
  // serif por defecto y el plano del PDF sale con otra letra que el de la
  // pantalla.
  svg = svg.replace(
    /<svg\b/,
    `<svg width="${ancho}" height="${alto}" font-family="Helvetica, Arial, sans-serif"`
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
  lienzo.width = ancho;
  lienzo.height = alto;

  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('No se ha podido dibujar el plano');

  // Fondo blanco explícito: un PNG con transparencia sobre el papel se ve
  // igual, pero si alguien lo pega en otro sitio aparece a cuadros.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

  return lienzo.toDataURL('image/png');
};
