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
 * Lo que se extrae de un archivo `.jwpub` y cómo se compara contra lo que ya
 * hay vive en `@services/app/jwpub_report`: es lo MISMO para los bosquejos de
 * discursos y para el cancionero —una lista de «número + título»— y tenerlo
 * dos veces era tenerlo dos veces mal.
 */

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
