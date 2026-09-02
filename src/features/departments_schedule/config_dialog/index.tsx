import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack } from '@mui/material';
import { useAtomValue } from 'jotai';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import InfoTip from '@components/info_tip';
import AppButton from '@components/button';
import SegmentedControl from '@components/segmented_control';
import Select from '@components/select';
import MenuItem from '@components/menuitem';
import SwitchWithLabel from '@components/switch_with_label';
import { departmentsConfigState } from '@states/settings';
import { deptScheduleState } from '@states/departments_schedule';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { displaySnackNotification } from '@services/states/app';
import {
  DEPT_LABEL,
  DeptConfig,
  DepartmentsConfig,
  DepartmentsConfigStored,
  deptConfigForMonth,
  deptConfigSetForMonth,
  deptConfigTramos,
  MAX_DEPT_TURNS,
  readDeptConfig,
} from '@services/app/departments_slots';
import { isDeptMonthPublished } from '@services/app/departments_publish';
import { monthOfDate } from '@services/app/month_publish';
import { MESES_ES } from '@utils/nombres_fecha';
import { ALL_DEPARTMENT_TYPES, DepartmentType } from '@definition/person';

/**
 * Configuración de los departamentos.
 *
 * Vive aquí dentro y no en los ajustes de la congregación a propósito: quien
 * lleva los departamentos no tiene por qué tener acceso a los ajustes, y sí
 * tiene que poder decidir cómo se organizan sus turnos.
 *
 * SE CONFIGURA A PARTIR DE UN MES, y no para toda la historia. Antes era una
 * sola configuración para siempre: cambiarla en septiembre para que rigiera en
 * octubre reescribía también septiembre y agosto, y lo ya asignado —guardado
 * bajo las claves de entonces— dejaba de encontrarse. Ahora cada mes se lee
 * con la configuración que regía ese mes (ver `departments_slots`), y lo
 * anterior al mes elegido no se toca.
 */

const PAPER_STYLE: CSSProperties = {
  maxWidth: '560px',
  borderRadius: 'var(--shape-md)',
  backgroundColor: 'var(--white)',
  marginLeft: '16px',
  marginRight: '16px',
  marginTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
  marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
  maxHeight:
    'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px)',
};

/** Cuántos meses hacia delante se pueden elegir. Un año da de sobra. */
const MESES_POR_DELANTE = 12;

