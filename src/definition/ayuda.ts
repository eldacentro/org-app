import { ReactElement } from 'react';

/**
 * Contenido de la sección Ayuda.
 *
 * Cada sección es visible solo para los roles que le corresponden (ver
 * `visible` — recibe los flags de useCurrentUser). Los artículos se escriben
 * como bloques tipados para que toda la guía tenga el mismo aspecto y sea
 * fácil de ampliar: párrafo, pasos numerados, consejo, aviso y pregunta
 * frecuente.
 */

export type AyudaRoles = {
  isAdmin: boolean;
  isElder: boolean;
  isSecretary: boolean;
  isPublicTalkCoordinator: boolean;
  isMidweekEditor: boolean;
  isWeekendEditor: boolean;
  isDepartmentsEditor: boolean;
  isAttendanceEditor: boolean;
  isGroupOverseer: boolean;
  isServiceCommittee: boolean;
  isPersonViewer: boolean;
  isSettingsEditor: boolean;
};

export type AyudaBlock =
  | { type: 'p'; text: string }
  | { type: 'steps'; title?: string; items: string[] }
  | { type: 'tip'; text: string }
  | { type: 'warn'; text: string }
  | { type: 'faq'; q: string; a: string }
  // "Llévame allí": botón que navega a una ruta real de la app (nunca se
  // queda desactualizado, es una ruta). `to` es el path de react-router.
  | { type: 'link'; to: string; label: string }
  // Leyenda de iconos REALES de la app (los mismos componentes que ve el
  // usuario en pantalla): así "cuál botón" queda claro sin capturas.
  | { type: 'iconrow'; items: { icon: ReactElement; text: string }[] }
  // Diagrama conceptual dibujado (SVG/CSS), no una captura. `kind` elige cuál.
  | { type: 'diagram'; kind: 'sync' };

export type AyudaArticle = {
  id: string;
  title: string;
  blocks: AyudaBlock[];
};

export type AyudaSection = {
  id: string;
  title: string;
  description: string;
  icon: ReactElement;
  visible: (roles: AyudaRoles) => boolean;
  articles: AyudaArticle[];
  /** sin contenido todavía: solo la ve el admin, con etiqueta "En preparación" */
  comingSoon?: boolean;
};
