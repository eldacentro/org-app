import { Box } from '@mui/material';
import Button from '@components/button';
import InfoTip from '@components/info_tip';
import Typography from '@components/typography';
import { CircuitVisitType } from '@definition/circuit_visit';
import { circuitVisitChangedSincePublish } from '@services/app/circuit_visit';

/**
 * La tira de aviso de "esta visita se ha tocado desde que se publicó", arriba
 * de la página de la visita.
 *
 * Misma forma y mismo sitio que la de las reuniones
 * (features/meetings/publish_notice): una tira donde se está trabajando, no un
 * diálogo — aquí se está preparando la visita y nada debe interrumpir.
 *
 * Una sola diferencia con las reuniones, y es de fondo: allí cada asignación
 * lleva su propia marca de tiempo y se puede decir "has hecho N cambios". La
 * visita se guarda ENTERA, con un solo `updatedAt`, así que aquí solo se puede
 * decir que se ha tocado. No se inventa un número.
 *
 * Lo que NO sale: en borrador (ya lo dice la etiqueta naranja de la cabecera),
 * publicada y sin tocar, y publicada antes de que existiera el sello — de esas
 * no se sabe desde cuándo, y callar es más honesto que avisar a ciegas.
 */
const CircuitVisitPublishNotice = ({
  visit,
  onRepublish,
}: {
  visit: CircuitVisitType | null;
  onRepublish: () => void;
}) => {
  if (!circuitVisitChangedSincePublish(visit)) return null;

  return (
    <InfoTip isBig={false} color="warning">
      {/* `span` en los dos, y no `div`/`p`: InfoTip ya mete lo que le pasas
          DENTRO de un <p>, y un <div> o un <p> ahí es HTML inválido — React lo
          canta en consola. Un <span> con display:flex maqueta igual. */}
      <Box
        component="span"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          width: '100%',
        }}
      >
        <Typography
          component="span"
          className="body-regular"
          sx={{ color: 'var(--orange-dark)' }}
        >
          Esta visita está publicada y se ha cambiado desde entonces. La
          congregación ya vio la versión anterior.
        </Typography>

        <Button variant="small" onClick={onRepublish}>
          Volver a publicar
        </Button>
      </Box>
    </InfoTip>
  );
};

export default CircuitVisitPublishNotice;
