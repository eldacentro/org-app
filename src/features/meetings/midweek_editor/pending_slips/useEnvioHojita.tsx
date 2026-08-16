import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import { AssignmentFieldType } from '@definition/assignment';
import { PendingSlip } from '@services/app/pending_s89';
import {
  schedulesGetMeetingDate,
  schedulesS89DataForAssignment,
  schedulesToggleAssignmentSent,
} from '@services/app/schedules';
import {
  componerMensajeHojita,
  limpiarPasaje,
  limpiarTituloParte,
} from '@services/app/mensaje_hojita';
import { compartirPDF } from '@services/app/compartir_pdf';
import { TemplateS89 } from '@views/index';
import { personsState } from '@states/persons';
import { schedulesState } from '@states/schedules';
import { sourcesState } from '@states/sources';
import {
  displayNameMeetingsEnableState,
  fullnameOptionState,
  JWLangLocaleState,
  JWLangState,
  midweekMeetingClassCountState,
  userDataViewState,
} from '@states/settings';
import { personGetDisplayName } from '@utils/common';
import { enlaceWhatsApp, normalizarTelefono } from '@utils/telefono';
import { fmtDiaLargo } from '@utils/nombres_fecha';
import { diaArchivo, nombreArchivo } from '@utils/nombre_pdf';

/**
 * Todo lo que hace falta para mandar UNA hojita.
 *
 * Junta cuatro cosas que ya existían por separado —quién es la persona, qué
 * dice su S-89, cómo se compone el mensaje y cómo se comparte un PDF— y no
 * añade ninguna regla nueva sobre el formulario: la hoja se genera con la MISMA
 * plantilla y los MISMOS datos que el botón de exportar de cada fila. Aquí solo
 * cambia a dónde va el fichero.
 *
 * El PDF se genera al abrir, no al pulsar. Ver `compartirPDF`: en iOS, generar
 * dentro del gesto lo invalida y compartir falla con `NotAllowedError`.
 */
