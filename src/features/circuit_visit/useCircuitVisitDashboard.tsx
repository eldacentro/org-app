import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { circuitVisitsState } from '@states/circuit_visit';
import {
  COFullnameState,
  COSpouseNameState,
  JWLangState,
  congFullnameState,
  displayNameMeetingsEnableState,
  fullnameOptionState,
} from '@states/settings';
import {
  serviceOutingsListState,
  serviceOutingsSettingsState,
} from '@states/service_outings';
import { deriveWeekOutingSlots } from '@utils/service_outings';
import { personsStateFind } from '@services/states/persons';
import { personGetDisplayName } from '@utils/common';
import { displaySnackNotification } from '@services/states/app';
import CircuitVisitProgramDoc from '@views/circuit_visit';
import {
  CircuitVisitType,
  CircuitVisitMeal,
  CircuitVisitCompanion,
  CircuitVisitSpecialMeeting,
  CircuitVisitShepherdingVisit,
} from '@definition/circuit_visit';
import {
  dbCircuitVisitSave,
  dbCircuitVisitDelete,
} from '@services/dexie/circuit_visit';
import { buildVisitForWeek } from '@services/app/circuit_visit';
import { addDays, formatDate } from '@utils/date';
import { getEffectiveCoName } from './shared/getEffectiveCoName';

export type CircuitVisitSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 800;

