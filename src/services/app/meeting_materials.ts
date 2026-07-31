import { SourceImportOriginType, SourceWeekType } from '@definition/sources';

/**
 * Qué material de reunión hay, de dónde salió y qué falta.
 *
 * Son DOS publicaciones distintas y se importan por separado: la Guía de
 * actividades (entre semana) y La Atalaya de estudio (fin de semana). Por eso
 * aquí casi todo se pregunta POR REUNIÓN — decir "enero-febrero está
 * importado" sin más manda a alguien al domingo sin material porque solo se
 * bajó la Guía.
 *
 * ── Cada publicación se cuenta en SU cadencia ────────────────────────────
 *
 * La Guía de actividades es BIMESTRAL: un cuaderno cubre dos meses, y el
 * bimestre de la portada es el bimestre en que se usa.
 *
 * La Atalaya de estudio es MENSUAL, y —esto es lo que confunde— **el mes de su
 * portada NO es el mes en que se estudia**: cada número se estudia unos dos
 * meses después. La de noviembre se estudia en enero.
 *
 * Antes se metían las dos en bloques de BIMESTRE "porque era lo único común".
 * Con la Guía era correcto; con La Atalaya salía un rótulo que describe algo
 * que no existe: no hay una "Atalaya de noviembre-diciembre". Y peor, se leía
 * como el número de portada cuando lo que se está contando son las SEMANAS DE
 * ESTUDIO — así que quien importaba la de noviembre la buscaba en "noviembre"
 * y no la encontraba, porque sus semanas caen en enero.
 *
 * Ahora la Guía se agrupa por bimestre y La Atalaya por MES DE ESTUDIO, y en
 * los dos casos se dicen las semanas concretas que cubre. Con las fechas
 * delante no hay nada que interpretar.
 *
 * El número de portada NO se puede enseñar: el material importado guarda el
 * título del artículo de cada semana, no de qué número salió.
 *
 * Todo son funciones puras sobre la tabla de material: se pueden probar, y no
 * hay forma de que un `?.` de más se lleve media lista sin que nadie se entere.
 */

export type MeetingKind = 'midweek' | 'weekend';

export type MaterialOrigen = 'jw' | 'jwpub' | 'desconocido';

export type EstadoReunion = {
  semanas: string[];
  origen: MaterialOrigen;
  /** Cuándo se importó por última vez, si consta. ISO. */
  importadoEl?: string;
  /**
   * De dónde vino esa ÚLTIMA importación, que no siempre es lo mismo que
   * `origen`: la automática de jw.org pasa cada semana por encima del material
   * subido con un .jwpub sin quitarle lo que lo hace especial. Sirve para no
   * llamar "importado" a algo que en realidad fue una actualización.
   */
  ultimaImportacion?: MaterialOrigen;
  /**
   * Si el enlace de JW Library puede abrir la semana exacta. Solo el .jwpub
   * trae los identificadores; desde jw.org se abre la publicación y ya.
   */
  semanaExacta: boolean;
  /**
   * De qué números salió el material de este periodo, si consta.
   *
   * Suele ser uno —un .jwpub trae un número— pero un mes de estudio puede
   * caer a caballo de dos: la última semana de noviembre es todavía del
   * número de septiembre y la primera de diciembre ya es del de octubre.
   */
  numeros: { simbolo: string; titulo: string }[];
};

export type Cadencia = 'mes' | 'bimestre';

export type PeriodoMateriales = {
  /** 'YYYY-N'. Sirve de clave. */
  id: string;
  year: number;
  cadencia: Cadencia;
  /** 1..6 si es bimestre, 1..12 si es mes. */
  periodo: number;
  /** Mes inicial del periodo, 1..12. */
  primerMes: number;
  /** Mes final: el mismo que el inicial si es un mes suelto. */
  ultimoMes: number;
  estado: EstadoReunion;
};

/** El bimestre (1..6) al que pertenece un mes 1..12. */
export const bimestreDeMes = (month: number) => Math.floor((month - 1) / 2) + 1;

