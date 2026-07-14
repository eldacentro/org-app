import { useState } from 'react';
import { Box, Stack, CircularProgress } from '@mui/material';
import { useAtomValue } from 'jotai';
import { settingsState } from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import {
  googleDriveConnect,
  googleDriveDisconnect,
  googleDriveUploadBackup,
} from '@services/app/googleDriveBackup';
import { generateBackupPayload } from '@services/app/backupScheduler';
import { displaySnackNotification } from '@services/states/app';
import { IconBackupOrganized, IconError } from '@components/icons';
import Button from '@components/button';
import Typography from '@components/typography';
import SwitchWithLabel from '@components/switch_with_label';

const GoogleDriveTab = () => {
  const settings = useAtomValue(settingsState);
  const backupAutomatic = settings.user_settings.backup_automatic;

  const googleDriveEmail = backupAutomatic.google_drive_email?.value || '';
  const isConnected = googleDriveEmail !== '';
  const tokenExpiry = backupAutomatic.google_drive_token_expiry?.value || '0';
  const isTokenExpired = isConnected && (Date.now() >= parseInt(tokenExpiry, 10));
  const isAutoEnabled = backupAutomatic.google_drive_auto_enabled?.value || false;

  const [isUploading, setIsUploading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await googleDriveConnect();
      if (success) {
        displaySnackNotification({
          severity: 'success',
          header: 'Google Drive Conectado',
          message: 'La vinculación de la cuenta se realizó con éxito.',
        });
      } else {
        displaySnackNotification({
          severity: 'error',
          header: 'Error de conexión',
          message: 'No se pudo autorizar el acceso a Google Drive.',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await googleDriveDisconnect();
    displaySnackNotification({
      severity: 'success',
      header: 'Google Drive Desconectado',
      message: 'Se ha desvinculado la cuenta correctamente.',
    });
  };

  const handleToggleAutoBackup = async (checked: boolean) => {
    await dbAppSettingsUpdate({
      'user_settings.backup_automatic.google_drive_auto_enabled': {
        value: checked,
        updatedAt: new Date().toISOString(),
      },
    });
    displaySnackNotification({
      severity: 'success',
      header: checked ? 'Autoguardado activado' : 'Autoguardado desactivado',
      message: checked
        ? 'Las copias se subirán automáticamente a Drive.'
        : 'Se han pausado las subidas automáticas.',
    });
  };

  const handleManualUpload = async () => {
    if (isUploading) return;
    setIsUploading(true);
    try {
      const payload = await generateBackupPayload();
      const success = await googleDriveUploadBackup(payload);
      if (success) {
        displaySnackNotification({
          severity: 'success',
          header: 'Subida exitosa',
          message: 'La copia de seguridad ha sido guardada en Elda Centro App Backups.',
        });
      } else {
        displaySnackNotification({
          severity: 'error',
          header: 'Error al subir',
          message: 'No se pudo completar la subida de datos a Google Drive. Asegúrese de que su sesión de Drive no haya expirado.',
        });
      }
    } catch (err) {
      console.error(err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error al subir',
        message: 'No se pudo generar la copia de seguridad para subir.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Stack spacing="24px" sx={{ mt: 1 }}>
      <Typography className="body-regular" color="var(--grey-400)">
        Resguarda copias de seguridad versión diaria cifrada directamente en tu Google Drive personal de forma automática.
      </Typography>

      {/* Connection Status Box */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 3,
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-m)',
          bgcolor: isConnected ? (isTokenExpired ? 'rgba(255, 152, 0, 0.03)' : 'var(--accent-100)') : 'var(--accent-100)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              bgcolor: isConnected ? (isTokenExpired ? 'rgba(255, 152, 0, 0.1)' : 'rgba(76, 175, 80, 0.1)') : 'rgba(158, 158, 158, 0.1)',
            }}
          >
            <IconBackupOrganized color={isConnected ? (isTokenExpired ? 'orange' : 'green') : 'var(--grey-400)'} />
          </Box>
          <Stack>
            <Typography className="h3">
              Google Drive: {isConnected ? (isTokenExpired ? 'Sesión Expirada' : 'Conectado') : 'Desconectado'}
            </Typography>
            <Typography className="label-small-regular" color="var(--grey-400)">
              {isConnected
                ? `Cuenta vinculada: ${googleDriveEmail}`
                : 'Ninguna cuenta de Google Drive vinculada actualmente'}
            </Typography>
          </Stack>
        </Box>

        <Box>
          {isConnected ? (
            <Stack direction="row" spacing={1} alignItems="center">
              {isTokenExpired && (
                <Button variant="main" onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? <CircularProgress size={20} color="inherit" /> : 'Reautorizar'}
                </Button>
              )}
              <Button variant="secondary" onClick={handleDisconnect}>
                Desconectar
              </Button>
            </Stack>
          ) : (
            <Button variant="main" onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? <CircularProgress size={20} color="inherit" /> : 'Vincular Cuenta'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Warning Notice if session is expired */}
      {isConnected && isTokenExpired && (
        <Box
          sx={{
            p: 2.5,
            border: '1px dashed var(--orange-main)',
            borderRadius: 'var(--radius-m)',
            bgcolor: 'rgba(255, 152, 0, 0.04)',
          }}
        >
          <Typography className="h4" color="var(--orange-main)" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconError width={18} height={18} color="var(--orange-main)" />
            Sesión de Google Drive expirada
          </Typography>
          <Typography className="body-regular" color="var(--grey-400)">
            Por políticas de seguridad de Google, la sesión local de acceso a archivos caduca después de 1 hora.
            Las copias de seguridad automáticas en Drive están pausadas en este dispositivo.
            Toca el botón <strong>Reautorizar</strong> a la derecha para reactivarlas.
          </Typography>
        </Box>
      )}

      {/* Additional Controls if Connected */}
      {isConnected ? (
        <Stack spacing="16px">
          {/* Auto Backup Toggle */}
          <Box
            sx={{
              p: 2,
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-m)',
              bgcolor: 'var(--accent-100)',
            }}
          >
            <SwitchWithLabel
              label="Copia automática diaria"
              helper="Sube silenciosamente una copia diaria cuando abres la aplicación."
              checked={isAutoEnabled}
              onChange={handleToggleAutoBackup}
            />
          </Box>

          {/* Instant Cloud Upload Action */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-m)',
              bgcolor: 'var(--accent-100)',
            }}
          >
            <Stack>
              <Typography className="h4">Subir Copia a la Nube Ahora</Typography>
              <Typography className="label-small-regular" color="var(--grey-400)">
                Sincroniza y guarda el estado actual inmediatamente en tu Google Drive.
              </Typography>
            </Stack>
            <Button
              variant="small"
              onClick={handleManualUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Subiendo...' : 'Subir a Drive'}
            </Button>
          </Box>
        </Stack>
      ) : (
        <Box
          sx={{
            p: 3,
            bgcolor: 'var(--accent-100)',
            borderRadius: 'var(--radius-m)',
            border: '1px solid var(--line)',
          }}
        >
          <Typography className="h4" color="var(--accent-dark)" sx={{ mb: 1 }}>
            ¿Por qué conectar Google Drive?
          </Typography>
          <Typography className="body-regular" color="var(--grey-400)" sx={{ mb: 2 }}>
            1. **Copias en la Nube Automatizadas:** Cada día que uses la aplicación, se guardará una copia histórica rotativa de tus datos.
          </Typography>
          <Typography className="body-regular" color="var(--grey-400)" sx={{ mb: 2 }}>
            2. **Alcance de Privacidad Seguro (`drive.file`):** La aplicación solo tiene permiso para ver y modificar los archivos creados por ella misma. Tus fotos, documentos o carpetas privadas de Drive están totalmente fuera del alcance de la aplicación.
          </Typography>
          <Typography className="body-regular" color="var(--grey-400)">
            3. **Carpeta Identificable:** Todos los archivos se guardan organizados de manera centralizada en una carpeta exclusiva llamada **`Elda Centro App Backups`**.
          </Typography>
        </Box>
      )}
    </Stack>
  );
};

export default GoogleDriveTab;
