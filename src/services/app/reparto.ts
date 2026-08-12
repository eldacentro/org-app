import { AssignmentCode } from '@definition/assignment';
import { PersonType } from '@definition/person';
import { AssignmentHistoryType } from '@definition/schedules';

/**
 * La rueda: cómo va de repartida cada asignación.
 *
 * Nace de la hoja de cálculo que se llevaba a mano —una fila por hermano, una
 * columna por vuelta, y la fecha en la celda— para confirmar de un vistazo que
 * el reparto iba equitativo.
 *
 * No se copia esa rejilla, y es a propósito: sus columnas no son tiempo, son
 * VUELTAS, y cada vuelta dura lo que dura. Dos celdas de la misma columna
 * pueden estar a dos meses una de otra, así que hay que interpretarla —contar
 * huecos, comparar fechas a mano— y con veinticinco filas eso ya no se lee de
 * un vistazo, y en un móvil no se lee en absoluto.
 *
 * Debajo de la hoja hay cuatro preguntas, y ninguna necesita una rejilla:
 *
 *   1. ¿Va equilibrado, o a uno le toca el doble que a otro?
 *   2. ¿A quién le toca ahora?
 *   3. ¿A quién se están saltando?
 *   4. ¿Cuándo le tocó a este la última vez?
 *
 * El resumen contesta la 1 de un vistazo; la lista ordenada, las otras tres.
 */

/** Cuántas veces le tocó a cada uno, y cuándo fue la última. */
export type RepartoPersonaType = {
  person_uid: string;
  veces: number;
  /** 'yyyy/MM/dd' de la última vez. Vacío = nunca. */
  ultima: string;
};

export type RepartoAsignacionType = {
  code: AssignmentCode;
  /** Cómo se llama, para leerlo. */
  titulo: string;
  /** Los que pueden llevarla, ordenados por a quién le toca antes. */
  personas: RepartoPersonaType[];
  /** Al que menos veces le ha tocado, dentro de la ventana. */
  menos: number;
  /** Y al que más. */
  mas: number;
  /**
   * Si conviene mirarlo.
   *
   * Un margen de uno o dos es normal: la gente entra, sale, se ausenta. Se
   * avisa a partir de TRES, que ya no se explica solo por eso.
   */
  desigual: boolean;
};

/** Meses hacia atrás que se miran. Un año entero, para que una racha corta no
 *  parezca un desequilibrio. */
export const REPARTO_MESES = 12;

const desdeMes = (hoy: Date, meses: number) => {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() - meses + 1, 1);

  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/01`;
};

/**
 * El reparto de UNA asignación.
 *
 * `elegibles` son los que pueden llevarla hoy — no los que salen en el
 * historial. Es lo que hace que se vea a quien nunca le ha tocado, que es
 * justo lo que la hoja de cálculo enseñaba como una fila entera en blanco.
 */
export const construirReparto = ({
  code,
  titulo,
  elegibles,
  history,
  hoy = new Date(),
  meses = REPARTO_MESES,
}: {
  code: AssignmentCode;
  titulo: string;
  elegibles: PersonType[];
  history: AssignmentHistoryType[];
  hoy?: Date;
  meses?: number;
}): RepartoAsignacionType => {
  const desde = desdeMes(hoy, meses);

  const deEstaAsignacion = history.filter(
    (record) => record.assignment.code === code
  );

  const personas: RepartoPersonaType[] = elegibles.map((person) => {
    const suyas = deEstaAsignacion.filter(
      (record) => record.assignment.person === person.person_uid
    );

    // La cuenta se hace dentro de la ventana; la ÚLTIMA VEZ no, porque «hace
    // catorce meses» es justo lo que hay que poder ver.
    const veces = suyas.filter((record) => record.weekOf >= desde).length;

    const ultima = suyas
      .map((record) => record.weekOf)
      .sort((a, b) => b.localeCompare(a))
      .at(0);

    return { person_uid: person.person_uid, veces, ultima: ultima ?? '' };
  });

  // El mismo orden que usa el autocompletado: quien no la ha llevado nunca
  // primero, después por antigüedad. No es una vista aparte que haya que
  // creerse — es el motor, enseñado.
  personas.sort((a, b) => {
    if (a.ultima !== b.ultima) return a.ultima.localeCompare(b.ultima);

    return a.person_uid.localeCompare(b.person_uid);
  });

  const cuentas = personas.map((p) => p.veces);
  const menos = cuentas.length > 0 ? Math.min(...cuentas) : 0;
  const mas = cuentas.length > 0 ? Math.max(...cuentas) : 0;

  return {
    code,
    titulo,
    personas,
    menos,
    mas,
    desigual: mas - menos >= 3,
  };
};

/**
 * Cómo se llama cada asignación en el resumen.
 *
 * Se saca del propio historial —el título que más se repite para ese código—
 * en vez de una tabla escrita a mano: así una asignación que la app renombre
 * se renombra aquí sola. Para las partes de estudiante, cuyo título es el de
 * la parte de esa semana y cambia cada vez, el título más repetido no sirve, y
 * por eso se pueden pasar rótulos fijos.
 */
export const tituloDeAsignacion = (
  history: AssignmentHistoryType[],
  code: AssignmentCode,
  fijos: Partial<Record<AssignmentCode, string>> = {}
) => {
  if (fijos[code]) return fijos[code];

  const cuenta = new Map<string, number>();

  for (const record of history) {
    if (record.assignment.code !== code) continue;

    const titulo = record.assignment.title?.trim();
    if (!titulo) continue;

    cuenta.set(titulo, (cuenta.get(titulo) ?? 0) + 1);
  }

  let mejor = '';
  let mejorCuenta = 0;

  for (const [titulo, veces] of cuenta) {
    if (veces > mejorCuenta) {
      mejor = titulo;
      mejorCuenta = veces;
    }
  }

  return mejor;
};
