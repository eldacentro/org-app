import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { sourcesState } from '@states/sources';
import { PeriodoMateriales } from '@services/app/meeting_materials';
import {
  sourcesJWAutoImportFrequencyState,
  sourcesJWAutoImportState,
} from '@states/settings';
import { STORAGE_KEY } from '@constants/index';
import { addWeeks, formatDate, getWeekDate } from '@utils/date';
import {
  agruparMaterial,
  semanasSinMaterial,
} from '@services/app/meeting_materials';
import useMeetingMaterials from '@pages/dashboard/meeting_materials/useMeetingMaterials';

/** Cuántas semanas por delante se vigila que haya material. */
const SEMANAS_VIGILADAS = 10;

const useMeetingMaterialsPage = () => {
  // Los dos importadores son los de siempre: esta página no reimplementa nada,
  // solo los reúne y añade lo que hasta ahora no se veía por ningún lado.
  const { handleOpenJWImport, isNavigatorOnline, handleFileSelected } =
    useMeetingMaterials();

  const sources = useAtomValue(sourcesState);
  const autoImport = useAtomValue(sourcesJWAutoImportState);
  const autoImportFrequency = useAtomValue(sourcesJWAutoImportFrequencyState);

  // Cada publicación en SU cadencia: la Guía es bimestral y La Atalaya
  // mensual (ver la cabecera de `services/app/meeting_materials`).
  const guia = useMemo(
    () => agruparMaterial(sources, 'midweek', 'bimestre'),
    [sources]
  );

  const atalaya = useMemo(
    () => agruparMaterial(sources, 'weekend', 'mes'),
    [sources]
  );

  /**
   * Lo vigente es el periodo en curso y los que vienen; lo demás es historia.
   * Se separan aquí para que la página enseñe primero lo único que se
   * consulta y deje lo viejo plegado.
   */
  const separar = (periodos: PeriodoMateriales[]) => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;

    const esAnterior = (p: PeriodoMateriales) =>
      p.year === year ? p.ultimoMes < mes : p.year < year;

    return {
      vigentes: periodos.filter((p) => !esAnterior(p)),
      anteriores: periodos.filter(esAnterior),
    };
  };

  const guiaSeparada = useMemo(() => separar(guia), [guia]);
  const atalayaSeparada = useMemo(() => separar(atalaya), [atalaya]);

  /**
   * Las semanas de aquí en adelante que no tienen material.
   *
   * Es el aviso que importa: enterarse el martes de que la semana está vacía
   * es justo lo que esta página tiene que evitar.
   */
  const semanasQueFaltan = useMemo(() => {
    const lunesActual = formatDate(getWeekDate(new Date()), 'yyyy/MM/dd');

    const previstas: string[] = [];

    for (let i = 0; i < SEMANAS_VIGILADAS; i++) {
      previstas.push(
        formatDate(addWeeks(lunesActual.replace(/\//g, '-'), i), 'yyyy/MM/dd')
      );
    }

    // Por reunión: faltar La Atalaya no es lo mismo que faltar la Guía, y
    // avisarlo en bloque esconde justo la mitad que falta.
    return {
      midweek: semanasSinMaterial(sources, previstas, 'midweek'),
      weekend: semanasSinMaterial(sources, previstas, 'weekend'),
    };
  }, [sources]);

  /** Cuándo toca la próxima importación automática, si está puesta. */
  const proximaAutomatica = useMemo(() => {
    if (!autoImport) return null;

    try {
      const guardada = localStorage.getItem(STORAGE_KEY.source_import);
      if (!guardada) return null;

      const fecha = new Date(guardada);
      if (Number.isNaN(fecha.getTime())) return null;

      return fecha;
    } catch {
      return null;
    }
  }, [autoImport]);

  return {
    handleOpenJWImport,
    isNavigatorOnline,
    handleFileSelected,
    guia: guiaSeparada,
    atalaya: atalayaSeparada,
    semanasQueFaltan,
    autoImport,
    autoImportFrequency,
    proximaAutomatica,
    semanasVigiladas: SEMANAS_VIGILADAS,
  };
};

export default useMeetingMaterialsPage;
