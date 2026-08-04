import { describe, expect, it, vi } from 'vitest';

/**
 * La lista de títulos vive en las traducciones, que en Node no se cargan. Se
 * pone aquí la MISMA cadena que trae `es-SSP/forms-templates.json`, para que la
 * prueba falle si alguien cambia la lista sin querer.
 */
vi.mock('@services/i18n/translation', async (original) => ({
  ...((await original()) as object),
  getTranslation: ({ key }: { key: string }) =>
    key === 'tr_lcNoAssignedVariations'
      ? 'Logros de la Organización|Informe del Cuerpo Gobernante'
      : '',
}));

import { sourcesLCPartNeedsAssignee } from './sources';

/**
 * ¿Se pone a alguien en «Logros de la organización»?
 *
 * La aplicación reconoce dos partes de «Nuestra vida cristiana» por su título y
 * no pide hermano: normalmente son un vídeo o un informe que presenta quien
 * preside. Pero eso no vale para todas las congregaciones — en Elda Centro se
 * lleva como análisis con el auditorio, y no había forma de asignar a nadie
 * porque la casilla ni siquiera salía en pantalla.
 *
 * Lo que se prueba aquí es que la regla y su ajuste dan UNA sola respuesta, la
 * misma que usan el editor y el autocompletado. Si se separaran, la aplicación
 * pediría un hermano en pantalla y el autocompletado se saltaría esa parte para
 * siempre.
 */

const ESPANOL = 'es-SSP';

describe('«Logros de la organización» y el «Informe del Cuerpo Gobernante»', () => {
  it('sin el ajuste no piden hermano, que es como se ha comportado siempre', () => {
    expect(
      sourcesLCPartNeedsAssignee(
        '9. Logros de la organización para el mes de septiembre',
        ESPANOL,
        false
      )
    ).toBe(false);

    expect(
      sourcesLCPartNeedsAssignee(
        '8. Informe del Cuerpo Gobernante',
        ESPANOL,
        false
      )
    ).toBe(false);
  });

  it('con el ajuste puesto, sí', () => {
    expect(
      sourcesLCPartNeedsAssignee(
        '9. Logros de la organización para el mes de septiembre',
        ESPANOL,
        true
      )
    ).toBe(true);
  });

  it('cualquier otra parte pide hermano, con ajuste o sin él', () => {
    // El ajuste solo levanta la excepción; no cambia el caso normal.
    for (const puesto of [false, true]) {
      expect(
        sourcesLCPartNeedsAssignee(
          '8. El autocontrol nos ayuda a obedecer',
          ESPANOL,
          puesto
        )
      ).toBe(true);
    }
  });

  it('no se despista con las mayúsculas ni con lo que venga detrás', () => {
    // El título real trae número delante y el mes detrás.
    expect(
      sourcesLCPartNeedsAssignee(
        '9. LOGROS DE LA ORGANIZACIÓN PARA EL MES DE OCTUBRE',
        ESPANOL,
        false
      )
    ).toBe(false);
  });
});
