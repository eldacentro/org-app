/**
 * Partir un territorio en dos con una raya.
 *
 * Es la pieza de debajo de "dividir el territorio": el que dirige la salida
 * traza una raya que cruza el territorio de lado a lado —siguiendo una calle,
 * un camino o lo que le parezca— y el territorio se parte en dos.
 *
 * Por qué una RAYA y no dibujar los trozos: dibujando áreas a mano siempre
 * queda un hueco o un solape entre ellas, y entonces las secciones ya no son
 * el territorio. Cortando, los dos trozos son el original por construcción —
 * eso es lo que comprueba `AREA_NO_CUADRA` antes de devolver nada.
 *
 * Sin dependencias nuevas: son ~200 líneas de geometría plana. A la escala de
 * un territorio (unos cientos de metros) tratar longitud/latitud como un plano
 * no se nota; y aquí no se miden distancias, solo se corta.
 */
import { MultiPolygon, Polygon } from '@definition/territories';

/** [longitud, latitud], como en GeoJSON. */
export type Pos = [number, number];

export type MotivoFallo =
  | 'NO_CRUZA'
  | 'CRUZA_DE_MAS'
  | 'CORTA_UN_HUECO'
  | 'ROZA_EL_BORDE'
  | 'CRUZA_VARIAS_PARTES'
  | 'AREA_NO_CUADRA';

/** Lo que se le enseña a quien está cortando. Sin jerga. */
export const MOTIVO_TEXTO: Record<MotivoFallo, string> = {
  NO_CRUZA: 'La raya tiene que entrar por un lado y salir por el otro.',
  CRUZA_DE_MAS:
    'Esa raya cruza el borde más de dos veces. Haz un corte más sencillo; después puedes volver a partir cada trozo.',
  CORTA_UN_HUECO:
    'La raya pasa por encima de un hueco del territorio. Rodéalo por un lado.',
  ROZA_EL_BORDE:
    'La raya pasa rozando el borde y uno de los dos trozos se queda en nada. Trázala más adentro.',
  CRUZA_VARIAS_PARTES:
    'Este territorio está en varios trozos sueltos y la raya cruza más de uno. Corta uno cada vez.',
  AREA_NO_CUADRA:
    'El corte no ha salido bien y se perdería parte del territorio. Inténtalo con otra raya.',
};

export type ResultadoCorte =
  | { ok: true; piezas: [Polygon, Polygon] }
  | { ok: false; motivo: MotivoFallo };

const EPS = 1e-12;

/**
 * Por debajo de esto un trozo no es una sección, es una astilla: media
 * milésima del territorio son unos pocos metros cuadrados en uno urbano.
 */
const ASTILLA = 0.0005;

// ─── Geometría de andar por casa ─────────────────────────────────────────

/** Área con signo (fórmula del zapatero). Solo se usa para comparar. */
const areaAnillo = (anillo: Pos[]): number => {
  let suma = 0;
  for (let i = 0; i < anillo.length - 1; i += 1) {
    suma += anillo[i][0] * anillo[i + 1][1] - anillo[i + 1][0] * anillo[i][1];
  }
  return Math.abs(suma) / 2;
};

/** Área de un polígono con sus huecos descontados. */
const areaPoligono = (poligono: Polygon): number => {
  const [exterior, ...huecos] = poligono.coordinates as Pos[][];
  return huecos.reduce(
    (total, h) => total - areaAnillo(h),
    areaAnillo(exterior)
  );
};

const dentroDelAnillo = (punto: Pos, anillo: Pos[]): boolean => {
  let dentro = false;
  for (let i = 0, j = anillo.length - 2; i < anillo.length - 1; j = i, i += 1) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    const cruza =
      yi > punto[1] !== yj > punto[1] &&
      punto[0] < ((xj - xi) * (punto[1] - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
};

type Cruce = {
  punto: Pos;
  /** Índice del segmento de la raya y posición dentro de él. */
  segRaya: number;
  tRaya: number;
  /** Índice del segmento del borde y posición dentro de él. */
  segBorde: number;
  tBorde: number;
};

const corta = (
  a: Pos,
  b: Pos,
  c: Pos,
  d: Pos
): { punto: Pos; t: number; u: number } | null => {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const sx = d[0] - c[0];
  const sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < EPS) return null; // paralelas o encima

  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;

  return { punto: [a[0] + t * rx, a[1] + t * ry], t, u };
};

/**
 * Alarga la raya por los dos extremos.
 *
 * Nadie traza con el dedo un palmo por fuera del territorio: se queda justo
 * en el borde o un pelo por dentro, y entonces solo cruzaría una vez y el
 * corte se rechazaría sin que se entienda por qué. Prolongando las puntas,
 * la raya que "va de lado a lado" a ojo cruza de verdad.
 */
const prolongar = (raya: Pos[], largo: number): Pos[] => {
  const estirar = (desde: Pos, hacia: Pos): Pos => {
    const dx = hacia[0] - desde[0];
    const dy = hacia[1] - desde[1];
    const norma = Math.hypot(dx, dy);
    if (norma < EPS) return hacia;
    return [hacia[0] + (dx / norma) * largo, hacia[1] + (dy / norma) * largo];
  };

  const primera = estirar(raya[1], raya[0]);
  const ultima = estirar(raya[raya.length - 2], raya[raya.length - 1]);
  return [primera, ...raya.slice(1, -1), ultima];
};

const diagonal = (anillo: Pos[]): number => {
  const xs = anillo.map((p) => p[0]);
  const ys = anillo.map((p) => p[1]);
  return Math.hypot(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys)
  );
};

