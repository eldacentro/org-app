import { Box } from '@mui/material';
import Dialog from '@components/dialog';
import { MESES_ES } from '@utils/nombres_fecha';
import Typography from '@components/typography';
import InfoTip from '@components/info_tip';
import AppButton from '@components/button';

/**
 * Publicar o retirar un mes del programa de departamentos.
 *
 * Se publica por mes, como en Exhibidores y Salidas, aunque aquí los datos sean
 * por semana: publicar marca todas las semanas de ese mes.
 */
const DeptPublishDialog = ({
  open,
  onClose,
  onConfirm,
  isPublished,
  month,
  emptyRoles,
  hasSchedule,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPublished: boolean;
  month: string;
  emptyRoles: number;
  hasSchedule: boolean;
}) => {
  const monthLabel = (() => {
    const [year, monthNumber] = month.split('/');
    const names = [...MESES_ES];

    return `${names[Number(monthNumber) - 1] ?? ''} ${year ?? ''}`.trim();
  })();

  return (
    // El Dialog del sistema, no el de MUI en crudo: es el que pone los
    // márgenes seguros de iOS. Su Paper ya trae el radio, el fondo y la
    // sombra, así que aquí no se repiten. Ver DESIGN_SYSTEM §6.1.
    <Dialog open={open} onClose={onClose}>
      <Typography className="h2" sx={{ color: 'var(--ink)' }}>
        {isPublished ? 'Retirar' : 'Publicar'}: {monthLabel}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!hasSchedule ? (
          <InfoTip
            isBig={false}
            color="warning"
            text="Este mes no tiene todavía ningún programa que publicar."
          />
        ) : (
          <InfoTip
            isBig={false}
            color={isPublished ? 'warning' : 'info'}
            text={
              isPublished
                ? 'Al retirarlo, este mes vuelve a ser un borrador: dejará de aparecer en las asignaciones de los hermanos y en el programa semanal.'
                : 'Al publicarlo, cada hermano verá su parte de este mes en "Mis asignaciones" y en el programa semanal, y recibirá el aviso correspondiente.'
            }
          />
        )}

        {hasSchedule && !isPublished && emptyRoles > 0 && (
          <InfoTip
            isBig={false}
            color="warning"
            text={`Hay ${emptyRoles} ${emptyRoles === 1 ? 'puesto sin nadie asignado' : 'puestos sin nadie asignado'}. Puedes publicarlo igualmente si el resto ya está decidido.`}
          />
        )}
      </Box>

      {/* Cancelar a la izquierda y la acción principal la más a la derecha,
          como en todos los diálogos de la app. */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <AppButton variant="tertiary" onClick={onClose}>
          Cancelar
        </AppButton>
        {hasSchedule && (
          <AppButton
            variant="main"
            color={isPublished ? 'red' : undefined}
            onClick={onConfirm}
          >
            {isPublished ? 'Retirar' : 'Publicar'}
          </AppButton>
        )}
      </Box>
    </Dialog>
  );
};

export default DeptPublishDialog;
