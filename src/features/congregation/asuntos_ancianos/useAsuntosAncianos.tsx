import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLiveQuery } from 'dexie-react-hooks';
import appDb from '@db/appDb';
import { personsActiveState, personsState } from '@states/persons';
import { fullnameOptionState, userLocalUIDState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';
import { dbAsuntoBorrar } from '@services/dexie/asuntos_ancianos';
import {
  necesidadesParaBorrar,
  ordenarPendientes,
} from '@services/app/necesidades';

/**
 * Necesidades de la congregación.
 *
 * Lee la tabla con `useLiveQuery` y NO por un átomo global a propósito: así
 * estos datos no entran en el almacén de estado de la app de quien no abre esta
 * página. En el móvil de un publicador la tabla está vacía —el servidor no se
 * la manda—, pero la promesa que se le hizo al cuerpo de ancianos se defiende
 * mejor si además nadie más la carga en memoria.
 */
const useAsuntosAncianos = () => {
  const yo = useAtomValue(userLocalUIDState);
  const persons = useAtomValue(personsState);
  const activos = useAtomValue(personsActiveState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const [pestana, setPestana] = useState(0);

  const guardados = useLiveQuery(() => appDb.asuntos_ancianos.toArray(), []);

  /** El nombre de una persona, o algo honesto si ya no está. */
  const nombreDe = useMemo(() => {
    return (person_uid: string) => {
      if (!person_uid) return '';

      const person = persons.find(
        (record) => record.person_uid === person_uid
      );

      if (!person) return 'Alguien que ya no está';

      return buildPersonFullname(
        person.person_data.person_lastname?.value ?? '',
        person.person_data.person_firstname?.value ?? '',
        fullnameOption
      );
    };
  }, [persons, fullnameOption]);

  const vivos = useMemo(
    () => (guardados ?? []).filter((asunto) => !asunto._deleted),
    [guardados]
  );

  const pendientes = useMemo(
    () => ordenarPendientes(vivos.filter((asunto) => !asunto.tratadoEl)),
    [vivos]
  );

  /** El archivo: lo último tratado primero, que es como se consulta. */
  const archivo = useMemo(() => {
    return vivos
      .filter((asunto) => asunto.tratadoEl)
      .sort((a, b) => (b.tratadoEl ?? '').localeCompare(a.tratadoEl ?? ''));
  }, [vivos]);

  // Lo que lleva en el archivo más de lo debido se borra solo, al abrir la
  // página. Con lápida, como cualquier borrado: así llega a todos.
  useEffect(() => {
    const viejas = necesidadesParaBorrar(vivos);

    if (viejas.length === 0) return;

    Promise.all(viejas.map((asunto) => dbAsuntoBorrar(asunto.id))).catch(
      (error) => console.error('No se pudo vaciar el archivo', error)
    );
  }, [vivos]);

  /**
   * Para «a quién le podría tocar»: los ancianos y siervos ministeriales en
   * activo, por nombre. Antes solo ofrecía ancianos, y muchas necesidades de la
   * congregación las lleva un siervo ministerial.
   */
  const opcionesPersonas = useMemo(() => {
    return activos
      .filter((person) =>
        (person.person_data.privileges ?? []).some((p) => {
          const privilegio =
            typeof p.privilege === 'object' && p.privilege !== null
              ? (p.privilege as { value: string }).value
              : p.privilege;

          return (
            (privilegio === 'elder' || privilegio === 'ms') &&
            p._deleted !== true &&
            !p.end_date
          );
        })
      )
      .map((person) => ({
        id: person.person_uid,
        etiqueta: buildPersonFullname(
          person.person_data.person_lastname?.value ?? '',
          person.person_data.person_firstname?.value ?? '',
          fullnameOption
        ),
      }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  }, [activos, fullnameOption]);

  return {
    cargando: guardados === undefined,
    pendientes,
    archivo,
    nombreDe,
    opcionesPersonas,
    yo,
    pestana,
    setPestana,
  };
};

export default useAsuntosAncianos;