/** Mes inicial (1, 3, 5…) del bimestre al que pertenece un mes. */
export const primerMesDelBimestre = (month: number) =>
  month % 2 === 0 ? month - 1 : month;

const partesDeSemana = (weekOf: string) => {
  const partes = weekOf.split('/');
  if (partes.length !== 3) return null;

  const year = Number(partes[0]);
  const month = Number(partes[1]);

  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;

  return { year, month };
};

/** El identificador de documento de esa reunión, si lo hay. */
export const docidDeSemana = (week: SourceWeekType, meeting: MeetingKind) =>
  meeting === 'midweek' ? week?.mwb_week_docid : week?.w_study_docid;

const origenGuardado = (week: SourceWeekType, meeting: MeetingKind) => {
  const guardado = week?.import_source;
  if (!guardado) return undefined;

  // Forma antigua, de las primeras horas de esta función: un solo origen para
  // toda la semana. Se acepta para las dos reuniones y no se descarta nada.
  const suelto = guardado as unknown as { type?: string; updatedAt?: string };
  if (suelto.type === 'jw' || suelto.type === 'jwpub') {
    // La forma antigua nunca llevó número: es posterior.
    return {
      type: suelto.type,
      updatedAt: suelto.updatedAt,
      issue: undefined,
    } as SourceImportOriginType;
  }

  return guardado[meeting];
};

/**
 * De dónde salió el material de esa reunión, en esa semana.
 *
 * MANDA EL IDENTIFICADOR DE DOCUMENTO, no el sello de la última importación.
 *
 * El sello iba primero y estaba mal. La importación automática desde jw.org
 * corre cada semana sobre las mismas semanas y vuelve a sellarlas como 'jw',
 * pero NO puede quitar el identificador (no lo trae ni lo toca). Resultado: la
 * misma fila decía "Desde jw.org" y a la vez "JW Library abre la semana
 * exacta", que es una capacidad que solo da el .jwpub. Se contradecía sola.
 *
 * Preguntándoselo al identificador eso es imposible por construcción: es el
 * MISMO dato del que sale `semanaExacta`, así que las dos líneas no pueden
 * discrepar nunca. Y responde a lo que de verdad se quiere saber mirando esta
 * página — qué meses traen los extras del .jwpub—, en vez de a quién escribió
 * el último.
 *
 * El sello sigue sirviendo para dos cosas: para el material sin identificador
 * (publicaciones antiguas, o lo importado desde jw.org, que nunca lo tiene) y
 * para la FECHA, que sí debe moverse cuando jw.org trae correcciones.
 */
export const origenDeSemana = (
  week: SourceWeekType,
  meeting: MeetingKind
): MaterialOrigen => {
  if (typeof docidDeSemana(week, meeting) === 'number') return 'jwpub';

  const guardado = origenGuardado(week, meeting);

  if (guardado?.type === 'jw') return 'jw';
  if (guardado?.type === 'jwpub') return 'jwpub';

  return 'desconocido';
};

const tieneTexto = (valor: object | undefined) =>
  !!valor &&
  Object.values(valor).some(
    (texto) => typeof texto === 'string' && texto.trim().length > 0
  );

/**
 * ¿Tiene material esa reunión de esa semana?
 *
 * Un registro puede existir vacío: la tabla se siembra al crear el programa de
 * una semana aunque no se haya importado nada. Lo que decide es que haya
 * llegado el texto — la lectura de la Biblia para entre semana, el tema del
 * estudio para el fin de semana.
 */
export const tieneMaterial = (
  week: SourceWeekType | undefined,
  meeting: MeetingKind
) => {
  if (!week) return false;

  return meeting === 'midweek'
    ? tieneTexto(week.midweek_meeting?.weekly_bible_reading)
    : tieneTexto(week.weekend_meeting?.w_study);
};

