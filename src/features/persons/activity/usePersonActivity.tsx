import { useEffect, useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { assignmentsHistoryState, schedulesState } from '@states/schedules';
import { deptScheduleState } from '@states/departments_schedule';
import { serviceOutingsListState } from '@states/service_outings';
import { exhibitorsListState } from '@states/exhibitors';
import { circuitVisitsState } from '@states/circuit_visit';
import { congIDState } from '@states/settings';
import { congAccountConnectedState } from '@states/app';
import { schedulesBuildHistoryList } from '@services/app/schedules';
import { fetchPersonTerritoryHistory } from '@services/firebase/territories';
import {
  ActivityCategory,
  ActivityItem,
  buildCircuitVisitActivity,
  buildDepartmentActivity,
  buildExhibitorActivity,
  buildOutingActivity,
  groupActivityByMonth,
  sortActivity,
} from '@services/app/person_activity';
import { formatDate, toComparableDate } from '@utils/date';

const TERRITORY_STATUS_LABELS: Record<string, string> = {
  asignado: 'Sin devolver',
  trabajado: 'Trabajado',
  no_trabajado: 'Devuelto sin trabajar',
};

/**
 * Toda la actividad de una persona, de todos los módulos, en una sola lista.
 *
 * Las asignaciones de reunión salen del historial que ya construye
 * `schedulesBuildHistoryList()` (incluye los discursos salientes); el resto lo
 * arma `@services/app/person_activity` a partir del estado de cada módulo.
 *
 * Los territorios son el único que no vive en Dexie: se consultan a Firestore
 * una sola vez al abrir la ficha. Si falla —sin conexión, sin permisos, módulo
 * sin usar— la lista se queda sin esa categoría y ya está: el resto de la
 * ficha no depende de ello.
 */
const usePersonActivity = (personUid: string) => {
  const setAssignmentsHistory = useSetAtom(assignmentsHistoryState);

  const schedules = useAtomValue(schedulesState);
  const assignmentsHistory = useAtomValue(assignmentsHistoryState);
  const deptSchedules = useAtomValue(deptScheduleState);
  const outings = useAtomValue(serviceOutingsListState);
  const exhibitors = useAtomValue(exhibitorsListState);
  const circuitVisits = useAtomValue(circuitVisitsState);
  const congId = useAtomValue(congIDState);
  const isConnected = useAtomValue(congAccountConnectedState);

  const [category, setCategory] = useState<ActivityCategory | 'all'>('all');
  const [territoryItems, setTerritoryItems] = useState<ActivityItem[]>([]);

  // Mismo patrón que el historial de asignaciones que había antes: el listado
  // se reconstruye cuando cambian los programas.
  useEffect(() => {
    setAssignmentsHistory(schedulesBuildHistoryList());
  }, [schedules, setAssignmentsHistory]);

  useEffect(() => {
    if (!personUid || !congId || !isConnected) return;

    let active = true;

    fetchPersonTerritoryHistory(congId, personUid)
      .then((records) => {
        if (!active) return;

        setTerritoryItems(
          records.reduce<ActivityItem[]>((items, { assignment, territoryLabel }) => {
            const date = toComparableDate(assignment.assignedAt);
            if (!date) return items;

            const returned = assignment.returnedAt
              ? `devuelto el ${formatDate(new Date(assignment.returnedAt), 'dd/MM/yyyy')}`
              : TERRITORY_STATUS_LABELS.asignado;

            items.push({
              key: `TERRITORY:${assignment.id}`,
              date,
              category: 'territory',
              title: territoryLabel
                ? `Territorio ${territoryLabel}`
                : 'Territorio',
              detail: [
                assignment.isCampaign ? 'Campaña' : '',
                assignment.returnedAt
                  ? TERRITORY_STATUS_LABELS[assignment.status] ?? ''
                  : '',
                returned,
              ]
                .filter(Boolean)
                .join(' · '),
            });

            return items;
          }, [])
        );
      })
      .catch((error) => {
        console.error('No se pudo leer el historial de territorios:', error);
      });

    return () => {
      active = false;
    };
  }, [personUid, congId, isConnected]);

  const items = useMemo(() => {
    const meetings = assignmentsHistory
      .filter((record) => record.assignment.person === personUid)
      .reduce<ActivityItem[]>((result, record) => {
        const date = toComparableDate(record.actualDate || record.weekOf);
        if (!date) return result;

        result.push({
          key: `MEETING:${record.id}`,
          date,
          category: 'meeting',
          title: record.assignment.title,
          // El aula viaja como '1' o '2' porque en la tabla anterior tenía su
          // propia columna «Salón»; aquí va suelta en una línea, así que sin
          // la palabra delante se leería como un número perdido.
          detail: [
            record.assignment.classroom
              ? `Salón ${record.assignment.classroom}`
              : '',
            record.assignment.desc,
          ]
            .filter(Boolean)
            .join(' · '),
        });

        return result;
      }, []);

    return sortActivity([
      ...meetings,
      ...buildDepartmentActivity(deptSchedules, personUid),
      ...buildOutingActivity(outings, personUid),
      ...buildExhibitorActivity(exhibitors, personUid),
      ...buildCircuitVisitActivity(circuitVisits, personUid),
      ...territoryItems,
    ]);
  }, [
    assignmentsHistory,
    deptSchedules,
    outings,
    exhibitors,
    circuitVisits,
    territoryItems,
    personUid,
  ]);

  // Solo se ofrecen los filtros que de verdad tienen algo detrás: una fila de
  // seis categorías donde cuatro están siempre vacías no es un filtro, es
  // ruido.
  const counts = useMemo(() => {
    const result = new Map<ActivityCategory, number>();

    for (const item of items) {
      result.set(item.category, (result.get(item.category) ?? 0) + 1);
    }

    return result;
  }, [items]);

  const groups = useMemo(() => {
    const visible =
      category === 'all'
        ? items
        : items.filter((item) => item.category === category);

    return groupActivityByMonth(visible);
  }, [items, category]);

  return {
    groups,
    counts,
    total: items.length,
    category,
    setCategory,
  };
};

export default usePersonActivity;
