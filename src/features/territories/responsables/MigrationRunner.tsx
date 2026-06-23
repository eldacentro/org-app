import { useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import Button from '@components/button';
import Typography from '@components/typography';
import { displaySnackNotification } from '@services/states/app';
import { useAtomValue } from 'jotai';
import { personsActiveState } from '@states/persons';
import { congIDState } from '@states/settings';
import { runMigrationDB } from '@services/firebase/territoriesMigration';
import migrationData from '../migrationData.json';

const MigrationRunner = () => {
  const [busy, setBusy] = useState(false);
  const persons = useAtomValue(personsActiveState);
  const congId = useAtomValue(congIDState);

  const runMigration = async () => {
    if (!confirm('¿Estás seguro de que quieres inyectar todos los datos? Esto podría sobrescribir la base de datos de territorios si ya hay algo.')) return;
    setBusy(true);
    
    try {
      await runMigrationDB(migrationData, persons, congId);
      displaySnackNotification({ severity: 'success', header: 'Migración Completa', message: 'Los datos se inyectaron correctamente en Firebase.' });
    } catch (e) {
      console.error(e);
      displaySnackNotification({ severity: 'error', header: 'Error', message: 'No se pudo migrar. Mira la consola.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ mt: 4, p: 3, border: '2px dashed var(--accent-main)', borderRadius: '16px', textAlign: 'center' }}>
      <Typography sx={{ fontWeight: 700, mb: 1, color: 'var(--ink)' }}>🛠 Herramienta de Migración Interna</Typography>
      <Typography sx={{ fontSize: '13px', color: 'var(--ink-2)', mb: 2 }}>
        Esto leerá el archivo migrationData.json e inyectará {migrationData.territories.length} territorios y {migrationData.assignments.length} asignaciones directamente en Firebase.
      </Typography>
      <Button variant="main" onClick={runMigration} disabled={busy} sx={{ mx: 'auto' }}>
        {busy ? <CircularProgress size={16} sx={{ mr: 1, color: 'inherit' }} /> : '🚀 Inyectar Datos a Firebase'}
      </Button>
    </Box>
  );
};

export default MigrationRunner;
