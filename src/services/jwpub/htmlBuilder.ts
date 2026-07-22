import MarkdownIt from 'markdown-it';
import { BuiltDocumentHtml, JwpubChapter } from './types';

// Markdown → HTML MEPS de un capítulo. JW Library renderiza HTML semántico
// limpio; lo esencial es que cada bloque lleve `id="pN"` y `data-pid="N"`
// correlativos desde 1, y que las posiciones de párrafo sean offsets de
// BYTES UTF-8 dentro del HTML final (no de caracteres).

const md = new MarkdownIt({
  html: false, // no permitir HTML crudo del usuario (seguridad)
  linkify: false,
  breaks: false,
});

const byteLen = (s: string) => new TextEncoder().encode(s).length;

// Envuelve cada bloque de primer nivel con id/data-pid correlativos y recoge
// sus posiciones. El título va como <h1> (data-pid 1) dentro de <header>; el
// resto del cuerpo dentro de <div class="bodyTxt">.
export const buildChapterHtml = (chapter: JwpubChapter): BuiltDocumentHtml => {
  // markdown-it renderiza cada bloque; los partimos por línea de bloque para
  // asignarles pid. Estrategia simple y robusta: renderizar el cuerpo entero,
  // luego reasignar ids a los elementos de primer nivel.
  const bodyHtml = md.render(chapter.markdown || '').trim();

  // Insertar id/data-pid en cada etiqueta de apertura de bloque de primer
  // nivel (<p>, <h2>..<h6>, <ul>, <ol>, <blockquote>). El título es pid 1.
  let pid = 1;

  const titleHtml = `<h1 id="p${pid}" data-pid="${pid}">${escapeHtml(
    chapter.title
  )}</h1>`;
  pid++;

  // Recorremos los bloques de primer nivel del cuerpo. markdown-it los separa
  // con '\n'; un bloque de primer nivel empieza al inicio de línea con '<'.
  const withIds = bodyHtml.replace(
    /^(<(p|h[2-6]|ul|ol|blockquote|pre)(\s|>))/gm,
    (_m, _open, tag, tail) => {
      const attrs = ` id="p${pid}" data-pid="${pid}"`;
      pid++;
      return `<${tag}${attrs}${tail === '>' ? '>' : tail}`;
    }
  );

  const html = `<header>${titleHtml}</header>\n<div class="bodyTxt">\n${withIds}\n</div>`;

  // Posiciones de párrafo: para cada elemento con data-pid, [inicio del tag,
  // byte tras su cierre]. Se calculan sobre el HTML final en bytes UTF-8.
  const paragraphs = computeParagraphOffsets(html);

  return { html, contentLength: byteLen(html), paragraphs };
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Localiza cada `data-pid="N"` y devuelve el rango de bytes del elemento que
// lo contiene (desde su `<` de apertura hasta el byte siguiente a su cierre).
const computeParagraphOffsets = (
  html: string
): BuiltDocumentHtml['paragraphs'] => {
  const enc = new TextEncoder();
  const result: BuiltDocumentHtml['paragraphs'] = [];

  const tagRe = /<([a-z0-9]+)[^>]*\bdata-pid="(\d+)"/g;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(html)) !== null) {
    const tag = m[1];
    const index = Number(m[2]);

    // inicio del elemento = posición del '<' que abre este tag
    const openStart = html.lastIndexOf('<' + tag, m.index);
    const closeTag = `</${tag}>`;
    const closeIdx = html.indexOf(closeTag, m.index);
    const endChar =
      closeIdx === -1 ? html.length : closeIdx + closeTag.length;

    result.push({
      index,
      begin: enc.encode(html.slice(0, openStart)).length,
      end: enc.encode(html.slice(0, endChar)).length,
    });
  }

  return result.sort((a, b) => a.index - b.index);
};
