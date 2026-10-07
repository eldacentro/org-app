import { describe, expect, it } from 'vitest';
import { AssignmentCode } from '@definition/assignment';
import { tipoDeParteAYF } from './sources';

/**
 * De qué tipo es cada parte de «Seamos mejores maestros».
 *
 * De esto depende que una parte de estudiante se pueda asignar a una hermana:
 * si no se reconoce, cae en «Análisis con el auditorio», que es de hermanos, y
 * la hermana deja de aparecer en la lista sin que nada lo explique. Pasó con
 * todo noviembre de 2026.
 */

/** Las etiquetas que la app tiene en español, tal cual las monta Dexie. */
const LISTA = [
  { label: 'Empiece conversaciones', value: AssignmentCode.MM_StartingConversation },
  { label: 'Haga revisitas', value: AssignmentCode.MM_FollowingUp },
  { label: 'Haga discípulos', value: AssignmentCode.MM_MakingDisciples },
  { label: 'Explique sus creencias', value: AssignmentCode.MM_ExplainingBeliefs },
  { label: 'Discurso', value: AssignmentCode.MM_Talk },
  { label: 'Análisis con el auditorio', value: AssignmentCode.MM_Discussion },
];

describe('el tipo de una parte de Seamos mejores maestros', () => {
  it('reconoce la redacción de siempre', () => {
    expect(tipoDeParteAYF('Empiece conversaciones', LISTA)).toBe(
      AssignmentCode.MM_StartingConversation
    );
    expect(tipoDeParteAYF('Discurso', LISTA)).toBe(AssignmentCode.MM_Talk);
  });

  // El material cambió de redacción el 2 de noviembre de 2026. Sin esto,
  // noviembre entero se volvía «Análisis con el auditorio» y no se podía poner
  // a ninguna hermana.
  it('reconoce la redacción nueva, en primera persona del plural', () => {
    expect(tipoDeParteAYF('Empecemos conversaciones', LISTA)).toBe(
      AssignmentCode.MM_StartingConversation
    );
    expect(tipoDeParteAYF('Hagamos revisitas', LISTA)).toBe(
      AssignmentCode.MM_FollowingUp
    );
    expect(tipoDeParteAYF('Hagamos discípulos', LISTA)).toBe(
      AssignmentCode.MM_MakingDisciples
    );
    expect(tipoDeParteAYF('Expliquemos nuestras creencias', LISTA)).toBe(
      AssignmentCode.MM_ExplainingBeliefs
    );
  });

  it('no se cae por una tilde, una mayúscula o un espacio de más', () => {
    expect(tipoDeParteAYF('  hagamos discipulos ', LISTA)).toBe(
      AssignmentCode.MM_MakingDisciples
    );
    expect(tipoDeParteAYF('HAGAMOS  REVISITAS', LISTA)).toBe(
      AssignmentCode.MM_FollowingUp
    );
  });

  it('se come el espacio de ancho cero que cuela el material', () => {
    expect(tipoDeParteAYF('Empecemos​ conversaciones', LISTA)).toBe(
      AssignmentCode.MM_StartingConversation
    );
  });

  // «¿Qué dirías?» es de verdad un análisis con el auditorio, así que el
  // comodín acierta. Lo que no puede es tragarse una parte de estudiante.
  it('lo que no reconoce sigue siendo análisis con el auditorio', () => {
    expect(tipoDeParteAYF('¿Qué dirías?', LISTA)).toBe(
      AssignmentCode.MM_Discussion
    );
    expect(tipoDeParteAYF('', LISTA)).toBe(AssignmentCode.MM_Discussion);
  });
});
