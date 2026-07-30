export type MemberItemProps = {
  member: string;
  onDelete: (id: string) => void;

  /** Mover una posición arriba (flecha ↑ con el asa enfocada). */
  onSubir?: () => void;
  /** Mover una posición abajo (flecha ↓ con el asa enfocada). */
  onBajar?: () => void;
};
