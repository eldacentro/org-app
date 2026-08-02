import { Box, Stack } from '@mui/material';
import { JwpubReportType } from '@services/app/jwpub_report';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import Button from '@components/button';
import IconLoading from '@components/icon_loading';
import InfoTip from '@components/info_tip';
import { JwpubReportDialogProps } from './index.types';

/**
 * El informe de una importación desde `.jwpub`, para bosquejos y para
 * cánticos.
 *
 * Se abre SIEMPRE, también cuando el archivo no trae ninguna diferencia. Ese
 * era justo el caso que fallaba: reimportar el mismo archivo —que es cómo uno
 * comprueba que está al día— no decía nada, y quedarse en silencio delante de
 * alguien que acaba de pedir una comprobación es la peor respuesta posible.
 *
 * Y cubre los cuatro casos, no tres: lo que el archivo NO trae también se
 * cuenta, y se dice en voz alta qué pasa con ello. No se borra. Nunca.
 */

const ETIQUETA = {
  added: 'Nuevo',
  renamed: 'Cambia el título',
  reactivated: 'Vuelve a estar en uso',
  retired: 'Pasa a «No usar»',
} as const;

const COLOR = {
  added: 'var(--accent-main)',
  renamed: 'var(--ink-2)',
  reactivated: 'var(--green-main)',
  retired: 'var(--red-main)',
} as const;

/** "1 cántico" / "12 cánticos", sin concatenar la "s" a mano. */
const contar = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

const Resumen = ({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '12px',
    }}
  >
    <Typography className="body-small-regular" color="var(--ink-2)">
      {etiqueta}
    </Typography>
    <Typography className="body-small-semibold" color="var(--ink)">
      {valor}
    </Typography>
  </Box>
);

const JwpubReportDialog = ({
  open,
  report,
  entidadSingular,
  entidadPlural,
  publicationTitle,
  aviso,
  isSaving,
  onCancel,
  onConfirm,
}: JwpubReportDialogProps) => {
  const nuevos = report.changes.filter((c) => c.kind === 'added');
  const cambiados = report.changes.filter((c) => c.kind !== 'added');

  return (
    <Dialog open={open} onClose={onCancel} sx={{ maxWidth: '100%' }}>
      <Box>
        <Typography className="h2" color="var(--ink)">
          {report.hasChanges
            ? 'Vista previa de importación'
            : 'Nada ha cambiado'}
        </Typography>
        <Typography className="body-small-regular" color="var(--ink-2)">
          {publicationTitle.length > 0
            ? publicationTitle
            : 'Archivo .jwpub sin título'}
        </Typography>
      </Box>

      {aviso && <InfoTip isBig={false} color="warning" text={aviso} />}

      {!report.hasChanges && (
        <InfoTip
          isBig={false}
          color="success"
          text={`Nada ha cambiado. ${contar(
            report.total,
            `${entidadSingular} del archivo es idéntico`,
            `${entidadPlural} del archivo son idénticos`
          )} a lo que ya tiene la aplicación.`}
        />
      )}

      {/* ── Las cuatro cuentas, siempre las cuatro ─────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px 16px',
          borderRadius: 'var(--shape-sm)',
          border: '1px solid var(--line)',
          backgroundColor: 'var(--accent-100)',
        }}
      >
        <Resumen
          etiqueta="El archivo trae"
          valor={contar(report.total, entidadSingular, entidadPlural)}
        />
        <Resumen etiqueta="Sin cambios" valor={String(report.unchanged)} />
        <Resumen etiqueta="Nuevos" valor={String(nuevos.length)} />
        <Resumen etiqueta="Cambian" valor={String(cambiados.length)} />
        <Resumen
          etiqueta="Ya no están en el archivo"
          valor={String(report.missing.length)}
        />
      </Box>

      {report.missing.length > 0 && (
        <InfoTip
          isBig={false}
          color="warning"
          text={`${contar(
            report.missing.length,
            `${entidadSingular} que la aplicación tiene NO viene`,
            `${entidadPlural} que la aplicación tiene NO vienen`
          )} en este archivo: ${report.missing
            .slice(0, 12)
            .map((m) => m.number)
            .join(', ')}${
            report.missing.length > 12 ? '…' : ''
          }. No se borran: se quedan tal como están. Importar sustituye lo que viene, no vacía lo que falta.`}
        />
      )}

      {report.changes.length > 0 && (
        <Stack
          spacing="8px"
          sx={{
            width: '100%',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '4px 0',
          }}
        >
          {report.changes.map((change) => (
            <Box
              key={change.number}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '8px 12px',
                borderRadius: 'var(--shape-sm)',
                border: '1px solid var(--accent-200)',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <Typography className="body-small-semibold" color="var(--ink)">
                  Número {change.number}
                </Typography>
                <Typography
                  className="label-small-semibold"
                  sx={{ color: COLOR[change.kind] }}
                >
                  {ETIQUETA[change.kind]}
                </Typography>
              </Box>

              {change.previous_title.length > 0 && (
                <Typography
                  className="body-small-regular"
                  color="var(--grey-350)"
                  sx={{ textDecoration: 'line-through' }}
                >
                  {change.previous_title}
                </Typography>
              )}

              <Typography className="body-small-regular" color="var(--ink)">
                {change.new_title}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {/* Sin cambios no hay nada que confirmar, así que un solo botón: dos
          que hacen lo mismo es lo que prohíbe el sistema de diseño. */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {report.hasChanges && (
          <Button variant="tertiary" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
        )}
        <Button
          variant="main"
          onClick={report.hasChanges ? onConfirm : onCancel}
          disabled={isSaving}
          startIcon={isSaving ? <IconLoading color="card" /> : null}
        >
          {report.hasChanges ? 'Importar' : 'Entendido'}
        </Button>
      </Box>
    </Dialog>
  );
};

export type { JwpubReportType };

export default JwpubReportDialog;
