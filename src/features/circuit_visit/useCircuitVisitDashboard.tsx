import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { circuitVisitsState } from '@states/circuit_visit';
import {
  COFullnameState,
  JWLangState,
  displayNameMeetingsEnableState,
  fullnameOptionState,
} from '@states/settings';
import { serviceOutingsListState } from '@states/service_outings';
import { personsStateFind } from '@services/states/persons';
import { personGetDisplayName } from '@utils/common';
import CircuitVisitProgramDoc from '@views/circuit_visit';
import {
  CircuitVisitType,
  CircuitVisitMeal,
  CircuitVisitCompanion,
  CircuitVisitSpecialMeeting,
} from '@definition/circuit_visit';
import {
  dbCircuitVisitSave,
  dbCircuitVisitDelete,
} from '@services/dexie/circuit_visit';
import { addDays, formatDate, getWeekDate } from '@utils/date';

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
    meals: [],
    co_companions: [],
    meeting_pioneers: null,
    meeting_elders: null,
    accounting_note: '',
  };
};

const useCircuitVisitDashboard = () => {
  const visits = useAtomValue(circuitVisitsState);
  const coName = useAtomValue(COFullnameState);
  const jwLang = useAtomValue(JWLangState);
  const outingsList = useAtomValue(serviceOutingsListState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  // Más recientes primero.
  const sortedVisits = useMemo(
    () => [...visits].sort((a, b) => b.weekOf.localeCompare(a.weekOf)),
    [visits]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [working, setWorking] = useState<CircuitVisitType | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    saveTimer.current = setTimeout(() => {
      dbCircuitVisitSave(record);
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

        return {
          date: o.date,
          time: o.time,
          location: o.location,
          companionName: companion
            ? `${companionName}${companion.withWife ? ' y esposa' : ''}`
            : '',
        };
      })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    const blob = await pdf(
      <CircuitVisitProgramDoc
        visit={working}
        coName={coName}
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
  }, [working, coName, jwLang, outingsList, displayNameEnabled, fullnameOption]);

  return {
    visits: sortedVisits,
    selectedId,
    setSelectedId,
    working,
    hasVisits: sortedVisits.length > 0,
    handleCreateVisit,
    handleDeleteVisit,
    patch,
    addMeal,
    updateMeal,
    removeMeal,
    upsertCompanion,
    removeCompanion,
    updateSpecialMeeting,
    handleExportPdf,
  };
};

export default useCircuitVisitDashboard;
