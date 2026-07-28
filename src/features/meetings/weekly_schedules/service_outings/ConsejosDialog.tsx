import { Box, Stack } from '@mui/material';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import AppButton from '@components/button';

/**
 * Consejos para las reuniones para el servicio del campo.
 *
 * El texto es el de la Guía de actividades de noviembre de 2021, pág. 7
 * (mwb21 11), más las ideas que la congregación añadió. Va escrito aquí y no
 * como archivo porque es un texto corto, fijo y que tiene que abrirse al
 * instante desde el programa, sin descargas ni conexión.
 */

const IDEAS_GUIA = [
  'Las ideas para conversar de la Guía de actividades para la reunión Vida y Ministerio Cristianos.',
  'Cómo usar un suceso o noticia recientes para comenzar una conversación.',
  'Cómo vencer una objeción común en el territorio.',
  'Cómo responderle a un ateo, a un evolucionista, a una persona que habla otro idioma o a alguien de una religión que no es común en el territorio.',
  'Cómo usar el sitio jw.org, la aplicación JW Library o la Biblia.',
  'Cómo usar una de las herramientas del kit de enseñanza.',
  'Algún aspecto del ministerio, como la predicación telefónica, la predicación por carta, la predicación pública, las revisitas o los cursos bíblicos.',
  'Recordatorios sobre seguridad, ser adaptables, tener buenos modales, ser positivos, etc.',
  'Una lección o video del folleto Seamos mejores lectores y maestros.',
  'Cómo animar y ayudar a nuestro compañero de predicación.',
  'Un texto que se relacione con el ministerio o una experiencia animadora.',
];

const IDEAS_CONGREGACION = [
  'Una lección o video del folleto Hacer discípulos: una obra de amor.',
  'Alguna idea del Apéndice A “Verdades bíblicas que nos encanta enseñar” del folleto Hacer discípulos: una obra de amor.',
];

const Lista = ({ ideas }: { ideas: string[] }) => (
  <Stack component="ul" spacing="6px" sx={{ margin: 0, paddingLeft: '20px' }}>
    {ideas.map((idea) => (
      <Typography key={idea} component="li" className="body-small-regular" color="var(--ink-2)">
        {idea}
      </Typography>
    ))}
  </Stack>
);

const ConsejosDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    PaperProps={{
      className: 'pop-up-shadow',
      style: {
        maxWidth: '620px',
        borderRadius: 'var(--radius-xl)',
        backgroundColor: 'var(--white)',
        marginLeft: '16px',
        marginRight: '16px',
        marginTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        maxHeight:
          'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px)',
      },
    }}
    // Solo se desplaza el texto: el título y el botón de cerrar se quedan.
    sx={{ overflow: 'hidden', alignItems: 'stretch' }}
  >
    <Box sx={{ width: '100%' }}>
      <Typography className="h2" color="var(--ink)">
        Consejos para que las reuniones para el servicio del campo sean
        prácticas
      </Typography>
      <Typography className="label-small-regular" color="var(--ink-3)">
        Guía de actividades noviembre 2021, pág. 7 (mwb21 11)
      </Typography>
    </Box>

    <Stack
      spacing="12px"
      sx={{ width: '100%', flex: 1, minHeight: 0, overflowY: 'auto' }}
    >
      <Typography className="body-small-regular" color="var(--ink-2)">
        Las reuniones para el servicio del campo, al igual que todas las
        reuniones de congregación, son un regalo que Jehová nos da para
        motivarnos a mostrar amor y hacer buenas obras (Heb 10:24, 25). Toda la
        reunión, contando el tiempo para organizar los grupos, asignar el
        territorio y hacer la oración, <b>debe durar entre 5 y 7 minutos</b>. Si
        se realiza al terminar otra reunión, debe durar aún menos. Quien dirija
        la reunión debe preparar algo que resulte práctico para quienes vayan a
        predicar ese día. Por ejemplo, los sábados, cuando hay muchos hermanos
        que no han salido a predicar durante la semana, puede ser práctico
        simplemente repasar qué decir en la predicación. ¿Qué otros temas pueden
        ser útiles?
      </Typography>

      <Lista ideas={IDEAS_GUIA} />

      <Typography className="body-small-regular" color="var(--ink-2)">
        Las siguientes ideas son añadidas a la información de la guía de
        actividades:
      </Typography>

      <Lista ideas={IDEAS_CONGREGACION} />

      <Typography className="label-small-regular" color="var(--ink-3)">
        Puedes encontrar más ideas y sugerencias sobre las reuniones para el
        servicio del campo en el Ministerio del Reino de marzo del 2015
        “Reuniones para el servicio del campo que cumplen su objetivo” (kms 3/15
        3).
      </Typography>
    </Stack>

    <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
      <AppButton variant="main" disableAutoStretch onClick={onClose}>
        Cerrar
      </AppButton>
    </Box>
  </Dialog>
);

export default ConsejosDialog;
