import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { Week } from '@definition/week_type';
import { MidweekExportType, PDFBlobType } from './index.types';
import { displaySnackNotification } from '@services/states/app';
import { getMessageByCode } from '@services/i18n/translation';
import { useAtom, useAtomValue } from 'jotai';
import { S89TemplateState, schedulesState } from '@states/schedules';
import {
  MidweekMeetingDataType,
  S89DataType,
  S89TemplateType,
  SchedWeekType,
} from '@definition/schedules';
import {
  schedulesMidweekData,
  schedulesS89Data,
} from '@services/app/schedules';
import {
  displayNameMeetingsEnableState,
  JWLangLocaleState,
  JWLangState,
  meetingExactDateState,
  midweekMeetingClassCountState,
  midweekMeetingWeekdayState,
  userDataViewState,
  pdfExportEnabledState,
} from '@states/settings';
import {
  TemplateS140AppNormal,
  TemplateS89,
  TemplateS89Doc4in1,
} from '@views/index';
import { cookiesConsentState } from '@states/app';
import { addDays } from '@utils/date';
import { headerForScheduleState } from '@states/field_service_groups';
import { WEEK_TYPE_NO_MEETING } from '@constants/index';
import { sourcesState } from '@states/sources';
import { diaArchivo, nombreArchivo, rangoArchivo } from '@utils/nombre_pdf';

