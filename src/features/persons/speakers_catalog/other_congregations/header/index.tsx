import { Box, IconButton } from '@mui/material';
import { IconCheck, IconDelete, IconEdit, IconExpand } from '@components/icons';
import { useAppTranslation, useBreakpoints, useCurrentUser } from '@hooks/index';
import { IncomingCongregationHeaderType } from './index.types';
import useHeader from './useHeader';
import Typography from '@components/typography';

const IncomingCongregationHeader = ({
  expanded,
  onExpandChange,
  editMode,
  onEditModeChange,
  cong_name,
  cong_number,
  cong_circuit,
  onDelete,
}: IncomingCongregationHeaderType) => {
  const { t } = useAppTranslation();

  const { laptopDown } = useBreakpoints();

  const { isPublicTalkCoordinator } = useCurrentUser();

  const { handleHideDelete, handleShowDelete, showDelete } = useHeader();

  const { tablet600Down } = useBreakpoints();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '16px',
      }}
      onMouseEnter={handleShowDelete}
      onMouseLeave={handleHideDelete}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: tablet600Down ? '100%' : 'auto',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Typography className="h4" color="var(--grey-400)">
            {cong_name}
          </Typography>
          {/* Sin número no se pinta la etiqueta. Se pintaba siempre, y una
              congregación sin número dejaba un rectángulo gris de 16px con
              nada dentro, que se leía como una raya al lado del nombre: chrome
              sin contenido, que no informa de nada y solo desordena la fila.
              Es lo que ya hace la cabecera gemela de «Mi congregación». */}
          {cong_number && (
            <Typography
              className="body-small-semibold"
              color="var(--grey-400)"
              sx={{
                borderRadius: 'var(--shape-xs)',
                padding: '2px 8px',
                backgroundColor: 'var(--grey-150)',
              }}
            >
              {cong_number}
            </Typography>
          )}

          {/* El circuito, solo en «Otras congregaciones»: allí se mezclan y es
              el dato que falta para saber de dónde viene cada una. En «Tu
              circuito» no se pinta, que allí sería la misma etiqueta en todas
              las filas.

              Con el mismo dibujo gris que el número y con la palabra
              «Circuito:» delante, exactamente igual que la cabecera gemela de
              «Tu congregación»: sin la palabra, dos chapas seguidas con un
              número dentro no se distinguen. Y en gris y no en azul porque el
              tinte azul es el dibujo de LO ELEGIDO —lo llevan los chips del
              filtro de aquí arriba—, y esto no se elige: es un dato. */}
          {cong_circuit && (
            <Typography
              className="body-small-semibold"
              color="var(--grey-400)"
              sx={{
                borderRadius: 'var(--shape-xs)',
                padding: '2px 8px',
                backgroundColor: 'var(--grey-150)',
                whiteSpace: 'nowrap',
              }}
            >
              {t('tr_circuit', { circuitNumber: cong_circuit })}
            </Typography>
          )}
        </Box>
        {tablet600Down && (
          <IconButton
            aria-label={
              expanded ? 'Ocultar la congregación' : 'Mostrar la congregación'
            }
            onClick={() => onExpandChange(cong_number)}
          >
            <IconExpand
              color="var(--black)"
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition:
                  'transform var(--motion-medium) var(--ease-standard)',
              }}
            />
          </IconButton>
        )}
      </Box>

      {!tablet600Down && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isPublicTalkCoordinator && (
            <>
              {(laptopDown || showDelete) && (
                <IconButton aria-label="Eliminar" onClick={onDelete}>
                  <IconDelete color="var(--red-main)" />
                </IconButton>
              )}

              <IconButton
                aria-label={
                  editMode ? 'Guardar los cambios' : 'Editar la congregación'
                }
                onClick={onEditModeChange}
              >
                {!editMode && <IconEdit color="var(--accent-main)" />}
                {editMode && <IconCheck color="var(--accent-main)" />}
              </IconButton>
            </>
          )}

          <IconButton
            aria-label={
              expanded ? 'Ocultar la congregación' : 'Mostrar la congregación'
            }
            onClick={() => onExpandChange(cong_number)}
          >
            <IconExpand
              color="var(--black)"
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition:
                  'transform var(--motion-medium) var(--ease-standard)',
              }}
            />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default IncomingCongregationHeader;
