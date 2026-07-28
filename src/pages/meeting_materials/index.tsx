import { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { IconImportFile, IconJwOrg } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import PageTitle from '@components/page_title';
import Typography from '@components/typography';
import InfoTip from '@components/info_tip';
import Badge from '@components/badge';
import useMeetingMaterialsPage from './useMeetingMaterialsPage';
import { BimestreMateriales } from '@services/app/meeting_materials';

/**
 * Materiales de reunión.
 *
 * Los dos botones de importar estaban sueltos en Configuración y no había
 * forma de saber QUÉ hay importado ni de dónde salió. Aquí están los dos, y
 * además lo que hasta ahora solo se podía averiguar mirando la base de datos:
 * qué cuadernos hay, de dónde vinieron, y —lo que de verdad importa— qué
 * semanas de las que vienen están sin material.
 */

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const nombreBimestre = (grupo: BimestreMateriales) =>
  `${MESES[grupo.primerMes - 1]}–${MESES[grupo.primerMes]} ${grupo.year}`;

const fechaCorta = (iso?: string) => {
  if (!iso) return '';

  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  return fecha.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const semanaCorta = (weekOf: string) => {
  const partes = weekOf.split('/');
  if (partes.length !== 3) return weekOf;

  return `${Number(partes[2])} de ${MESES[Number(partes[1]) - 1].toLowerCase()}`;
};

const ORIGEN = {
  jwpub: { texto: 'Desde .jwpub', color: 'green' as const },
  jw: { texto: 'Desde jw.org', color: 'accent' as const },
  desconocido: { texto: 'Origen desconocido', color: 'grey' as const },
};

const Tarjeta = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      padding: '16px',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-l)',
      backgroundColor: 'var(--card)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}
  >
    {children}
  </Box>
);

const MeetingMaterials = () => {
  const { t } = useAppTranslation();

  const {
    handleOpenJWImport,
    isNavigatorOnline,
    handleFileSelected,
    bimestres,
    semanasQueFaltan,
    autoImport,
    autoImportFrequency,
    proximaAutomatica,
    semanasVigiladas,
  } = useMeetingMaterialsPage();

  const botonSx = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    border: '1px solid var(--accent-200)',
    borderRadius: 'var(--radius-l)',
    backgroundColor: 'var(--accent-100)',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    '&:hover': { backgroundColor: 'var(--accent-200)' },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageTitle title={t('tr_meetingMaterials', 'Materiales de reunión')} />

      {/* ── Importar ────────────────────────────────────────────────────── */}
      <Stack spacing="12px">
        {isNavigatorOnline && (
          <Box sx={botonSx} onClick={handleOpenJWImport}>
            <IconJwOrg color="var(--accent-main)" width={22} height={22} />
            <Box>
              <Typography className="h4" color="var(--ink)">
                {t('tr_sourceImportJw', 'Importar desde jw.org')}
              </Typography>
              <Typography className="label-small-regular" color="var(--ink-2)">
                Trae el material publicado. El enlace de JW Library llevará al
                cuaderno del bimestre.
              </Typography>
            </Box>
          </Box>
        )}

        <Box sx={{ ...botonSx, position: 'relative' }}>
          <IconImportFile color="var(--accent-main)" width={22} height={22} />
          <Box>
            <Typography className="h4" color="var(--ink)">
              {t('tr_sourceImportEPUB', 'Importar desde archivo .jwpub')}
            </Typography>
            <Typography className="label-small-regular" color="var(--ink-2)">
              Además, el enlace de JW Library llevará a la semana exacta.
            </Typography>
          </Box>
          {/* Sin `accept`: iOS agrisa los .jwpub si se restringe por extensión
              (no es un UTI reconocido). Se valida en handleFileSelected. */}
          <input
            type="file"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 2,
            }}
            onChange={handleFileSelected}
          />
        </Box>
      </Stack>

      {/* ── Lo que falta ────────────────────────────────────────────────── */}
      {semanasQueFaltan.length > 0 && (
        <InfoTip
          isBig={false}
          color="warning"
          text={`Sin material: ${semanasQueFaltan
            .map((week) => semanaCorta(week))
            .join(', ')}. Importa el cuaderno correspondiente antes de repartir esas semanas.`}
        />
      )}

      {semanasQueFaltan.length === 0 && bimestres.length > 0 && (
        <InfoTip
          isBig={false}
          color="success"
          text={`Las próximas ${semanasVigiladas} semanas tienen material.`}
        />
      )}

      {/* ── Importación automática ──────────────────────────────────────── */}
      <Tarjeta>
        <Typography className="h4" color="var(--ink)">
          Importación automática desde jw.org
        </Typography>
        <Typography className="body-small-regular" color="var(--ink-2)">
          {autoImport
            ? `Activada, cada ${autoImportFrequency} ${
                autoImportFrequency === 1 ? 'semana' : 'semanas'
              }.${
                proximaAutomatica
                  ? ` La próxima, a partir del ${fechaCorta(proximaAutomatica.toISOString())}.`
                  : ''
              }`
            : 'Desactivada: el material hay que importarlo a mano. Se activa en los ajustes de la congregación.'}
        </Typography>
      </Tarjeta>

      {/* ── Qué hay importado ───────────────────────────────────────────── */}
      <Typography className="h4" color="var(--ink)">
        Cuadernos importados
      </Typography>

      {bimestres.length === 0 && (
        <Typography className="body-regular" color="var(--grey-400)">
          Todavía no hay material importado.
        </Typography>
      )}

      <Stack spacing="12px">
        {bimestres.map((grupo) => {
          const origen = ORIGEN[grupo.origen];

          return (
            <Tarjeta key={grupo.id}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <Typography className="h4" color="var(--ink)">
                  {nombreBimestre(grupo)}
                </Typography>
                <Badge
                  text={origen.texto}
                  color={origen.color}
                  size="small"
                  filled={false}
                />
              </Box>

              <Typography className="label-small-regular" color="var(--ink-2)">
                {grupo.semanas.length}{' '}
                {grupo.semanas.length === 1 ? 'semana' : 'semanas'}
                {grupo.importadoEl
                  ? ` · importado el ${fechaCorta(grupo.importadoEl)}`
                  : ''}
                {grupo.semanaExacta
                  ? ' · JW Library abre la semana exacta'
                  : ' · JW Library abre el cuaderno'}
              </Typography>
            </Tarjeta>
          );
        })}
      </Stack>
    </Box>
  );
};

export default MeetingMaterials;