const mesDeHoy = () => {
  const hoy = new Date();

  return `${hoy.getFullYear()}/${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

const sumarMeses = (mes: string, cuantos: number) => {
  const [year, month] = mes.split('/').map(Number);
  const fecha = new Date(year, month - 1 + cuantos, 1);

  return `${fecha.getFullYear()}/${String(fecha.getMonth() + 1).padStart(2, '0')}`;
};

/** 'octubre 2026', igual que en el diálogo de publicar de esta misma página. */
const etiquetaMes = (mes: string) => {
  const [year, month] = mes.split('/');

  return `${MESES_ES[Number(month) - 1] ?? ''} ${year ?? ''}`.trim();
};

/**
 * Los interruptores tal como están ese mes.
 *
 * Se rellenan LOS CUATRO departamentos aunque no haya nada guardado: así el
 * diálogo enseña siempre lo que de verdad rige (lo de siempre, cuando no se ha
 * tocado nada) en vez de dejar huecos.
 */
const cargarDelMes = (
  saved: DepartmentsConfigStored,
  mes: string
): DepartmentsConfig => {
  const delMes = deptConfigForMonth(saved, mes);
  const draft: DepartmentsConfig = {};

  for (const dept of ALL_DEPARTMENT_TYPES) {
    draft[dept] = readDeptConfig(delMes, dept);
  }

  return draft;
};

const DeptConfigDialog = ({
  open,
  onClose,
  month,
}: {
  open: boolean;
  onClose: () => void;
  /** El mes que se está viendo en la página, que es el que se propone. */
  month: string;
}) => {
  const saved = useAtomValue(departmentsConfigState);
  const schedules = useAtomValue(deptScheduleState);

  const mesPagina = monthOfDate(month);

  const [mes, setMes] = useState('');
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

    const inicial = mesPagina || mesDeHoy();

    setMes(inicial);
    setDraft(cargarDelMes(saved, inicial));
  }, [open, saved, mesPagina]);

  /**
   * Los meses que se pueden elegir: de este en adelante, un año.
   *
   * Y además el que se esté viendo en la página y los que ya tengan un tramo
   * decidido, aunque se hayan quedado atrás: si no, un tramo puesto por error
   * el año pasado no habría forma ni de mirarlo ni de deshacerlo.
   */
  const meses = useMemo(() => {
    const lista = new Set<string>();
    const hoy = mesDeHoy();

    for (let i = 0; i <= MESES_POR_DELANTE; i++) {
      lista.add(sumarMeses(hoy, i));
    }

    if (mesPagina) lista.add(mesPagina);

    for (const tramo of deptConfigTramos(saved)) {
      if (tramo.desde) lista.add(tramo.desde);
    }

    return [...lista].sort();
  }, [saved, mesPagina]);

  const handleMes = (nuevo: string) => {
    setMes(nuevo);

    // Los interruptores pasan a enseñar cómo está el mes NUEVO. Lo tocado sin
    // guardar se pierde a propósito: lo que se ve tiene que ser lo que hay.
    setDraft(cargarDelMes(saved, nuevo));
  };

  const setDept = (dept: DepartmentType, changes: Partial<DeptConfig>) => {
    setDraft((prev) => ({
      ...prev,
      [dept]: { ...readDeptConfig(prev, dept), ...changes },
    }));
  };

  const mesLabel = etiquetaMes(mes);
  const mesPasado = mes !== '' && mes < mesDeHoy();
  const mesPublicado = mes !== '' && isDeptMonthPublished(schedules, mes);

  // Si hay otra configuración más adelante, esta NO llega hasta allí. Decirlo
  // evita el susto de creer que se ha cambiado todo el curso de una vez.
  const siguienteTramo = useMemo(() => {
    if (!mes) return '';

    const siguiente = deptConfigTramos(saved).find(
      (tramo) => tramo.desde && tramo.desde > mes
    );

    return siguiente?.desde ?? '';
  }, [saved, mes]);

  const aviso = mesPasado
    ? `${mesLabel} ya pasó. Cambiar la configuración de un mes que ya se dio esconde lo que se asignó entonces, que sigue guardado con las claves de aquella configuración. Lo normal es cambiarlo a partir del mes que viene.`
    : mesPublicado
      ? `${mesLabel} ya está publicado: la congregación lo tiene delante. Cambiar su configuración no borra nada, pero lo que ya estuviera asignado deja de verse mientras esté cambiada.`
      : 'Cambiar esto no borra nada, pero las asignaciones ya hechas con la configuración anterior dejan de verse mientras esté cambiada. Si te arrepientes, déjalo como estaba y vuelven a aparecer.';

  const handleSave = async () => {
    const value = deptConfigSetForMonth(saved, mes, draft);

    // Guardar algo idéntico despierta la sincronización de toda la
    // congregación para nada: misma regla que al publicar el mes.
    if (JSON.stringify(value) === JSON.stringify(saved)) {
      onClose();

      displaySnackNotification({
        header: 'Sin cambios',
        message: 'La configuración se queda como estaba.',
        severity: 'success',
      });

      return;
    }

    try {
      await dbAppSettingsUpdate({
        'cong_settings.departments_config': {
          value,
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
      message: `Así quedan los departamentos a partir de ${mesLabel}.`,
      severity: 'success',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ className: 'pop-up-shadow', style: PAPER_STYLE }}
      // El contenido no se desplaza entero: solo la lista de departamentos.
      // Así el título, el mes y los botones no se van de la pantalla y no hay
      // que bajar hasta el final para poder guardar.
      sx={{ overflow: 'hidden', alignItems: 'stretch' }}
    >
      <Typography className="h2" sx={{ color: 'var(--ink)' }}>
        Configuración de departamentos
      </Typography>

      {/* El mes va FUERA de lo que se desplaza, pegado al título: es el marco
          de todo lo de abajo, y perderlo de vista mientras se tocan los
          interruptores es justo cómo se cambia el mes equivocado. */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
        }}
      >
        <Select
          label="A partir de"
          value={meses.includes(mes) ? mes : ''}
          onChange={(e) => handleMes(e.target.value as string)}
        >
          {meses.map((value) => (
            <MenuItem key={value} value={value}>
              <Typography>{etiquetaMes(value)}</Typography>
            </MenuItem>
          ))}
        </Select>

        <Typography className="body-small-regular" color="var(--ink-2)">
          {`Los meses anteriores a ${mesLabel} se quedan como están. Los interruptores enseñan cómo está ${mesLabel}.`}
          {siguienteTramo &&
            ` Desde ${etiquetaMes(siguienteTramo)} ya rige otra configuración, y esa no se toca.`}
        </Typography>
      </Box>

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
          la semana, o unas entre semana y otras el fin de semana. Y el turno se
          puede partir en dos: principio y final de la reunión.
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
                borderRadius: 'var(--shape-sm)',
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

        <InfoTip isBig={false} color="warning" text={aviso} />
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
