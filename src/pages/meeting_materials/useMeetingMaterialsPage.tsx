import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { sourcesState } from '@states/sources';
import {
  sourcesJWAutoImportFrequencyState,
  sourcesJWAutoImportState,
} from '@states/settings';
import { STORAGE_KEY } from '@constants/index';
import { addWeeks, formatDate, getWeekDate } from '@utils/date';
import {
  agruparPorBimestre,
  bimestreDeMes,
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

  const bimestres = useMemo(() => agruparPorBimestre(sources), [sources]);

  /**
   * Lo vigente es el bimestre en curso y los que vienen; lo demás es historia.
   * Se separan aquí para que la página enseñe primero lo único que se
   * consulta y deje lo viejo plegado.
   */
  const { vigentes, anteriores } = useMemo(() => {
    const hoy = new Date();
    const actual = `${hoy.getFullYear()}-${bimestreDeMes(hoy.getMonth() + 1)}`;

    const esAnterior = (id: string) => {
      const [anioA, bimA] = id.split('-').map(Number);
      const [anioB, bimB] = actual.split('-').map(Number);

      return anioA === anioB ? bimA < bimB : anioA < anioB;
    };

    return {
      vigentes: bimestres.filter((grupo) => !esAnterior(grupo.id)),
      anteriores: bimestres.filter((grupo) => esAnterior(grupo.id)),
    };
  }, [bimestres]);

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
    bimestres,
    vigentes,
    anteriores,
    semanasQueFaltan,
    autoImport,
    autoImportFrequency,
    proximaAutomatica,
    semanasVigiladas: SEMANAS_VIGILADAS,
  };
};

export default useMeetingMaterialsPage;
