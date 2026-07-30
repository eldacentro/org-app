import { Stack } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import { CardContainer } from '@features/ministry/shared_styles';
import Typography from '@components/typography';
import Comments from '@features/ministry/report/form_S4/comments';
import SubmitButton from '@features/ministry/report/form_S4/submit_button';

/**
 * El comentario y el botón de enviar, JUNTOS.
 *
 * ── Por qué van en la misma tarjeta ──────────────────────────────────────
 *
 * Estaban en dos bloques separados: la tarjeta de "Comentarios" por un lado y
 * el botón suelto debajo. Y así el comentario parece una cosa más del mes —al
 * nivel de las horas o las revisitas— cuando en realidad viaja CON el envío:
 * es lo que el secretario lee al lado del informe, no un apunte que se guarda
 * por su cuenta.
 *
 * En la misma tarjeta y con el botón al final, la lectura es la que toca:
 * "esto es lo que voy a mandar, y esto es lo que quiero decir al mandarlo".
 *
 * ── Y por qué es un componente ───────────────────────────────────────────
 *
 * Lo usan las dos vistas. La de Mes ya tenía el comentario; la de Día no, y
 * quien lleva el informe día a día tenía que cambiar de vista solo para
 * escribir una línea antes de enviar.
 */
const SubmitBlock = ({
  month,
  person_uid,
}: {
  month: string;
  person_uid: string;
}) => {
  const { t } = useAppTranslation();

  return (
    <CardContainer>
      <Stack spacing="16px">
        <Stack spacing="8px">
          {/* Un sitio donde escribir lo que los números no cuentan: que estuvo
              enfermo, que se ausentó parte del mes, lo que sea. */}
          <Typography className="h4">{t('tr_comments')}</Typography>
          <Typography className="body-small-regular" color="var(--grey-400)">
            Opcional. Si quieres aclarar algo de este mes, escríbelo aquí.
          </Typography>
          <Comments month={month} person_uid={person_uid} publisher={true} />
        </Stack>

        <SubmitButton month={month} person_uid={person_uid} publisher={true} />
      </Stack>
    </CardContainer>
  );
};

export default SubmitBlock;