const construirEstado = (
  semanas: SourceWeekType[],
  meeting: MeetingKind
): EstadoReunion | undefined => {
  const conMaterial = semanas.filter((week) => tieneMaterial(week, meeting));
  if (conMaterial.length === 0) return undefined;

  const conteo = new Map<MaterialOrigen, number>();
  let importadoEl: string | undefined;
  let ultimaImportacion: MaterialOrigen | undefined;

  for (const week of conMaterial) {
    const origen = origenDeSemana(week, meeting);
    conteo.set(origen, (conteo.get(origen) ?? 0) + 1);

    const sello = origenGuardado(week, meeting);
    const fecha = sello?.updatedAt;

    if (fecha && (!importadoEl || fecha > importadoEl)) {
      importadoEl = fecha;
      ultimaImportacion = sello?.type as MaterialOrigen;
    }
  }

  let origen: MaterialOrigen = 'desconocido';
  let mejor = 0;

  for (const [candidato, veces] of conteo) {
    // Con empate gana lo que NO es "desconocido": decir de dónde vino es más
    // útil que encogerse de hombros.
    if (veces > mejor || (veces === mejor && candidato !== 'desconocido')) {
      origen = candidato;
      mejor = veces;
    }
  }

  // De qué números salió, sin repetir y en el orden en que aparecen.
  const numeros: { simbolo: string; titulo: string }[] = [];

  for (const week of conMaterial) {
    const issue = origenGuardado(week, meeting)?.issue;

    if (issue && !numeros.some((n) => n.simbolo === issue.simbolo)) {
      numeros.push({ simbolo: issue.simbolo, titulo: issue.titulo });
    }
  }

  return {
    numeros,
    semanas: conMaterial.map((week) => week.weekOf).sort(),
    origen,
    importadoEl,
    ultimaImportacion,
    semanaExacta: conMaterial.some(
      (week) => typeof docidDeSemana(week, meeting) === 'number'
    ),
  };
};

/**
 * Agrupa el material de UNA reunión en periodos de su cadencia.
 *
 * `cadencia` es 'bimestre' para la Guía de actividades y 'mes' para La
 * Atalaya, por lo que explica la cabecera de este fichero. El periodo siempre
 * se calcula sobre la semana en que se ESTUDIA, que es el único dato que
 * guarda el material importado.
 */
export const agruparMaterial = (
  sources: SourceWeekType[],
  meeting: MeetingKind,
  cadencia: Cadencia
): PeriodoMateriales[] => {
  const grupos = new Map<string, SourceWeekType[]>();

  for (const week of sources ?? []) {
    if (!tieneMaterial(week, meeting)) continue;

    const partes = partesDeSemana(week.weekOf);
    if (!partes) continue;

    const periodo =
      cadencia === 'bimestre' ? bimestreDeMes(partes.month) : partes.month;

    const id = `${partes.year}-${periodo}`;

    const actual = grupos.get(id) ?? [];
    actual.push(week);
    grupos.set(id, actual);
  }

  const resultado: PeriodoMateriales[] = [];

  for (const [id, semanas] of grupos) {
    const [yearStr, periodoStr] = id.split('-');
    const periodo = Number(periodoStr);
    const primerMes = cadencia === 'bimestre' ? periodo * 2 - 1 : periodo;

    const estado = construirEstado(semanas, meeting);
    if (!estado) continue;

    resultado.push({
      id,
      year: Number(yearStr),
      cadencia,
      periodo,
      primerMes,
      ultimoMes: cadencia === 'bimestre' ? primerMes + 1 : primerMes,
      estado,
    });
  }

  return resultado.sort((a, b) =>
    a.year === b.year ? b.periodo - a.periodo : b.year - a.year
  );
};

/**
 * Las semanas que vienen y todavía no tienen material de esa reunión.
 *
 * Es el dato que de verdad muerde: no enterarse de que falta el cuaderno hasta
 * el martes. `semanasPrevistas` son los lunes que deberían existir (los genera
 * quien llama, que es quien sabe el calendario).
 */
export const semanasSinMaterial = (
  sources: SourceWeekType[],
  semanasPrevistas: string[],
  meeting: MeetingKind
) => {
  const conMaterial = new Set(
    (sources ?? [])
      .filter((week) => tieneMaterial(week, meeting))
      .map((week) => week.weekOf)
  );

  return (semanasPrevistas ?? []).filter((week) => !conMaterial.has(week));
};
