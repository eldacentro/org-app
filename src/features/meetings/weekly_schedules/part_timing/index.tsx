import Badge from '@components/badge';
import { PartTimingProps } from './index.types';
import { useMeetingRunPart } from '../meeting_run/useMeetingRunPart';

/**
 * La hora a la que empieza una parte.
 *
 * Es SIEMPRE la hora del programa, calculada con lo que dura cada parte. Antes,
 * mientras alguien seguía la reunión en directo, se corría con el retraso y
 * cambiaba sola cada minuto; el retraso ya lo dice la barra de abajo. Lo único
 * que cambia en directo es el color: gris apagado lo que ya pasó y azul lo que
 * está sonando. Fuera de eso —y en la reunión del fin de semana, que no pasa
 * `partKey`— se ve como siempre.
 */
const PartTiming = ({ time, partKey }: PartTimingProps) => {
  const run = useMeetingRunPart(partKey);

  const color = run?.status === 'current' ? 'accent' : 'grey';

  return (
    <Badge
      size="small"
      color={color}
      filled={run?.status === 'current'}
      faded={run?.status === 'done'}
      text={time}
      centerContent
      className="label-small-medium"
      sx={{
        width: '45px',
        borderRadius: 'var(--shape-full)',
        padding: '12px 6px',
      }}
    />
  );
};

export default PartTiming;
