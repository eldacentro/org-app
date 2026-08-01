import React, { useState, useEffect } from 'react';
import { displaySnackNotification } from '@services/states/app';
import { Box, MenuItem } from '@mui/material';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import Button from '@components/button';
import Checkbox from '@components/checkbox';
import SwitchWithLabel from '@components/switch_with_label';
import TextField from '@components/textfield';
import DatePicker from '@components/date_picker';
import { useAtomValue } from 'jotai';
import { fieldServiceGroupsState } from '@states/field_service_groups';
import { schedulesState } from '@states/schedules';
import { SchedWeekType } from '@definition/schedules';
import {
  dbLimpiezaGetConfig,
  dbLimpiezaSaveConfig,
} from '@services/dexie/limpieza';
import { useAppTranslation } from '@hooks/index';
import { LimpiezaConfig } from '@definition/limpieza';
import { FieldServiceGroupType } from '@definition/field_service_groups';
import { calcularGrupoReunion } from '@services/limpieza/calcularRotacion';
import { schedulesGetMeetingDate } from '@services/app/schedules';

/**
 * Congela lo ya asignado como overrides explícitos, para que cambiar la
 * configuración no reescriba hacia atrás lo que la congregación ya dio por
 * bueno.
 *
 * Congela desde la fecha de inicio ANTIGUA hasta el más tardío de estos dos:
 * el lunes de esta semana, o el lunes de la fecha de inicio NUEVA. Ese segundo
 * límite es el que faltaba: al poner una fecha de inicio en el futuro —para
 * recolocar la rotación desde ahí— todo lo que quedaba entre hoy y esa fecha
 * se recalculaba con la configuración nueva y cambiaba solo. Ahora ese tramo
 * se queda escrito tal cual estaba.
 *
 * Se le pasan los `schedules` reales: el cálculo salta las semanas sin reunión
 * (asamblea, visita del CO), y sin ellos congelaba valores distintos de los que
 * la gente tenía delante — que es justo cambiar el pasado, no conservarlo.
 */
