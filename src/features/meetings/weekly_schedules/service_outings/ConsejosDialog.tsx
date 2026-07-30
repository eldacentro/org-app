import { Box, Stack } from '@mui/material';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import AppButton from '@components/button';
import { IconInTerritory } from '@components/icons';

/**
 * Consejos para las reuniones para el servicio del campo.
 *
 * El texto es el de la Guía de actividades de noviembre de 2021, pág. 7
 * (mwb21 11), más las ideas que la congregación añadió. Va escrito aquí y no
 * como archivo porque es un texto corto, fijo y que tiene que abrirse al
 * instante desde el programa, sin descargas ni conexión.
 *
 * Se presenta como se leería en papel —una cabecera con la referencia, la
 * duración destacada porque es EL dato que se olvida, y las ideas en fichas
 * numeradas— en vez de como una lista de viñetas sin jerarquía.
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

const Idea = ({ numero, texto }: { numero: number; texto: string }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '12px 14px',
      borderRadius: 'var(--shape-sm)',
      backgroundColor: 'var(--accent-100)',
      border: '1px solid var(--accent-200)',
    }}
  >
    <Box
      sx={{
        flexShrink: 0,
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        backgroundColor: 'var(--accent-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography className="body-small-semibold" color="var(--always-white)">
        {numero}
      </Typography>
    </Box>

    <Typography className="body-regular" color="var(--ink-2)">
      {texto}
    </Typography>
  </Box>
);

const Titulo = ({ children }: { children: string }) => (
  <Typography className="h3" color="var(--ink)" sx={{ marginTop: '4px' }}>
    {children}
  </Typography>
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
        maxWidth: '640px',
        borderRadius: 'var(--shape-xl)',
        backgroundColor: 'var(--white)',
        marginLeft: '16px',
        marginRight: '16px',
        marginTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        maxHeight:
          'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px)',
      },
    }}
    // Solo se desplaza el texto: la cabecera y el botón de cerrar se quedan.
    sx={{ overflow: 'hidden', alignItems: 'stretch', padding: 0 }}
  >
    {/* Cabecera */}
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        width: '100%',
        padding: '20px',
        backgroundColor: 'var(--accent-main)',
      }}
    >
      <IconInTerritory color="var(--always-white)" width={26} height={26} />
      <Box>
        <Typography
          className="h3"
          sx={{ color: 'var(--always-white)', fontWeight: 800 }}
        >
          Reuniones para el servicio del campo
        </Typography>
        <Typography
          className="body-small-regular"
          sx={{ color: 'var(--always-white)', opacity: 0.85 }}
        >
          Guía de actividades, noviembre de 2021, pág. 7 (mwb21 11)
        </Typography>
      </Box>
    </Box>

    <Stack
      spacing="16px"
      sx={{
        width: '100%',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '20px',
      }}
    >
      {/* La duración es EL dato que se olvida, así que va destacado y solo. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '10px',
          padding: '14px 16px',
          borderRadius: 'var(--shape-sm)',
          backgroundColor: 'var(--orange-secondary)',
          border: '1px solid var(--orange-dark)',
        }}
      >
        <Typography
          className="h2"
          sx={{
            color: 'var(--orange-dark)',
            fontWeight: 800,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          5–7 min
        </Typography>
        <Typography className="body-regular" color="var(--orange-dark)">
          contando organizar los grupos, asignar el territorio y la oración. Si
          es al terminar otra reunión, aún menos.
        </Typography>
      </Box>

      <Typography className="body-regular" color="var(--ink-2)">
        Las reuniones para el servicio del campo, al igual que todas las
        reuniones de congregación, son un regalo que Jehová nos da para
        motivarnos a mostrar amor y hacer buenas obras (Heb 10:24, 25). Quien
        dirija la reunión debe preparar algo que resulte práctico para quienes
        vayan a predicar ese día. Por ejemplo, los sábados, cuando hay muchos
        hermanos que no han salido a predicar durante la semana, puede ser
        práctico simplemente repasar qué decir en la predicación.
      </Typography>

      <Titulo>Qué temas pueden ser útiles</Titulo>

      <Stack spacing="8px">
        {IDEAS_GUIA.map((idea, i) => (
          <Idea key={idea} numero={i + 1} texto={idea} />
        ))}
      </Stack>

      <Titulo>Añadido por la congregación</Titulo>

      <Stack spacing="8px">
        {IDEAS_CONGREGACION.map((idea, i) => (
          <Idea key={idea} numero={IDEAS_GUIA.length + i + 1} texto={idea} />
        ))}
      </Stack>

      <Typography
        className="body-small-regular"
        color="var(--ink-3)"
        sx={{ paddingBottom: '4px' }}
      >
        Hay más ideas y sugerencias en el Ministerio del Reino de marzo de 2015,
        “Reuniones para el servicio del campo que cumplen su objetivo” (kms 3/15
        3).
      </Typography>
    </Stack>

    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%',
        padding: '0 20px 20px',
      }}
    >
      <AppButton variant="main" disableAutoStretch onClick={onClose}>
        Cerrar
      </AppButton>
    </Box>
  </Dialog>
);

export default ConsejosDialog;
