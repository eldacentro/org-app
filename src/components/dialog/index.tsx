import { Dialog as MUIDialog, DialogContent } from '@mui/material';
import { DialogProps } from './index.types';

/**
 * Component for rendering a custom dialog.
 * @param {Object} props - Props for the CustomDialog component.
 * @param {boolean} props.open - Whether the dialog is open.
 * @param {VoidFunction} props.onClose - Function to handle dialog close event.
 * @param {React.ReactNode} props.children - Content to be rendered inside the dialog.
 * @param {SxProps} props.sx - Custom styling for the dialog content.
 * @returns {JSX.Element} CustomDialog component.
 */
const Dialog = ({ open, onClose, children, sx, PaperProps }: DialogProps) => {
  /**
   * Handles the dialog close event.
   * @param {string} reason - The reason for closing the dialog.
   */
  const handleClose = (_, reason) => {
    if (reason === 'clickaway' || reason === 'backdropClick') {
      return;
    }

    onClose();
  };

  return (
    <MUIDialog
      fullWidth
      open={open}
      onClose={handleClose}
      sx={{
        boxSizing: 'border-box',
        '.MuiPaper-root': {
          margin: { mobile: '16px', tablet: '24px', desktop: '32px' },
          // Los márgenes seguros de iOS, para TODOS los diálogos de la app.
          //
          // El margen de arriba se quedaba en 16 y en un iPhone eso mete el
          // borde del diálogo debajo de la muesca; el de abajo, debajo de la
          // barra de inicio. Se veía en los Ajustes rápidos de Reunión de fin
          // de semana, pero no era cosa de ese diálogo: son ochenta los que
          // pasan por aquí.
          //
          // `max` y no una suma: donde no hay muesca —escritorio, Android—
          // `env(...)` vale 0 y queda el margen de siempre, así que esto no
          // cambia nada fuera de un iPhone.
          marginTop: {
            mobile: 'max(16px, env(safe-area-inset-top))',
            tablet: 'max(24px, env(safe-area-inset-top))',
            desktop: 'max(32px, env(safe-area-inset-top))',
          },
          marginBottom: {
            mobile: 'max(16px, env(safe-area-inset-bottom))',
            tablet: 'max(24px, env(safe-area-inset-bottom))',
            desktop: 'max(32px, env(safe-area-inset-bottom))',
          },
          // Y el alto máximo baja lo mismo, porque si no un diálogo largo
          // crece por debajo de la barra de inicio aunque su margen esté bien.
          // Y que se pueda RECORRER. Con el alto máximo puesto pero sin esto,
          // un diálogo más largo que su máximo —la configuración de Limpieza,
          // con seis grupos y las notas— no se desliza: se desborda por abajo.
          //
          // Va aquí y no en una regla global: se intentó, y alcanzaba también
          // a los diálogos que van a pantalla completa —el de ver un
          // territorio, con su mapa— y les metía márgenes donde no debe
          // haberlos.
          overflowY: 'auto',
          maxHeight: {
            mobile:
              'calc(100% - max(32px, env(safe-area-inset-top) + env(safe-area-inset-bottom)))',
            tablet:
              'calc(100% - max(48px, env(safe-area-inset-top) + env(safe-area-inset-bottom)))',
            desktop:
              'calc(100% - max(64px, env(safe-area-inset-top) + env(safe-area-inset-bottom)))',
          },
        },
      }}
      PaperProps={{
        ...PaperProps,
        // El `PaperProps` de quien llama SE SUMA al de aquí; antes lo
        // REEMPLAZABA. Y lo primero que se llevaba por delante era la sombra:
        // once diálogos —los nueve de Territorios, las categorías de
        // Documentos y las responsabilidades— pasaban su `PaperProps` solo
        // para cambiar el ancho máximo, y se quedaban planos sobre el fondo
        // mientras el resto de la app levantaba los suyos. Todos repetían
        // además el mismo radio, el mismo fondo y un `width: 100%` que ya da
        // el `fullWidth` de arriba.
        // `dialogo-entra` da la dirección de entrada: un diálogo aparece
        // subiendo un poco, no materializándose en el sitio. Es la regla de
        // Material —un componente entra desde el borde por el que llega— y en
        // móvil, donde el diálogo ocupa casi toda la pantalla, es lo que hace
        // que se lea como una hoja que sube y no como un cambio de imagen.
        //
        // Va como CLASE y no como regla global sobre `.MuiDialog-container >
        // .MuiPaper-root`: eso ya se intentó el 2 de agosto y hubo que
        // revertirlo, porque alcanzaba también a los diálogos a pantalla
        // completa —el mapa de un territorio, el visor de documentos— que no
        // pasan por aquí. Con la clase, solo se mueve lo que sale de este
        // componente.
        //
        // Solo el desplazamiento: la opacidad la sigue poniendo el `Fade` que
        // MUI trae de fábrica, y así la salida se queda como estaba.
        className: [
          ...new Set([
            'pop-up-shadow',
            'dialogo-entra',
            ...(PaperProps?.className ?? '').split(' '),
          ]),
        ]
          .filter(Boolean)
          .join(' '),
        // Los valores por defecto van en `sx` y no en `style` a propósito: así
        // el `style` en línea de quien llama —que es como lo pasan diez de los
        // once— sigue ganando, y el `sx` del que falta se fusiona detrás.
        sx: [
          {
            maxWidth: '560px',
            // Un diálogo es la superficie más grande que se levanta sobre la
            // página: le toca la curva más generosa de la escala, la misma que
            // la tarjeta destacada del inicio.
            borderRadius: 'var(--shape-xl)',
            backgroundColor: 'var(--white)',
          },
          ...(Array.isArray(PaperProps?.sx) ? PaperProps.sx : [PaperProps?.sx]),
        ],
      }}
      slotProps={{
        backdrop: {
          style: {
            backgroundColor: 'var(--accent-dark-overlay)',
          },
        },
      }}
    >
      <DialogContent
        sx={{
          padding: { mobile: '16px', desktop: '32px' },
          display: 'flex',
          flexDirection: 'column',
          gap: { mobile: '16px', desktop: '24px' },
          // Lo de dentro ocupa el ANCHO del diálogo.
          //
          // Estaba en `flex-start`, así que cada bloque se encogía a su
          // contenido y no llenaba la caja. Eso obliga a que TODOS los diálogos
          // se acuerden de pedir `width: 100%` por su cuenta, y diecinueve de
          // los ochenta no lo hacen. En Subir documento se veía: el formulario
          // pedía `minWidth: 400` —o sea "al menos 400"— y como nada lo
          // estiraba, ese mínimo se convertía en el ancho exacto: 400 dentro de
          // 496 útiles, con 96px de aire a la derecha de cada campo.
          //
          // Con `stretch` el ancho lo pone el diálogo, que es quien lo sabe, y
          // quien de verdad quiera encogerse lo pide con `alignSelf`.
          // Comprobado en el navegador: 400 → 496, que es exactamente el ancho
          // útil (560 de diálogo menos 32+32 de relleno).
          alignItems: 'stretch',
          ...sx,
        }}
      >
        {children}
      </DialogContent>
    </MUIDialog>
  );
};

export default Dialog;
