import { Box } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { GroupItemProps } from './index.types';
import DragHandle from '@components/drag_handle';
import Typography from '@components/typography';

const GroupItem = ({ name, onSubir, onBajar }: GroupItemProps) => {
  const { t } = useAppTranslation();

  return (
    <Box
      sx={{ padding: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}
    >
      {/* Antes era un icono suelto: se podía arrastrar, pero con el teclado no
          había forma de mover un grupo. El asa compartida entiende ↑ y ↓. */}
      <DragHandle etiqueta={name} onSubir={onSubir} onBajar={onBajar} />
      <Typography>{t('tr_groupName', { groupName: name })}</Typography>
    </Box>
  );
};

export default GroupItem;
