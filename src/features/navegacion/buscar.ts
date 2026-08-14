import { Destino, DestinoRoles } from '@definition/destinos';
import { DESTINOS } from './destinos';

/**
 * La búsqueda, como funciones puras. La pantalla va aparte.
 *
 * Se separa por lo mismo que el índice: así se puede probar en Node, y lo que
 * hay que probar de un buscador no es cómo se pinta, es qué encuentra y —sobre
 * todo— qué NO enseña a quien no puede entrar.
 */

/**
 * Minúsculas y sin acentos, las dos partes.
 *
 * Es la misma normalización que usa el buscador de la Ayuda, y no es un
 * detalle: media congregación escribe sin tildes en el móvil. Sin esto,
 * "predicacion" no encuentra "Predicación".
 */
export const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Lo que se busca de un destino: su nombre y sus sinónimos. */
const textoDe = (d: Destino) =>
  normalizar([d.nombre, ...(d.sinonimos ?? [])].join(' '));

export type ResultadoDestino = {
  destino: Destino;
  /** Cuanto más bajo, más arriba sale. */
  peso: number;
};

/**
 * Los destinos que este hermano puede abrir Y que coinciden con lo escrito.
 *
 * El filtro de permiso va PRIMERO y no es negociable: un resultado que no se
 * puede abrir es peor que no tener buscador. Ese es el fallo que hay que
 * evitar, y por eso está probado.
 *
 * El orden se decide así, de mejor a peor coincidencia:
 *   0 · el nombre empieza por lo escrito   ("exhi" → Exhibidores)
 *   1 · el nombre lo contiene              ("bidor" → Exhibidores)
 *   2 · lo encuentra por un sinónimo       ("cartelera" → Exhibidores)
 * A igual peso, el orden del índice, que ya está puesto por categorías.
 */
export const buscarDestinos = (
  termino: string,
  roles: DestinoRoles
): ResultadoDestino[] => {
  const t = normalizar(termino.trim());

  if (t.length === 0) return [];

  const permitidos = DESTINOS.filter((d) => !d.visible || d.visible(roles));

  return permitidos
    .map((d) => {
      const nombre = normalizar(d.nombre);

      if (nombre.startsWith(t)) return { destino: d, peso: 0 };
      if (nombre.includes(t)) return { destino: d, peso: 1 };
      if (textoDe(d).includes(t)) return { destino: d, peso: 2 };

      return null;
    })
    .filter((r): r is ResultadoDestino => r !== null)
    .sort((a, b) => a.peso - b.peso);
};

export type DocumentoBuscable = {
  id: string;
  nombre: string;
  /** El nombre de la categoría, ya resuelto. */
  categoria: string;
};

/**
 * Los documentos que coinciden, POR NOMBRE O POR CATEGORÍA.
 *
 * Lo de la categoría no es un extra: es medio motivo de que esto exista. Hay
 * documentos de Exhibidores cuyo nombre no dice "Exhibidores" por ningún lado
 * —se llaman "Turnos julio" o "Instrucciones"— y sin buscar por categoría no
 * los encuentra nadie que no sepa ya cómo se llaman.
 */
export const buscarDocumentos = (
  termino: string,
  documentos: DocumentoBuscable[]
): DocumentoBuscable[] => {
  const t = normalizar(termino.trim());

  if (t.length === 0) return [];

  return documentos
    .map((doc) => {
      const nombre = normalizar(doc.nombre);
      const categoria = normalizar(doc.categoria);

      if (nombre.startsWith(t)) return { doc, peso: 0 };
      if (nombre.includes(t)) return { doc, peso: 1 };
      // Por categoría va el último: quien escribe "exhibidores" espera ver
      // antes la PÁGINA de Exhibidores que sus ocho documentos.
      if (categoria.includes(t)) return { doc, peso: 2 };

      return null;
    })
    .filter((r): r is { doc: DocumentoBuscable; peso: number } => r !== null)
    .sort((a, b) => a.peso - b.peso)
    .map((r) => r.doc);
};
