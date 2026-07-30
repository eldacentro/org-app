import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@mui/material';
import { IconClose } from '@components/icons';
import Typography from '@components/typography';
import { PlanEvacuacion } from '@definition/evacuacion';
import Plano2D from './Plano2D';
import DetalleSeleccion, { Seleccion } from './DetalleSeleccion';

/**
 * El plano a pantalla completa.
 *
 * En un móvil el salón es una franja apaisada de 194x92 metida en una pantalla
 * vertical: por mucho zoom que se ponga, se ve un trozo cada vez. En apaisado
 * cabe entero y con detalle, que es como se mira un plano.
 *
 * Al abrir se pide pantalla completa de verdad (sin barra del navegador) y se
 * bloquea la orientación en horizontal. Las dos cosas pueden fallar y no pasa
 * nada:
 * - En iOS no existe el bloqueo de orientación, y en Safari de iPhone tampoco
 *   la pantalla completa. Ahí queda una capa que ocupa toda la ventana, que ya
 *   es bastante mejor que el recuadro de la página, y si el teléfono está en
 *   vertical se le dice que lo gire.
 * - Si el usuario tiene el giro bloqueado en su teléfono, igual.
 *
 * Por eso NADA de esto se da por hecho: todo va en try/catch y la vista
 * funciona aunque las dos llamadas fallen.
 */

type Props = {
  plan: PlanEvacuacion;
  seleccion: Seleccion;
  onSelect: (seleccion: Seleccion) => void;
  onClose: () => void;
};

const PlanoPantallaCompleta = ({
  plan,
  seleccion,
  onSelect,
  onClose,
}: Props) => {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = contenedor.current;

    const entrar = async () => {
      try {
        await elemento?.requestFullscreen?.();
      } catch {
        // Sin pantalla completa nativa: la capa ya ocupa toda la ventana.
      }

      try {
        const orientacion = screen.orientation as ScreenOrientation & {
          lock?: (o: string) => Promise<void>;
        };
        await orientacion?.lock?.('landscape');
      } catch {
        // El giro puede estar bloqueado, o el navegador no soportarlo.
      }
    };

    entrar();

    // El scroll de la página detrás no debe moverse mientras esto está abierto.
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const alPulsarTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', alPulsarTecla);

    // Salir de la pantalla completa por el gesto del sistema (o con Esc, que
    // el navegador se queda) también tiene que cerrar esta vista, o quedaría
    // la capa abierta sin que nada la explique.
    const alCambiarPantallaCompleta = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener('fullscreenchange', alCambiarPantallaCompleta);

    return () => {
      document.body.style.overflow = overflowPrevio;
      document.removeEventListener('keydown', alPulsarTecla);
      document.removeEventListener(
        'fullscreenchange',
        alCambiarPantallaCompleta
      );

      try {
        (
          screen.orientation as ScreenOrientation & { unlock?: () => void }
        )?.unlock?.();
      } catch {
        // Da igual: si no se pudo bloquear, tampoco hay nada que soltar.
      }

      if (document.fullscreenElement)
        document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose]);

  // Se monta como hijo directo de <body>. Dentro del árbol de la página, la
  // barra de navegación y los botones flotantes de la app seguían pintándose
  // por encima por muy alto que fuera el z-index: cada uno crea su propio
  // contexto de apilamiento y desde dentro no se les gana.
  return createPortal(
    <Box
      ref={contenedor}
      sx={{
        position: 'fixed',
        inset: 0,
        // Por encima de TODO: la barra de navegación de la app y sus botones
        // flotantes se dibujan en sus propias capas y con 1400 seguían
        // asomando por encima del plano.
        zIndex: 2000,
        backgroundColor: 'var(--paper)',
        overscrollBehavior: 'contain',
        display: 'flex',
        flexDirection: 'column',
        // El fondo va de borde a borde, pero el CONTENIDO se mete dentro de la
        // zona segura. Sin esto, en un iPhone el título y el botón de salir
        // quedaban debajo de la hora y la batería, y el aviso de abajo debajo
        // de la barra de inicio. En apaisado —que es como se mira este plano—
        // el notch se va a un LADO, así que hacen falta las cuatro y no solo
        // arriba y abajo.
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '10px 14px',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            minWidth: 0,
          }}
        >
          <Typography className="h3" color="var(--ink)">
            Plan de evacuación
          </Typography>
          <Typography className="body-small-regular" color="var(--ink-3)">
            Toca cualquier punto del plano
          </Typography>
        </Box>

        <Box
          component="button"
          type="button"
          onClick={onClose}
          aria-label="Salir de pantalla completa"
          sx={{
            appearance: 'none',
            border: '1px solid var(--line)',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-max)',
            backgroundColor: 'var(--card)',
            color: 'var(--ink-2)',
            '&:hover': { color: 'var(--ink)' },
          }}
        >
          <IconClose width={16} height={16} color="currentColor" />
          <Typography className="label-small-semibold" color="inherit">
            Salir
          </Typography>
        </Box>
      </Box>

      {/* El plano ocupa todo lo que queda */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          padding: '0 14px 14px',
          position: 'relative',
        }}
      >
        <Plano2D seleccion={seleccion} onSelect={onSelect} />

        {/* El detalle flota sobre el plano, arriba a la derecha: aquí sí, porque
            en apaisado sobra sitio y así no se come el alto del dibujo. Los
            controles de zoom viven abajo a la izquierda, así que no se pisan. */}
        {seleccion && (
          <Box
            sx={{
              position: 'absolute',
              top: '10px',
              right: '24px',
              width: { mobile: 'calc(100% - 48px)', tablet: '380px' },
              maxHeight: 'calc(100% - 20px)',
              overflowY: 'auto',
              boxShadow: 'var(--pop-up-shadow)',
              borderRadius: 'var(--r-lg)',
            }}
          >
            <DetalleSeleccion
              plan={plan}
              seleccion={seleccion}
              onClose={() => onSelect(null)}
            />
          </Box>
        )}
      </Box>

      {/* Solo se ve si el teléfono sigue en vertical (no se pudo bloquear el
          giro, que es lo normal en iOS). */}
      <Box
        sx={{
          display: 'none',
          '@media (orientation: portrait) and (max-width: 900px)': {
            display: 'flex',
          },
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '14px',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-max)',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--line)',
          }}
        >
          <Typography className="label-small-medium" color="var(--ink-2)">
            Gira el teléfono para verlo más grande
          </Typography>
        </Box>
      </Box>
    </Box>,
    document.body
  );
};

export default PlanoPantallaCompleta;
