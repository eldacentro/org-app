import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLiveQuery } from 'dexie-react-hooks';
import appDb from '@db/appDb';
import { AsuntoAncianosType } from '@definition/asuntos_ancianos';
import { eldersActiveState, personsState } from '@states/persons';
import { fullnameOptionState, userLocalUIDState } from '@states/settings';
import { buildPersonFullname } from '@utils/common';

/**
 * El tablón del cuerpo de ancianos.
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
  const ancianos = useAtomValue(eldersActiveState);
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

  /**
   * Lo que queda por tratar.
   *
   * Orden: lo urgente arriba, y dentro de cada grupo lo MÁS VIEJO primero. Es
   * al revés de lo habitual a propósito: un tablón ordenado por lo último que
   * llegó entierra justo lo que lleva meses sin tratarse, que es lo que no
   * debería pasar nunca.
   */
  const pendientes = useMemo(() => {
    return vivos
      .filter((asunto) => !asunto.tratadoEl)
      .sort((a, b) => {
        if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;

        return (a.propuestoEl ?? '').localeCompare(b.propuestoEl ?? '');
      });
  }, [vivos]);

  /** El historial: lo último tratado primero, que es como se consulta. */
  const tratados = useMemo(() => {
    return vivos
      .filter((asunto) => asunto.tratadoEl)
      .sort((a, b) => (b.tratadoEl ?? '').localeCompare(a.tratadoEl ?? ''));
  }, [vivos]);

  /** De lo que soy responsable yo. Es el «contador» que pidió el cuerpo. */
  const mios = useMemo(
    () => pendientes.filter((asunto) => asunto.asignadoA === yo),
    [pendientes, yo]
  );

  const sinAsignar = useMemo(
    () => pendientes.filter((asunto) => !asunto.asignadoA).length,
    [pendientes]
  );

  /** Para el desplegable de «responsable»: los ancianos, por nombre. */
  const opcionesAncianos = useMemo(() => {
    return ancianos
      .map((person) => ({
        id: person.person_uid,
        etiqueta: buildPersonFullname(
          person.person_data.person_lastname?.value ?? '',
          person.person_data.person_firstname?.value ?? '',
          fullnameOption
        ),
      }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
  }, [ancianos, fullnameOption]);

  return {
    cargando: guardados === undefined,
    pendientes,
    tratados,
    mios,
    sinAsignar,
    nombreDe,
    opcionesAncianos,
    yo,
    pestana,
    setPestana,
  };
};

export type AsuntoConNombre = AsuntoAncianosType;

export default useAsuntosAncianos;
