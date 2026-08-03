import { Box } from '@mui/material';
import { IconPublishedSchedule } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { ScheduleWeekType } from '../index.types';
import Checkbox from '@components/checkbox';
import Typography from '@components/typography';

type WeekItemProps = {
  data: ScheduleWeekType;
  onChange: (checked: boolean, value: string) => void;
  /**
   * Explicar por qué esta semana no se puede marcar solo hace falta cuando en
   * el mismo mes hay otras que sí. En un mes entero del histórico la nota se
   * repetiría en cada renglón sin decir nada nuevo.
   */
  showHistoricNote?: boolean;
};

/**
 * Una semana dentro del diálogo de publicar.
 *
 * El rótulo es el día de la REUNIÓN («2 Sep»), no el lunes: es como se llama la
 * semana en el selector del editor, y llamarla de dos maneras distintas en dos
 * pantallas es pedirle a alguien que se equivoque.
 *
 * Debajo, lo que le falta. No un número —«faltan 3 partes» no dice ni cuál ni
 * dónde—, sino los nombres, que es con lo que se puede ir a arreglarlo. Cuando
 * no falta nada no se dice nada: un «completa» en cada renglón se convierte en
 * ruido y deja de leerse justo el que sí importa.
 */
const WeekItem = ({ data, onChange, showHistoricNote }: WeekItemProps) => {
  const { t } = useAppTranslation();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '8px',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Una semana del histórico no se marca: ya se ve sin que nadie la
            publicara, y dejar pulsar un botón que no puede hacer nada es peor
            que no tenerlo. Se enseña igual para que no parezca que falta. */}
        <Checkbox
          label={data.label}
          checked={data.checked}
          disabled={data.isHistoric}
          onChange={(e) => onChange(e.target.checked, data.weekOf)}
        />

        {data.isHistoric && showHistoricNote && (
          <Typography
            className="label-small-regular"
            color="var(--grey-400)"
            sx={{ paddingLeft: '32px' }}
          >
            Ya se ve: es del histórico
          </Typography>
        )}

        {!data.isHistoric && data.missing.length > 0 && (
          <Typography
            className="label-small-regular"
            color="var(--orange-dark)"
            sx={{ paddingLeft: '32px' }}
          >
            {/* Una semana sin empezar tiene TODAS las partes vacías, y
                enumerarlas es una pared de texto naranja que no dice nada: se
                resume. La lista solo vale cuando falta lo justo, que es cuando
                se puede ir a ponerlo. */}
            {data.missingAll
              ? 'Sin empezar'
              : `Falta ${data.missing.join(', ')}`}
          </Typography>
        )}
      </Box>

      {data.published && (
        <Box
          title={t('tr_published')}
          sx={{ display: 'flex', alignItems: 'center', paddingTop: '8px' }}
        >
          <IconPublishedSchedule color="var(--accent-main)" />
        </Box>
      )}
    </Box>
  );
};

export default WeekItem;