const useEnvioHojita = (slip: PendingSlip | null) => {
  const persons = useAtomValue(personsState);
  const schedules = useAtomValue(schedulesState);
  const sources = useAtomValue(sourcesState);
  const lang = useAtomValue(JWLangState);
  const sourceLocale = useAtomValue(JWLangLocaleState);
  const dataView = useAtomValue(userDataViewState);
  const classCount = useAtomValue(midweekMeetingClassCountState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const fullnameOption = useAtomValue(fullnameOptionState);

  const [blob, setBlob] = useState<Blob | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);

  const schedule = useMemo(
    () => schedules.find((record) => record.weekOf === slip?.weekOf),
    [schedules, slip?.weekOf]
  );

  /**
   * La asignación del ESTUDIANTE, venga la fila de quien venga.
   *
   * Un ayudante no tiene hoja propia —su nombre va dentro de la del estudiante,
   * en la casilla «Ayudante»—, así que la hoja que se comparte es la misma. Es
   * lo que ya hacía el botón de exportar de la fila del ayudante.
   */
  const asignacionEstudiante = useMemo(() => {
    if (!slip) return null;

    return (
      slip.papel === 'ayudante'
        ? slip.assignment.replace('Assistant', 'Student')
        : slip.assignment
    ) as AssignmentFieldType;
  }, [slip]);

  const s89 = useMemo(() => {
    if (!schedule || !asignacionEstudiante) return null;

    return schedulesS89DataForAssignment(
      schedule,
      dataView,
      asignacionEstudiante
    );
  }, [schedule, dataView, asignacionEstudiante]);

  const persona = useMemo(
    () => persons.find((record) => record.person_uid === slip?.person),
    [persons, slip?.person]
  );

  const nombre = useMemo(() => {
    if (!persona) return '';

    return persona.person_data.person_firstname.value;
  }, [persona]);

  const nombreCompleto = useMemo(() => {
    if (!persona) return '';

    return personGetDisplayName(persona, displayNameEnabled, fullnameOption);
  }, [persona, displayNameEnabled, fullnameOption]);

  /**
   * El teléfono, o `null` si no hay ninguno que valga.
   *
   * `null` no apaga nada ni hace fallar el botón: cambia lo que se ofrece —se
   * puede compartir el PDF igual, solo que eligiendo el contacto a mano— y se
   * dice en la propia fila antes de pulsar.
   */
  const telefono = useMemo(
    () => normalizarTelefono(persona?.person_data.phone.value),
    [persona]
  );

  const mensaje = useMemo(() => {
    if (!slip || !s89 || !nombre) return '';

    const source = sources.find((record) => record.weekOf === slip.weekOf);

    // Qué se dice de la parte, sacado del material de la semana. Para la
    // LECTURA es el pasaje —su título es «Lectura de la Biblia», que no añade
    // nada a «la parte 3», y lo que hace falta saber es qué se lee—; para las
    // demás, el nombre de la parte. Los dos vienen sucios del material: el
    // título con su número delante y el pasaje con la lección detrás.
    const esLectura = Boolean(
      asignacionEstudiante?.includes('TGWBibleReading')
    );

    const partKey = esLectura
      ? 'tgw_bible_reading'
      : `ayf_part${asignacionEstudiante?.match(/\d+/)?.at(0)}`;

    const parteSource = source?.midweek_meeting?.[partKey];

    const tituloParte = esLectura
      ? (limpiarPasaje(parteSource?.src?.[lang]) ??
        limpiarTituloParte(parteSource?.title?.[lang]))
      : limpiarTituloParte(parteSource?.title?.[lang]);

    // El día de la reunión, no el lunes de la semana.
    const { date } = schedulesGetMeetingDate({
      week: slip.weekOf,
      meeting: 'midweek',
      dataView,
    });

    // En español y en minúscula porque van DENTRO de la frase (DESIGN_SYSTEM
    // §5). No salen del diccionario a propósito: el mensaje entero está escrito
    // en español, y `t('tr_mainHall')` devolvería «Sala principal» con su
    // mayúscula, que a mitad de frase está mal — y bajarla con `.toLowerCase()`
    // es justo lo que el sistema de diseño prohíbe.
    //
    // Con una sola sala no se menciona ninguna: decir «en la sala principal»
    // donde no hay otra es ruido.
    const sala =
      classCount === 1
        ? undefined
        : slip.assignment.endsWith('_B')
          ? 'sala auxiliar'
          : 'sala principal';

    const estudiante =
      slip.papel === 'ayudante'
        ? persons.find((record) => record.person_uid === slip.ayudaA)
        : undefined;

    return componerMensajeHojita({
      nombre,
      papel: slip.papel,
      parte: s89.part_number,
      tituloParte,
      fecha: fmtDiaLargo(date || slip.weekOf),
      sala,
      estudiante: estudiante
        ? personGetDisplayName(estudiante, displayNameEnabled, fullnameOption)
        : // Sin ficha del estudiante queda el nombre desnormalizado que la
          // propia hoja ya lleva impreso, que es mejor que no decir de quién
          // es la parte.
          s89.student_name || undefined,
    });
  }, [
    slip,
    s89,
    nombre,
    sources,
    asignacionEstudiante,
    lang,
    dataView,
    classCount,
    persons,
    displayNameEnabled,
    fullnameOption,
  ]);

  const enlace = useMemo(() => {
    if (!telefono || !mensaje) return null;

    return enlaceWhatsApp(telefono, mensaje);
  }, [telefono, mensaje]);

  /**
   * QUÉ hojita es, en una cadena estable.
   *
   * El PDF se rehace cuando cambia esto, y NO cuando cambia el objeto `s89`.
   * Son cosas distintas: `s89` se reconstruye entero cada vez que cambia el
   * array de programas —o sea, en cada sincronización— y además estrena un `id`
   * nuevo por `crypto.randomUUID()`, así que nunca es igual al anterior aunque
   * diga exactamente lo mismo.
   *
   * Con `s89` de dependencia, una sincronización de fondo en mitad de la cola
   * volvía a generar el PDF: el botón de compartir se apagaba medio segundo
   * justo cuando alguien iba a pulsarlo. Es el mismo filo que ya está escrito
   * en CLAUDE.md —guardar lo que no ha cambiado despierta a `useLiveQuery`—,
   * visto por el otro lado.
   */
  const claveHoja = slip
    ? `${slip.weekOf}|${asignacionEstudiante}|${dataView}|${sourceLocale}`
    : null;

  const s89Ref = useRef(s89);
  s89Ref.current = s89;

  // El PDF, preparado en cuanto se abre la hoja de envío. Ver el comentario de
  // arriba del hook: hacerlo dentro del toque rompe el envío en iOS.
  useEffect(() => {
    const datos = s89Ref.current;

    if (!datos) {
      setBlob(null);
      return;
    }

    let cancelado = false;

    setPreparando(true);
    setBlob(null);

    pdf(<TemplateS89 data={datos} lang={sourceLocale} />)
      .toBlob()
      .then((generado) => {
        if (!cancelado) setBlob(generado);
      })
      .catch((error) => {
        console.error('No se ha podido preparar la hojita:', error);
      })
      .finally(() => {
        if (!cancelado) setPreparando(false);
      });

    return () => {
      cancelado = true;
    };
    // `s89` a propósito FUERA: cambia de identidad en cada sincronización sin
    // cambiar de contenido, y se lee por referencia. Ver `claveHoja`.
  }, [claveHoja, sourceLocale]);

  const marcarEnviada = async (enviada: boolean) => {
    if (!schedule || !slip) return;

    await schedulesToggleAssignmentSent(schedule, slip.assignment, enviada);
  };

  const compartir = async () => {
    if (!blob || !s89 || compartiendo) return 'error';

    setCompartiendo(true);

    try {
      // La marca la pone la propia función de compartir, y solo si el fichero
      // ha salido de verdad: cerrar la hoja del sistema sin elegir destino deja
      // la hojita como estaba.
      return await compartirPDF({
        blob,
        nombre: nombreArchivo(
          'S-89',
          `${diaArchivo(s89.weekOf)} ${s89.student_name}`
        ),
        titulo: `Hojita de ${nombreCompleto || s89.student_name}`,
        alCompartir: () => marcarEnviada(true),
      });
    } finally {
      setCompartiendo(false);
    }
  };

  return {
    nombre,
    nombreCompleto,
    telefono,
    mensaje,
    enlace,
    listo: Boolean(blob),
    preparando,
    compartiendo,
    compartir,
    marcarEnviada,
  };
};

export default useEnvioHojita;