const cerrar = (anillo: Pos[]): Pos[] => {
  const primero = anillo[0];
  const ultimo = anillo[anillo.length - 1];
  const yaCerrado =
    Math.abs(primero[0] - ultimo[0]) < EPS &&
    Math.abs(primero[1] - ultimo[1]) < EPS;
  return yaCerrado ? anillo : [...anillo, primero];
};

const mismoPunto = (a: Pos, b: Pos, tolerancia: number): boolean =>
  Math.hypot(a[0] - b[0], a[1] - b[1]) < tolerancia;

// ─── El corte ────────────────────────────────────────────────────────────

/** Parte UN polígono (con sus huecos) en dos. */
export const cortarPoligono = (
  poligono: Polygon,
  raya: Pos[]
): ResultadoCorte => {
  if (raya.length < 2) return { ok: false, motivo: 'NO_CRUZA' };

  const anillos = poligono.coordinates as Pos[][];
  const borde = cerrar(anillos[0]);
  const huecos = anillos.slice(1).map(cerrar);

  const largo = diagonal(borde);
  const rayaLarga = prolongar(raya, largo);
  const tolerancia = largo * 1e-9;

  // La raya no puede pasar por encima de un hueco: el trozo de dentro del
  // hueco no es territorio, así que el corte no significaría nada.
  const tocaHueco = huecos.some((hueco) => cruces(rayaLarga, hueco).length > 0);
  if (tocaHueco) return { ok: false, motivo: 'CORTA_UN_HUECO' };

  const encontrados = cruces(rayaLarga, borde, tolerancia);
  if (encontrados.length < 2) return { ok: false, motivo: 'NO_CRUZA' };
  if (encontrados.length > 2) return { ok: false, motivo: 'CRUZA_DE_MAS' };

  const [primeroEnLaRaya, segundoEnLaRaya] = encontrados;

  // Los vértices de la raya que quedan DENTRO, entre los dos cruces: son los
  // que hacen que el corte siga la calle en vez de ir en línea recta.
  const interior = rayaLarga.slice(
    primeroEnLaRaya.segRaya + 1,
    segundoEnLaRaya.segRaya + 1
  );
  const caminoEnLaRaya: Pos[] = [
    primeroEnLaRaya.punto,
    ...interior,
    segundoEnLaRaya.punto,
  ];

  // Ahora en orden del BORDE, que es como se recorre para armar las piezas.
  const enOrdenDeBorde = [...encontrados].sort(
    (a, b) => a.segBorde - b.segBorde || a.tBorde - b.tBorde
  );
  const [x1, x2] = enOrdenDeBorde;
  const camino =
    x1 === primeroEnLaRaya ? caminoEnLaRaya : [...caminoEnLaRaya].reverse();

  const arcoA = arco(borde, x1, x2);
  const arcoB = arco(borde, x2, x1);

  // Cada pieza es un trozo del borde más la raya, recorrida al revés en una
  // de las dos. El interior del camino se repite en las dos piezas: es la
  // costura por la que se han separado.
  const pieza1 = cerrar([...arcoA, ...[...camino].reverse().slice(1, -1)]);
  const pieza2 = cerrar([...arcoB, ...camino.slice(1, -1)]);

  const conHuecos = (exterior: Pos[]): Polygon => ({
    type: 'Polygon',
    coordinates: [
      exterior,
      ...huecos.filter((h) => dentroDelAnillo(h[0], exterior)),
    ],
  });

  const resultado: [Polygon, Polygon] = [conHuecos(pieza1), conHuecos(pieza2)];

  // La comprobación que justifica todo esto: si los dos trozos no suman el
  // territorio, se ha perdido terreno por el camino y no se guarda nada.
  const original = areaPoligono(poligono);
  const areas = [areaPoligono(resultado[0]), areaPoligono(resultado[1])];
  const suma = areas[0] + areas[1];
  if (original > 0 && Math.abs(suma - original) / original > 1e-6) {
    return { ok: false, motivo: 'AREA_NO_CUADRA' };
  }

  // Una raya que pasa rozando una esquina parte "bien" —las cuentas cuadran—
  // pero deja una astilla sin una sola casa dentro. Probando contra los
  // territorios reales salían trozos de menos de una milésima del territorio:
  // eso no es una sección, es un resbalón del dedo.
  if (original > 0 && Math.min(...areas) / original < ASTILLA) {
    return { ok: false, motivo: 'ROZA_EL_BORDE' };
  }

  return { ok: true, piezas: resultado };
};

