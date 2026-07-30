import { useMemo } from 'react';
import { GroupBadgeProps } from './index.types';

const useBadge = ({ group }: GroupBadgeProps) => {
  // Blanco translúcido, no el color del grupo: ahora la cabecera YA es de ese
  // color, así que la píldora quedaba color sobre el mismo color y
  // desaparecía. Translúcido funciona con los diez colores de grupo sin
  // elegir uno a mano para cada uno.
  const bg_color = 'color-mix(in srgb, var(--always-white) 22%, transparent)';

  const members_count = useMemo(() => {
    return group.group_data.members.length;
  }, [group]);

  return { bg_color, members_count };
};

export default useBadge;
