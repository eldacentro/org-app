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
  settingsState,
} from '@states/settings';
import { serviceOutingsListState } from '@states/service_outings';
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
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { addDays, formatDate, getWeekDate } from '@utils/date';

export type CircuitVisitSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 800;

const buildVisitForWeek = (anyDateInWeek: Date): CircuitVisitType => {
  const monday = getWeekDate(new Date(anyDateInWeek));
  const weekOf = formatDate(monday, 'yyyy/MM/dd');

  return {
    id: crypto.randomUUID(),
    _deleted: false,
    updatedAt: '',
    weekOf,
    date_start: formatDate(addDays(monday, 1), 'yyyy/MM/dd'), // martes
    date_end: formatDate(addDays(monday, 6), 'yyyy/MM/dd'), // domingo
    is_substitute: false,
    substitute_name: '',
    substitute_spouse_name: '',
    meals: [],
    co_companions: [],
    shepherding_visits: [],
    meeting_pioneers: null,
    meeting_elders: null,
    accounting_note: '',
  };
};

const useCircuitVisitDashboard = () => {
  const visits = useAtomValue(circuitVisitsState);
  const coName = useAtomValue(COFullnameState);
  const coSpouseName = useAtomValue(COSpouseNameState);
  const congName = useAtomValue(congFullnameState);
  const jwLang = useAtomValue(JWLangState);
  const outingsList = useAtomValue(serviceOutingsListState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);
  const settings = useAtomValue(settingsState);

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
  const handleCreateVisit = useCallback(async (anyDateInWeek: Date) => {
    const visit = buildVisitForWeek(anyDateInWeek);
    const saved = await dbCircuitVisitSave(visit);
    setSelectedId(saved.id);
    setWorking(saved);
    return saved;
  }, []);

  // Además de la entidad completa, limpia cualquier entrada suelta con la
  // misma semana en la lista ligera de Ajustes (settings.circuit_overseer.
  // visits) — es una fuente de datos aparte que puede quedar desincronizada
  // si esa semana también se había planificado desde ahí. El tipo de semana
  // en el horario ya lo revierte dbCircuitVisitDelete/unprojectVisit.
  const cleanupSettingsVisitEntry = useCallback(
    async (weekOf: string) => {
      if (!weekOf) return;

      const coVisits = structuredClone(
        settings.cong_settings.circuit_overseer.visits
      );

      let changed = false;
      for (const record of coVisits) {
        if (record._deleted === false && record.weekOf === weekOf) {
          record._deleted = true;
          record.updatedAt = new Date().toISOString();
          changed = true;
        }
      }

      if (!changed) return;

      await dbAppSettingsUpdate({
        'cong_settings.circuit_overseer.visits': coVisits,
      });
    },
    [settings]
  );

  const handleDeleteVisit = useCallback(
    async (id: string) => {
      const target = sortedVisits.find((v) => v.id === id);

      await dbCircuitVisitDelete(id);

      if (target) {
        await cleanupSettingsVisitEntry(target.weekOf);
      }

      if (selectedId === id) {
        setSelectedId(null);
        setWorking(null);
      }
    },
    [selectedId, sortedVisits, cleanupSettingsVisitEntry]
  );

  // ── Comidas ──────────────────────────────────────────────────────────
  const addMeal = useCallback(() => {
    setWorking((prev) => {
      if (!prev) return prev;
      const meal: CircuitVisitMeal = {
        id: crypto.randomUUID(),
        date: prev.date_start,
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

    const preachingRows = (weekRecord?.outings ?? [])
      .filter((o) => !o.cancelled && o.person)
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

    // Si es un sustituto, el programa debe mostrar su nombre, no el del CO
    // titular configurado en Ajustes — de lo contrario el PDF de esa semana
    // saldría con el nombre equivocado.
    const effectiveCoName =
      working.is_substitute && working.substitute_name
        ? working.substitute_name
        : coName;
    const effectiveCoSpouseName = working.is_substitute
      ? working.substitute_spouse_name || ''
      : coSpouseName;

    const blob = await pdf(
      <CircuitVisitProgramDoc
        visit={working}
        coName={effectiveCoName}
        coSpouseName={effectiveCoSpouseName}
        congregation={congName}
        lang={jwLang}
        preachingRows={preachingRows}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Visita_CO_${working.weekOf.replace(/\//g, '-')}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }, [working, coName, coSpouseName, congName, jwLang, outingsList, displayNameEnabled, fullnameOption]);

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
