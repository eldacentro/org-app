import { CSSProperties, useEffect, useRef, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
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

/**
 * Son cuatro departamentos con dos ajustes cada uno, así que en un móvil el
 * diálogo no cabe entero. La altura se limita a lo que de verdad se puede
 * usar —descontando la barra de estado y el notch— y lo que sobra se
 * desplaza por dentro. Sin esto, el diálogo crecía por encima de la pantalla
 * y el título se metía debajo de la hora y la batería.
 */
const PAPER_STYLE: CSSProperties = {
  maxWidth: '560px',
  borderRadius: 'var(--radius-xl)',
  backgroundColor: 'var(--white)',
  marginLeft: '16px',
  marginRight: '16px',
  marginTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
  marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
  maxHeight:
    'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px)',
};

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
      PaperProps={{ className: 'pop-up-shadow', style: PAPER_STYLE }}
      // El contenido no se desplaza entero: solo la lista de departamentos.
      // Así el título y los botones no se van de la pantalla y no hay que
      // bajar hasta el final para poder guardar.
      sx={{ overflow: 'hidden', alignItems: 'stretch' }}
    >
      <Typography className="h2" sx={{ color: 'var(--ink)' }}>
        Configuración de departamentos
      </Typography>

      <Stack
        spacing="12px"
        sx={{
          width: '100%',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          // Sin esto, la sombra del control segmentado se corta contra el
          // borde del área que se desplaza.
          paddingBottom: '4px',
        }}
      >
        <Typography className="body-small-regular" color="var(--ink-2)">
          Cada departamento se organiza por su cuenta: las mismas personas toda
          la semana, o unas entre semana y otras el fin de semana. Y el turno
          se puede partir en dos: principio y final de la reunión.
        </Typography>

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

        <InfoTip
          isBig={false}
          color="warning"
          text="Cambiar esto no borra nada, pero las asignaciones ya hechas con la configuración anterior dejan de verse mientras esté cambiada. Si te arrepientes, déjalo como estaba y vuelven a aparecer."
        />
      </Stack>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          width: '100%',
        }}
      >
        <AppButton variant="tertiary" disableAutoStretch onClick={onClose}>
          Cancelar
        </AppButton>
        <AppButton variant="main" disableAutoStretch onClick={handleSave}>
          Guardar
        </AppButton>
      </Box>
    </Dialog>
  );
};

export default DeptConfigDialog;
