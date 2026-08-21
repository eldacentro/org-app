import { ReactNode, useState } from 'react';
import { MESES_ES } from '@utils/nombres_fecha';
import { Box, Stack } from '@mui/material';
import { IconJwOrg } from '@components/icons';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import Typography from '@components/typography';
import InfoTip from '@components/info_tip';
import Badge from '@components/badge';
import useMeetingMaterialsPage from './useMeetingMaterialsPage';
import ImportRow from '@features/meeting_materials/import_row';
import SongsImport from '@features/meeting_materials/songs_import';
import SongDurations from '@features/meeting_materials/song_durations';
import ImportTalks from '@features/meeting_materials/public_talks/import_talks';
import {
  EstadoReunion,
  PeriodoMateriales,
} from '@services/app/meeting_materials';

/**
 * Materiales de reunión.
 *
 * Los dos botones de importar estaban sueltos en Configuración y no había
 * forma de saber QUÉ hay importado ni de dónde salió. Aquí están los dos, y
 * además lo que hasta ahora solo se podía averiguar mirando la base de datos:
 * qué material hay, de dónde vino, y —lo que de verdad importa— qué
 * semanas de las que vienen están sin material.
 */

const MESES = [...MESES_ES];

const nombrePeriodo = (p: PeriodoMateriales) =>
  p.cadencia === 'bimestre'
    ? `${MESES[p.primerMes - 1]}–${MESES[p.ultimoMes - 1]} ${p.year}`
    : `${MESES[p.primerMes - 1]} ${p.year}`;

/** El mismo periodo, pero metido en una frase: "en noviembre de 2026". */
const periodoEnFrase = (p: PeriodoMateriales) =>
  p.cadencia === 'bimestre'
    ? `${MESES[p.primerMes - 1]} y ${MESES[p.ultimoMes - 1]} de ${p.year}`
    : `${MESES[p.primerMes - 1]} de ${p.year}`;

/** "del 2 al 30 de noviembre" — las semanas concretas que cubre. */
const rangoDeSemanas = (semanas: string[]) => {
  if (semanas.length === 0) return '';

  const primera = semanaCorta(semanas[0]);
  const ultima = semanaCorta(semanas[semanas.length - 1]);

  return primera === ultima ? primera : `del ${primera} al ${ultima}`;
};

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
  // El cancionero y los bosquejos vienen dentro de la aplicación mientras
  // nadie importe nada. Se dice con el mismo vocabulario que el resto, porque
  // es la misma pregunta: de dónde ha salido esto que estoy viendo.
  app: { texto: 'Desde la aplicación', color: 'grey' as const },
};

const Tarjeta = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      padding: '16px',
      border: '1px solid var(--line)',
      borderRadius: 'var(--shape-sm)',
      backgroundColor: 'var(--card)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}
  >
    {children}
  </Box>
);

const FilaReunion = ({
  titulo,
  estado,
}: {
  /** Opcional: si la sección ya nombra la publicación, aquí sobra. */
  titulo?: string;
  estado?: EstadoReunion;
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      flexWrap: 'wrap',
    }}
  >
    <Box>
      {titulo && (
        <Typography className="body-small-semibold" color="var(--ink)">
          {titulo}
        </Typography>
      )}
      <Typography className="label-small-regular" color="var(--ink-2)">
        {estado
          ? `${estado.semanas.length} ${
              estado.semanas.length === 1 ? 'semana' : 'semanas'
            }${
              estado.importadoEl
                ? estado.ultimaImportacion &&
                  estado.ultimaImportacion !== estado.origen
                  ? // La última pasada no fue la que da la etiqueta: la
                    // automática de jw.org repasa cada semana el material que
                    // ya estaba. Llamarlo "importado" haría pensar que se
                    // sustituyó, y no es eso.
                    ` · actualizado desde jw.org el ${fechaCorta(estado.importadoEl)}`
                  : ` · importado el ${fechaCorta(estado.importadoEl)}`
                : ''
            } · JW Library abre ${
              estado.semanaExacta ? 'la semana exacta' : 'la publicación'
            }`
          : 'Sin importar'}
      </Typography>
    </Box>

    <Badge
      text={estado ? ORIGEN[estado.origen].texto : 'Falta'}
      color={estado ? ORIGEN[estado.origen].color : 'red'}
      size="small"
      filled={false}
    />
  </Box>
);

