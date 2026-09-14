import { Box, Stack } from '@mui/material';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { CardContainer } from '../shared_styles';
import usePioneerBalance from './usePioneerBalance';
import Typography from '@components/typography';

/**
 * Saldo de precursores, con las horas ABIERTAS.
 *
 * Antes cada fila decía nombre y saldo, y nada más. El secretario pidió ver
 * también la predicación y el crédito por separado, como en TsWin: no para
 * el saldo, que ya estaba, sino para encontrar informes mal metidos —un año
 * con 1.860 horas canta en la columna de predicación, y con solo el saldo se
 * confunde con alguien que va muy bien. La columna de promedio de TsWin no
 * hacía falta; el saldo con su signo sí, y se queda.
 *
 * Es una tabla de cinco columnas dibujada con una rejilla: nombre y cuatro
 * cifras a la derecha, alineadas por la derecha y con dígitos de la misma
 * anchura para que se comparen en vertical, que es como se cazan los errores.
 * El nombre es el que cede y se parte en dos líneas en un móvil.
 */
const COLUMNAS = 'minmax(0, 1fr) repeat(4, auto)';

const PioneerBalance = ({ year }: { year: string }) => {
  const { t } = useAppTranslation();

  const { isServiceCommittee } = useCurrentUser();

  const { pioneers } = usePioneerBalance(year);

  // Datos sensibles de desempeño — solo el comité de servicio (y admins)
  // deben ver el saldo de horas de los demás, no cualquier anciano.
  if (!isServiceCommittee) return null;

  if (pioneers.length === 0) return null;

  const cifra = {
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <CardContainer>
      <Stack spacing="16px">
        <Stack spacing="8px">
          <Typography className="h2">{t('tr_pioneersHoursBalance')}</Typography>
          <Typography color="var(--grey-400)">
            {t('tr_pioneersHoursBalanceDesc', { year })}
          </Typography>
        </Stack>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Cabecera: el rótulo de cada cifra, una sola vez. */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: COLUMNAS,
              columnGap: '12px',
              alignItems: 'baseline',
              padding: '0 12px 4px',
            }}
          >
            <Typography className="label-small-semibold" color="var(--ink-3)">
              {t('tr_name', 'Nombre')}
            </Typography>
            <Typography
              className="label-small-semibold"
              color="var(--ink-3)"
              sx={cifra}
            >
              Predicación
            </Typography>
            <Typography
              className="label-small-semibold"
              color="var(--ink-3)"
              sx={cifra}
            >
              Crédito
            </Typography>
            <Typography
              className="label-small-semibold"
              color="var(--ink-3)"
              sx={cifra}
            >
              Total
            </Typography>
            <Typography
              className="label-small-semibold"
              color="var(--ink-3)"
              sx={cifra}
            >
              Saldo
            </Typography>
          </Box>

          {pioneers.map((pioneer) => {
            const enRojo = pioneer.balance < 0;

            return (
              <Box
                key={pioneer.person_uid}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: COLUMNAS,
                  columnGap: '12px',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 'var(--shape-sm)',
                  backgroundColor: enRojo
                    ? 'var(--red-secondary)'
                    : 'var(--accent-150)',
                }}
              >
                <Typography
                  className="body-small-semibold"
                  color="var(--black)"
                  sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
                >
                  {pioneer.name}
                </Typography>

                {/* Las tres cifras que explican el saldo van en tinta
                    normal: son datos, no un veredicto. El veredicto es el
                    saldo, y es el único que lleva color. */}
                <Typography
                  className="body-small-regular"
                  color="var(--ink-2)"
                  sx={cifra}
                >
                  {pioneer.horas}
                </Typography>
                <Typography
                  className="body-small-regular"
                  color="var(--ink-2)"
                  sx={cifra}
                >
                  {pioneer.credito}
                </Typography>
                <Typography
                  className="body-small-semibold"
                  color="var(--ink)"
                  sx={cifra}
                >
                  {pioneer.total}
                </Typography>
                <Typography
                  className="body-small-semibold"
                  color={enRojo ? 'var(--red-main)' : 'var(--accent-dark)'}
                  sx={cifra}
                >
                  {pioneer.balance > 0
                    ? `+${pioneer.balance}`
                    : pioneer.balance.toString()}{' '}
                  h
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Stack>
    </CardContainer>
  );
};

export default PioneerBalance;
