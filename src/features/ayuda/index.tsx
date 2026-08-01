import { ReactNode, useState } from 'react';
import Badge from '@components/badge';
import { useNavigate } from 'react-router';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  IconArrowLink,
  IconExpand,
  IconLightbulb,
  IconError,
} from '@icons/index';
import { AyudaBlock, AyudaSection } from '@definition/ayuda';
import PageTitle from '@components/page_title';
import SearchBar from '@components/search_bar';
import Typography from '@components/typography';
import useAyuda from './useAyuda';

// ── Diagrama conceptual de los indicadores de sincronización ──────────────────
// Dibuja los MISMOS visuales que ve el usuario en el botón de su perfil
// (aro naranja, circulito azul girando, puntito verde), no una captura.

const SyncDot = ({ children }: { children?: ReactNode }) => (
  <Box
    sx={{
      position: 'relative',
      width: '28px',
      height: '28px',
      flexShrink: 0,
      borderRadius: 'var(--shape-full)',
      backgroundColor: 'var(--accent-150)',
      border: '1px solid var(--accent-200)',
    }}
  >
    {children}
  </Box>
);

const SyncDiagram = () => {
  const rows = [
    {
      visual: (
        <SyncDot>
          <Box
            sx={{
              position: 'absolute',
              inset: '-2px',
              borderRadius: 'var(--shape-full)',
              border: '2px solid var(--orange-main)',
            }}
          />
        </SyncDot>
      ),
      label: 'Aro naranja: tienes cambios tuyos aún sin subir.',
    },
    {
      visual: (
        <SyncDot>
          <CircularProgress
            size={30}
            thickness={4}
            sx={{
              position: 'absolute',
              top: -2,
              left: -2,
              color: 'var(--accent-main)',
            }}
          />
        </SyncDot>
      ),
      label: 'Circulito azul girando: subiendo tus cambios ahora.',
    },
    {
      visual: (
        <SyncDot>
          <Box
            sx={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: '10px',
              height: '10px',
              borderRadius: 'var(--shape-full)',
              backgroundColor: 'var(--green-main)',
              // el borde debe fundirse con el fondo de SU PROPIO contenedor
              // (el círculo SyncDot), no con el de la página: así el punto
              // se ve "recortado" correctamente sobre cualquier tema/color.
              border: '1.5px solid var(--accent-150)',
            }}
          />
        </SyncDot>
      ),
      label: 'Puntito verde: acabas de ponerte al día.',
    },
    {
      visual: <SyncDot />,
      label: 'Sin nada: todo tranquilo y guardado.',
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        borderRadius: 'var(--shape-sm)',
        backgroundColor: 'var(--accent-100)',
        border: '1px solid var(--accent-200)',
      }}
    >
      {rows.map((row, i) => (
        <Box
          key={i}
          sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          {row.visual}
          <Typography className="body-regular" color="var(--ink)">
            {row.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

// ── Bloques de artículo ───────────────────────────────────────────────────────

const LinkButton = ({ to, label }: { to: string; label: string }) => {
  const navigate = useNavigate();

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => navigate(to)}
      onKeyDown={(e) =>
        e.key === 'Enter' || e.key === ' ' ? navigate(to) : null
      }
      sx={{
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: 'var(--shape-full)',
        backgroundColor: 'var(--accent-main)',
        cursor: 'pointer',
        transition: 'opacity var(--motion-fast) var(--ease-standard)',
        '&:hover': { opacity: 0.88 },
        '&:focus-visible': {
          outline: 'var(--accent-main) auto 2px',
          outlineOffset: '2px',
        },
      }}
    >
      <Typography className="body-small-semibold" color="var(--always-white)">
        {label}
      </Typography>
      <IconArrowLink color="var(--always-white)" width={16} height={16} />
    </Box>
  );
};

/**
 * Interlineado de LECTURA, para los párrafos largos de la Ayuda.
 *
 * `body-regular` va a 15/20px (1,33): bien para una fila de una tabla, apretado
 * para cuatro renglones seguidos de prosa. Va SIN unidad a propósito: la app
 * agranda el texto ×1,15 en tablet redefiniendo las clases, y un `line-height`
 * en píxeles se quedaría clavado mientras la letra crece — justo al revés de lo
 * que hace falta. El tamaño no se toca: sale de la clase, como manda
 * DESIGN_SYSTEM §3.
 */
const READING = { lineHeight: 1.55 } as const;

/** Ancho de lectura: pasada cierta anchura, un renglón largo cuesta de seguir. */
const MEASURE = { maxWidth: '68ch' } as const;

const BlockView = ({ block }: { block: AyudaBlock }) => {
  if (block.type === 'p') {
    return (
      <Typography
        className="body-regular"
        color="var(--ink)"
        sx={{ ...READING, ...MEASURE }}
      >
        {block.text}
      </Typography>
    );
  }

  if (block.type === 'steps') {
    return (
      <Box>
        {block.title && (
          <Typography
            className="body-regular-semibold"
            color="var(--ink)"
            sx={{ marginBottom: '8px', ...READING }}
          >
            {block.title}
          </Typography>
        )}
        <Box
          component="ol"
          sx={{
            margin: 0,
            paddingLeft: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            ...MEASURE,
          }}
        >
          {block.items.map((item, i) => (
            <Typography
              key={i}
              component="li"
              className="body-regular"
              color="var(--ink)"
              sx={READING}
            >
              {item}
            </Typography>
          ))}
        </Box>
      </Box>
    );
  }

  if (block.type === 'tip' || block.type === 'warn') {
    const isTip = block.type === 'tip';
    return (
      <Box
        sx={{
          borderRadius: 'var(--shape-sm)',
          // 12/16 de la rejilla de 8 (§4). Estaba en 10/12, que no está en la
          // escala y con el texto ya a tamaño de cuerpo apretaba.
          padding: '12px 16px',
          backgroundColor: isTip
            ? 'var(--green-secondary)'
            : 'var(--orange-secondary)',
          // Sin uñita a la izquierda. El sistema de diseño la quitó de toda la
          // app —Documentos fue el último— y estos avisos se habían quedado con
          // ella: superficie tintada y su icono, que ya dicen de qué van, y un
          // canto completo del mismo color en vez de un trocito de un lado.
          border: `1px solid ${isTip ? 'var(--green-main)' : 'var(--orange-main)'}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          // La caja se para donde se paran los párrafos: si no, en escritorio
          // el consejo cruza toda la tarjeta mientras el texto de alrededor
          // corta a media anchura, y el ojo tiene que cambiar de recorrido.
          ...MEASURE,
        }}
      >
        {isTip ? (
          <IconLightbulb
            width={20}
            height={20}
            color="var(--green-main)"
            sx={{ flexShrink: 0, mt: '2px' }}
          />
        ) : (
          <IconError
            width={20}
            height={20}
            color="var(--orange-main)"
            sx={{ flexShrink: 0, mt: '2px' }}
          />
        )}
        <Typography
          className="body-regular"
          color="var(--ink)"
          sx={READING}
        >
          {block.text}
        </Typography>
      </Box>
    );
  }

  if (block.type === 'link') {
    return <LinkButton to={block.to} label={block.label} />;
  }

  if (block.type === 'iconrow') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
          borderRadius: 'var(--shape-sm)',
          backgroundColor: 'var(--accent-100)',
          border: '1px solid var(--accent-200)',
          ...MEASURE,
        }}
      >
        {block.items.map((item, i) => (
          <Box
            key={i}
            sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <Box
              sx={{
                display: 'flex',
                flexShrink: 0,
                width: '24px',
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </Box>
            <Typography
              className="body-regular"
              color="var(--ink)"
              sx={READING}
            >
              {item.text}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  }

  if (block.type === 'diagram') {
    return <SyncDiagram />;
  }

  // faq
  return (
    <Box sx={MEASURE}>
      {/* La pregunta es el titular de su respuesta: iba a 13px cuando la
          respuesta iba a 15, o sea el titular más pequeño que el cuerpo. */}
      <Typography
        className="body-regular-semibold"
        color="var(--ink)"
        sx={{ marginBottom: '4px', ...READING }}
      >
        {block.q}
      </Typography>
      <Typography className="body-regular" color="var(--ink)" sx={READING}>
        {block.a}
      </Typography>
    </Box>
  );
};

// ── Sección con sus artículos ────────────────────────────────────────────────

const SectionView = ({
  section,
  forceExpand,
}: {
  section: AyudaSection;
  forceExpand: boolean;
}) => {
  const [expanded, setExpanded] = useState<string | false>(false);

  return (
    <Box
      sx={{
        borderRadius: 'var(--shape-md)',
        border: '1px solid var(--line)',
        backgroundColor: 'var(--card)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {section.icon}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* `h2` es "título de sección/tarjeta" (§3), que es exactamente
                lo que es. Con `h3` la sección y sus artículos quedaban a un
                paso de distancia y la escalera no se leía. */}
            <Typography className="h2">{section.title}</Typography>
            {section.comingSoon && (
              <Badge size="small" color="orange" text="En preparación" />
            )}
          </Box>
          {/* Esta SÍ es secundaria: describe la sección, no la explica. Se
              queda pequeña y atenuada a propósito, pero con el token
              semántico (§2.1) en vez del gris de paleta. */}
          <Typography className="body-small-regular" color="var(--ink-2)">
            {section.description}
          </Typography>
        </Box>
      </Box>

      {section.articles.length > 0 && (
        <Box>
          {section.articles.map((article) => {
            const isOpen = forceExpand || expanded === article.id;

            return (
              <Accordion
                key={article.id}
                expanded={isOpen}
                onChange={(_, open) => setExpanded(open ? article.id : false)}
                disableGutters
                elevation={0}
                sx={{
                  backgroundColor: 'transparent',
                  '&::before': { display: 'none' },
                  borderTop: '1px solid var(--line)',
                }}
              >
                {/* `expandIcon` es el icono del estado CERRADO: MUI lo gira
                    180° al abrir. Aquí estaba puesta la flecha de cerrar (la
                    que apunta arriba), así que salía al revés en los dos
                    estados. Es la misma que usa el acordeón compartido de la
                    app (components/accordion). */}
                <AccordionSummary
                  expandIcon={<IconExpand color="var(--accent-350)" />}
                >
                  {/* `h3` = "subtítulo" (§3): el artículo cuelga de la
                      sección. Deja libre `body-regular-semibold` para las
                      preguntas de dentro, que antes le chocaban. */}
                  <Typography className="h3">{article.title}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ paddingTop: 0, paddingBottom: '20px' }}>
                  <Stack spacing="16px">
                    {article.blocks.map((block, i) => (
                      <BlockView key={i} block={block} />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

// ── Página ───────────────────────────────────────────────────────────────────

const Ayuda = () => {
  const { sections, search, setSearch, isSearching } = useAyuda();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PageTitle
        title="Ayuda"
        // Corto a propósito: el subtítulo de la cabecera es de una sola
        // línea con recorte (whiteSpace: nowrap + ellipsis, en el navbar
        // global), y en móvil un texto largo se veía cortado a media
        // palabra.
        secondaryTitle="Guía general y las secciones de tus responsabilidades"
      />

      <SearchBar
        placeholder="Buscar en la ayuda… (p. ej. «informe», «actualizar»)"
        value={search}
        onSearch={setSearch}
      />

      {sections.length === 0 && (
        <Typography
          className="body-regular"
          color="var(--ink-2)"
          sx={{ textAlign: 'center', padding: '24px' }}
        >
          No se encontró nada con esa búsqueda.
        </Typography>
      )}

      {sections.map((section) => (
        <SectionView
          key={section.id}
          section={section}
          forceExpand={isSearching}
        />
      ))}
    </Box>
  );
};

export default Ayuda;
