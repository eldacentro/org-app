import { Box } from '@mui/material';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import AppButton from '@components/button';
import TextField from '@components/textfield';
import Typography from '@components/typography';
import useAccountName from './useAccountName';

/**
 * Nombre y apellidos de la cuenta, editables por un administrador. Mismos
 * campos que en Mi cuenta, para que se reconozca que es lo mismo. Ver
 * `useAccountName`.
 */
const AccountName = () => {
  const { t } = useAppTranslation();

  const { tabletDown } = useBreakpoints();

  const {
    nombre,
    apellidos,
    setNombre,
    setApellidos,
    cambiado,
    ficha,
    isProcessing,
    handleGuardar,
    handleDeshacer,
    handleUsarFicha,
  } = useAccountName();

  const alPulsarEnter = (e: { key: string }) => {
    if (e.key === 'Enter') handleGuardar();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Typography className="label-small-semibold" color="var(--ink-3)">
        Nombre de la cuenta
      </Typography>

      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          flexWrap: tabletDown ? 'wrap' : 'nowrap',
        }}
      >
        <TextField
          label={t('tr_firstname')}
          height={48}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={alPulsarEnter}
          slotProps={{ input: { readOnly: isProcessing } }}
        />
        <TextField
          label={t('tr_lastname')}
          height={48}
          value={apellidos}
          onChange={(e) => setApellidos(e.target.value)}
          onKeyDown={alPulsarEnter}
          slotProps={{ input: { readOnly: isProcessing } }}
        />
      </Box>

      <Typography className="body-small-regular" color="var(--ink-3)">
        Es el nombre que le sale en Mi cuenta. Le llega a su app la próxima vez
        que sincronice.
      </Typography>

      {!cambiado && ficha && (
        <Box>
          <AppButton
            variant="tertiary"
            disableAutoStretch
            disabled={isProcessing}
            onClick={handleUsarFicha}
          >
            {`Usar el de su ficha: ${ficha.completo}`}
          </AppButton>
        </Box>
      )}

      {cambiado && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <AppButton
            variant="tertiary"
            disableAutoStretch
            disabled={isProcessing}
            onClick={handleDeshacer}
          >
            Cancelar
          </AppButton>
          <AppButton
            variant="main"
            disableAutoStretch
            disabled={isProcessing}
            onClick={handleGuardar}
          >
            Guardar
          </AppButton>
        </Box>
      )}
    </Box>
  );
};

export default AccountName;
