export type SongType = {
  song_number: number;
  song_title: { [language: string]: string };
};

export type SongLocaleType = {
  song_number: number;
  song_title: string;
};

/**
 * Lo que un administrador importó a mano desde el `.jwpub` del cancionero.
 *
 * Vive en SU PROPIA tabla y no en `songs`, y esa es toda la gracia del
 * asunto: `songs` es una tabla DERIVADA, se rehace entera desde las
 * traducciones al terminar cada sincronización, y cualquier cosa escrita
 * directamente ahí desaparece en el ciclo siguiente. Aquí no la alcanza
 * nadie: la reconstrucción vuelve a poner esto por encima cada vez (ver
 * `services/dexie/songs.ts`). Es el mismo trato que ya tienen los bosquejos
 * de discursos públicos con `public_talks_override`.
 *
 * Por idioma, solo los números cuyo título difiere del que trae la aplicación
 * por defecto: un cántico sin diferencias sencillamente no aparece.
 */
export type SongOverrideType = {
  id: string;
  updatedAt: string;
  overrides: Record<string, Record<string, string>>;
  /**
   * De dónde salió. Sin esto, la fecha de importación no dice nada: saber que
   * se importó algo el martes no es saber QUÉ cancionero tiene la
   * congregación.
   */
  publicationTitle: string;
  /** El símbolo del catálogo: 'sjj', 'sjjm'… */
  symbol: string;
  /** Cuántos cánticos traía el archivo. */
  total: number;
};