/** Todos los cruces de una raya con un anillo cerrado, en orden de la raya. */
const cruces = (raya: Pos[], anillo: Pos[], tolerancia = 0): Cruce[] => {
  const encontrados: Cruce[] = [];

  for (let i = 0; i < raya.length - 1; i += 1) {
    for (let j = 0; j < anillo.length - 1; j += 1) {
      const corte = corta(raya[i], raya[i + 1], anillo[j], anillo[j + 1]);
      if (!corte) continue;

      // Si la raya pasa justo por un vértice del borde, los dos segmentos que
      // salen de él dan el mismo punto: sería un cruce contado dos veces, y
      // el corte se rechazaría por "cruza de más" sin motivo.
      const repetido = encontrados.some((otro) =>
        mismoPunto(otro.punto, corte.punto, Math.max(tolerancia, EPS))
      );
      if (repetido) continue;

      encontrados.push({
        punto: corte.punto,
        segRaya: i,
        tRaya: corte.t,
        segBorde: j,
        tBorde: corte.u,
      });
    }
  }

  return encontrados.sort((a, b) => a.segRaya - b.segRaya || a.tRaya - b.tRaya);
};

/** El trozo de borde que va de un cruce al otro, hacia delante. */
const arco = (anillo: Pos[], desde: Cruce, hasta: Cruce): Pos[] => {
  const n = anillo.length - 1; // el último vértice repite el primero
  const vertices: Pos[] = [desde.punto];

  // Los dos cruces en el mismo lado y el destino por delante: entre ellos no
  // hay ningún vértice del borde, es una recta.
  if (desde.segBorde === hasta.segBorde && desde.tBorde <= hasta.tBorde) {
    vertices.push(hasta.punto);
    return vertices;
  }

  // El segmento `j` va del vértice `j` al `j+1`, así que a partir de un cruce
  // en el segmento `j` el siguiente vértice es el `j+1`.
  let i = (desde.segBorde + 1) % n;
  for (let vueltas = 0; vueltas <= n; vueltas += 1) {
    vertices.push(anillo[i]);
    if (i === hasta.segBorde) break;
    i = (i + 1) % n;
  }

  vertices.push(hasta.punto);
  return vertices;
};

/**
 * Parte un territorio, sea de una pieza o de varias.
 *
 * Los KML traen a veces territorios en trozos sueltos (una manzana aparte, un
 * grupo de casas al otro lado de la carretera). La raya solo puede cruzar uno;
 * los demás trozos se quedan enteros y se van con la pieza que les pilla más
 * cerca — repartirlos a mano es peor que tenerlos ya puestos en un lado.
 */
export const cortarTerritorio = (
  geometria: Polygon | MultiPolygon,
  raya: Pos[]
):
  | { ok: true; piezas: [Polygon | MultiPolygon, Polygon | MultiPolygon] }
  | { ok: false; motivo: MotivoFallo } => {
  if (geometria.type === 'Polygon') {
    const resultado = cortarPoligono(geometria, raya);
    if (resultado.ok === false) return { ok: false, motivo: resultado.motivo };
    return { ok: true, piezas: resultado.piezas };
  }

  const partes: Polygon[] = geometria.coordinates.map((coords) => ({
    type: 'Polygon',
    coordinates: coords,
  }));

  const cortadas = partes.map((parte) => cortarPoligono(parte, raya));
  const indicesCortados = cortadas
    .map((r, i) => (r.ok ? i : -1))
    .filter((i) => i >= 0);

  if (indicesCortados.length === 0) return { ok: false, motivo: 'NO_CRUZA' };
  if (indicesCortados.length > 1)
    return { ok: false, motivo: 'CRUZA_VARIAS_PARTES' };

  const cortada = cortadas[indicesCortados[0]];
  if (cortada.ok === false) return { ok: false, motivo: cortada.motivo };

  const sueltas = partes.filter((_, i) => i !== indicesCortados[0]);
  const centro = (p: Polygon): Pos => {
    const anillo = p.coordinates[0] as Pos[];
    const xs = anillo.map((q) => q[0]);
    const ys = anillo.map((q) => q[1]);
    return [
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...ys) + Math.max(...ys)) / 2,
    ];
  };

  const grupos: [Polygon[], Polygon[]] = [
    [cortada.piezas[0]],
    [cortada.piezas[1]],
  ];
  const centros = [centro(cortada.piezas[0]), centro(cortada.piezas[1])];

  for (const suelta of sueltas) {
    const c = centro(suelta);
    const d0 = Math.hypot(c[0] - centros[0][0], c[1] - centros[0][1]);
    const d1 = Math.hypot(c[0] - centros[1][0], c[1] - centros[1][1]);
    grupos[d0 <= d1 ? 0 : 1].push(suelta);
  }

  const armar = (lista: Polygon[]): Polygon | MultiPolygon =>
    lista.length === 1
      ? lista[0]
      : { type: 'MultiPolygon', coordinates: lista.map((p) => p.coordinates) };

  return { ok: true, piezas: [armar(grupos[0]), armar(grupos[1])] };
};
