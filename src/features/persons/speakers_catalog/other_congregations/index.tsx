import { Box } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import useOtherCongregations from './useOtherCongregations';
import CompletarDatos from './completar_datos';
import CongregationAdd from './congregation_add';
import IncomingCongregation from './congregation_item';
import CountBadge from '@components/count_badge';
import FilterChip from '@components/filter_chip';
import Typography from '@components/typography';
import { SIN_CIRCUITO } from '@services/app/speakers_congregations';

const OtherCongregations = () => {
  const { t } = useAppTranslation();

  const {
    circuitCongs,
    otherCongs,
    circuitosOtros,
    circuitoFiltro,
    handleCircuitoFiltro,
    circuitSpeakersCount,
    otherSpeakersCount,
    isAdding,
    handleIsAddingClose,
    currentExpanded,
    handleSetExpanded,
  } = useOtherCongregations();

  return (
    <Box
      sx={{
        flexGrow: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {isAdding && (
        <CongregationAdd open={isAdding} onClose={handleIsAddingClose} />
      )}

      {/* Arriba del todo y fuera de las dos secciones: los huecos pueden estar
          en cualquiera de las dos, y repetir la tira en cada una sería decir lo
          mismo dos veces. */}
      <CompletarDatos />

      {/* Tu Circuito Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* El contador, fuera del paréntesis: la misma chapa que las
            pestañas y que la lista de personas. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Typography className="h2">Tu circuito</Typography>
          <CountBadge value={circuitSpeakersCount} />
        </Box>

        {circuitCongs.length === 0 && (
          <Typography
            sx={{
              color: 'var(--grey-400)',
              fontStyle: 'italic',
              paddingLeft: '8px',
            }}
          >
            No hay congregaciones en tu circuito.
          </Typography>
        )}

        {circuitCongs.length > 0 &&
          circuitCongs.map((congregation) => (
            <IncomingCongregation
              key={congregation.id}
              congregation={congregation}
              currentExpanded={currentExpanded}
              onChangeCurrentExpanded={handleSetExpanded}
            />
          ))}
      </Box>

      {/* Otras Congregaciones Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Typography className="h2">{t('tr_otherCongregations')}</Typography>
          <CountBadge value={otherSpeakersCount} />
        </Box>

        {/* Filtrar por circuito. Solo cuando hay más de uno: con uno solo la
            tira no filtraría nada y se comería una línea de pantalla.

            Se puede quitar volviendo a pulsar el mismo, sin un botón de
            «Todas»: es un filtro de una sola opción, y el propio chip elegido
            enseña que está puesto. */}
        {circuitosOtros.length > 1 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              alignItems: 'center',
            }}
          >
            {circuitosOtros.map((circuito) => (
              <FilterChip
                key={circuito}
                label={
                  circuito === SIN_CIRCUITO ? 'Sin circuito' : circuito
                }
                selected={circuitoFiltro === circuito}
                onClick={() => handleCircuitoFiltro(circuito)}
              />
            ))}
          </Box>
        )}

        {otherCongs.length === 0 && (
          <Typography
            sx={{
              color: 'var(--grey-400)',
              fontStyle: 'italic',
              paddingLeft: '8px',
            }}
          >
            {circuitoFiltro
              ? 'Ninguna congregación de ese circuito.'
              : 'No hay otras congregaciones fuera de tu circuito.'}
          </Typography>
        )}

        {otherCongs.length > 0 &&
          otherCongs.map((congregation) => (
            <IncomingCongregation
              key={congregation.id}
              congregation={congregation}
              currentExpanded={currentExpanded}
              onChangeCurrentExpanded={handleSetExpanded}
              showCircuit
            />
          ))}
      </Box>
    </Box>
  );
};

export default OtherCongregations;