/**
 * Un periodo de UNA publicación.
 *
 * El título es el periodo de ESTUDIO, y debajo van las semanas concretas que
 * cubre. Las fechas están ahí a propósito: el mes de portada de La Atalaya no
 * es el mes en que se estudia —la de noviembre se estudia en enero— así que
 * sin las fechas delante el rótulo se presta a confusión.
 */
const TarjetaPeriodo = ({ periodo }: { periodo: PeriodoMateriales }) => (
  <Tarjeta>
    <Box>
      {/* Lo primero, el NÚMERO — que es lo que uno importa y por lo que lo
          busca. Solo consta si vino de un .jwpub: jw.org no lo dice.
          Debajo, cuándo se estudia, que es harina de otro costal: la Atalaya
          de septiembre se estudia del 2 de noviembre al 6 de diciembre. */}
      {periodo.estado.numeros.length > 0 && (
        <Typography className="h4" color="var(--ink)">
          {periodo.estado.numeros.map((n) => n.titulo).join(' · ')}
        </Typography>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <Typography
          className={
            periodo.estado.numeros.length > 0 ? 'body-small-regular' : 'h4'
          }
          color={
            periodo.estado.numeros.length > 0 ? 'var(--ink-2)' : 'var(--ink)'
          }
        >
          {periodo.estado.numeros.length > 0
            ? `Se estudia en ${periodoEnFrase(periodo)}`
            : nombrePeriodo(periodo)}
        </Typography>
        <Typography className="label-small-regular" color="var(--ink-2)">
          {rangoDeSemanas(periodo.estado.semanas)}
        </Typography>
      </Box>
    </Box>

    <FilaReunion estado={periodo.estado} />
  </Tarjeta>
);

/**
 * El cancionero y los bosquejos de discursos públicos.
 *
 * No son material de una semana, sino una lista entera que la aplicación
 * lleva dentro, así que no encajan en el patrón de periodos de arriba. Lo que
 * sí comparten es la pregunta —de dónde ha salido esto que estoy viendo— y
 * por eso llevan el MISMO vocabulario y las mismas etiquetas: «Desde .jwpub»
 * cuando alguien lo importó, «Desde la aplicación» mientras nadie lo haya
 * hecho.
 *
 * Y para el cancionero, además, CUÁL: la fecha de importación no dice nada si
 * no se sabe qué se importó.
 */
const TarjetaLista = ({
  rotulo,
  total,
  singular,
  plural,
  importado,
  importadoEl,
  cambiados,
  publicacion,
  notaSinImportar,
  notaImportado,
}: {
  rotulo: string;
  total: number;
  singular: string;
  plural: string;
  importado: boolean;
  importadoEl?: string;
  cambiados?: number;
  publicacion?: string;
  notaSinImportar: string;
  notaImportado: string;
}) => (
  <Tarjeta>
    <Box>
      <Typography className="h4" color="var(--ink)">
        {rotulo}
      </Typography>
      {importado && publicacion && publicacion.length > 0 && (
        <Typography className="body-small-regular" color="var(--ink-2)">
          {publicacion}
        </Typography>
      )}
    </Box>

    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <Box>
        <Typography className="label-small-regular" color="var(--ink-2)">
          {`${total} ${total === 1 ? singular : plural}`}
          {importado && importadoEl
            ? ` · importado el ${fechaCorta(importadoEl)}`
            : ''}
          {importado && cambiados
            ? ` · ${cambiados} ${
                cambiados === 1 ? 'título sustituido' : 'títulos sustituidos'
              }`
            : ''}
        </Typography>
        <Typography className="label-small-regular" color="var(--grey-400)">
          {importado ? notaImportado : notaSinImportar}
        </Typography>
      </Box>

      <Badge
        text={importado ? ORIGEN.jwpub.texto : ORIGEN.app.texto}
        color={importado ? ORIGEN.jwpub.color : ORIGEN.app.color}
        size="small"
        filled={false}
      />
    </Box>
  </Tarjeta>
);

/**
 * Una publicación: lo que viene primero, y lo pasado plegado.
 *
 * Lo pasado ya no se consulta; se guarda detrás de un enlace para no enterrar
 * lo único que hay que mirar.
 */
const ListaPublicacion = ({
  rotulo,
  grupos,
  verAnteriores,
  onVerAnteriores,
}: {
  rotulo: string;
  grupos: { vigentes: PeriodoMateriales[]; anteriores: PeriodoMateriales[] };
  verAnteriores: boolean;
  onVerAnteriores: () => void;
}) => {
  if (grupos.vigentes.length === 0 && grupos.anteriores.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Typography
        className="label-small-semibold"
        color="var(--ink-2)"
        sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
      >
        {rotulo}
      </Typography>

      {grupos.vigentes.length === 0 && (
        <Typography className="body-small-regular" color="var(--grey-400)">
          No hay material de aquí en adelante.
        </Typography>
      )}

      <Stack spacing="12px">
        {grupos.vigentes.map((periodo) => (
          <TarjetaPeriodo key={periodo.id} periodo={periodo} />
        ))}
      </Stack>

      {grupos.anteriores.length > 0 && (
        <Box>
          <Box
            component="button"
            type="button"
            aria-expanded={verAnteriores}
            onClick={onVerAnteriores}
            sx={{
              appearance: 'none',
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              '&:focus-visible': {
                outline: '2px solid var(--accent-main)',
                outlineOffset: '2px',
              },
            }}
          >
            <Typography
              className="label-small-semibold"
              color="var(--accent-main)"
            >
              {verAnteriores ? 'Ocultar' : 'Ver'} anteriores (
              {grupos.anteriores.length})
            </Typography>
          </Box>

          {verAnteriores && (
            <Stack spacing="12px" sx={{ marginTop: '12px' }}>
              {grupos.anteriores.map((periodo) => (
                <TarjetaPeriodo key={periodo.id} periodo={periodo} />
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
};

const MeetingMaterials = () => {
  const { t } = useAppTranslation();

  const {
    handleOpenJWImport,
    isNavigatorOnline,
    handleFileSelected,
    guia,
    atalaya,
    semanasQueFaltan,
    autoImport,
    autoImportFrequency,
    semanasVigiladas,
    proximaAutomatica,
    cancionero,
    discursos,
  } = useMeetingMaterialsPage();

  const { isPublicTalkCoordinator } = useCurrentUser();

  const [verGuia, setVerGuia] = useState(false);
  const [verAtalaya, setVerAtalaya] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageTitle title={t('tr_meetingMaterials', 'Materiales de reunión')} />

      {/* ── Importar ────────────────────────────────────────────────────── */}
      <Stack spacing="12px">
        {isNavigatorOnline && (
          <ImportRow
            icon={
              <IconJwOrg color="var(--accent-main)" width={22} height={22} />
            }
            titulo={t('tr_sourceImportJw', 'Importar desde jw.org')}
            descripcion="Trae el material publicado. El enlace de JW Library llevará a la publicación, no a la semana."
            onClick={handleOpenJWImport}
          />
        )}

        <ImportRow
          titulo={t('tr_sourceImportEPUB', 'Importar desde archivo .jwpub')}
          descripcion="Además, el enlace de JW Library llevará a la semana exacta."
        >
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
        </ImportRow>

        {/* El cancionero y los bosquejos son material de reunión igual que la
            Guía y La Atalaya, y hasta hoy se importaban —cuando se podía— en
            otra parte o en ninguna. */}
        <SongsImport />

        <SongDurations />

        {isPublicTalkCoordinator && <ImportTalks variant="row" />}
      </Stack>

      {/* ── Lo que falta ────────────────────────────────────────────────── */}
      {(['midweek', 'weekend'] as const).map((meeting) => {
        const faltan = semanasQueFaltan[meeting];
        if (faltan.length === 0) return null;

        const nombre =
          meeting === 'midweek'
            ? 'Guía de actividades (entre semana)'
            : 'La Atalaya (fin de semana)';

        return (
          <InfoTip
            key={meeting}
            isBig={false}
            color="warning"
            text={`Falta ${nombre}: ${faltan
              .map((week) => semanaCorta(week))
              .join(', ')}.`}
          />
        );
      })}

      {semanasQueFaltan.midweek.length === 0 &&
        semanasQueFaltan.weekend.length === 0 &&
        (guia.vigentes.length > 0 || atalaya.vigentes.length > 0) && (
          <InfoTip
            isBig={false}
            color="success"
            text={`Las próximas ${semanasVigiladas} semanas tienen las dos publicaciones.`}
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
      <Box>
        <Typography className="h4" color="var(--ink)">
          Material importado
        </Typography>
        {/* Lo que evita el malentendido, dicho una vez y arriba del todo. */}
        <Typography className="label-small-regular" color="var(--ink-2)">
          Las fechas son las semanas en que se ESTUDIA. La Atalaya lleva en la
          portada un mes anterior: la de noviembre se estudia en enero.
        </Typography>
      </Box>

      {guia.vigentes.length === 0 &&
        guia.anteriores.length === 0 &&
        atalaya.vigentes.length === 0 &&
        atalaya.anteriores.length === 0 && (
          <Typography className="body-regular" color="var(--grey-400)">
            Todavía no hay material importado.
          </Typography>
        )}

      {/* Cada publicación por su lado y en su cadencia: la Guía es bimestral y
          La Atalaya mensual. Juntarlas en un bloque de bimestre —como estaba—
          hacía aparecer una "Atalaya de noviembre-diciembre", que no existe. */}
      <ListaPublicacion
        rotulo="Guía de actividades · entre semana"
        grupos={guia}
        verAnteriores={verGuia}
        onVerAnteriores={() => setVerGuia((v) => !v)}
      />

      <ListaPublicacion
        rotulo="La Atalaya · fin de semana"
        grupos={atalaya}
        verAnteriores={verAtalaya}
        onVerAnteriores={() => setVerAtalaya((v) => !v)}
      />

      {/* ── Las dos listas ──────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Typography
          className="label-small-semibold"
          color="var(--ink-2)"
          sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
        >
          Cancionero y discursos públicos
        </Typography>

        <TarjetaLista
          rotulo="Cancionero"
          total={cancionero.total}
          singular="cántico"
          plural="cánticos"
          importado={cancionero.importado}
          importadoEl={
            cancionero.importado ? cancionero.importadoEl : undefined
          }
          cambiados={cancionero.importado ? cancionero.cambiados : undefined}
          publicacion={
            cancionero.importado ? cancionero.publicationTitle : undefined
          }
          notaSinImportar="Vienen dentro de la aplicación: solo cambian al publicarse una versión nueva."
          notaImportado="Se sincroniza con el resto de la congregación: al importarlo aquí, les llega a todos."
        />

        <TarjetaLista
          rotulo="Bosquejos de discursos públicos"
          total={discursos.total}
          singular="bosquejo"
          plural="bosquejos"
          importado={discursos.importado}
          importadoEl={discursos.importado ? discursos.importadoEl : undefined}
          cambiados={discursos.importado ? discursos.cambiados : undefined}
          notaSinImportar="Vienen dentro de la aplicación: solo cambian al publicarse una versión nueva."
          notaImportado="Los títulos importados se sincronizan con el resto de la congregación."
        />
      </Box>
    </Box>
  );
};

export default MeetingMaterials;
