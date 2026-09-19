import { Box } from '@mui/material';
import Card from '@components/card';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import Typography from '@components/typography';
import useApplicant from './useApplicant';

/**
 * «¿De quién es esta solicitud?» — solo aparece si hay personas delegadas.
 *
 * Va en su propia tarjeta, ANTES del formulario, porque es lo primero que hay
 * que decidir: todo lo que se rellena debajo es de esa persona.
 */
const ApplicantSelector = () => {
  const { options, value, isSelf, visible, handleChange } = useApplicant();

  if (!visible) return null;

  return (
    <Card>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography className="h3" color="var(--ink)">
          ¿De quién es esta solicitud?
        </Typography>
        <Typography className="body-small-regular" color="var(--ink-2)">
          Puedes enviarla por las personas que tengas delegadas. El comité verá
          que la has enviado tú.
        </Typography>
      </Box>

      <Select
        label="Solicitud de"
        value={value}
        onChange={(e) => handleChange(e.target.value as string)}
        sx={{ color: 'var(--black)' }}
      >
        {options.map((record) => (
          <MenuItem key={record.person_uid} value={record.person_uid}>
            <Typography>
              {record.self ? `${record.name} (tú)` : record.name}
            </Typography>
          </MenuItem>
        ))}
      </Select>

      {!isSelf && (
        <Typography className="body-small-regular" color="var(--ink-2)">
          Lo que rellenes abajo es la solicitud de esa persona, y así le llegará
          al comité de servicio.
        </Typography>
      )}
    </Card>
  );
};

export default ApplicantSelector;
