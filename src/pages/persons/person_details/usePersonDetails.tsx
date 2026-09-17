import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAtom, useAtomValue } from 'jotai';
import { personCurrentDetailsState, personsState } from '@states/persons';
import { personSchema } from '@services/dexie/schema';
import { congAccountConnectedState } from '@states/app';
import { PersonType } from '@definition/person';
import { copiaDeTrabajoTrasCambio } from '@services/app/ficha_en_edicion';

/** Marca de «esta visita es un alta», para no confundirla con ningún uid. */
const ALTA = '::alta::';

const usePersonDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const isNewPerson = id === undefined;

  const [person, setPerson] = useAtom(personCurrentDetailsState);

  const persons = useAtomValue(personsState);
  const isConnected = useAtomValue(congAccountConnectedState);

  // QUÉ ficha hay cargada y CÓMO estaba en la base de datos al cargarla. Es lo
  // que permite distinguir «ha cambiado este hermano» de «ha cambiado la
  // tabla», que no es lo mismo: ver `copiaDeTrabajoTrasCambio`.
  const cargada = useRef<{ id: string; base: PersonType } | null>(null);

  const isBaptized = useMemo(() => {
    return person.person_data.publisher_baptized.active.value;
  }, [person]);

  const male = useMemo(() => {
    return person.person_data.male.value;
  }, [person]);

  useEffect(() => {
    if (isNewPerson) {
      // UNA vez por visita. Antes se fabricaba un esquema nuevo —con otro
      // identificador— cada vez que cambiaba la lista de personas, así que una
      // sincronización a mitad de un alta vaciaba el formulario entero.
      if (cargada.current?.id === ALTA) return;

      const newSchema = structuredClone(personSchema);
      newSchema.person_uid = crypto.randomUUID();

      cargada.current = { id: ALTA, base: newSchema };
      setPerson(newSchema);

      return;
    }

    // Evitar redirect falso mientras persons[] aún está cargando desde IndexedDB
    if (persons.length === 0) return;

    const foundPerson = persons.find((record) => record.person_uid === id);

    if (!foundPerson) {
      navigate('/persons');
      return;
    }

    const previa = cargada.current;

    // Otra ficha (o la primera carga): se toma tal cual.
    if (!previa || previa.id !== id) {
      cargada.current = { id, base: foundPerson };
      setPerson(foundPerson);

      return;
    }

    // La misma ficha y la lista ha cambiado. Casi siempre el cambio es de OTRO
    // hermano, y entonces aquí no se toca nada: lo que se está editando sin
    // guardar se queda como está.
    const base = previa.base;

    cargada.current = { id, base: foundPerson };

    setPerson((enEdicion) => {
      // La copia de trabajo es un átomo global: si por lo que sea contiene a
      // otro hermano, no hay nada que fusionar — manda la ficha de la ruta.
      if (enEdicion.person_uid !== foundPerson.person_uid) return foundPerson;

      return copiaDeTrabajoTrasCambio({
        enEdicion,
        base,
        guardada: foundPerson,
      });
    });
  }, [id, persons, navigate, isNewPerson, setPerson]);

  return { isNewPerson, isBaptized, male, isConnected };
};

export default usePersonDetails;
