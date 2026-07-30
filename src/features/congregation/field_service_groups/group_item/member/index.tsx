import { Box, Menu, Stack } from '@mui/material';
import {
  IconAssistant,
  IconOverseer,
  IconMore,
  IconRemovePerson,
} from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { GroupMemberProps } from './index.types';
import useMember from './useMember';
import IconButton from '@components/icon_button';
import MenuItem from '@components/menuitem';
import RemovePerson from '../remove_person';
import Typography from '@components/typography';

const GroupMember = (props: GroupMemberProps) => {
  const { t } = useAppTranslation();

  const {
    member_name,
    member_desc,
    icon_hover_color,
    anchorEl,
    handleCloseMenu,
    handleOpenMenu,
    open,
    make_assistant,
    make_overseer,
    handleMakeOverseer,
    handleMakeAssistant,
    handleCloseRemove,
    handleOpenRemove,
    handlePersonRemove,
    removeOpen,
    isServiceCommittee,
    label_overseer,
    isPioneer,
  } = useMember(props);

  const destacado = props.member.isOverseer || props.member.isAssistant;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: 'var(--shape-sm)',
        // SIN reacción al ratón. La fila no se puede pulsar —lo único pulsable
        // es el menú de los tres puntos— así que iluminarla al pasar por encima
        // promete algo que no existe. Antes, además, se desplazaba 6px a la
        // derecha con una curva de rebote: en una lista de dieciocho nombres,
        // una fila que se mueve y se desalinea con sus vecinas cada vez que el
        // ratón la cruza.
      }}
    >
      {removeOpen && (
        <RemovePerson
          action={handlePersonRemove}
          group_id={props.group_id}
          index={props.index}
          member={props.member}
          onClose={handleCloseRemove}
          open={removeOpen}
        />
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* El distintivo SOLO para el superintendente y su auxiliar. Los demás
            llevaban un icono de personita idéntico en las dieciocho filas: no
            distinguía a nadie y, peor, hacía que los dos que sí importan se
            perdieran entre dieciséis medallones iguales. Sin él, el hueco se
            reserva igual para que todos los nombres arranquen de la misma
            línea. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: 'var(--shape-full)',
            flexShrink: 0,
            ...(destacado && {
              backgroundColor: `rgba(var(--group-${props.index}-base), 0.12)`,
              color: `var(--group-${props.index})`,
            }),
          }}
        >
          {props.member.isOverseer && (
            <IconOverseer color="currentColor" width={18} height={18} />
          )}
          {props.member.isAssistant && (
            <IconAssistant color="currentColor" width={18} height={18} />
          )}
        </Box>

        <Stack>
          {/* El nombre es lo principal de la fila, así que va al tamaño de
              cuerpo. Estaba en el tamaño pequeño —el de los metadatos— por un
              apaño viejo: el código original pedía una clase "body-medium" que
              nunca existió, y al arreglarlo se eligió la pequeña en vez de la
              de cuerpo. */}
          <Typography
            className={isPioneer ? 'body-regular-semibold' : 'body-regular'}
            color="var(--ink)"
          >
            {member_name}
          </Typography>

          {member_desc && (
            <Typography className="label-small-medium" color="var(--ink-3)">
              {member_desc}
            </Typography>
          )}
        </Stack>
      </Box>

      {props.editable && isServiceCommittee && (
        <>
          <IconButton
            onClick={handleOpenMenu}
            sx={{
              padding: 0,
              '&:hover': { backgroundColor: icon_hover_color },
            }}
          >
            <IconMore color="var(--grey-400)" />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleCloseMenu}
            sx={{
              marginTop: '8px',
              '& li': {
                borderBottom: '1px solid var(--line)',
              },
              '& li:last-child': {
                borderBottom: 'none',
              },
            }}
            slotProps={{
              paper: {
                className: 'small-card-shadow',
                style: {
                  borderRadius: 'var(--shape-sm)',
                  border: '1px solid var(--line)',
                  backgroundColor: 'var(--card)',
                },
              },
            }}
          >
            {make_overseer && (
              <MenuItem
                onClick={handleMakeOverseer}
                sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <IconOverseer color="var(--black)" />
                <Typography>{t(label_overseer)}</Typography>
              </MenuItem>
            )}

            {make_assistant && (
              <MenuItem
                onClick={handleMakeAssistant}
                sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <IconAssistant color="var(--black)" />
                <Typography>{t('tr_makeAssistant')}</Typography>
              </MenuItem>
            )}

            <MenuItem
              onClick={handleOpenRemove}
              sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <IconRemovePerson color="var(--red-main)" />
              <Typography color="var(--red-main)">
                {t('tr_removeFromGroups')}
              </Typography>
            </MenuItem>
          </Menu>
        </>
      )}
    </Box>
  );
};

export default GroupMember;
