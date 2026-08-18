import { Grid } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAppTranslation } from '@hooks/index';
import { CurrentPioneersProps } from './index.types';
import Typography from '@components/typography';
import UserCard from '@components/user_card';

const CurrentPioneers = ({ pioneers }: CurrentPioneersProps) => {
  const { t } = useAppTranslation();

  const navigate = useNavigate();

  if (pioneers.length === 0) {
    return (
      <Typography className="body-regular" color="var(--ink-2)">
        {t('tr_noAuxiliaryPioneersThisMonth')}
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      {pioneers.map((pioneer) => (
        <Grid
          key={pioneer.person_uid}
          size={{ desktop: 4, laptop: 6, tablet: 12 }}
          sx={{ width: '100%' }}
        >
          <UserCard
            type="person"
            name={pioneer.name}
            female={pioneer.female}
            showArrow
            onClick={() => navigate(`/persons/${pioneer.person_uid}`)}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default CurrentPioneers;