const freezePastWeeks = (
  oldConfig: LimpiezaConfig,
  groups: FieldServiceGroupType[],
  schedules: SchedWeekType[],
  nuevaFechaInicio: Date | null
): Record<string, string> => {
  const overrides: Record<string, string> = { ...(oldConfig.overrides ?? {}) };

  // Lunes de la semana de fechaInicio
  const dInicio = new Date(oldConfig.fechaInicio);
  const dayI = dInicio.getDay();
  const diffI = dInicio.getDate() - dayI + (dayI === 0 ? -6 : 1);
  const current = new Date(dInicio.getFullYear(), dInicio.getMonth(), diffI);
  current.setHours(0, 0, 0, 0);

  // Lunes de la semana ACTUAL (no congelamos la semana en curso)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDay = today.getDay();
  const todayDiff = today.getDate() - todayDay + (todayDay === 0 ? -6 : 1);
  const thisMonday = new Date(today.getFullYear(), today.getMonth(), todayDiff);
  thisMonday.setHours(0, 0, 0, 0);

  // El corte: se congela toda reunión ANTERIOR a esta fecha. Por defecto el
  // lunes de esta semana —la semana en curso no se congela—, y si la fecha de
  // inicio nueva es posterior, ella misma.
  //
  // El corte es una FECHA, no un lunes, y eso importa: poniendo el inicio en
  // domingo 16 se congelaba por semanas enteras hasta el lunes 10, así que el
  // miércoles 12 —anterior al 16, y ya asignado— se recalculaba con la
  // configuración nueva y cambiaba de grupo. Justo lo que no debía pasar.
  let corte = thisMonday;

  if (nuevaFechaInicio) {
    const dNueva = new Date(nuevaFechaInicio);
    dNueva.setHours(0, 0, 0, 0);
    if (dNueva > corte) corte = dNueva;
  }

  const corteLunes = new Date(corte);
  const dayC = corteLunes.getDay();
  corteLunes.setDate(corteLunes.getDate() - (dayC === 0 ? 6 : dayC - 1));
  corteLunes.setHours(0, 0, 0, 0);

  while (current <= corteLunes) {
    const weekOf = `${current.getFullYear()}/${String(current.getMonth() + 1).padStart(2, '0')}/${String(current.getDate()).padStart(2, '0')}`;

    for (const reunionDia of ['midweek', 'weekend'] as const) {
      const key = `${weekOf}-${reunionDia}`;
      if (overrides[key]) continue;

      // La reunión de la semana del corte solo se congela si cae antes de la
      // fecha de corte. Se pregunta la fecha REAL (la visita del
      // superintendente mueve la de entre semana) en vez de suponer el día.
      const { date: fechaReunion } = schedulesGetMeetingDate({
        week: weekOf,
        meeting: reunionDia,
      });
      if (!fechaReunion) continue;

      const [fy, fm, fd] = fechaReunion.split('/').map(Number);
      const dReunion = new Date(fy, fm - 1, fd);
      dReunion.setHours(0, 0, 0, 0);
      if (dReunion >= corte) continue;

      const groupId = calcularGrupoReunion(
        oldConfig,
        weekOf,
        reunionDia,
        groups,
        schedules
      );
      if (groupId) overrides[key] = groupId;
    }

    current.setDate(current.getDate() + 7);
  }

  return overrides;
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const LimpiezaConfigDialog = ({ open, onClose }: Props) => {
  const { t } = useAppTranslation();
  const groups = useAtomValue(fieldServiceGroupsState);
  const schedules = useAtomValue(schedulesState);
  const activeGroups = React.useMemo(() => {
    return [...groups]
      .filter((g) => g.group_data._deleted !== true)
      .sort((a, b) => a.group_data.sort_index - b.group_data.sort_index);
  }, [groups]);

  const getGroupName = (g: FieldServiceGroupType) => {
    if (!g) return '';
    if (g.group_data.name && g.group_data.name.length > 0)
      return g.group_data.name;
    return t('tr_groupNumber', { groupNumber: g.group_data.sort_index + 1 });
  };

  const [fechaInicio, setFechaInicio] = useState<Date | null>(new Date());
  const [grupoInicio, setGrupoInicio] = useState<string>('');
  const [gruposParticipantes, setGruposParticipantes] = useState<string[]>([]);
  const [alternarParejas, setAlternarParejas] = useState(false);
  const [notasGenerales, setNotasGenerales] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await dbLimpiezaGetConfig();
        if (config) {
          setFechaInicio(new Date(config.fechaInicio));
          setGrupoInicio(config.grupoInicio);
          setGruposParticipantes(config.gruposParticipantes);
          setAlternarParejas(config.alternarParejas ?? false);
          setNotasGenerales(config.notasGenerales || '');
        } else {
          // Default values
          setFechaInicio(new Date());
          setGrupoInicio(
            activeGroups.length > 0 ? activeGroups[0].group_id : ''
          );
          setGruposParticipantes(activeGroups.map((g) => g.group_id));
          setAlternarParejas(false);
          setNotasGenerales('');
        }
      } catch (err) {
        console.error('Error loading limpieza config:', err);
      }
    };

    if (open) {
      loadConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    if (!fechaInicio || !grupoInicio || isSaving) return;
    setIsSaving(true);

    try {
      const existingConfig = await dbLimpiezaGetConfig();

      // Congelar semanas pasadas: convertirlas a overrides explícitos para que
      // el cambio de fechaInicio/grupoInicio no retroafecte el historial.
      const frozenOverrides = existingConfig
        ? freezePastWeeks(existingConfig, groups, schedules, fechaInicio)
        : {};

      const newConfig: LimpiezaConfig = {
        id: '1',
        updatedAt: new Date().toISOString(),
        fechaInicio: fechaInicio.toISOString(),
        grupoInicio,
        gruposParticipantes,
        alternarParejas,
        notasGenerales,
        overrides: frozenOverrides,
      };

      await dbLimpiezaSaveConfig(newConfig);
      displaySnackNotification({
        severity: 'success',
        header: 'Configuración guardada',
        message: 'La rotación de limpieza ha sido actualizada.',
      });
      onClose();
    } catch (err) {
      console.error('Error saving limpieza config:', err);
      displaySnackNotification({
        severity: 'error',
        header: 'Error al guardar',
        message: 'No se pudo guardar la configuración de limpieza.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setGruposParticipantes((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    // El Dialog del sistema, no el de MUI en crudo. Con el de MUI este diálogo
    // traía su propio Paper (radio, borde, sombra), su propio DialogTitle y un
    // DialogActions cuyo espaciado no era el de los demás: por eso sus botones
    // no se parecían a los del resto de la app. Ver DESIGN_SYSTEM §6.1.
    <Dialog open={open} onClose={onClose}>
      <Typography className="h2" color="var(--ink)">
        Configuración de limpieza
      </Typography>
      <Typography
        className="body-small-regular"
        color="var(--ink-2)"
        sx={{ marginTop: '4px' }}
      >
        Define desde cuándo y con qué grupos rota la limpieza del salón.
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginTop: '24px',
        }}
      >
        <DatePicker
          label="Fecha de inicio"
          value={fechaInicio}
          onChange={(newValue) => {
            if (newValue) setFechaInicio(newValue as Date);
          }}
          view="input"
        />

        <TextField
          select
          label="Grupo de inicio"
          value={grupoInicio}
          onChange={(e) => setGrupoInicio(e.target.value)}
        >
          {activeGroups.map((g) => (
            <MenuItem key={g.group_id} value={g.group_id}>
              {getGroupName(g)}
            </MenuItem>
          ))}
        </TextField>

        <Box>
          <Typography
            className="body-small-semibold"
            color="var(--ink-2)"
            sx={{ marginBottom: '8px' }}
          >
            Grupos que participan en la rotación
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {activeGroups.map((g) => (
              <Checkbox
                key={g.group_id}
                label={getGroupName(g)}
                checked={gruposParticipantes.includes(g.group_id)}
                onChange={() => toggleGroup(g.group_id)}
              />
            ))}
          </Box>
        </Box>

        {/* Solo tiene sentido con un número par de grupos: con impar la
            rotación ya alterna sola y el interruptor no haría nada. Y hacen
            falta cuatro: con dos, el intercambio deja al mismo grupo cerrando
            una vuelta y abriendo la siguiente, o sea limpiando dos reuniones
            seguidas. */}
        {gruposParticipantes.length % 2 === 0 &&
          gruposParticipantes.length >= 4 && (
            <SwitchWithLabel
              label="Alternar por parejas cada vuelta"
              helper="Con un número par de grupos, cada grupo acaba limpiando siempre la misma reunión. Con esto, al terminar la vuelta los grupos se intercambian de dos en dos —1, 2, 3, 4, 5, 6 y luego 2, 1, 4, 3, 6, 5— y todos pasan por las dos reuniones."
              checked={alternarParejas}
              onChange={(checked) => setAlternarParejas(checked)}
            />
          )}

        <TextField
          label="Notas generales"
          multiline
          rows={3}
          value={notasGenerales}
          onChange={(e) => setNotasGenerales(e.target.value)}
          placeholder="Ej: Traer fregonas, revisar aseos, etc."
        />
      </Box>

      {/* Cancelar a la izquierda y Guardar el más a la derecha, como en todos
          los diálogos de la app. */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          marginTop: '24px',
        }}
      >
        <Button variant="tertiary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="main" onClick={handleSave} disabled={isSaving}>
          Guardar
        </Button>
      </Box>
    </Dialog>
  );
};

export default LimpiezaConfigDialog;
