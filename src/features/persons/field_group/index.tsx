import { Box } from '@mui/material';
import { useCurrentUser } from '@hooks/index';
import useFieldGroup from './useFieldGroup';
import InfoTip from '@components/info_tip';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import Typography from '@components/typography';

/**
 * Tarjeta "Grupo de predicación" del perfil de la persona.
 *
 * - Si la persona es miembro real de un grupo, se muestra esa pertenencia
 *   (solo lectura — se gestiona desde "Grupos de predicación") junto con una
 *   nota de visibilidad si está inactiva.
 * - Si no es miembro de ninguno, se puede asignar un grupo "interno" que solo
 *   se usa para la organización de los ancianos (PDF de contactos de
 *   emergencia, superintendente de grupo) sin aparecer en la vista pública.
 */
const PersonFieldGroup = () => {
  const { isPersonEditor } = useCurrentUser();

  const {
    groups,
    memberGroup,
    assignedGroup,
    assignedGroupId,
    isInactive,
    hasConcession,
    inactiveVisibleToElders,
    handleChangeAssignedGroup,
  } = useFieldGroup();

  return (
    <Box
      sx={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        display: 'flex',
        padding: '16px',
        gap: '16px',
        flexDirection: 'column',
        borderRadius: 'var(--r-lg)',
      }}
    >
      <Typography className="h2">Grupo de predicación</Typography>

      {memberGroup && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Typography className="body-regular">
            Es miembro de <strong>{memberGroup.name}</strong>. La pertenencia
            se gestiona desde el selector de grupo en Estado espiritual o
            desde Congregación → Grupos de predicación.
          </Typography>

          {isInactive && !hasConcession && (
            <InfoTip
              isBig={false}
              color="warning"
              text={
                inactiveVisibleToElders
                  ? 'Al estar inactivo, en Grupos de predicación solo los ancianos lo ven dentro de su grupo. Si debe seguir siendo visible para todos, activa la concesión en Estado espiritual.'
                  : 'Al estar inactivo no aparece en Grupos de predicación (la congregación tiene desactivada la visibilidad de inactivos también para los ancianos). Si debe seguir siendo visible, activa la concesión en Estado espiritual.'
              }
            />
          )}

          {isInactive && hasConcession && (
            <InfoTip
              isBig={false}
              color="success"
              text="Está inactivo, pero con la concesión activada: sigue apareciendo en su grupo para toda la congregación."
            />
          )}
        </Box>
      )}

      {!memberGroup && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Select
            label="Grupo (organización interna)"
            value={assignedGroupId}
            onChange={(e) =>
              handleChangeAssignedGroup(e.target.value as string)
            }
            readOnly={!isPersonEditor}
          >
            <MenuItem value="">
              <Typography>Sin asignar</Typography>
            </MenuItem>
            {groups.map((group) => (
              <MenuItem key={group.group_id} value={group.group_id}>
                <Typography>{group.name}</Typography>
              </MenuItem>
            ))}
          </Select>

          {assignedGroup && (
            <InfoTip
              isBig={false}
              color="info"
              text={`No aparecerá en ${assignedGroup.name} en Grupos de predicación: esta asignación es solo para la organización interna (contactos de emergencia y superintendente de grupo).`}
            />
          )}

          {!assignedGroup && (
            <Typography className="label-small-regular" color="var(--grey-350)">
              No es miembro de ningún grupo. Puedes asignarle uno a efectos
              internos para que salga con ese grupo en el PDF de contactos de
              emergencia.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default PersonFieldGroup;
