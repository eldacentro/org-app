import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { AssignmentFieldType } from '@definition/assignment';
import { AssignmentCongregation, SchedWeekType } from '@definition/schedules';
import { ASSIGNMENT_PATH } from '@constants/index';
import {
  schedulesGetData,
  schedulesS89AssignmentsForWeek,
} from '@services/app/schedules';
import { pendingS89Slips } from '@services/app/pending_s89';
import { buildWeekRangeLabel } from '@services/app/week_range';
import { formatDate, getWeekDate } from '@utils/date';
import { monthNamesState } from '@states/app';
import { personsState } from '@states/persons';
import { sourcesState } from '@states/sources';
import {
  avisarAyudantesState,
  schedulesState,
  selectedWeekState,
} from '@states/schedules';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
  JWLangState,
  userDataViewState,
} from '@states/settings';
import { personGetDisplayName } from '@utils/common';
import { normalizarTelefono } from '@utils/telefono';
import { useAppTranslation } from '@hooks/index';

/**
 * Cómo se llama cada parte en la lista de pendientes.
 *
 * Los números son los de la propia hoja S-89 (la lectura de la Biblia es la
 * parte 3), así que coinciden con lo que el hermano tiene en la mano.
 */
const NOMBRE_PARTE: Record<string, string> = {
  MM_TGWBibleReading: 'Lectura de la Biblia',
  MM_AYFPart1: 'Parte 4',
  MM_AYFPart2: 'Parte 5',
  MM_AYFPart3: 'Parte 6',
  MM_AYFPart4: 'Parte 7',
};

const usePendingSlips = () => {
  const { t } = useAppTranslation();

  const schedules = useAtomValue(schedulesState);
  const selectedWeek = useAtomValue(selectedWeekState);
  const persons = useAtomValue(personsState);
  const sources = useAtomValue(sourcesState);
  const lang = useAtomValue(JWLangState);
  const dataView = useAtomValue(userDataViewState);
  const monthNames = useAtomValue(monthNamesState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const avisarAyudantes = useAtomValue(avisarAyudantesState);

  const pending = useMemo(() => {
    const fromWeek = formatDate(getWeekDate(), 'yyyy/MM/dd');

    const slips = pendingS89Slips({
      schedules,
      dataView,
      fromWeek,
      incluirAyudantes: avisarAyudantes,
      // El material de la semana hace falta para saber el TIPO de cada parte
      // de "Seamos mejores maestros": las de «Análisis» las dirige un hermano
      // y no llevan papeleta, así que tampoco cuentan como pendientes.
      assignmentsForWeek: (schedule, view) =>
        schedulesS89AssignmentsForWeek(
          schedule,
          view,
          sources.find((record) => record.weekOf === schedule.weekOf),
          lang
        ),
      getAssignment: (
        schedule: SchedWeekType,
        assignment: AssignmentFieldType,
        view: string
      ) =>
        schedulesGetData(
          schedule,
          ASSIGNMENT_PATH[assignment],
          view
        ) as AssignmentCongregation,
    });

    return slips.map((slip) => {
      const person = persons.find(
        (record) => record.person_uid === slip.person
      );

      // El ayudante comparte la parte del estudiante, así que su etiqueta sale
      // del mismo sitio: hay que quitarle también su palabra, o la fila diría
      // «MM_AYFPart1_Assistant» en crudo.
      const clave = slip.assignment
        .replace(/_(Student|Assistant)/, '')
        .replace(/_[AB]$/, '');

      // El teléfono se resuelve AQUÍ, con la lista, y no al pulsar: quien
      // reparte tiene que ver de un vistazo a quién no se le puede escribir,
      // en vez de descubrirlo hojita por hojita.
      const telefono = normalizarTelefono(person?.person_data.phone.value);

      return {
        ...slip,
        telefono,
        // Si la persona ya no existe, el nombre desnormalizado del propio
        // programa evita que la fila quede en blanco y no se sepa a quién
        // había que darle la hojita.
        name: person
          ? personGetDisplayName(person, displayNameEnabled, fullnameOption)
          : t('tr_deleted', 'Eliminado'),
        part: NOMBRE_PARTE[clave] ?? clave,
        auxClass: slip.assignment.endsWith('_B'),
        weekLabel: buildWeekRangeLabel(slip.weekOf, monthNames, t),
      };
    });
  }, [
    schedules,
    sources,
    lang,
    dataView,
    avisarAyudantes,
    persons,
    displayNameEnabled,
    fullnameOption,
    monthNames,
    t,
  ]);

  // Agrupadas por semana: sin esto la fecha se repetía en cada fila y cuatro
  // filas seguidas decían lo mismo. Además así se lee como se trabaja — "esta
  // semana debo cuatro" — en vez de como una lista plana.
  const porSemana = useMemo(() => {
    const grupos: {
      weekOf: string;
      weekLabel: string;
      slips: typeof pending;
    }[] = [];

    for (const slip of pending) {
      const ultimo = grupos.at(-1);

      if (ultimo?.weekOf === slip.weekOf) {
        ultimo.slips.push(slip);
        continue;
      }

      grupos.push({
        weekOf: slip.weekOf,
        weekLabel: slip.weekLabel,
        slips: [slip],
      });
    }

    return grupos;
  }, [pending]);

  // Lo de la semana abierta. Es lo que de verdad se puede hacer AHORA: con
  // dos meses repartidos, "quedan 59" no dice por dónde empezar, y "en esta
  // semana quedan 3" sí. El total sigue estando, detrás.
  const enSemana = useMemo(() => {
    if (!selectedWeek) return null;

    return pending.filter((slip) => slip.weekOf === selectedWeek);
  }, [pending, selectedWeek]);

  // Los DOS estados, que es de lo que va todo esto. «Por enviar» es trabajo
  // que queda por hacer; «esperando» son hojitas que ya salieron y de las que
  // falta que contesten. Mezclados en un solo número no se sabe por dónde
  // empezar — ni siquiera si hay algo que empezar.
  const porEnviar = useMemo(
    () => pending.filter((slip) => !slip.sent),
    [pending]
  );

  const esperando = useMemo(
    () => pending.filter((slip) => slip.sent),
    [pending]
  );

  return { pending, porSemana, enSemana, porEnviar, esperando };
};

export default usePendingSlips;
