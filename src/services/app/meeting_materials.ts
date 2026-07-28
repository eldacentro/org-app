import { SourceWeekType } from '@definition/sources';

/**
 * Qué material de reunión hay, de dónde salió y qué falta.
 *
 * La Guía de actividades se publica por BIMESTRES (enero-febrero, marzo-abril,
 * …), así que es la unidad con la que se piensa: se descarga un cuaderno, no
 * una semana. Aquí se agrupan las semanas guardadas en esos bimestres.
 *
 * Todo esto son funciones puras sobre la tabla de material: se pueden probar,
 * y no hay forma de que un `?.` de más se lleve media lista sin que nadie se
 * entere.
 */

export type MaterialOrigen = 'jw' | 'jwpub' | 'desconocido';

export type BimestreMateriales = {
  /** 'YYYY-N', con N el número de bimestre (1..6). Sirve de clave. */
  id: string;
  year: number;
  /** 1..6 */
  bimestre: number;
  /** Mes inicial del bimestre (1, 3, 5, 7, 9, 11). */
  primerMes: number;
  semanas: string[];
  origen: MaterialOrigen;
  /** Cuándo se importó, si se sabe. ISO. */
  importadoEl?: string;
  /**
   * Si el enlace de JW Library puede llevar a la semana exacta. Solo el
   * .jwpub trae los identificadores de semana; desde jw.org el enlace lleva
   * al cuaderno del bimestre y ya.
   */
  semanaExacta: boolean;
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

/**
 * El origen de UNA semana.
 *
 * Lo importado antes de que se guardara el origen no lo lleva, así que se
 * deduce: solo la importación desde .jwpub guarda el identificador de semana.
 * No es infalible —si sobre un .jwpub se reimporta desde jw.org, el
 * identificador se conserva— pero es lo mejor que se puede decir del pasado, y
 * de aquí en adelante el dato es explícito.
 */
export const origenDeSemana = (week: SourceWeekType): MaterialOrigen => {
  if (week?.import_source?.type === 'jw') return 'jw';
  if (week?.import_source?.type === 'jwpub') return 'jwpub';

  if (typeof week?.mwb_week_docid === 'number') return 'jwpub';

  return 'desconocido';
};

/**
 * ¿Tiene material de verdad esta semana?
 *
 * Un registro puede existir vacío: la tabla se siembra al crear el programa de
 * una semana aunque no se haya importado nada. Lo que decide es que haya
 * llegado el texto de la reunión de entre semana o el estudio de La Atalaya.
 */
export const semanaTieneMaterial = (week: SourceWeekType | undefined) => {
  if (!week) return false;

  const midweek = week.midweek_meeting?.weekly_bible_reading;
  const weekend = week.weekend_meeting?.w_study;

  const tieneAlgo = (valor: object | undefined) =>
    !!valor &&
    Object.values(valor).some(
      (texto) => typeof texto === 'string' && texto.trim().length > 0
    );

  return tieneAlgo(midweek) || tieneAlgo(weekend);
};

/**
 * Agrupa el material guardado en bimestres, del más reciente al más antiguo.
 *
 * El origen del bimestre es el de sus semanas: si no coinciden todas —porque
 * se reimportó a medias— manda el de la MAYORÍA, que es lo que describe mejor
 * de dónde salió el cuaderno.
 */
export const agruparPorBimestre = (
  sources: SourceWeekType[]
): BimestreMateriales[] => {
  const grupos = new Map<string, SourceWeekType[]>();

  for (const week of sources ?? []) {
    if (!semanaTieneMaterial(week)) continue;

    const partes = partesDeSemana(week.weekOf);
    if (!partes) continue;

    const id = `${partes.year}-${bimestreDeMes(partes.month)}`;

    const actual = grupos.get(id) ?? [];
    actual.push(week);
    grupos.set(id, actual);
  }

  const resultado: BimestreMateriales[] = [];

  for (const [id, semanas] of grupos) {
    const [yearStr, bimestreStr] = id.split('-');
    const year = Number(yearStr);
    const bimestre = Number(bimestreStr);

    const conteo = new Map<MaterialOrigen, number>();
    let importadoEl: string | undefined;

    for (const week of semanas) {
      const origen = origenDeSemana(week);
      conteo.set(origen, (conteo.get(origen) ?? 0) + 1);

      const fecha = week.import_source?.updatedAt;
      if (fecha && (!importadoEl || fecha > importadoEl)) importadoEl = fecha;
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

    resultado.push({
      id,
      year,
      bimestre,
      primerMes: bimestre * 2 - 1,
      semanas: semanas.map((week) => week.weekOf).sort(),
      origen,
      importadoEl,
      semanaExacta: semanas.some(
        (week) => typeof week.mwb_week_docid === 'number'
      ),
    });
  }

  return resultado.sort((a, b) =>
    a.year === b.year ? b.bimestre - a.bimestre : b.year - a.year
  );
};

/**
 * Las semanas que vienen y todavía no tienen material.
 *
 * Es el dato que de verdad muerde: no enterarse de que falta el cuaderno hasta
 * el martes. `semanasPrevistas` son los lunes que deberían existir (los genera
 * quien llama, que es quien sabe el calendario).
 */
export const semanasSinMaterial = (
  sources: SourceWeekType[],
  semanasPrevistas: string[]
) => {
  const conMaterial = new Set(
    (sources ?? [])
      .filter((week) => semanaTieneMaterial(week))
      .map((week) => week.weekOf)
  );

  return (semanasPrevistas ?? []).filter((week) => !conMaterial.has(week));
};
