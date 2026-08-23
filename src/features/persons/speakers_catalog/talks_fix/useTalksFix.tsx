import { useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { congIDState, userLocalUIDState } from '@states/settings';
import { personsState } from '@states/persons';
import { visitingSpeakersState } from '@states/visiting_speakers';
import { speakerOverridesState } from '@states/speaker_overrides';
import {
  correccionRedundante,
  discursosVigentes,
} from '@services/app/speaker_overrides';
import {
  borrarCorreccionOrador,
  guardarCorreccionOrador,
} from '@services/firebase/speaker_overrides';
import { VisitingSpeakerType } from '@definition/visiting_speakers';
import { displaySnackNotification } from '@services/states/app';

/**
 * Leer una lista de discursos escrita a mano.
 *
 * Se acepta cualquier separador —coma, espacio, punto y coma, salto de línea—
 * porque esto llega por WhatsApp escrito de veinte maneras distintas, y pelear
 * con el formato no aporta nada. Se ordena y se quitan los repetidos.
 */
export const leerNumeros = (texto: string): number[] => {
  const numeros = (texto ?? '')
    .split(/[^0-9]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 999);

  return [...new Set(numeros)].sort((a, b) => a - b);
};

const useTalksFix = (speaker: VisitingSpeakerType) => {
  const congId = useAtomValue(congIDState);
  const userUID = useAtomValue(userLocalUIDState);
  const persons = useAtomValue(personsState);
  const correcciones = useAtomValue(speakerOverridesState);

  // SIN corregir: es lo que hace falta para poder enseñar qué dice el Sheet y
  // para volver a ello. El átomo de siempre ya viene con la corrección aplicada.
  const enBruto = useAtomValue(visitingSpeakersState);

  const correccion = useMemo(
    () => correcciones.find((c) => c.speakerUid === speaker.person_uid),
    [correcciones, speaker.person_uid]
  );

  const delSheet = useMemo(() => {
    const original = enBruto.find(
      (record) => record.person_uid === speaker.person_uid
    );

    return discursosVigentes(original);
  }, [enBruto, speaker.person_uid]);

  const [texto, setTexto] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const reiniciar = () => {
    setTexto(discursosVigentes(speaker).join(', '));
    setNota(correccion?.note ?? '');
  };

  useEffect(reiniciar, [speaker, correccion]);

  const nombrePropio = useMemo(() => {
    const persona = persons.find((record) => record.person_uid === userUID);

    if (!persona) return '';

    return `${persona.person_data.person_firstname.value} ${persona.person_data.person_lastname.value}`.trim();
  }, [persons, userUID]);

  const guardar = async () => {
    if (!congId || guardando) return;

    setGuardando(true);

    try {
      await guardarCorreccionOrador(congId, {
        speakerUid: speaker.person_uid,
        talks: leerNumeros(texto),
        note: nota.trim(),
        byName: nombrePropio,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('No se pudo guardar la corrección:', error);

      displaySnackNotification({
        severity: 'error',
        header: 'No se ha podido guardar la corrección',
        message: 'Comprueba la conexión y vuelve a intentarlo.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const volverAlSheet = async () => {
    if (!congId || guardando) return;

    setGuardando(true);

    try {
      await borrarCorreccionOrador(congId, speaker.person_uid);
    } catch (error) {
      console.error('No se pudo quitar la corrección:', error);

      displaySnackNotification({
        severity: 'error',
        header: 'No se ha podido quitar la corrección',
        message: 'Comprueba la conexión y vuelve a intentarlo.',
      });
    } finally {
      setGuardando(false);
    }
  };

  return {
    texto,
    setTexto,
    nota,
    setNota,
    guardando,
    correccion,
    delSheet,
    redundante: correccionRedundante(
      enBruto.find((r) => r.person_uid === speaker.person_uid),
      correccion
    ),
    guardar,
    volverAlSheet,
  };
};

export default useTalksFix;
