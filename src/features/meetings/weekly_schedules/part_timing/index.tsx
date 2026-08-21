import Badge from '@components/badge';
import { PartTimingProps } from './index.types';
import { useMeetingRunPart } from '../meeting_run/useMeetingRunPart';

/**
 * La hora a la que empieza una parte.
 *
 * Mientras se sigue la reunión en directo estos mismos relojitos se pintan
 * solos: gris apagado lo que ya pasó, azul lo que está sonando, y naranja con la
 * hora corrida lo que queda cuando la reunión va con retraso. Fuera de eso —y en
 * la reunión del fin de semana, que no pasa `partKey`— se ven como siempre.
 */
const PartTiming = ({ time, partKey }: PartTimingProps) => {
  const run = useMeetingRunPart(partKey);

  const corrida = run?.shifted;

  // Naranja solo cuando la reunión va TARDE. Yendo por delante la hora también
  // se corre, pero no hay nada que avisar: pintarlo de naranja diría «cuidado»
  // justo cuando todo va bien.
  const color =
    run?.status === 'current'
      ? 'accent'
      : corrida
        ? run.drift > 0
          ? 'orange'
          : 'accent'
        : 'grey';

  return (
    <Badge
      size="small"
      color={color}
      filled={run?.status === 'current'}
      faded={run?.status === 'done'}
      text={corrida ?? time}
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
