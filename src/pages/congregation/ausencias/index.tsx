import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useNavigate } from 'react-router';
import PageTitle from '@components/page_title';
import Typography from '@components/typography';
import SearchBar from '@components/search_bar';
import InfoTip from '@components/info_tip';
import Button from '@components/button';
import { IconAirplaneTicket, IconInfo } from '@components/icons';
import { useBreakpoints } from '@hooks/index';
import useTimeAwayOverview, {
  TimeAwayRow,
} from '@features/persons/time_away_overview/useTimeAwayOverview';

/**
 * Ausencias — todas las de la congregación en un solo sitio.
 *
 * Hasta ahora los periodos de ausencia solo se veían de uno en uno, dentro de
 * la ficha de cada persona, o como aviso suelto al asignar a alguien a una
 * reunión. No había forma de responder "¿quién está fuera esta semana?" sin
 * abrir las 96 fichas.
 *
 * Solo la ven los ancianos (ruta bajo ElderRoute): los periodos llevan
 * comentarios personales y hoy únicamente los ve quien puede abrir fichas.
 */

const StatusChip = ({
  label,
  tone,
}: {
  label: string;
  tone: 'brand' | 'amber' | 'muted';
}) => {
  const palette = {
    brand: { bg: 'var(--brand-tint)', fg: 'var(--brand-deep)' },
    amber: { bg: 'var(--amber-tint)', fg: 'var(--amber)' },
    muted: { bg: 'var(--accent-100)', fg: 'var(--ink-2)' },
  }[tone];

  return (
    <Box
      sx={{
        flexShrink: 0,
        padding: '4px 8px',
        borderRadius: 'var(--radius-max)',
        backgroundColor: palette.bg,
      }}
    >
      <Typography className="label-small-semibold" color={palette.fg}>
        {label}
      </Typography>
    </Box>
  );
};

const AwayRow = ({ row }: { row: TimeAwayRow }) => {
  const navigate = useNavigate();

  const tone = row.openStale ? 'amber' : row.status === 'past' ? 'muted' : 'brand';

  return (
    <Box
      onClick={() => navigate(`/persons/${row.person_uid}`)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--line)',
        backgroundColor: 'var(--card)',
        cursor: 'pointer',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          borderColor: 'var(--accent-300)',
          boxShadow: 'var(--hover-shadow)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: 0,
        }}
      >
        <Typography
          className="body-regular-semibold"
          color={row.status === 'past' ? 'var(--ink-2)' : 'var(--ink)'}
          sx={{ flex: 1, minWidth: 0 }}
        >
          {row.name}
        </Typography>

        {row.status_label && (
          <StatusChip label={row.status_label} tone={tone} />
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '4px 8px',
        }}
      >
        <Typography className="body-small-regular" color="var(--ink-2)">
          {row.dates}
        </Typography>

        {row.group && (
          <>
            <Typography className="body-small-regular" color="var(--ink-3)">
              ·
            </Typography>
            <Typography className="body-small-regular" color="var(--ink-3)">
              {row.group}
            </Typography>
          </>
        )}
      </Box>

      {row.comments && (
        <Typography className="body-small-regular" color="var(--ink-3)">
          {row.comments}
        </Typography>
      )}
    </Box>
  );
};

const AwaySection = ({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: TimeAwayRow[];
  emptyText?: string;
}) => {
  if (rows.length === 0 && !emptyText) return null;

  return (
    <Stack spacing="8px">
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <Typography className="h3" color="var(--ink)">
          {title}
        </Typography>
        {rows.length > 0 && (
          <Typography className="body-small-regular" color="var(--ink-3)">
            {rows.length}
          </Typography>
        )}
      </Box>

      {rows.length === 0 ? (
        <Typography className="body-small-regular" color="var(--ink-3)">
          {emptyText}
        </Typography>
      ) : (
        rows.map((row) => <AwayRow key={row.key} row={row} />)
      )}
    </Stack>
  );
};

const AusenciasPage = () => {
  const { tabletUp } = useBreakpoints();
  const { sections, summary, search, setSearch, hasAny } = useTimeAwayOverview();

  const [showPast, setShowPast] = useState(false);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 'var(--dash-measure)',
        margin: '0 auto',
        paddingTop: '16px',
      }}
    >
      <PageTitle title="Ausencias" />

      <Stack spacing="16px">
        {/* Resumen: la pregunta que trae a alguien a esta página es
            "¿cuánta gente falta ahora mismo?". */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: tabletUp ? '20px 24px' : '16px',
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--line)',
            backgroundColor: 'var(--card)',
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-max)',
              backgroundColor: 'var(--brand-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconAirplaneTicket color="var(--brand)" width={24} height={24} />
          </Box>

          <Stack spacing="2px" sx={{ minWidth: 0 }}>
            <Typography className="h2" color="var(--ink)">
              {summary.away_now === 0
                ? 'Nadie está de ausencia'
                : summary.away_now === 1
                  ? '1 persona de ausencia'
                  : `${summary.away_now} personas de ausencia`}
            </Typography>
            <Typography className="body-small-regular" color="var(--ink-2)">
              {summary.upcoming === 0
                ? 'Sin ausencias previstas'
                : summary.upcoming === 1
                  ? '1 ausencia prevista'
                  : `${summary.upcoming} ausencias previstas`}
            </Typography>
          </Stack>
        </Box>

        {/* Las ausencias abiertas y olvidadas ensucian los avisos al programar
            reuniones meses después, así que se dicen aquí para que alguien las
            cierre. */}
        {summary.stale > 0 && (
          <InfoTip
            isBig={false}
            color="warning"
            icon={<IconInfo color="var(--amber)" />}
            text={
              summary.stale === 1
                ? '1 ausencia lleva meses abierta sin fecha de vuelta. Mientras siga así, esa persona aparecerá como ausente en cualquier programa futuro.'
                : `${summary.stale} ausencias llevan meses abiertas sin fecha de vuelta. Mientras sigan así, esas personas aparecerán como ausentes en cualquier programa futuro.`
            }
          />
        )}

        {hasAny && (
          <SearchBar
            placeholder="Buscar por nombre, grupo o comentario"
            value={search}
            onSearch={(value) => setSearch(value ?? '')}
          />
        )}

        {!hasAny && (
          <Typography className="body-regular" color="var(--ink-2)">
            Aquí aparecerán los periodos de ausencia que se apunten en las
            fichas de las personas, o que cada publicador apunte en su propio
            perfil. Ahora mismo no hay ninguno.
          </Typography>
        )}

        <AwaySection
          title="Ahora mismo"
          rows={sections.ongoing}
          emptyText={hasAny ? 'Nadie está fuera hoy.' : undefined}
        />

        <AwaySection title="Próximas" rows={sections.upcoming} />

        {sections.past.length > 0 && (
          <Stack spacing="8px">
            <Box>
              <Button
                variant="tertiary"
                onClick={() => setShowPast((prev) => !prev)}
              >
                {showPast
                  ? 'Ocultar las terminadas'
                  : `Ver las terminadas (${sections.past.length})`}
              </Button>
            </Box>

            {showPast && <AwaySection title="Terminadas" rows={sections.past} />}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default AusenciasPage;
