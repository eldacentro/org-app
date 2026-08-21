import { Box, Stack } from '@mui/material';
import { MeetingRunPart, MeetingRunRecord } from '@services/app/meeting_run';
import { MeetingRunPartInfo } from './run_parts';
import Badge from '@components/badge';
import Button from '@components/button';
import Divider from '@components/divider';
import Typography from '@components/typography';

/**
 * A partir de aquí se considera que una parte «se pasó».
 *
 * Pulsar «Siguiente» de pie y con el móvil en la mano llega tarde por sistema, y
 * marcar en naranja a alguien que terminó a su hora porque el presidente tardó
 * seis segundos en pulsar sería injusto además de inútil.
 */
const MARGEN_SEGUNDOS = 30;

const reloj = (segundos: number) => {
  const total = Math.abs(Math.round(segundos));

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Cómo fue la reunión, una vez terminada.
 *
 * Es lo único que queda guardado, y solo de esa semana y en ese teléfono. No es
 * una nota de examen ni un historial de nadie: es para que quien preside pueda
 * mirar después qué se alargó, mientras se acuerda.
 */
const MeetingRunSummary = ({
  run,
  parts,
  info,
  onReopen,
  onDiscard,
}: {
  run: MeetingRunRecord;
  parts: MeetingRunPart[];
  info: Record<string, MeetingRunPartInfo>;
  onReopen: VoidFunction;
  onDiscard: VoidFunction;
}) => {
  const cronometradas = parts.filter(
    (part) => typeof run.actual[part.key] === 'number'
  );

  const desfase = run.drift;

  return (
    <Box
      sx={{
        borderRadius: 'var(--shape-lg)',
        border: '1px solid var(--line)',
        backgroundColor: 'var(--card)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <Typography className="h4">Cómo fue la reunión</Typography>

        <Badge
          size="small"
          color={desfase > 0 ? 'orange' : 'green'}
          // Corto: con «Terminó» delante, el título de al lado se partía en
          // dos renglones en un móvil.
          text={
            desfase > 0
              ? `${desfase} min tarde`
              : desfase < 0
                ? `${-desfase} min antes`
                : 'en hora'
          }
        />
      </Box>

      {cronometradas.length === 0 && (
        <Typography className="body-small-regular" color="var(--ink-3)">
          No se cronometró ninguna parte.
        </Typography>
      )}

      {cronometradas.length > 0 && (
        <Stack divider={<Divider color="var(--grey-200)" />}>
          {cronometradas.map((part) => {
            const duro = run.actual[part.key];
            const previsto = part.minutes * 60;
            const sePaso = duro - previsto >= MARGEN_SEGUNDOS;

            return (
              <Box
                key={part.key}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 0',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    className="body-small-regular"
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {info[part.key]?.label ?? part.key}
                  </Typography>

                  {info[part.key]?.person?.length > 0 && (
                    <Typography
                      className="label-small-regular"
                      color="var(--ink-3)"
                    >
                      {info[part.key].person}
                    </Typography>
                  )}
                </Box>

                <Typography
                  className="body-small-semibold"
                  color={sePaso ? 'var(--orange-dark)' : 'var(--ink-2)'}
                  sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
                >
                  {reloj(duro)}
                </Typography>

                <Typography
                  className="label-small-regular"
                  color="var(--ink-3)"
                  sx={{
                    flexShrink: 0,
                    width: '62px',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  de {part.minutes} min
                </Typography>
              </Box>
            );
          })}
        </Stack>
      )}

      <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onDiscard} disableAutoStretch>
          Borrar
        </Button>
        <Button variant="tertiary" onClick={onReopen} disableAutoStretch>
          Reanudar
        </Button>
      </Box>
    </Box>
  );
};

export default MeetingRunSummary;
