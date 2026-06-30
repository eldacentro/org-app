import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { circuitVisitsState } from '@states/circuit_visit';
import { COFullnameState, JWLangState } from '@states/settings';
import CircuitVisitProgramDoc from '@views/circuit_visit';
import {
  CircuitVisitType,
  CircuitVisitMeal,
  CircuitVisitPreaching,
  CircuitVisitSpecialMeeting,
} from '@definition/circuit_visit';
import {
  dbCircuitVisitSave,
  dbCircuitVisitDelete,
} from '@services/dexie/circuit_visit';
import {
  circuitVisitMarkWeek,
  circuitVisitUnmarkWeek,
} from '@services/app/circuit_visit';
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
    preaching: [],
    meeting_pioneers: null,
    meeting_elders: null,
    accounting_note: '',
  };
};

const useCircuitVisitDashboard = () => {
  const visits = useAtomValue(circuitVisitsState);
  const coName = useAtomValue(COFullnameState);
  const jwLang = useAtomValue(JWLangState);

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

  const handleCreateVisit = useCallback(
    async (anyDateInWeek: Date) => {
      const visit = buildVisitForWeek(anyDateInWeek);
      const saved = await dbCircuitVisitSave(visit);
      await circuitVisitMarkWeek(saved.weekOf);
      setSelectedId(saved.id);
      setWorking(saved);
      return saved;
    },
    []
  );

  const handleDeleteVisit = useCallback(
    async (id: string) => {
      const visit = visits.find((v) => v.id === id);
      await dbCircuitVisitDelete(id);
      if (visit) await circuitVisitUnmarkWeek(visit.weekOf);
      if (selectedId === id) {
        setSelectedId(null);
        setWorking(null);
      }
    },
    [visits, selectedId]
  );

  // ── Comidas ──────────────────────────────────────────────────────────
  const addMeal = useCallback(() => {
    setWorking((prev) => {
      if (!prev) return prev;
      const meal: CircuitVisitMeal = {
        id: crypto.randomUUID(),
        date: prev.date_start,
        type: 'lunch',
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

  // ── Predicación ──────────────────────────────────────────────────────
  const addPreaching = useCallback(() => {
    setWorking((prev) => {
      if (!prev) return prev;
      const row: CircuitVisitPreaching = {
        id: crypto.randomUUID(),
        date: prev.date_start,
        time: '',
        meetingPoint: '',
        group: '',
        note: '',
      };
      const next = { ...prev, preaching: [...prev.preaching, row] };
      flushSave(next);
      return next;
    });
  }, [flushSave]);

  const updatePreaching = useCallback(
    (id: string, changes: Partial<CircuitVisitPreaching>) => {
      setWorking((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          preaching: prev.preaching.map((p) =>
            p.id === id ? { ...p, ...changes } : p
          ),
        };
        flushSave(next);
        return next;
      });
    },
    [flushSave]
  );

  const removePreaching = useCallback(
    (id: string) => {
      setWorking((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          preaching: prev.preaching.filter((p) => p.id !== id),
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

    const blob = await pdf(
      <CircuitVisitProgramDoc
        visit={working}
        coName={coName}
        lang={jwLang}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Visita_CO_${working.weekOf.replace(/\//g, '-')}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }, [working, coName, jwLang]);

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
    addPreaching,
    updatePreaching,
    removePreaching,
    updateSpecialMeeting,
    handleExportPdf,
  };
};

export default useCircuitVisitDashboard;
