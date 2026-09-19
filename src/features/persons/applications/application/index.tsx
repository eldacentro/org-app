import { Box, Grid } from '@mui/material';
import { ApplicationProps } from './index.types';
import useApplication from './useApplication';
import UserCard from '@components/user_card';
import Badge from '@components/badge';

const Application = (props: ApplicationProps) => {
  const { name, isFemale, submitted, months, repeated, handleOpen } =
    useApplication(props);

  return (
    <Grid size={{ desktop: 4, laptop: 6, tablet: 12 }} sx={{ width: '100%' }}>
      <UserCard
        type="person"
        name={name}
        female={isFemale}
        showArrow
        onClick={handleOpen}
      >
        {/* QUÉ pide, no solo cuándo lo envió. Con el nombre y la fecha de envío
            a secas, dos solicitudes del mismo hermano salían idénticas y no
            había manera de saber si pedían lo mismo sin abrir las dos. */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {repeated && (
            <Badge text="Repetida" color="orange" size="small" filled />
          )}
          {months && (
            <Badge text={months} color="accent" size="small" filled={false} />
          )}
          <Badge text={submitted} color="grey" size="small" filled={false} />
        </Box>
      </UserCard>
    </Grid>
  );
};

export default Application;
