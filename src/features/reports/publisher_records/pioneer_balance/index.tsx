import { Box, Stack } from '@mui/material';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import { CardContainer } from '../shared_styles';
import usePioneerBalance from './usePioneerBalance';
import Typography from '@components/typography';

const PioneerBalance = () => {
  const { t } = useAppTranslation();

  const { isServiceCommittee } = useCurrentUser();

  const { pioneers, year } = usePioneerBalance();

  // Datos sensibles de desempeño — solo el comité de servicio (y admins)
  // deben ver el saldo de horas de los demás, no cualquier anciano.
  if (!isServiceCommittee) return null;

  if (pioneers.length === 0) return null;

  return (
    <CardContainer>
      <Stack spacing="16px">
        <Stack spacing="8px">
          <Typography className="h2">{t('tr_pioneersHoursBalance')}</Typography>
          <Typography color="var(--grey-400)">
            {t('tr_pioneersHoursBalanceDesc', { year })}
          </Typography>
        </Stack>

        <Stack spacing="8px">
          {pioneers.map((pioneer) => (
            <Box
              key={pioneer.person_uid}
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-l)',
                backgroundColor:
                  pioneer.balance < 0
                    ? 'var(--red-secondary)'
                    : 'var(--accent-150)',
              }}
            >
              <Typography className="body-small-semibold" color="var(--black)">
                {pioneer.name}
              </Typography>

              <Typography
                className="body-small-semibold"
                color={
                  pioneer.balance < 0 ? 'var(--red-main)' : 'var(--accent-dark)'
                }
                sx={{ flexShrink: 0 }}
              >
                {pioneer.balance > 0
                  ? `+${pioneer.balance}`
                  : pioneer.balance.toString()}{' '}
                h
              </Typography>
            </Box>
          ))}
        </Stack>
      </Stack>
    </CardContainer>
  );
};

export default PioneerBalance;