const useMidweekExport = (
  onClose: MidweekExportType['onClose'],
  /** Puesta cuando se abre desde «Programas semanales». Ver `shouldExportS89`. */
  semanaBase?: MidweekExportType['semanaBase']
) => {
  const [S89Template, setS89Template] = useAtom(S89TemplateState);

  const pdfExportEnabled = useAtomValue(pdfExportEnabledState);
  const schedules = useAtomValue(schedulesState);
  const dataView = useAtomValue(userDataViewState);
  const lang = useAtomValue(JWLangState);
  const class_count = useAtomValue(midweekMeetingClassCountState);
  const cong_name = useAtomValue(headerForScheduleState);
  const displayNameEnabled = useAtomValue(displayNameMeetingsEnableState);
  const cookiesConsent = useAtomValue(cookiesConsentState);
  const sourceLocale = useAtomValue(JWLangLocaleState);
  const meetingExactDate = useAtomValue(meetingExactDateState);
  const midweekDay = useAtomValue(midweekMeetingWeekdayState);
  const sources = useAtomValue(sourcesState);

  const [startWeek, setStartWeek] = useState('');
  const [endWeek, setEndWeek] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportS140, setExportS140] = useState(false);
  const [exportS89, setExportS89] = useState(false);

  // Las dos casillas: cada una se marca o no, y se sacan las que se marquen.
  // Sacar el programa no arrastra las hojitas, ni al revés.
  //
  // Con la exportación a PDF apagada no hay casillas que marcar y lo único que
  // sale son las hojitas, así que ahí se da por marcada.
  const shouldExportS140 = pdfExportEnabled && exportS140;
  // Desde «Programas semanales» NUNCA salen las hojitas, y se dice aquí y no
  // solo escondiendo la casilla: ahí abajo hay un `: true` que las daría por
  // pedidas si alguien apagase el interruptor general con el diálogo abierto.
  // Que dependa de una cadena de condiciones algo que el usuario ha pedido dos
  // veces que no salga es buscarse un fallo.
  const shouldExportS89 = semanaBase
    ? false
    : pdfExportEnabled
      ? exportS89
      : true;

  const handleSetStartWeek = (value: string) => setStartWeek(value);

  const handleSetEndWeek = (value: string) => setEndWeek(value);

  const handleToggleS140 = () => setExportS140((prev) => !prev);

  const handleToggleS89 = () => setExportS89((prev) => !prev);

  const handleSelectS89Template = (template: S89TemplateType) => {
    setS89Template(template);

    if (cookiesConsent) {
      localStorage.setItem('organized_template_S89', template);
    }
  };

  const handleExportS89 = async (weeks: SchedWeekType[]) => {
    const S89: S89DataType[] = [];

    for (const schedule of weeks) {
      // Con el material de la semana, para no imprimir una S-89 de una parte
      // de «Análisis»: esas las dirige un hermano, no un estudiante.
      const data = schedulesS89Data(
        schedule,
        dataView,
        sources.find((record) => record.weekOf === schedule.weekOf),
        lang
      );
      S89.push(...data);
    }

    if (S89.length > 0) {
      if (S89Template === 'S89_4x1') {
        const blob = await pdf(
          <TemplateS89Doc4in1 s89Data={S89} lang={sourceLocale} />
        ).toBlob();

        const filename = nombreArchivo(
          'S-89',
          rangoArchivo(S89.at(0).weekOf, S89.at(-1).weekOf)
        );

        saveAs(blob, filename);
      }

      if (S89Template === 'S89_1x1') {
        const pdfBlobs: PDFBlobType[] = [];

        for await (const data of S89) {
          const blob = await pdf(
            <TemplateS89 data={data} lang={sourceLocale} />
          ).toBlob();

          const filename = nombreArchivo(
            'S-89',
            `${diaArchivo(data.weekOf)} ${data.student_name}`
          );

          pdfBlobs.push({ pdfBlob: blob, filename });
        }

        const zip = new JSZip();

        pdfBlobs.forEach((blob) => {
          zip.file(blob.filename, blob.pdfBlob);
        });

        const content = await zip.generateAsync({ type: 'blob' });

        saveAs(
          content,
          nombreArchivo(
            'S-89',
            rangoArchivo(S89.at(0).weekOf, S89.at(-1).weekOf),
            'zip'
          )
        );
      }
    }

    // Cuántas hojitas han salido. Cero es un resultado legítimo —una semana sin
    // estudiantes asignados— y hay que poder decirlo, que hasta ahora el
    // diálogo se cerraba sin más.
    return S89.length;
  };

  const handleExportS140 = async (weeks: SchedWeekType[]) => {
    const S140: MidweekMeetingDataType[] = [];

    for (const schedule of weeks) {
      const data = schedulesMidweekData(schedule, dataView, lang);
      S140.push(data);
    }

    if (S140.length > 0) {
      const blob = await pdf(
        <TemplateS140AppNormal
          class_count={class_count}
          cong_name={cong_name}
          data={S140}
          fullname={!displayNameEnabled}
          lang={sourceLocale}
        />
      ).toBlob();

      // Si la congregación imprime con la fecha exacta de la reunión, el
      // archivo se nombra con ese día y no con el lunes de la semana.
      const toAdd = meetingExactDate ? midweekDay : 0;

      const filename = nombreArchivo(
        'Programa de la reunión de entre semana',
        rangoArchivo(
          addDays(S140.at(0).weekOf, toAdd),
          addDays(S140.at(-1).weekOf, toAdd)
        )
      );

      saveAs(blob, filename);
    }

    return S140.length;
  };

  const handleExportSchedule = async () => {
    if (isProcessing) return;

    // El botón no se apaga nunca, así que lo que falte se dice aquí en vez de
    // no hacer nada — que era el fallo original: pulsar «Exportar» sin haber
    // elegido cerraba el diálogo sin decir palabra.
    if (startWeek.length === 0 || endWeek.length === 0) {
      displaySnackNotification({
        header: 'Faltan las semanas',
        message: 'Elige la semana de inicio y la de fin para poder exportar.',
        // Solo hay 'success' | 'error' | 'message-with-button'; no hay aviso.
        severity: 'error',
      });

      return;
    }

    if (!shouldExportS140 && !shouldExportS89) {
      displaySnackNotification({
        header: 'No has elegido qué exportar',
        message:
          'Marca el programa, las hojitas de asignación, o las dos cosas.',
        severity: 'error',
      });

      return;
    }

    try {
      setIsProcessing(true);

      // get affected weeks list
      const weeksList = schedules.filter((schedule) => {
        const normStart = startWeek.replace(/\//g, '-');
        const normEnd = endWeek.replace(/\//g, '-');
        const normWeek = schedule.weekOf.replace(/\//g, '-');
        const isValid = normWeek >= normStart && normWeek <= normEnd;

        if (!isValid) return false;

        const source = sources.find((src) => src.weekOf === schedule.weekOf)!;

        if (!source.midweek_meeting.week_date_locale[lang]) return false;

        if (dataView !== 'main') {
          const weekType =
            schedule.midweek_meeting.week_type.find(
              (record) => record.type === dataView
            )?.value ?? Week.NORMAL;

          const noMeeting = WEEK_TYPE_NO_MEETING.includes(weekType);

          return !noMeeting;
        }

        return isValid;
      });

      // Solo lo que se haya marcado.
      const hojitas = shouldExportS89 ? await handleExportS89(weeksList) : 0;
      const programas = shouldExportS140
        ? await handleExportS140(weeksList)
        : 0;

      setIsProcessing(false);

      // Marcado sí, pero el rango no tiene nada dentro: ni una semana con
      // programa, ni un estudiante asignado. Antes el diálogo se cerraba en
      // silencio y parecía que había fallado la descarga.
      if (hojitas === 0 && programas === 0) {
        const falta = [
          shouldExportS140 ? 'programa' : '',
          shouldExportS89 ? 'estudiantes asignados' : '',
        ].filter(Boolean);

        displaySnackNotification({
          header: 'No hay nada que exportar',
          message: `Ninguna semana de ese rango tiene ${falta.join(' ni ')}.`,
          severity: 'error',
        });

        return;
      }

      onClose?.();
    } catch (error) {
      console.error(error);

      setIsProcessing(false);
      onClose?.();

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  return {
    handleSetStartWeek,
    handleSetEndWeek,
    isProcessing,
    handleExportSchedule,
    exportS140,
    exportS89,
    handleToggleS140,
    handleToggleS89,
    S89Template,
    handleSelectS89Template,
  };
};

export default useMidweekExport;
