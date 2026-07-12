import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, CircularProgress, Stack } from '@mui/material';
import { IconArrowLink, IconCollapse } from '@icons/index';
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
      borderRadius: 'var(--radius-max)',
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
              borderRadius: '50%',
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
            sx={{ position: 'absolute', top: -2, left: -2, color: 'var(--accent-main)' }}
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
              borderRadius: '50%',
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
        padding: '14px 16px',
        borderRadius: 'var(--radius-l)',
        backgroundColor: 'var(--accent-100)',
        border: '1px solid var(--accent-200)',
      }}
    >
      {rows.map((row, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {row.visual}
          <Typography className="body-small-regular" color="var(--grey-400)">
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
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? navigate(to) : null)}
      sx={{
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: 'var(--radius-max)',
        backgroundColor: 'var(--accent-main)',
        cursor: 'pointer',
        transition: 'opacity 0.15s',
        '&:hover': { opacity: 0.88 },
        '&:focus-visible': { outline: 'var(--accent-main) auto 2px', outlineOffset: '2px' },
      }}
    >
      <Typography className="body-small-semibold" color="var(--always-white)">
        {label}
      </Typography>
      <IconArrowLink color="var(--always-white)" width={16} height={16} />
    </Box>
  );
};

const BlockView = ({ block }: { block: AyudaBlock }) => {
  if (block.type === 'p') {
    return (
      <Typography className="body-regular" color="var(--grey-400)">
        {block.text}
      </Typography>
    );
  }

  if (block.type === 'steps') {
    return (
      <Box>
        {block.title && (
          <Typography className="body-small-semibold" sx={{ marginBottom: '4px' }}>
            {block.title}
          </Typography>
        )}
        <Box component="ol" sx={{ margin: 0, paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {block.items.map((item, i) => (
            <Typography key={i} component="li" className="body-regular" color="var(--grey-400)">
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
          borderRadius: 'var(--radius-m)',
          padding: '10px 12px',
          backgroundColor: isTip ? 'var(--green-secondary)' : 'var(--orange-secondary)',
          borderLeft: `3px solid ${isTip ? 'var(--green-main)' : 'var(--orange-main)'}`,
        }}
      >
        <Typography className="body-small-regular">
          {isTip ? '💡 ' : '⚠️ '}
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
          gap: '10px',
          padding: '12px 14px',
          borderRadius: 'var(--radius-l)',
          backgroundColor: 'var(--accent-100)',
          border: '1px solid var(--accent-200)',
        }}
      >
        {block.items.map((item, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Box sx={{ display: 'flex', flexShrink: 0, width: '24px', justifyContent: 'center' }}>
              {item.icon}
            </Box>
            <Typography className="body-small-regular" color="var(--grey-400)">
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
    <Box>
      <Typography className="body-small-semibold">{block.q}</Typography>
      <Typography className="body-regular" color="var(--grey-400)">
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
        borderRadius: 'var(--radius-xl)',
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
            <Typography className="h3">{section.title}</Typography>
            {section.comingSoon && (
              <Chip
                label="En preparación"
                size="small"
                sx={{
                  backgroundColor: 'var(--orange-secondary)',
                  color: 'var(--orange-dark)',
                  fontSize: '11px',
                  height: '20px',
                }}
              />
            )}
          </Box>
          <Typography className="body-small-regular" color="var(--grey-350)">
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
                <AccordionSummary expandIcon={<IconCollapse color="var(--accent-350)" />}>
                  <Typography className="body-regular-semibold">{article.title}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ paddingTop: 0 }}>
                  <Stack spacing="12px">
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
        secondaryTitle="Guía de uso de la aplicación: verás la guía general y las secciones de tus responsabilidades"
      />

      <SearchBar
        placeholder="Buscar en la ayuda… (p. ej. «informe», «actualizar»)"
        value={search}
        onSearch={setSearch}
      />

      {sections.length === 0 && (
        <Typography className="body-regular" color="var(--grey-350)" sx={{ textAlign: 'center', padding: '24px' }}>
          No se encontró nada con esa búsqueda.
        </Typography>
      )}

      {sections.map((section) => (
        <SectionView key={section.id} section={section} forceExpand={isSearching} />
      ))}
    </Box>
  );
};

export default Ayuda;
