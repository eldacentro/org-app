import { describe, expect, it } from 'vitest';
import { FieldServiceGroupType } from '@definition/field_service_groups';
import { nombreDeGrupo } from './nombreGrupo';

/** El `t` de verdad para esta clave: «Grupo {{ groupNumber }}». */
const t = (key: string, options?: Record<string, unknown>) =>
  key === 'tr_groupNumber' ? `Grupo ${options?.groupNumber}` : key;

const grupo = (name: string, sort_index: number) =>
  ({ group_id: 'g', group_data: { name, sort_index } }) as FieldServiceGroupType;

/**
 * Casi ninguna congregación pone nombre a sus grupos: se llaman por su número.
 * Leer `group_data.name` a secas les llamaba «Grupo» a todos, que es lo que se
 * vio en la rotación de cenas.
 */
describe('cómo se llama un grupo de predicación', () => {
  it('sin nombre, es su número — y el número empieza en 1', () => {
    expect(nombreDeGrupo(grupo('', 0), t)).toBe('Grupo 1');
    expect(nombreDeGrupo(grupo('', 2), t)).toBe('Grupo 3');
  });

  it('con nombre, manda el nombre', () => {
    expect(nombreDeGrupo(grupo('Grupo de Elda Norte', 4), t)).toBe(
      'Grupo de Elda Norte'
    );
  });

  it('sin grupo, no se inventa nada', () => {
    expect(nombreDeGrupo(undefined, t)).toBe('');
  });
});
