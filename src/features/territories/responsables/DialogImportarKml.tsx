import { useEffect, useState } from 'react';
import { Box, Stack, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import { congIDState, congMasterKeyState } from '@states/settings';
import { territoryZonesSortedState } from '@states/territories';
import { parseKmlFile, ParsedTerritory } from '@utils/kml';
import { Territory } from '@definition/territories';
import { saveTerritoriesBatch } from '@services/firebase/territories';

type Props = { open: boolean; onClose: () => void };

const DialogImportarKml = ({ open, onClose }: Props) => {
  const congId = useAtomValue(congIDState);
  const masterKey = useAtomValue(congMasterKeyState);
  const zones = useAtomValue(territoryZonesSortedState);

  const [zoneId, setZoneId] = useState('');
  const [parsed, setParsed] = useState<ParsedTerritory[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open) {
      setParsed([]);
      setFileName('');
      setError('');
      setZoneId(zones[0]?.id ?? '');
    }
  }, [open, zones]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setFileName(file.name);
    try {
      const result = await parseKmlFile(file);
      if (result.length === 0) {
        setError('No se encontraron polígonos en el archivo.');
      }
      setParsed(result);
    } catch (e) {
      setError((e as Error).message);
      setParsed([]);
    }
  };

  const handleImport = async () => {
    if (!zoneId || parsed.length === 0) return;
    setImporting(true);
    try {
      const now = new Date().toISOString();
      const territories: Territory[] = parsed.map((p, i) => ({
        id: crypto.randomUUID(),
        zoneId,
        numero: p.name || String(i + 1),
        geometry: p.geometry,
        tags: [],
        updatedAt: now,
      }));
      await saveTerritoriesBatch(congId, territories, masterKey ?? '');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={importing ? undefined : onClose}
      PaperProps={{
        style: {
          maxWidth: '520px',
          width: '100%',
          borderRadius: 'var(--r-md)',
          backgroundColor: 'var(--card)',
          padding: '10px',
        },
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Typography variant="h6" className="h2" sx={{ mb: 1, color: 'var(--ink)' }}>
          Importar territorios (KML/KMZ)
        </Typography>
        <Typography variant="body2" color="var(--ink-2)" sx={{ mb: 3 }}>
          Sube el archivo exportado desde Territory Helper o Google Earth. Cada
          polígono se importará como un territorio en la zona seleccionada.
        </Typography>

        <Stack spacing={2}>
          {zones.length === 0 ? (
            <Typography variant="body2" color="var(--red-main)">
              Primero crea al menos una zona.
            </Typography>
          ) : (
            <FormControl fullWidth size="small">
              <InputLabel id="zona-import">Zona destino</InputLabel>
              <Select
                labelId="zona-import"
                label="Zona destino"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
              >
                {zones.map((z) => (
                  <MenuItem key={z.id} value={z.id}>
                    {z.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button variant="tertiary" disableAutoStretch>
            <label style={{ cursor: 'pointer', width: '100%' }}>
              {fileName || 'Seleccionar archivo .kml / .kmz'}
              <input
                type="file"
                accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz"
                hidden
                onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
              />
            </label>
          </Button>

          {parsed.length > 0 && (
            <Typography variant="body2" sx={{ color: 'var(--green-main)' }}>
              {parsed.length} territorio(s) detectado(s).
            </Typography>
          )}
          {error && (
            <Typography variant="body2" sx={{ color: 'var(--red-main)' }}>
              {error}
            </Typography>
          )}
        </Stack>

        <Stack
          direction="row"
          spacing={1.5}
          justifyContent="flex-end"
          sx={{ borderTop: '1px solid var(--line)', pt: 2.5, mt: 3 }}
        >
          <Button variant="tertiary" onClick={onClose} disabled={importing}>
            Cancelar
          </Button>
          <Button
            variant="main"
            onClick={handleImport}
            disabled={importing || parsed.length === 0 || !zoneId}
          >
            Importar {parsed.length > 0 ? `(${parsed.length})` : ''}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DialogImportarKml;
