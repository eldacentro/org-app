import { useState, useEffect } from 'react';
import { Box, Stack, Grid, CircularProgress } from '@mui/material';
import { saveAs } from 'file-saver';
import backupsDb, { SnapshotType } from '@db/backupsDb';
import {
  generateBackupPayload,
  applySmartRetentionPolicy,
  restoreFromPayload,
} from '@services/app/backupScheduler';
import { googleDriveUploadBackup, googleDriveIsConnected } from '@services/app/googleDriveBackup';
import { displaySnackNotification } from '@services/states/app';
import { IconBackupOrganized, IconDelete, IconAdd } from '@components/icons';
import Button from '@components/button';
import Typography from '@components/typography';
import IconButton from '@components/icon_button';
import Dialog from '@components/dialog';

const LocalBackupsTab = () => {
  const [snapshots, setSnapshots] = useState<SnapshotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<SnapshotType | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadSnapshots = async () => {
    try {
      setLoading(true);
      const data = await backupsDb.snapshots.orderBy('timestamp').reverse().toArray();
      setSnapshots(data);
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  const handleCreateSnapshot = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const payload = await generateBackupPayload();
      const payloadString = JSON.stringify(payload);
      const sizeInBytes = new Blob([payloadString]).size;
      const now = new Date();
      const isoString = now.toISOString();

      // Determine snapshot type based on schedule rules for manual context
      let type: 'daily' | 'weekly' | 'monthly' = 'daily';
      if (now.getDay() === 0) type = 'weekly';
      if (now.getDate() === 1) type = 'monthly';

      await backupsDb.snapshots.add({
        timestamp: isoString,
        type,
        size: sizeInBytes,
        data: payload,
      });

      await applySmartRetentionPolicy();

      if (googleDriveIsConnected()) {
        await googleDriveUploadBackup(payload);
      }

      await loadSnapshots();

      displaySnackNotification({
        severity: 'success',
        header: 'Copia local creada',
        message: 'La copia de seguridad se ha guardado correctamente.',
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error al crear copia',
        message: 'No se pudo generar la copia de seguridad.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSnapshot = async (id: number) => {
    try {
      await backupsDb.snapshots.delete(id);
      await loadSnapshots();
      displaySnackNotification({
        severity: 'success',
        header: 'Copia eliminada',
        message: 'La copia de seguridad ha sido eliminada del almacenamiento local.',
      });
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error al eliminar',
        message: 'No se pudo eliminar la copia de seguridad.',
      });
    }
  };

  const handleDownloadSnapshot = (snapshot: SnapshotType) => {
    const jsonStr = JSON.stringify(snapshot.data);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const formattedDate = new Date(snapshot.timestamp).toISOString().split('T')[0];
    saveAs(blob, `Elda_Centro_Backup_${formattedDate}_${snapshot.type}.json`);
  };

  const handleRestore = async () => {
    if (!confirmRestore) return;
    setIsRestoring(true);
    try {
      await restoreFromPayload(confirmRestore.data);
      displaySnackNotification({
        severity: 'success',
        header: 'Restauración completada',
        message: 'La base de datos ha sido revertida con éxito. Recargando la aplicación...',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error de restauración',
        message: 'No se pudo restaurar la base de datos a partir del snapshot seleccionado.',
      });
      setIsRestoring(false);
      setConfirmRestore(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const translateType = (type: string) => {
    switch (type) {
      case 'daily':
        return 'Diario';
      case 'weekly':
        return 'Semanal';
      case 'monthly':
        return 'Mensual';
      default:
        return type;
    }
  };

  return (
    <Stack spacing="16px" sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography className="body-regular" color="var(--grey-400)">
          Administra las copias históricas de IndexedDB guardadas localmente en este navegador.
        </Typography>
        <Button
          variant="small"
          onClick={handleCreateSnapshot}
          disabled={isCreating}
          startIcon={<IconAdd />}
        >
          {isCreating ? 'Generando...' : 'Crear Copia Ahora'}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress color="inherit" />
        </Box>
      ) : snapshots.length === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px dashed var(--line)',
            borderRadius: 'var(--radius-m)',
            bgcolor: 'var(--accent-50)',
          }}
        >
          <IconBackupOrganized color="var(--accent-dark)" />
          <Typography className="h4" sx={{ mt: 1 }}>
            No hay copias de seguridad locales
          </Typography>
          <Typography className="body-regular" color="var(--grey-400)">
            Las copias de seguridad automáticas se crean diariamente de forma silenciosa.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {/* Header Row */}
          <Box
            sx={{
              display: 'flex',
              px: 2,
              py: 1,
              bgcolor: 'var(--accent-150)',
              borderRadius: 'var(--radius-m) var(--radius-m) 0 0',
              fontWeight: 'bold',
            }}
          >
            <Grid container>
              <Grid item xs={5}>
                <Typography className="label-small-regular" color="var(--accent-dark)">Fecha y Hora</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography className="label-small-regular" color="var(--accent-dark)">Frecuencia</Typography>
              </Grid>
              <Grid item xs={2}>
                <Typography className="label-small-regular" color="var(--accent-dark)">Tamaño</Typography>
              </Grid>
              <Grid item xs={3} sx={{ textAlign: 'right' }}>
                <Typography className="label-small-regular" color="var(--accent-dark)">Acciones</Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Snapshot List Rows */}
          <Stack spacing={1} sx={{ maxH: '320px', overflowY: 'auto' }}>
            {snapshots.map((snapshot) => (
              <Box
                key={snapshot.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-m)',
                  bgcolor: 'var(--accent-50)',
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    bgcolor: 'var(--accent-100)',
                  },
                }}
              >
                <Grid container alignItems="center">
                  <Grid item xs={5}>
                    <Typography className="body-regular">
                      {new Date(snapshot.timestamp).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={2}>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 1,
                        py: 0.2,
                        borderRadius: '4px',
                        bgcolor:
                          snapshot.type === 'monthly'
                            ? 'var(--accent-250)'
                            : snapshot.type === 'weekly'
                            ? 'var(--line)'
                            : 'var(--accent-150)',
                      }}
                    >
                      <Typography className="label-small-regular" color="var(--accent-dark)">
                        {translateType(snapshot.type)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={2}>
                    <Typography className="body-regular">
                      {formatSize(snapshot.size)}
                    </Typography>
                  </Grid>
                  <Grid item xs={3} sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Button
                      variant="small"
                      sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '11px', minHeight: 'auto' }}
                      onClick={() => setConfirmRestore(snapshot)}
                    >
                      Restaurar
                    </Button>
                    <Button
                      variant="secondary"
                      sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: '11px', minHeight: 'auto' }}
                      onClick={() => handleDownloadSnapshot(snapshot)}
                    >
                      Descargar
                    </Button>
                    <IconButton
                      onClick={() => handleDeleteSnapshot(snapshot.id!)}
                      sx={{ p: 0.5 }}
                    >
                      <IconDelete color="var(--red-main)" />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Stack>
        </Stack>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmRestore} onClose={() => !isRestoring && setConfirmRestore(null)} sx={{ p: 3 }}>
        <Stack spacing={2} sx={{ p: 2, minWidth: '320px' }}>
          <Typography className="h3" color="var(--red-main)">
            ¿Confirmar restauración?
          </Typography>
          <Typography className="body-regular">
            Estás a punto de reemplazar **absolutamente todos los datos actuales** de la aplicación por los datos de la copia de seguridad del **{confirmRestore && new Date(confirmRestore.timestamp).toLocaleString()}**.
          </Typography>
          <Typography className="label-small-regular" color="var(--red-main)" sx={{ fontWeight: 'bold' }}>
            ¡ADVERTENCIA! Esta acción borrará permanentemente cualquier cambio realizado desde esta copia de seguridad. La aplicación se recargará automáticamente al finalizar.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              variant="secondary"
              onClick={() => setConfirmRestore(null)}
              disabled={isRestoring}
            >
              Cancelar
            </Button>
            <Button
              variant="main"
              onClick={handleRestore}
              disabled={isRestoring}
              sx={{ bgcolor: 'var(--red-main)', '&:hover': { bgcolor: 'darkred' } }}
            >
              {isRestoring ? 'Restaurando...' : 'Reemplazar base de datos'}
            </Button>
          </Stack>
        </Stack>
      </Dialog>
    </Stack>
  );
};

export default LocalBackupsTab;
