export type PublicTalksViewType = 'list' | 'table';

export type PublicTalkType = {
  talk_number: number;
  talk_title: { [language: string]: string };
};

export type PublicTalkLocaleType = {
  talk_number: number;
  talk_title: string;
};

/**
 * Datos extraídos de un archivo .jwpub (S-34) al importarlo: número y título
 * de cada bosquejo, tal como están en la fuente oficial de los Testigos de
 * Jehová, antes de comparar contra lo que ya tenemos.
 */
export type PublicTalkImportEntryType = {
  talk_number: number;
  talk_title: string;
};

export type PublicTalkImportDiffType = {
  talk_number: number;
  type: 'added' | 'renamed' | 'reactivated' | 'retired' | 'unchanged';
  previous_title: string;
  new_title: string;
};

/**
 * Lo que de verdad se guarda y se sincroniza: por idioma, solo los números
 * de bosquejo cuyo título difiere del que trae la app por defecto (vía
 * Crowdin). No se duplica la lista completa — un bosquejo sin diferencias
 * simplemente no aparece aquí.
 */
export type PublicTalkOverrideType = {
  id: string;
  updatedAt: string;
  overrides: Record<string, Record<string, string>>;
};
