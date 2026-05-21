import { Box } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import Typography from '@components/typography';

type LastModifiedInfoProps = {
  updatedAt: string;
  lastModifiedBy: string;
};

const LastModifiedInfo = ({ updatedAt, lastModifiedBy }: LastModifiedInfoProps) => {
  const { t } = useAppTranslation();

  if (!updatedAt || !lastModifiedBy) return null;

  const date = new Date(updatedAt);
  const formattedDate = date.toLocaleString();

  return (
    <Box sx={{ mt: 1, mb: 1, opacity: 0.7 }}>
      <Typography className="label-small-regular" color="var(--grey-400)">
        {`${t('tr_lastUpdate', 'Última actualización')}: ${formattedDate} (${lastModifiedBy})`}
      </Typography>
    </Box>
  );
};

export default LastModifiedInfo;
