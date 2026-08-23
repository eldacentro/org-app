import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { CongregationResponseType } from '@definition/api';
import { congCountryState } from '@states/settings';
import { incomingCongSpeakersState } from '@states/speakers_congregations';
import {
  apiFetchCongregations,
  apiFetchCountries,
} from '@services/api/congregation';
import { apiJwCongregationNumberGet } from '@services/api/app';
import { dbSpeakersCongregationsUpdate } from '@services/dexie/speakers_congregations';
import { displaySnackNotification } from '@services/states/app';
import {
  congregacionesIncompletas,
  emparejarPorNombre,
} from '@services/app/speakers_congregations';

/**
 * Cuántas se miran de una tanda.
 *
 * La búsqueda de congregaciones admite 30 peticiones cada cinco minutos, y aquí
 * se gasta una por congregación más otra para la lista de países. Pasarse no da
 * un error claro: devuelve fallos que aquí se leerían como «no encontrada», o
 * sea el peor resultado posible — parecería que jw.org no las conoce.
 *
 * Así que se cortan a 25 y SE DICE cuántas quedan. Un corte silencioso haría
 * creer que ya están todas.
 */
const POR_TANDA = 25;

/** Lo que se ha encontrado para una congregación. */
export type Hallazgo = {
  id: string;
  nombre: string;
  numero: string;
  circuito: string;
  /** Se buscó y no se pudo decidir. Se enseña para que se sepa cuáles quedan. */
  sinSuerte: boolean;
};

/**
 * Rellenar el número y el circuito que faltan en el catálogo.
 *
 * DE DÓNDE SALE CADA COSA, que no es del mismo sitio:
 *
 *  · el CIRCUITO, de la búsqueda de congregaciones de siempre. jw.org no
 *    publica el circuito en abierto por ningún lado — comprobado.
 *  · el NÚMERO, de jw.org, que lo escribe dentro del nombre («Elda - Centro
 *    (9357)»). La búsqueda de congregaciones no lo devuelve.
 *
 * SE BUSCA POR NOMBRE, y no por identificador, porque de estas congregaciones no
 * guardamos ninguno: se añadieron antes de que esto existiera. Por eso se exige
 * que el nombre coincida EXACTAMENTE y que haya una sola: ver
 * `emparejarPorNombre`.
 *
 * Y POR NUESTRO PAÍS. La búsqueda pide país, y de estas congregaciones tampoco
 * guardamos el suyo. El de la congregación es la única respuesta razonable —un
 * catálogo de oradores es del circuito y de los de al lado—, y la de otro país
 * simplemente no se encuentra y se dice.
 *
 * NADA SE GUARDA SOLO. Se busca, se enseña lo encontrado y decide una persona.
 * Y solo se rellenan huecos: lo que ya tiene valor no se toca, ni aunque jw.org
 * diga otra cosa, porque puede haberlo escrito alguien a propósito.
 */
const useCompletar = () => {
  const congregaciones = useAtomValue(incomingCongSpeakersState);
  const countryCode = useAtomValue(congCountryState);

  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [hallazgos, setHallazgos] = useState<Hallazgo[] | null>(null);

  const incompletas = useMemo(
    () => congregacionesIncompletas(congregaciones),
    [congregaciones]
  );

  const encontradas = (hallazgos ?? []).filter((h) => !h.sinSuerte);
  const perdidas = (hallazgos ?? []).filter((h) => h.sinSuerte);

  /** Las que no han entrado en esta tanda. Ver `POR_TANDA`. */
  const pendientes = Math.max(0, incompletas.length - POR_TANDA);

  const handleBuscar = async () => {
    if (buscando) return;

    try {
      setBuscando(true);
      setHallazgos(null);

      // La búsqueda pide el identificador del país, no su código de tres
      // letras, que es lo que tenemos guardado.
      const { data: paises } = await apiFetchCountries();

      // `Array.isArray` y no `?? []`: si la petición falla, aquí llega el objeto
      // de error del servidor y `.find` sobre eso revienta con un mensaje que no
      // le dice nada a nadie.
      const paisGuid = (Array.isArray(paises) ? paises : []).find(
        (record) => record.countryCode === countryCode
      )?.countryGuid;

      if (!paisGuid) {
        throw new Error('error_app_congregation-search-error');
      }

      const resultados: Hallazgo[] = [];

      // De una en una y no todas a la vez: son pocas, y la búsqueda de
      // congregaciones tiene un límite por minuto que un puñado de peticiones
      // simultáneas se lleva por delante.
      for (const falta of incompletas.slice(0, POR_TANDA)) {
        const { data } = await apiFetchCongregations(paisGuid, falta.nombre);

        const encontrada = emparejarPorNombre<CongregationResponseType>(
          falta.nombre,
          data ?? []
        );

        if (!encontrada) {
          resultados.push({
            id: falta.id,
            nombre: falta.nombre,
            numero: '',
            circuito: '',
            sinSuerte: true,
          });

          continue;
        }

        const circuito = falta.faltaCircuito ? encontrada.circuit || '' : '';

        let numero = '';

        if (falta.faltaNumero && encontrada.congGuid) {
          // Si jw.org no contesta, el circuito sigue valiendo: se guarda lo que
          // haya en vez de perder también lo que sí se sabe.
          numero = await apiJwCongregationNumberGet(encontrada.congGuid).catch(
            () => ''
          );
        }

        resultados.push({
          id: falta.id,
          nombre: falta.nombre,
          numero,
          circuito,
          sinSuerte: !numero && !circuito,
        });
      }

      setHallazgos(resultados);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        severity: 'error',
        header: 'No se ha podido buscar',
        message:
          'No se ha podido consultar la lista de congregaciones. Comprueba la conexión y vuelve a intentarlo.',
      });
    } finally {
      setBuscando(false);
    }
  };

  const handleGuardar = async () => {
    if (guardando || encontradas.length === 0) return;

    try {
      setGuardando(true);

      const ahora = new Date().toISOString();

      for (const hallazgo of encontradas) {
        const cambios: Record<string, unknown> = {};

        // Cadena vacía nunca, ni `undefined`: en una tabla que se sincroniza
        // cifrada un `undefined` desaparece al empaquetar, y solo se escribe lo
        // que de verdad se ha encontrado.
        if (hallazgo.numero) {
          cambios['cong_data.cong_number'] = {
            value: hallazgo.numero,
            updatedAt: ahora,
          };
        }

        if (hallazgo.circuito) {
          cambios['cong_data.cong_circuit'] = {
            value: hallazgo.circuito,
            updatedAt: ahora,
          };
        }

        if (Object.keys(cambios).length === 0) continue;

        await dbSpeakersCongregationsUpdate(cambios, hallazgo.id);
      }

      displaySnackNotification({
        severity: 'success',
        header: 'Hecho',
        message:
          encontradas.length === 1
            ? 'Se ha completado 1 congregación.'
            : `Se han completado ${encontradas.length} congregaciones.`,
      });

      setHallazgos(null);
    } catch (error) {
      console.error(error);

      displaySnackNotification({
        severity: 'error',
        header: 'No se ha podido guardar',
        message: 'Vuelve a intentarlo.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleDescartar = () => setHallazgos(null);

  return {
    incompletas,
    hallazgos,
    encontradas,
    perdidas,
    pendientes,
    buscando,
    guardando,
    handleBuscar,
    handleGuardar,
    handleDescartar,
  };
};

export default useCompletar;
