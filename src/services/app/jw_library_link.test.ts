import { describe, expect, it } from 'vitest';
import { SourceWeekType } from '@definition/sources';
import {
  midweekJwLibraryLink,
  watchtowerJwLibraryLink,
} from './jw_library_link';

/**
 * Enlaces a JW Library.
 *
 * Un enlace mal formado no rompe nada visible: abre la publicación equivocada,
 * y eso no se descubre hasta estar sentado en la reunión. De ahí las pruebas.
 */

const semana = (extra: Partial<SourceWeekType> = {}) =>
  ({ weekOf: '2026/08/03', ...extra }) as unknown as SourceWeekType;

describe('reunión de entre semana', () => {
  it('con el .jwpub importado abre la semana exacta', () => {
    const url = midweekJwLibraryLink(
      semana({ mwb_week_docid: 202600123 }),
      '2026/08/03',
      'S'
    );

    expect(url).toContain('docid=202600123');
    expect(url).toContain('wtlocale=S');
  });

  it('sin identificador cae al cuaderno del bimestre', () => {
    expect(midweekJwLibraryLink(semana(), '2026/08/03', 'S')).toContain(
      'pub=mwb&issue=202607'
    );
  });

  it('el número del cuaderno lleva SIEMPRE el mes impar del par', () => {
    // Agosto pertenece al cuaderno de julio-agosto: si esto se calculara con
    // el mes de la semana, agosto abriría un cuaderno que no existe.
    expect(midweekJwLibraryLink(semana(), '2026/08/03', 'S')).toContain(
      'issue=202607'
    );
    expect(midweekJwLibraryLink(semana(), '2026/07/06', 'S')).toContain(
      'issue=202607'
    );
    expect(midweekJwLibraryLink(semana(), '2026/12/28', 'S')).toContain(
      'issue=202611'
    );
  });

  it('sin fecha utilizable, no se inventa un enlace', () => {
    expect(midweekJwLibraryLink(semana(), '', 'S')).toBeNull();
    expect(midweekJwLibraryLink(undefined, 'lo que sea', 'S')).toBeNull();
  });
});

describe('estudio de La Atalaya', () => {
  it('con el .jwpub importado abre el artículo exacto', () => {
    expect(
      watchtowerJwLibraryLink(semana({ w_study_docid: 2026560 }), 'S')
    ).toContain('docid=2026560');
  });

  it('SIN identificador no hay enlace, a propósito', () => {
    // El número de estudio se publica dos o tres meses antes, y el desfase
    // cambia dentro del propio cuaderno. Mejor nada que el número equivocado.
    expect(watchtowerJwLibraryLink(semana(), 'S')).toBeNull();
    expect(watchtowerJwLibraryLink(undefined, 'S')).toBeNull();
  });

  it('el identificador de entre semana no vale para el fin de semana', () => {
    expect(
      watchtowerJwLibraryLink(semana({ mwb_week_docid: 999 }), 'S')
    ).toBeNull();
  });
});
