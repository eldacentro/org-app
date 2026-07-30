import { describe, expect, it } from 'vitest';
import { schedulesS89AssignmentCarriesSlip } from './pending_s89';
import { AssignmentCode, AssignmentFieldType } from '@definition/assignment';
import { SourceWeekType } from '@definition/sources';

/**
 * ¿Esta asignación lleva hoja S-89?
 *
 * Se prueba porque de esta respuesta dependen TRES cosas que tienen que decir
 * lo mismo —el contador de pendientes, las hojas que se imprimen y la casilla
 * de "entregada"—, y cuando no coincidían el resultado era un contador que no
 * podía llegar nunca a cero: contaba una hojita que no existe y que, por
 * tanto, nadie podía marcar como entregada.
 */

const LANG = 'S';

/** Material de la semana de mentira: solo el tipo de cada parte de SMM. */
const material = (tipos: Partial<Record<string, AssignmentCode>>) =>
  ({
    midweek_meeting: Object.fromEntries(
      Object.entries(tipos).map(([parte, tipo]) => [
        parte,
        { type: { [LANG]: tipo } },
      ])
    ),
  }) as unknown as SourceWeekType;

const lleva = (
  assignment: string,
  source: SourceWeekType | undefined = undefined
) =>
  schedulesS89AssignmentCarriesSlip(
    assignment as AssignmentFieldType,
    source,
    LANG
  );

describe('qué asignaciones llevan hoja S-89', () => {
  it('la lectura de la Biblia siempre lleva: es de un estudiante', () => {
    expect(lleva('MM_TGWBibleReading_A')).toBe(true);
    expect(lleva('MM_TGWBibleReading_B')).toBe(true);
  });

  it('una parte de SMM normal lleva', () => {
    const source = material({ ayf_part1: AssignmentCode.MM_InitialCall });

    expect(lleva('MM_AYFPart1_Student_A', source)).toBe(true);
  });

  it('una parte de «Análisis» NO lleva: la dirige un hermano', () => {
    // Este es el fallo original. Se guarda en el mismo campo que las de
    // estudiante (`MM_AYFPartN_Student_A`), así que el contador la contaba,
    // se imprimía su hoja, y la casilla de "entregada" no se dibujaba nunca
    // —el selector de hermanos no la tiene—: quedaba pendiente para siempre.
    const source = material({ ayf_part1: AssignmentCode.MM_Discussion });

    expect(lleva('MM_AYFPart1_Student_A', source)).toBe(false);
    expect(lleva('MM_AYFPart1_Student_B', source)).toBe(false);
  });

  it('cada parte se mira por separado', () => {
    const source = material({
      ayf_part1: AssignmentCode.MM_Discussion,
      ayf_part2: AssignmentCode.MM_InitialCall,
    });

    expect(lleva('MM_AYFPart1_Student_A', source)).toBe(false);
    expect(lleva('MM_AYFPart2_Student_A', source)).toBe(true);
  });

  it('sin material, se responde que sí', () => {
    // Es preferible una hojita de más —que se ve y se descarta— a que
    // desaparezca en silencio una que sí tocaba entregar. Es además cómo se
    // comportaba antes de existir esta comprobación.
    expect(lleva('MM_AYFPart1_Student_A', undefined)).toBe(true);
    expect(lleva('MM_AYFPart1_Student_A', material({}))).toBe(true);
  });

  it('lo que no está en la lista de la S-89 no lleva', () => {
    expect(lleva('MM_AYFPart1_Assistant_A')).toBe(false);
    expect(lleva('WM_Speaker_Outgoing')).toBe(false);
    expect(lleva('MM_ChairmanA')).toBe(false);
  });
});
