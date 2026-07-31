import { Box, Stack, IconButton, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { IconDelete } from '@components/icons';
import Badge from '@components/badge';
import { accentSurface } from '@components/accent_surface';
import { dateFormatFriendly, formatDate } from '@utils/date';
import Typography from '@components/typography';
import { DocumentoArchivo, DocumentoCategoria } from '@definition/documentos';
import useCurrentUser from '@hooks/useCurrentUser';

interface DocumentoCardProps {
  documento: DocumentoArchivo;
  categoria?: DocumentoCategoria;
  onView: (doc: DocumentoArchivo) => void;
  onDelete: (doc: DocumentoArchivo) => void;
}

const DocumentoCard = ({
  documento,
  categoria,
  onView,
  onDelete,
}: DocumentoCardProps) => {
  const { isElder, isAdmin, person } = useCurrentUser();
  const canManage = isElder || isAdmin;

  const isNew = person?.person_uid
    ? !documento.vistoPor?.includes(person.person_uid)
    : false;

  // Eran TRES copias de quince líneas de la misma etiqueta, distintas solo en
  // el color y el texto — y la del aviso llevaba el ámbar CONGELADO
  // (`#D97706`, `rgba(245,158,11,…)`), que no sigue al tema. El Badge del
  // sistema ya sabe pintar las tres.
  const renderVigenciaBadge = () => {
    if (documento.vigencia === 'indefinido') {
      return <Badge size="small" color="accent" text="Indefinido" />;
    }

    if (!documento.fechaExpiracion) return null;

    const dias = Math.ceil(
      (new Date(documento.fechaExpiracion).getTime() - Date.now()) /
        (1000 * 3600 * 24)
    );

    if (dias <= 7) {
      return (
        <Badge
          size="small"
          color="orange"
          text={`Expira en ${dias} ${dias === 1 ? 'día' : 'días'}`}
        />
      );
    }

    return (
      <Badge
        size="small"
        color="accent"
        text={`Expira el ${dateFormatFriendly(formatDate(new Date(documento.fechaExpiracion), 'yyyy/MM/dd'))}`}
      />
    );
  };

  const accentColor = categoria?.color || 'var(--accent-main)';

  return (
    // Era un `div` con `onClick`: con el ratón se abría el documento y con el
    // teclado no había forma. Como <button> hace falta el reset (fondo, borde,
    // fuente y alineación vienen puestos de fábrica) y `width: 100%`, porque un
    // control de formulario NO se estira al ancho del padre aunque sea flex.
    <Box
      component="button"
      type="button"
      className="active-press"
      sx={{
        appearance: 'none',
        font: 'inherit',
        textAlign: 'left',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        borderRadius: 'var(--shape-lg)',
        border: '1px solid var(--line)',
        background: 'var(--card)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition:
          'box-shadow var(--motion-medium) var(--ease-standard), transform var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard)',
        // La UÑITA que señaló Carlos: era un `::before` de 5px pegado al canto
        // izquierdo, y la esquina redondeada lo cortaba en seco dejando dos
        // muescas. La cápsula del sistema (§6.3) va DENTRO del margen, con su
        // propio radio, y encima trae el lavado del color que hace que la
        // tarjeta entera se lea "de esta categoría".
        ...accentSurface(accentColor),
        paddingTop: '20px',
        paddingRight: '20px',
        paddingBottom: '20px',
        '&:hover': {
          boxShadow: 'var(--shadow-md)',
          transform: 'translateY(-4px)',
          borderColor: accentColor,
        },
        '&:focus-visible': {
          outline: '2px solid var(--accent-main)',
          outlineOffset: '2px',
        },
      }}
      onClick={() => onView(documento)}
    >
      {isNew && (
        <Tooltip title="Nuevo documento">
          <Box
            sx={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 8,
              height: 8,
              borderRadius: 'var(--shape-full)',
              backgroundColor: 'var(--brand)',
              boxShadow: '0 0 8px var(--brand)',
              animation: 'pulse 2.2s infinite',
            }}
          />
        </Tooltip>
      )}

      <Stack
        direction="row"
        spacing={2}
        alignItems="flex-start"
        sx={{ pl: '4px' }}
      >
        <Box
          sx={{
            width: 52,
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Sin borde: en toda la app una caja de icono es relleno tintado
            // y nada más —el círculo del estado vacío, el recuadro de años—.
            // El delineado solo estaba aquí y en el diálogo de ver documento,
            // y con el 7% de relleno que tenía, el borde era casi lo único que
            // se veía de la caja. Subiendo el relleno al 12% la caja se lee
            // sola, que es lo que hace el resto.
            background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
            borderRadius: 'var(--shape-md)',
            flexShrink: 0,
            transition:
              'background-color var(--motion-medium) var(--ease-standard)',
          }}
        >
          <PictureAsPdfIcon sx={{ color: accentColor, fontSize: 30 }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', mb: 1 }}>
            {categoria && (
              // Las MISMAS medidas que el `Badge` de al lado, que es el que
              // dice la vigencia: alto 20, relleno 2/6, y el texto tal como se
              // escribe. Iba en VERSALITAS a peso 700 y con espaciado propio,
              // así que dos etiquetas de la misma fila —"REUNIONES" y "1 mes"—
              // no se parecían en nada.
              // El color sí es propio, y a propósito: es de la categoría, y es
              // lo que distingue una de otra de un vistazo.
              <Box
                className="label-small-medium"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '20px',
                  padding: '2px 6px',
                  backgroundColor: `color-mix(in srgb, ${categoria.color} 12%, transparent)`,
                  color: categoria.color,
                  borderRadius: 'var(--shape-full)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {categoria.nombre}
              </Box>
            )}
            {renderVigenciaBadge()}
          </Box>

          <Typography
            className="h3"
            sx={{
              color: 'var(--ink)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.35,
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            {documento.nombre}
          </Typography>

          {documento.descripcion && (
            <Typography
              color="var(--ink-2)"
              className="body-small-regular"
              sx={{
                mt: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.4,
              }}
            >
              {documento.descripcion}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          mt: 'auto',
          pt: 1.5,
          pl: '4px',
          borderTop: '1px solid var(--line)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography className="label-small-regular" color="var(--ink-3)">
            {dateFormatFriendly(
              formatDate(new Date(documento.fechaSubida), 'yyyy/MM/dd')
            )}
          </Typography>
          <Typography className="label-small-regular" color="var(--ink-3)">
            •
          </Typography>
          <Typography className="label-small-regular" color="var(--ink-3)">
            {(documento.fileSize / 1024 / 1024).toFixed(2)} MB
          </Typography>
        </Stack>

        {canManage && (
          <Stack
            direction="row"
            spacing={0.5}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip title="Eliminar documento">
              <IconButton
                onClick={() => onDelete(documento)}
                size="small"
                sx={{
                  color: 'var(--red-main)',
                  padding: '6px',
                  borderRadius: 'var(--shape-full)',
                  backgroundColor:
                    'color-mix(in srgb, var(--red-main) 6%, transparent)',
                  transition:
                    'background-color var(--motion-fast) var(--ease-standard)',
                  '&:hover': {
                    background:
                      'color-mix(in srgb, var(--red-main) 14%, transparent)',
                  },
                }}
              >
                <IconDelete color="currentColor" width={18} height={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default DocumentoCard;