const useCircuitVisitDashboard = () => {
  const visits = useAtomValue(circuitVisitsState);
  const coName = useAtomValue(COFullnameState);
  const coSpouseName = useAtomValue(COSpouseNameState);
  const congName = useAtomValue(congFullnameState);
  const jwLang = useAtomValue(JWLangState);
  const outingsList = useAtomValue(serviceOutingsListState);
  const outingsSettings = useAtomValue(serviceOutingsSettingsState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  // Más recientes primero.
  const sortedVisits = useMemo(
    () => [...visits].sort((a, b) => b.weekOf.localeCompare(a.weekOf)),
    [visits]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState<CircuitVisitType | null>(null);
  const [saveStatus, setSaveStatus] = useState<CircuitVisitSaveStatus>('idle');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selección por defecto: la visita más próxima a hoy (o la primera).
  useEffect(() => {
    if (selectedId && sortedVisits.some((v) => v.id === selectedId)) return;
    setSelectedId(sortedVisits[0]?.id ?? null);
  }, [sortedVisits, selectedId]);

  // Sincroniza el borrador editable cuando cambia la visita seleccionada,
  // tomando la versión del store (no se pisa mientras editas la misma).
  useEffect(() => {
    const fromStore = sortedVisits.find((v) => v.id === selectedId) ?? null;
    setWorking((prev) =>
      prev && prev.id === selectedId ? prev : fromStore
    );
  }, [selectedId, sortedVisits]);

  const flushSave = useCallback((record: CircuitVisitType) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (savedResetTimer.current) clearTimeout(savedResetTimer.current);

    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await dbCircuitVisitSave(record);
        setSaveStatus('saved');
        savedResetTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        setSaveStatus('error');
        console.error(error);
        displaySnackNotification({
          header: 'Error',
          message: 'No se pudo guardar el cambio. Revisa tu conexión.',
          severity: 'error',
        });
      }
    }, AUTOSAVE_MS);
  }, []);

  // Aplica un cambio al borrador y agenda el guardado.
  const patch = useCallback(
    (changes: Partial<CircuitVisitType>) => {
      setWorking((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...changes };
        flushSave(next);
        return next;
      });
    },
    [flushSave]
  );

  // dbCircuitVisitSave/dbCircuitVisitDelete ya proyectan (y revierten) los
  // marcadores derivados — semana del horario, Salidas de predicación y
  // Próximos eventos — así que aquí solo hace falta guardar/borrar.
  const handleCreateVisit = useCallback(
    async (anyDateInWeek: Date) => {
      const visit = buildVisitForWeek(anyDateInWeek);

      // Esa semana ya tiene visita activa: se selecciona en vez de duplicar
      // (dos entidades con el mismo weekOf = eventos y marcas por partida
      // doble en Próximos eventos y Ajustes).
      const existing = sortedVisits.find((v) => v.weekOf === visit.weekOf);
      if (existing) {
        setSelectedId(existing.id);
        displaySnackNotification({
          header: 'Visita ya activa',
          message: 'Esa semana ya tiene una visita activa. Se ha seleccionado.',
          severity: 'success',
        });
        return existing;
      }

      const saved = await dbCircuitVisitSave(visit);
      setSelectedId(saved.id);
      setWorking(saved);
      return saved;
    },
    [sortedVisits]
  );

  // dbCircuitVisitDelete ya limpia también la entrada ligera de Ajustes
  // (settings.circuit_overseer.visits) además de revertir los marcadores.
  const handleDeleteVisit = useCallback(
    async (id: string) => {
      await dbCircuitVisitDelete(id);

      if (selectedId === id) {
        setSelectedId(null);
        setWorking(null);
      }
    },
    [selectedId]
  );

  // ── Comidas ──────────────────────────────────────────────────────────
  const addMeal = useCallback(() => {
    setWorking((prev) => {
      if (!prev) return prev;

      // Las comidas normalmente empiezan el miércoles (el martes el CO
      // llega y no suele haber comida programada) — se ofrece el primer
      // día libre desde ahí en vez de repetir siempre date_start, que antes
      // dejaba todas las comidas nuevas en el mismo día (el martes) hasta
      // que alguien las cambiaba una a una a mano.
      const usedDates = new Set(prev.meals.map((m) => m.date));
      const end = new Date(prev.date_end);
      let candidate = addDays(new Date(prev.date_start), 1);
      let defaultDate = formatDate(candidate, 'yyyy/MM/dd');

      while (candidate <= end) {
        const candidateStr = formatDate(candidate, 'yyyy/MM/dd');
        if (!usedDates.has(candidateStr)) {
          defaultDate = candidateStr;
          break;
        }
        candidate = addDays(candidate, 1);
      }

      const meal: CircuitVisitMeal = {
        id: crypto.randomUUID(),
        date: defaultDate,
        host: '',
        note: '',
      };
      const next = { ...prev, meals: [...prev.meals, meal] };
      flushSave(next);
      return next;
    });
  }, [flushSave]);

  const updateMeal = useCallback(
    (id: string, changes: Partial<CircuitVisitMeal>) => {
      setWorking((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          meals: prev.meals.map((m) => (m.id === id ? { ...m, ...changes } : m)),
        };
        flushSave(next);
        return next;
      });
    },
    [flushSave]
  );

  const removeMeal = useCallback(
    (id: string) => {
      setWorking((prev) => {
        if (!prev) return prev;
        const next = { ...prev, meals: prev.meals.filter((m) => m.id !== id) };
        flushSave(next);
        return next;
      });
    },
    [flushSave]
  );

  // ── Compañía del CO tras cada salida ────────────────────────────────
  // La predicación en sí vive en "Salidas de predicación" (service_outings);
  // aquí solo guardamos con quién sale el CO para una salida ya asignada,
  // identificada por su clave estable `${date}_${time}`.
  const upsertCompanion = useCallback(
    (outingKey: string, changes: Partial<Omit<CircuitVisitCompanion, 'outingKey'>>) => {
      setWorking((prev) => {
        if (!prev) return prev;
        const existing = prev.co_companions.find((c) => c.outingKey === outingKey);

        const updated: CircuitVisitCompanion = existing
          ? { ...existing, ...changes }
          : {
              outingKey,
              brother: '',
              withWife: false,
              activity: 'predicacion',
              spouse_companions: [],
              ...changes,
            };

        const co_companions = existing
          ? prev.co_companions.map((c) =>
              c.outingKey === outingKey ? updated : c
            )
          : [...prev.co_companions, updated];

        const next = { ...prev, co_companions };
        flushSave(next);
        return next;
      });
    },
    [flushSave]
  );

  const removeCompanion = useCallback(
    (outingKey: string) => {
      setWorking((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          co_companions: prev.co_companions.filter(
            (c) => c.outingKey !== outingKey
          ),
        };
        flushSave(next);
        return next;
      });
    },
    [flushSave]
  );

  // ── Visitas de pastoreo ──────────────────────────────────────────────
  const addShepherding = useCallback(() => {
    setWorking((prev) => {
      if (!prev) return prev;
      const visit: CircuitVisitShepherdingVisit = {
        id: crypto.randomUUID(),
        brother: '',
        elder: '',
        date: prev.date_start,
        time: '',
        note: '',
      };
      const next = {
        ...prev,
        shepherding_visits: [...(prev.shepherding_visits ?? []), visit],
      };
      flushSave(next);
      return next;
    });
  }, [flushSave]);

  const updateShepherding = useCallback(
    (id: string, changes: Partial<CircuitVisitShepherdingVisit>) => {
      setWorking((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          shepherding_visits: (prev.shepherding_visits ?? []).map((v) =>
            v.id === id ? { ...v, ...changes } : v
          ),
        };
        flushSave(next);
        return next;
      });
    },
    [flushSave]
  );

  const removeShepherding = useCallback(
    (id: string) => {
      setWorking((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          shepherding_visits: (prev.shepherding_visits ?? []).filter(
            (v) => v.id !== id
          ),
        };
        flushSave(next);
        return next;
      });
    },
    [flushSave]
  );

  // ── Reuniones especiales ─────────────────────────────────────────────
  const updateSpecialMeeting = useCallback(
    (
      key: 'meeting_pioneers' | 'meeting_elders',
      value: CircuitVisitSpecialMeeting
    ) => {
      patch({ [key]: value } as Partial<CircuitVisitType>);
    },
    [patch]
  );

  // ── Exportar PDF ─────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    if (!working) return;

    const weekRecord = outingsList.find((r) => r.weekOf === working.weekOf);

    // Mismos turnos derivados que muestra la sección de predicación de la
    // página (configuración de la congregación, sin exigir hermano
    // asignado). El lunes es anterior a que el CO llegue.
    const preachingRows = deriveWeekOutingSlots(outingsSettings, weekRecord, working.weekOf)
      .filter((o) => !o.cancelled && o.date >= working.date_start)
      .map((o) => {
        const outingKey = `${o.date}_${o.time}`;
        const companion = working.co_companions.find(
          (c) => c.outingKey === outingKey
        );

        const companionPerson = companion?.brother
          ? personsStateFind(companion.brother)
          : undefined;
        const companionName = companionPerson
          ? personGetDisplayName(companionPerson, displayNameEnabled, fullnameOption)
          : '';

        const spouseNames = (companion?.spouse_companions ?? [])
          .map((uid) => {
            const p = personsStateFind(uid);
            return p ? personGetDisplayName(p, displayNameEnabled, fullnameOption) : '';
          })
          .filter(Boolean)
          .join(', ');

        return {
          date: o.date,
          time: o.time,
          location: o.location,
          companionName: companionName,
          spouseCompanions: spouseNames,
        };
      })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    // El PDF mostraba el uid en bruto del anfitrión (ej. "e992044-676c-...")
    // en vez de su nombre — meal.host nunca se resolvía contra persons,
    // a diferencia de preachingRows arriba. Mismo criterio que ya usa
    // CircuitVisitSummary.tsx en pantalla (findPersonName).
    const findPersonName = (uid: string) => {
      if (!uid) return '';
      const person = personsStateFind(uid);
      return person ? personGetDisplayName(person, displayNameEnabled, fullnameOption) : '';
    };

    const mealsRows = working.meals.map((meal) => ({
      date: meal.date,
      hostName: findPersonName(meal.host),
      note: meal.note,
    }));

    // Las visitas de pastoreo no salían en el PDF en absoluto.
    const shepherdingRows = (working.shepherding_visits ?? [])
      .map((sv) => ({
        date: sv.date,
        time: sv.time,
        brotherName: findPersonName(sv.brother),
        elderName: findPersonName(sv.elder),
      }))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    const { effectiveCoName, effectiveCoSpouseName } = getEffectiveCoName(
      working,
      coName,
      coSpouseName
    );

    const blob = await pdf(
      <CircuitVisitProgramDoc
        visit={working}
        coName={effectiveCoName}
        coSpouseName={effectiveCoSpouseName}
        congregation={congName}
        lang={jwLang}
        mealsRows={mealsRows}
        shepherdingRows={shepherdingRows}
        preachingRows={preachingRows}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Visita_CO_${working.weekOf.replace(/\//g, '-')}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }, [working, coName, coSpouseName, congName, jwLang, outingsList, outingsSettings, displayNameEnabled, fullnameOption]);

  return {
    visits: sortedVisits,
    selectedId,
    setSelectedId,
    working,
    saveStatus,
    hasVisits: sortedVisits.length > 0,
    handleCreateVisit,
    handleDeleteVisit,
    patch,
    addMeal,
    updateMeal,
    removeMeal,
    upsertCompanion,
    removeCompanion,
    addShepherding,
    updateShepherding,
    removeShepherding,
    updateSpecialMeeting,
    handleExportPdf,
  };
};

export default useCircuitVisitDashboard;
