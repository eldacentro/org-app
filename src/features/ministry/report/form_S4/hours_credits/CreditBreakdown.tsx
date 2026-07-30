import { Box, Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { CREDIT_TYPE_KEYS, CreditEntry } from '@services/app/credit_entries';
import { IconDelete } from '@components/icons';
import IconButton from '@components/icon_button';
import Typography from '@components/typography';

/**
 * Desglose del crédito de horas: de qué se compone el total.
 *
 * Antes esto vivía pegado al final del campo de comentarios ("Escuela de
 * Precursores: 30"), donde el secretario no podía contarlo ni filtrarlo, y de
 * paso ocupaba el único sitio que había para explicarse.
 *
 * No se muestra nada si no hay desglose: los informes anteriores a esto tienen
 * su total y ningún motivo, y no se les va a inventar uno.
 */
const CreditBreakdown = ({
  entries,
  onRemove,
  readOnly,
}: {
  entries: CreditEntry[];
  onRemove?: (id: string) => void;
  readOnly?: boolean;
}) => {
  const { t } = useAppTranslation();

  if (!entries || entries.length === 0) return null;

  return (
    <Stack spacing="4px" sx={{ width: '100%' }}>
      {entries.map((entry) => (
        <Box
          key={entry.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: 'var(--shape-sm)',
            backgroundColor: 'var(--accent-100)',
            border: '1px solid var(--accent-200)',
          }}
        >
          <Typography
            className="body-small-regular"
            color="var(--black)"
            sx={{ flex: 1, minWidth: 0 }}
          >
            {entry.type === 'other'
              ? entry.label || t(CREDIT_TYPE_KEYS.other)
              : t(CREDIT_TYPE_KEYS[entry.type])}
          </Typography>

          <Typography className="body-small-semibold" color="var(--black)">
            {t('tr_hoursList', { Hours: entry.hours })}
          </Typography>

          {!readOnly && onRemove && (
            <IconButton
              sx={{ padding: '2px' }}
              onClick={() => onRemove(entry.id)}
            >
              <IconDelete color="var(--red-main)" width={18} height={18} />
            </IconButton>
          )}
        </Box>
      ))}
    </Stack>
  );
};

export default CreditBreakdown;
