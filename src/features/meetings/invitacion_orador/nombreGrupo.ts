import { FieldServiceGroupType } from '@definition/field_service_groups';

/**
 * Cómo se llama un grupo de predicación.
 *
 * Casi ninguna congregación les pone nombre: se llaman por su número, y el
 * número es `sort_index + 1`. Es la misma regla que usa Limpieza, y hay que
 * usarla en vez de leer `group_data.name` a secas — leyéndolo a secas salía
 * «Grupo» a todo el mundo, porque ese campo está vacío.
 */
export const nombreDeGrupo = (
  grupo: FieldServiceGroupType | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string => {
  if (!grupo) return '';

  if (grupo.group_data.name && grupo.group_data.name.length > 0) {
    return grupo.group_data.name;
  }

  return t('tr_groupNumber', { groupNumber: grupo.group_data.sort_index + 1 });
};
