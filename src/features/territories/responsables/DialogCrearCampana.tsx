import { useEffect, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Button from '@components/button';
import Typography from '@components/typography';
import TextField from '@components/textfield';
import DatePicker from '@components/date_picker';
import { congIDState } from '@states/settings';
import { TerritoryCampaign, TerritoryCampaignEstado } from '@definition/territories';
import { saveCampaign } from '@services/firebase/territories';
import { displaySnackNotification } from '@services/states/app';

type Props = { open: boolean; onClose: () => void };

const estadoFor = (inicio: string, fin: string): TerritoryCampaignEstado => {
  const now = new Date();
  if (new Date(inicio) > now) return 'planificada';
  if (new Date(fin) < now) return 'pasada';
  return 'activa';
};

const DialogCrearCampana = ({ open, onClose }: Props) => {
  const congId = useAtomValue(congIDState);

  const [nombre, setNombre] = useState('');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre('');
      setInicio('');
      setFin('');
    }
  }, [open]);

  const handleCrear = async () => {
    if (!nombre.trim() || !inicio || !fin) return;
    setSaving(true);
    try {
      const campaign: TerritoryCampaign = {
        id: crypto.randomUUID(),
        nombre: nombre.trim(),
        fechaInicio: new Date(inicio).toISOString(),
        fechaFin: new Date(fin).toISOString(),
        estado: estadoFor(inicio, fin),
        territoryIds: [],
        updatedAt: new Date().toISOString(),
      };
      await saveCampaign(congId, campaign);
      displaySnackNotification({ severity: 'success', header: 'Campaña creada', message: `La campaña "${campaign.nombre}" ha sido creada.` });
      onClose();
    } catch (err) {
      console.error(err);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudo crear la campaña.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      PaperProps={{
        style: {
          maxWidth: '460px',
          width: '100%',
          borderRadius: 'var(--r-md)',
          backgroundColor: 'var(--card)',
          padding: '10px',
        },
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Typography variant="h6" className="h2" sx={{ mb: 2, color: 'var(--ink)' }}>
          Crear campaña
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Nombre (ej. Conmemoración 2026)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Stack direction={{ mobile: 'column', tablet600: 'row' }} spacing={2}>
            {/* Sin minWidth:0 estos campos no se podían encoger por debajo
                del ancho natural de su contenido (placeholder + icono), así
                que "Fecha de finalización" se salía del diálogo en vez de
                compartir el espacio con el de inicio. */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <DatePicker
                label="Fecha de inicio"
                value={inicio ? new Date(inicio) : null}
                onChange={(d) => {
                  if (!d) setInicio('');
                  else if (!isNaN(d.getTime())) setInicio(d.toISOString());
                }}
                view="input"
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <DatePicker
                label="Fecha de finalización"
                value={fin ? new Date(fin) : null}
                minDate={inicio ? new Date(inicio) : undefined}
                onChange={(d) => {
                  if (!d) setFin('');
                  else if (!isNaN(d.getTime())) setFin(d.toISOString());
                }}
                view="input"
              />
            </Box>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 3, flexWrap: 'wrap' }}>
          <Button variant="tertiary" disableAutoStretch onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="main"
            disableAutoStretch
            onClick={handleCrear}
            disabled={saving || !nombre.trim() || !inicio || !fin}
          >
            Crear
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default DialogCrearCampana;
