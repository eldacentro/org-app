import { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { Box, Stack, Grid, CircularProgress } from '@mui/material';
import { saveAs } from 'file-saver';
import backupsDb, { SnapshotType } from '@db/backupsDb';
import {
  generateBackupPayload,
  applySmartRetentionPolicy,
  restoreFromPayload,
} from '@services/app/backupScheduler';
import { googleDriveUploadBackup, googleDriveIsConnected } from '@services/app/googleDriveBackup';
import { congIDState, settingsState } from '@states/settings';
import Checkbox from '@components/checkbox';
import {
  previsualizarRestauracion,
  restaurarTerritorios,
  type ResumenRestauracion,
} from '@services/firebase/territoriesRestore';
import { displaySnackNotification } from '@services/states/app';
import { IconBackupOrganized, IconDelete, IconAdd } from '@components/icons';
import Button from '@components/button';
import Typography from '@components/typography';
import IconButton from '@components/icon_button';
import Dialog from '@components/dialog';

const LocalBackupsTab = () => {
  const congId = useAtomValue(congIDState);
  const settings = useAtomValue(settingsState);
  const [snapshots, setSnapshots] = useState<SnapshotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<SnapshotType | null>(null);
  // Qué se restaura. Los datos de la aplicación (personas, informes,
  // programas…) viven en la base local; los territorios viven en Firestore y
  // se restauran con reglas propias, así que se eligen por separado.
  const [restaurarApp, setRestaurarApp] = useState(true);
  const [restaurarTerr, setRestaurarTerr] = useState(true);
  const [resumenTerr, setResumenTerr] = useState<ResumenRestauracion | null>(null);
  const [calculando, setCalculando] = useState(false);
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
      // Con `congId`: sin él, `generateBackupPayload` se salta TODO lo de
      // territorios (vive en Firestore, no en Dexie, y hay que ir a
      // buscarlo). Solo la copia automática diaria lo pasaba, así que
      // las copias hechas a mano y las de Drive salían sin territorios.
      const payload = await generateBackupPayload(congId || undefined);
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

      if (googleDriveIsConnected(settings?.user_settings?.backup_automatic)) {
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

  /** Datos de territorios que trae la copia (si los trae). */
  const territoriosDeLaCopia = confirmRestore?.data?.data?.territories ?? null;

  // Al abrir la confirmación se calcula QUÉ haría la restauración de
  // territorios, sin escribir nada. Nadie debería pulsar "restaurar" a
  // ciegas: aquí se ve cuántos documentos se recuperan y cuántos se
  // sobrescriben antes de tocar nada.
  useEffect(() => {
    if (!confirmRestore || !territoriosDeLaCopia || !congId) {
      setResumenTerr(null);
      return;
    }
    let cancelado = false;
    setCalculando(true);
    previsualizarRestauracion(congId, territoriosDeLaCopia)
      .then((r) => {
        if (!cancelado) setResumenTerr(r);
      })
      .catch((err) => {
        console.error('No se pudo calcular la previsualización', err);
        if (!cancelado) setResumenTerr(null);
      })
      .finally(() => {
        if (!cancelado) setCalculando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [confirmRestore, territoriosDeLaCopia, congId]);

  const handleRestore = async () => {
    if (!confirmRestore) return;
    if (!restaurarApp && !restaurarTerr) return;
    setIsRestoring(true);
    try {
      let resumenFinal = '';

      if (restaurarTerr && territoriosDeLaCopia && congId) {
        const r = await restaurarTerritorios(congId, territoriosDeLaCopia);
        resumenFinal = ` Territorios: ${r.escritos} documentos restaurados`;
        if (r.reconciliados > 0) {
          resumenFinal += `, ${r.reconciliados} territorios reajustados`;
        }
        if (r.doblesAsignaciones > 0) {
          resumenFinal += `. ATENCIÓN: ${r.doblesAsignaciones} con más de una asignación abierta, revísalos`;
        }
        resumenFinal += '.';
      }

      // Los datos de la aplicación se restauran DESPUÉS: esa parte recarga la
      // página, y si fuera primero se llevaría por delante la de territorios.
      if (restaurarApp) {
        await restoreFromPayload(confirmRestore.data);
      }

      displaySnackNotification({
        severity: 'success',
        header: 'Restauración completada',
        message: restaurarApp
          ? `Hecho.${resumenFinal} Recargando la aplicación…`
          : `Hecho.${resumenFinal}`,
      });

      if (restaurarApp) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setIsRestoring(false);
        setConfirmRestore(null);
      }
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error de restauración',
        message: 'No se pudo completar la restauración. No se ha borrado nada; puedes volver a intentarlo.',
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
            borderRadius: 'var(--shape-sm)',
            // `--accent-50` no existe en NINGÚN tema: esta caja se quedaba
            // sin fondo. El escalón más suave que sí existe es el 100.
            bgcolor: 'var(--accent-100)',
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
              <Grid size={5}>
                <Typography className="label-small-regular" color="var(--accent-dark)">Fecha y Hora</Typography>
              </Grid>
              <Grid size={2}>
                <Typography className="label-small-regular" color="var(--accent-dark)">Frecuencia</Typography>
              </Grid>
              <Grid size={2}>
                <Typography className="label-small-regular" color="var(--accent-dark)">Tamaño</Typography>
              </Grid>
              <Grid size={3} sx={{ textAlign: 'right' }}>
                <Typography className="label-small-regular" color="var(--accent-dark)">Acciones</Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Snapshot List Rows */}
          <Stack spacing={1} sx={{ maxHeight: '320px', overflowY: 'auto' }}>
            {snapshots.map((snapshot) => (
              <Box
                key={snapshot.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--shape-sm)',
                  // Mismo caso: `--accent-50` no existe, la fila salía lisa.
                  bgcolor: 'var(--accent-100)',
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    bgcolor: 'var(--accent-100)',
                  },
                }}
              >
                <Grid container alignItems="center">
                  <Grid size={5}>
                    <Typography className="body-regular">
                      {new Date(snapshot.timestamp).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid size={2}>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 1,
                        py: 0.2,
                        borderRadius: 'var(--shape-full)',
                        bgcolor:
                          snapshot.type === 'monthly'
                            // `--accent-250` no existe: la píldora "Mensual"
                            // salía SIN fondo, que es justo lo contrario de
                            // lo que busca (distinguirla de las otras dos).
                            ? 'var(--accent-200)'
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
                  <Grid size={2}>
                    <Typography className="body-regular">
                      {formatSize(snapshot.size)}
                    </Typography>
                  </Grid>
                  <Grid size={3} sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
            Vas a restaurar desde la copia del{' '}
            <strong>
              {confirmRestore && new Date(confirmRestore.timestamp).toLocaleString('es-ES')}
            </strong>
            . Elige qué quieres recuperar:
          </Typography>

          <Checkbox
            checked={restaurarApp}
            onChange={() => setRestaurarApp((v) => !v)}
            label="Datos de la aplicación (personas, informes, programas, ajustes…)"
          />
          <Typography className="label-small-regular" color="var(--red-main)">
            Esto sí <strong>reemplaza</strong> todo lo actual: se perderá cualquier
            cambio hecho después de la copia. La aplicación se recargará al terminar.
          </Typography>

          {territoriosDeLaCopia && (
            <>
              <Checkbox
                checked={restaurarTerr}
                onChange={() => setRestaurarTerr((v) => !v)}
                label="Territorios (zonas, asignaciones, campañas, direcciones)"
              />
              <Typography className="label-small-regular" color="var(--ink-2)">
                Los territorios se <strong>fusionan, no se borran</strong>: vuelve lo
                que falte, se deshacen los cambios sobre lo que estaba en la copia, y
                lo creado después se conserva.
              </Typography>

              {calculando && (
                <Typography className="label-small-regular" color="var(--ink-2)">
                  Calculando qué cambiaría…
                </Typography>
              )}

              {!calculando && resumenTerr && (
                <Box
                  sx={{
                    backgroundColor: 'var(--accent-100)',
                    borderRadius: 'var(--radius-l)',
                    padding: '12px',
                  }}
                >
                  {resumenTerr.cambios.map((c) => (
                    <Typography
                      key={c.clave}
                      className="label-small-regular"
                      color="var(--ink-2)"
                      sx={{ display: 'block' }}
                    >
                      <strong>{c.nombre}:</strong>{' '}
                      {c.crear > 0 && `${c.crear} se recuperan · `}
                      {c.actualizar > 0 && `${c.actualizar} vuelven a su valor · `}
                      {c.conservar > 0 && `${c.conservar} se conservan · `}
                      {c.iguales > 0 && `${c.iguales} ya están igual`}
                    </Typography>
                  ))}
                  <Typography
                    className="label-small-regular"
                    color="var(--ink)"
                    sx={{ display: 'block', mt: 1, fontWeight: 600 }}
                  >
                    {resumenTerr.totalEscrituras === 0
                      ? 'No haría falta cambiar nada: ya coincide con la copia.'
                      : `${resumenTerr.totalEscrituras} documentos se escribirían.`}
                  </Typography>
                </Box>
              )}
            </>
          )}

          {!restaurarApp && !restaurarTerr && (
            <Typography className="label-small-regular" color="var(--red-main)">
              Marca al menos una de las dos.
            </Typography>
          )}
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              variant="tertiary"
              onClick={() => setConfirmRestore(null)}
              disabled={isRestoring}
            >
              Cancelar
            </Button>
            <Button
              variant="main"
              onClick={handleRestore}
              disabled={isRestoring || (!restaurarApp && !restaurarTerr)}
              sx={{ bgcolor: 'var(--red-main)', '&:hover': { bgcolor: 'darkred' } }}
            >
              {isRestoring ? 'Restaurando…' : 'Restaurar'}
            </Button>
          </Stack>
        </Stack>
      </Dialog>
    </Stack>
  );
};

export default LocalBackupsTab;
