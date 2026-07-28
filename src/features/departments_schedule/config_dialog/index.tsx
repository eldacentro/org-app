import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { useAtomValue } from 'jotai';
import Typography from '@components/typography';
import InfoTip from '@components/info_tip';
import AppButton from '@components/button';
import SegmentedControl from '@components/segmented_control';
import SwitchWithLabel from '@components/switch_with_label';
import { departmentsConfigState } from '@states/settings';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { displaySnackNotification } from '@services/states/app';
import {
  DEPT_LABEL,
  DeptConfig,
  DepartmentsConfig,
  MAX_DEPT_TURNS,
  readDeptConfig,
} from '@services/app/departments_slots';
import { ALL_DEPARTMENT_TYPES, DepartmentType } from '@definition/person';

/**
 * Configuración de los departamentos.
 *
 * Vive aquí dentro y no en los ajustes de la congregación a propósito: quien
 * lleva los departamentos no tiene por qué tener acceso a los ajustes, y sí
 * tiene que poder decidir cómo se organizan sus turnos.
 *
 * Cambiar esto NO borra nada, pero sí cambia la clave con la que se guarda
 * cada puesto, así que lo ya asignado con la configuración anterior deja de
 * verse hasta que se vuelva a dejar como estaba. Se avisa abajo.
 */
const DeptConfigDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const saved = useAtomValue(departmentsConfigState);

  const [draft, setDraft] = useState<DepartmentsConfig>({});

  // Se parte de lo guardado cada vez que se abre, para que cancelar deshaga
  // de verdad y no se arrastre lo tocado en una apertura anterior. Solo AL
  // ABRIR: si llega una sincronización con el diálogo abierto, no se borra de
  // golpe lo que la persona esté tocando.
  const initialized = useRef(false);

  useEffect(() => {
    if (!open) {
      initialized.current = false;
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const next: DepartmentsConfig = {};

    for (const dept of ALL_DEPARTMENT_TYPES) {
      next[dept] = readDeptConfig(saved, dept);
    }

    setDraft(next);
  }, [open, saved]);

  const setDept = (dept: DepartmentType, changes: Partial<DeptConfig>) => {
    setDraft((prev) => ({
      ...prev,
      [dept]: { ...readDeptConfig(prev, dept), ...changes },
    }));
  };

  const handleSave = async () => {
    try {
      await dbAppSettingsUpdate({
        'cong_settings.departments_config': {
          value: draft,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error saving departments config:', error);

      displaySnackNotification({
        header: 'No se ha podido guardar',
        message: 'Vuelve a intentarlo.',
        severity: 'error',
      });

      return;
    }

    onClose();

    displaySnackNotification({
      header: 'Hecho',
      message: 'Configuración de departamentos guardada.',
      severity: 'success',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="mobile"
      fullWidth
      sx={{ '& .MuiDialog-paper': { maxWidth: '560px', width: '100%' } }}
      PaperProps={{
        style: {
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--line)',
          backgroundColor: 'var(--card)',
          boxShadow: 'var(--pop-up-shadow)',
        },
      }}
      slotProps={{
        backdrop: { style: { backgroundColor: 'var(--accent-dark-overlay)' } },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography className="h2" sx={{ color: 'var(--ink)' }}>
          Configuración de departamentos
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: '16px', mt: '8px' }}
      >
        <InfoTip
          isBig={false}
          color="info"
          text="Cada departamento se organiza como quieras: las mismas personas toda la semana, o unas el día de entre semana y otras el fin de semana. Y si hace falta, el turno se puede partir en dos: uno al principio de la reunión y otro al final."
        />

        <Stack spacing="12px">
          {ALL_DEPARTMENT_TYPES.map((dept) => {
            const config = readDeptConfig(draft, dept);

            return (
              <Box
                key={dept}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-l)',
                  backgroundColor: 'var(--accent-100)',
                }}
              >
                <Typography className="h4" color="var(--ink)">
                  {DEPT_LABEL[dept]}
                </Typography>

                <SegmentedControl
                  ariaLabel={`Cómo se asigna ${DEPT_LABEL[dept]}`}
                  tabs={['Por semana', 'Por reunión']}
                  active={config.scope === 'meeting' ? 1 : 0}
                  onChange={(idx) =>
                    setDept(dept, { scope: idx === 1 ? 'meeting' : 'week' })
                  }
                />

                <SwitchWithLabel
                  label="Dividir en dos turnos"
                  helper="Uno al principio de la reunión y otro al final."
                  checked={config.turns > 1}
                  onChange={(checked) =>
                    setDept(dept, { turns: checked ? MAX_DEPT_TURNS : 1 })
                  }
                />
              </Box>
            );
          })}
        </Stack>

        <InfoTip
          isBig={false}
          color="warning"
          text="Cambiar esto no borra nada, pero las asignaciones ya hechas con la configuración anterior dejan de verse mientras esté cambiada. Si te arrepientes, déjalo como estaba y vuelven a aparecer."
        />
      </DialogContent>

      <DialogActions sx={{ padding: '16px', gap: '8px' }}>
        <AppButton variant="secondary" disableAutoStretch onClick={onClose}>
          Cancelar
        </AppButton>
        <AppButton variant="main" disableAutoStretch onClick={handleSave}>
          Guardar
        </AppButton>
      </DialogActions>
    </Dialog>
  );
};

export default DeptConfigDialog;
