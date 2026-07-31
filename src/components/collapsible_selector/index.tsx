import { ReactNode } from 'react';
import { Box, Collapse } from '@mui/material';
import { IconCollapse } from '@components/icons';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import Typography from '@components/typography';

/**
 * El panel para elegir semana o mes.
 *
 * Lo usan el editor de entre semana, el de fin de semana, Departamentos y los
 * de mes de Exhibidores y Salidas. Antes cada uno tenía el suyo y no se
 * parecían: uno enseñaba plegado "Semana: **Agosto 5**" sobre fondo azul claro
 * con un enlace "Cambiar", y otro un "Semanas" grande sobre fondo blanco que
 * no decía qué semana estaba abierta. Mismo trabajo, dos aspectos y dos
 * comportamientos.
 *
 * En escritorio es una tarjeta pegada al lado, siempre abierta. En móvil se
 * pliega y deja una barra que dice QUÉ hay elegido —que es el dato útil— y que
 * se puede cambiar.
 */
const CollapsibleSelector = ({
  title,
  valuePrefix,
  valueLabel,
  expanded,
  onToggle,
  actions,
  children,
}: {
  /** Título del panel abierto ("Reuniones", "Semanas", "Meses"). */
  title: string;
  /** Qué es lo elegido, para la barra plegada ("Semana", "Mes"). */
  valuePrefix: string;
  /** Lo elegido, ya escrito para leer. Sin esto no se pliega. */
  valueLabel?: string;
  expanded: boolean;
  onToggle: () => void;
  /** Controles propios del panel (ordenar, borrar…), a la derecha del título. */
  actions?: ReactNode;
  children: ReactNode;
}) => {
  const { t } = useAppTranslation();
  const { desktopUp } = useBreakpoints();

  // Plegado solo tiene sentido si se puede decir qué hay elegido. Sin valor, la
  // barra diría "Semana:" y nada más, y habría que abrirla para enterarse.
  if (!desktopUp && !expanded && valueLabel) {
    return (
      // Era un `Box` con `onClick`: la barra que abre el selector de mes en
      // Exhibidores y en Salidas, y con el teclado no se llegaba a ella.
      <Box
        component="button"
        type="button"
        aria-expanded={false}
        onClick={onToggle}
        sx={{
          appearance: 'none',
          font: 'inherit',
          color: 'inherit',
          textAlign: 'left',
          width: '100%',
          // Plegado es una BARRA, no una tarjeta: un escalón menos de curva
          // que el panel abierto. Con el mismo radio los dos parecían la misma
          // pieza cambiando de tamaño, y no lo son.
          borderRadius: 'var(--shape-md)',
          border: '1px solid var(--line)',
          backgroundColor: 'var(--accent-100)',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition:
            'background-color var(--motion-fast) var(--ease-standard)',
          '&:hover': { backgroundColor: 'var(--accent-150)' },
          '&:focus-visible': {
            outline: '2px solid var(--accent-main)',
            outlineOffset: '2px',
          },
        }}
      >
        <Typography
          className="body-small-semibold"
          sx={{ color: 'var(--accent-dark)', minWidth: 0 }}
        >
          {valuePrefix}: <strong>{valueLabel}</strong>
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <Typography
            className="label-small-semibold"
            color="var(--accent-main)"
          >
            {t('tr_change', 'Cambiar')}
          </Typography>
          <IconCollapse
            color="var(--accent-main)"
            sx={{ transform: 'rotate(180deg)', fontSize: '16px' }}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: desktopUp ? '360px' : '100%',
        flexShrink: 0,
        borderRadius: 'var(--shape-lg)',
        border: '1px solid var(--line)',
        backgroundColor: 'var(--card)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: desktopUp ? 'sticky' : 'unset',
        top: desktopUp ? 57 : 'unset',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          cursor: desktopUp ? 'default' : 'pointer',
        }}
      >
        {/* La cabecera del panel ABIERTO también pliega, y también con el
            teclado. Era un `Box` con `onClick`: en una pantalla estrecha —que
            es donde este panel se pliega— no había forma de cerrarlo tabulando.
            La barra PLEGADA ya se arregló en su día; ésta se quedó.

            Va como capa que cubre la franja, no envolviéndola, porque a la
            derecha hay `actions` —el orden de las semanas, por ejemplo— y un
            botón dentro de otro no es HTML válido. Esa zona lleva su
            `position: relative` para quedar por encima. */}
        {!desktopUp && (
          <Box
            component="button"
            type="button"
            aria-expanded={expanded}
            aria-label={title}
            onClick={onToggle}
            sx={{
              position: 'absolute',
              inset: 0,
              appearance: 'none',
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              '&:focus-visible': {
                outline: '2px solid var(--accent-main)',
                outlineOffset: '4px',
                borderRadius: 'var(--shape-xs)',
              },
            }}
          />
        )}

        <Typography className="h2">{title}</Typography>

        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {actions}

          {!desktopUp && (
            <IconCollapse
              color="var(--black)"
              sx={{
                transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 0.3s',
              }}
            />
          )}
        </Box>
      </Box>

      <Collapse in={desktopUp || expanded} timeout="auto" unmountOnExit>
        {children}
      </Collapse>
    </Box>
  );
};

export default CollapsibleSelector;
