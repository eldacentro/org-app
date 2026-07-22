import { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import PageTitle from '@components/page_title';
import Typography from '@components/typography';
import Button from '@components/button';
import TextField from '@components/textfield';
import IconButton from '@components/icon_button';
import InfoTip from '@components/info_tip';
import { IconAdd, IconDelete, IconExport } from '@components/icons';
import useJwpubStudio from './useJwpubStudio';

// Tarjeta local (mismo estilo que el resto de la app: fondo card, borde,
// sombra grande, radio l).
const Card = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <Box
    sx={{
      backgroundColor: 'var(--card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-l)',
      boxShadow: 'var(--big-card-shadow)',
      padding: '18px 20px',
    }}
  >
    <Stack spacing="2px" mb="14px">
      <Typography className="h3" color="var(--ink, var(--black))">
        {title}
      </Typography>
      {subtitle && (
        <Typography className="body-small-regular" color="var(--grey-400)">
          {subtitle}
        </Typography>
      )}
    </Stack>
    {children}
  </Box>
);

const JwpubStudio = () => {
  const {
    title,
    setTitle,
    symbol,
    setSymbol,
    sanitizeSymbol,
    year,
    setYear,
    chapters,
    addChapter,
    removeChapter,
    updateChapter,
    canGenerate,
    isGenerating,
    handleGenerate,
  } = useJwpubStudio();

  return (
    <Box sx={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '16px' }}>
      <PageTitle
        title="Editor de publicaciones"
        buttons={
          <Button
            variant="main"
            startIcon={<IconExport color="var(--always-white)" />}
            disabled={!canGenerate || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? 'Generando…' : 'Generar .jwpub'}
          </Button>
        }
      />

      <Stack spacing="20px" sx={{ mt: '12px' }}>
        <InfoTip
          isBig={false}
          color="info"
          text="Crea un archivo .jwpub con tu propio contenido para importarlo en JW Library. El archivo se genera en tu dispositivo; nada se sincroniza ni se comparte."
        />

        {/* Datos de la publicación */}
        <Card
          title="Datos de la publicación"
          subtitle="El símbolo identifica tu publicación en JW Library. Usa uno propio (p. ej. con prefijo “x”) para no chocar con publicaciones oficiales."
        >
          <Stack spacing="12px">
            <TextField
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Stack direction={{ mobile: 'column', tablet: 'row' }} spacing="12px" useFlexGap>
              <Box sx={{ flex: { tablet: '1 1 220px' } }}>
                <TextField
                  label="Símbolo"
                  placeholder="p. ej. xguia01"
                  value={symbol}
                  onChange={(e) => setSymbol(sanitizeSymbol(e.target.value))}
                />
              </Box>
              <Box sx={{ flex: { tablet: '0 1 120px' } }}>
                <TextField
                  label="Año"
                  type="number"
                  value={String(year)}
                  onChange={(e) => setYear(Number(e.target.value) || year)}
                />
              </Box>
            </Stack>
          </Stack>
        </Card>

        {/* Capítulos */}
        <Card
          title="Capítulos"
          subtitle="Cada capítulo es una unidad de lectura. Escribe el contenido en Markdown: **negrita**, *cursiva*, ## subtítulos y listas con guiones."
        >
          <Stack spacing="16px">
            {chapters.map((chapter, index) => (
              <Box
                key={chapter.id}
                sx={{
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-l)',
                  padding: '12px',
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing="8px"
                  mb="10px"
                >
                  <Typography className="body-small-semibold" color="var(--grey-400)">
                    Capítulo {index + 1}
                  </Typography>
                  {chapters.length > 1 && (
                    <IconButton onClick={() => removeChapter(chapter.id)}>
                      <IconDelete color="var(--red-main)" width={20} height={20} />
                    </IconButton>
                  )}
                </Stack>
                <Stack spacing="10px">
                  <TextField
                    label="Título del capítulo"
                    value={chapter.title}
                    onChange={(e) =>
                      updateChapter(chapter.id, { title: e.target.value })
                    }
                  />
                  <TextField
                    label="Contenido (Markdown)"
                    value={chapter.markdown}
                    onChange={(e) =>
                      updateChapter(chapter.id, { markdown: e.target.value })
                    }
                    multiline
                    minRows={5}
                  />
                </Stack>
              </Box>
            ))}

            <Button
              variant="secondary"
              startIcon={<IconAdd color="var(--accent-main)" />}
              onClick={addChapter}
            >
              Añadir capítulo
            </Button>
          </Stack>
        </Card>

        <Typography
          className="body-small-regular"
          color="var(--grey-400)"
          sx={{ textAlign: 'center' }}
        >
          Tras generar, abre el archivo con JW Library en tu dispositivo para
          importar la publicación.
        </Typography>
      </Stack>
    </Box>
  );
};

export default JwpubStudio;
