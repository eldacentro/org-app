import { useCurrentUser } from '@hooks/index';
import useRepeatNotice from './useRepeatNotice';
import MenuItem from '@components/menuitem';
import Select from '@components/select';
import Typography from '@components/typography';

/**
 * Avisar de que un bosquejo ya se dio hace poco.
 *
 * Las opciones son meses redondos y no un campo libre a propósito: nadie
 * necesita decir «catorce meses y medio», y un desplegable no se puede rellenar
 * mal.
 *
 * Lo decide la congregación porque cada una tiene su costumbre sobre cuánto
 * debe pasar; por eso también existe «No avisar».
 */
const OPCIONES = [0, 6, 12, 18, 24, 36];

const RepeatNotice = () => {
  const { isWeekendEditor, isPublicTalkCoordinator } = useCurrentUser();

  const { meses, handleChange } = useRepeatNotice();

  return (
    <Select
      label="Avisar si el bosquejo ya se dio hace menos de"
      value={meses}
      onChange={(e) => handleChange(Number(e.target.value))}
      readOnly={!isWeekendEditor && !isPublicTalkCoordinator}
    >
      {OPCIONES.map((opcion) => (
        <MenuItem key={opcion} value={opcion}>
          <Typography>
            {opcion === 0 ? 'No avisar' : `${opcion} meses`}
          </Typography>
        </MenuItem>
      ))}
    </Select>
  );
};

export default RepeatNotice;
