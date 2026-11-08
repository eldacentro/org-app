import { describe, expect, it } from 'vitest';
import { assignmentIsFreeText } from './schedules';

describe('nombre escrito a mano o identificador', () => {
  it('un nombre escrito a mano se enseña tal cual', () => {
    expect(assignmentIsFreeText({ solo: true, value: 'Óscar Martínez' })).toBe(
      true
    );
  });

  it('un identificador marcado como texto libre se busca como orador', () => {
    // El discurso del 15 de noviembre de 2026: salía «24f931b0-…» en el programa.
    expect(
      assignmentIsFreeText({
        solo: true,
        value: '24f931b0-9c9d-4e91-8989-98a474ea06e3',
      })
    ).toBe(false);
    expect(
      assignmentIsFreeText({
        solo: true,
        value: '343F3588-3587-4004-B254-61F8C6DF74A4',
      })
    ).toBe(false);
  });

  it('sin la marca nunca es texto libre', () => {
    expect(assignmentIsFreeText({ solo: false, value: 'José' })).toBe(false);
    expect(assignmentIsFreeText(undefined)).toBe(false);
  });
});
