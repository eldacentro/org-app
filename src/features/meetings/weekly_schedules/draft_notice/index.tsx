import { Box } from '@mui/material';
import Typography from '@components/typography';

/**
 * Lo que se ve en "Programas semanales" cuando el mes está en borrador.
 *
 * Dos piezas, las mismas que ya usaba Departamentos y con el mismo aspecto: el
 * hueco para quien no lo edita —que no debe ver una propuesta a medias— y la
 * tira de aviso para quien sí, que necesita saber que lo que tiene delante
 * todavía no lo ve nadie más.
 *
 * Se sacaron aquí porque ahora hacen falta en tres sitios (entre semana, fin de
 * semana y discursos salientes) y copiarlas una cuarta vez era pedir que se
 * separaran solas.
 */
export const DraftEmptyState = ({ text }: { text: string }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '24px',
      backgroundColor: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--shape-xl)',
      marginTop: '16px',
      justifyContent: 'center',
    }}
  >
    <Typography className="body-regular" color="var(--grey-400)">
      {text}
    </Typography>
  </Box>
);

export const DraftBanner = ({ text }: { text: string }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: 'var(--orange-secondary)',
      border: '1px solid var(--orange-dark)',
      borderRadius: 'var(--shape-xl)',
    }}
  >
    <Typography className="body-small-regular" color="var(--orange-dark)">
      {text}
    </Typography>
  </Box>
);
