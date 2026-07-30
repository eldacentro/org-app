import { Stack } from '@mui/material';
import { GroupItemProps } from './index.types';
import { GroupContainer } from './index.styles';
import useGroupItem from './useGroupItem';
import Divider from '@components/divider';
import GroupHeader from './header';
import GroupMember from './member';

const GroupItem = (props: GroupItemProps) => {
  const { border_color, divider_color, members } = useGroupItem(props);

  // La tarjeta ya no lleva `group-card-glass` ni `group-card-hover-effect`:
  // se levantaba 4px al pasar el ratón, con curva de rebote, sombra de color y
  // cambio de borde — y no es pulsable, solo lo son el lápiz de la cabecera y
  // los menús de cada fila. Prometía algo que no existe.
  //
  // El "cristal", además, la dejaba semitransparente con un desenfoque de 18px
  // detrás (caro en un móvil) y con sombras en azul fijo que no seguían el
  // color del tema elegido.
  return (
    <GroupContainer sx={{ border: border_color }}>
      <GroupHeader
        group={props.group}
        index={props.index}
        editable={props.editable}
      />

      <Stack spacing="4px" divider={<Divider color={divider_color} />} sx={{ padding: '16px 12px 12px 12px' }}>
        {members.map((member) => (
          <GroupMember
            key={member.person_uid}
            index={props.index}
            member={member}
            group_id={props.group.group_id}
            editable={props.editable}
          />
        ))}
      </Stack>
    </GroupContainer>
  );
};

export default GroupItem;
