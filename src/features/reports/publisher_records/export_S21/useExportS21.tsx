import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { pdf } from '@react-pdf/renderer';
import JSZip from 'jszip';
import { useAppTranslation } from '@hooks/index';
import { displaySnackNotification } from '@services/states/app';
import { ExportS21Props, ExportType } from './index.types';
import { getMessageByCode } from '@services/i18n/translation';
import { currentReportMonth } from '@utils/date';
import { fieldWithLanguageGroupsState } from '@states/field_service_groups';
import { FieldServiceGroupType } from '@definition/field_service_groups';
import { JWLangLocaleState } from '@states/settings';
import useCongregationCard from '@features/reports/hooks/useCongregationCard';
import usePersons from '@features/persons/hooks/usePersons';
import usePublisherCard from '@features/reports/hooks/usePublisherCard';
import TemplateS21Doc2in1 from '@views/reports/S21/2in1';
import TemplateS21DocMulti from '@views/reports/S21/multi';

const useExportS21 = ({ onClose }: ExportS21Props) => {
  const { t } = useAppTranslation();

  const {
    getPublishersActive,
    getPublishersInactive,
    getFTSMonths,
    getAPMonths,
    getPublisherMonths,
  } = usePersons();

  const { getCardsData } = usePublisherCard();

  const { getCongregationCardsData } = useCongregationCard();

  const fieldGroups = useAtomValue(fieldWithLanguageGroupsState);
  const sourceLocale = useAtomValue(JWLangLocaleState);

  const [type, setType] = useState<ExportType>('all');
  const [allOpen, setAllOpen] = useState(true);
  const [selectOpen, setSelectOpen] = useState(false);

  const month = useMemo(() => {
    return currentReportMonth();
  }, []);

  const publishers_active = useMemo(() => {
    return getPublishersActive(month);
  }, [month, getPublishersActive]);

  const publishers_FTS = useMemo(() => {
    return getFTSMonths(month);
  }, [month, getFTSMonths]);

  const publishers_AP = useMemo(() => {
    return getAPMonths(month);
  }, [month, getAPMonths]);

  const publishers_others = useMemo(() => {
    return getPublisherMonths(month);
  }, [month, getPublisherMonths]);

  const publishers_inactive = useMemo(() => {
    return getPublishersInactive(month);
  }, [month, getPublishersInactive]);

  const publishers_group = useMemo(() => {
    if (fieldGroups.length === 0) return [];

    const result: FieldServiceGroupType[] = [];

    for (const group of fieldGroups) {
      const members = group.group_data.members.filter((record) =>
        publishers_active.some(
          (person) => record.person_uid === person.person_uid
        )
      );

      if (members.length > 0) {
        const obj = structuredClone(group);

        obj.group_data.members = members;
        result.push(obj);
      }
    }

    return result.sort(
      (a, b) => a.group_data.sort_index - b.group_data.sort_index
    );
  }, [fieldGroups, publishers_active]);

  const handleChangeType = (value: ExportType) => setType(value);

  const handleExportAll = async () => {
    const zip = new JSZip();

    // get all inactive reports
    if (publishers_inactive.length > 0) {
      const inactiveZip = zip.folder(
        `02-${t('tr_inactivePublishers', { lng: sourceLocale })}`
      );

      for await (const publisher of publishers_inactive) {
        const data = getCardsData(publisher.person_uid);
        const name = `S-21_${data.at(0).name}.pdf`;

        const blob = await pdf(
          <TemplateS21Doc2in1 data={data} lang={sourceLocale} />
        ).toBlob();

        inactiveZip.file(name, blob);
      }
    }

    // get all active reports
    if (publishers_active.length > 0) {
      const activeZip = zip.folder(
        `01-${t('tr_activePublishers', { lng: sourceLocale })}`
      );

      // get FTS
      if (publishers_FTS.length > 0) {
        const ftsZip = activeZip.folder(
          t('tr_fulltimeServants', { lng: sourceLocale })
        );

        for await (const publisher of publishers_FTS) {
          const data = getCardsData(publisher.person_uid);
          const name = `S-21_${data.at(0).name}.pdf`;

          const blob = await pdf(
            <TemplateS21Doc2in1 data={data} lang={sourceLocale} />
          ).toBlob();

          ftsZip.file(name, blob);
        }
      }

      // get AP
      if (publishers_AP.length > 0) {
        const apZip = activeZip.folder(t('tr_APs', { lng: sourceLocale }));

        for await (const publisher of publishers_AP) {
          const data = getCardsData(publisher.person_uid);
          const name = `S-21_${data.at(0).name}.pdf`;

          const blob = await pdf(
            <TemplateS21Doc2in1 data={data} lang={sourceLocale} />
          ).toBlob();

          apZip.file(name, blob);
        }
      }

      // get other publishers
      if (publishers_others.length > 0) {
        const otherPubZip = activeZip.folder(
          t('tr_activePublishersAll', { lng: sourceLocale })
        );

        let index = 1;
        for await (const group of publishers_group) {
          let folderName = group.group_data.name;

          if (folderName === '') {
            folderName = t('tr_groupNumber', {
              lng: sourceLocale,
              groupNumber: index,
            });
          }

          // Remove invalid characters from folder name
          folderName = folderName.replace(/[<>:"/\\|?*]/g, '_');

          const groupZip = otherPubZip.folder(folderName);

          for await (const publisher of group.group_data.members) {
            const isPub = publishers_others.some(
              (record) => record.person_uid === publisher.person_uid
            );

            if (isPub) {
              const data = getCardsData(publisher.person_uid);
              const name = `S-21_${data.at(0).name}.pdf`;

              const blob = await pdf(
                <TemplateS21Doc2in1 data={data} lang={sourceLocale} />
              ).toBlob();

              groupZip.file(name, blob);
            }
          }

          index++;
        }
      }
    }

    // get total FTS
    const ftsData = getCongregationCardsData('FTS');
    let name = `S-21_${t('tr_fulltimeServants', { lng: sourceLocale })}.pdf`;
    let blob = await pdf(
      <TemplateS21Doc2in1 data={ftsData} lang={sourceLocale} />
    ).toBlob();
    zip.file(name, blob);

    // get total AP
    const apData = getCongregationCardsData('AP');
    name = `S-21_${t('tr_APs', { lng: sourceLocale })}.pdf`;
    blob = await pdf(
      <TemplateS21Doc2in1 data={apData} lang={sourceLocale} />
    ).toBlob();
    zip.file(name, blob);

    // get total publishers
    const pubData = getCongregationCardsData('Publishers');
    name = `S-21_${t('tr_activePublishersAll', { lng: sourceLocale })}.pdf`;
    blob = await pdf(
      <TemplateS21Doc2in1 data={pubData} lang={sourceLocale} />
    ).toBlob();
    zip.file(name, blob);

    const content = await zip.generateAsync({ type: 'blob' });

    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'EldaCentro_S-21_Cards.zip';
    link.click();
  };

  const handleExportInactive = async (values: string[]) => {
    // El árbol de selección incluye el id del nodo contenedor
    // ("inactive_all") junto con los uids reales cuando se usa
    // "Seleccionar todo" — se descarta aquí antes de buscar cada persona.
    const publisherUids = values.filter((value) =>
      publishers_inactive.some((record) => record.person_uid === value)
    );

    const publishers = publisherUids.map((person_uid) => getCardsData(person_uid));

    const blob = await pdf(
      <TemplateS21DocMulti publishers={publishers} lang={sourceLocale} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'EldaCentro_S-21_Cards_Inactives.pdf';
    link.click();
  };

  // Arma un solo Document (una página por publicador) con los publicadores
  // indicados y lo agrega al zip con el nombre dado — reemplaza el patrón
  // anterior de un archivo PDF por publicador.
  const addCombinedPdfToZip = async ({
    zip,
    fileName,
    person_uids,
  }: {
    zip: JSZip;
    fileName: string;
    person_uids: string[];
  }) => {
    if (person_uids.length === 0) return;

    const publishers = person_uids.map((person_uid) => getCardsData(person_uid));

    const blob = await pdf(
      <TemplateS21DocMulti publishers={publishers} lang={sourceLocale} />
    ).toBlob();

    zip.file(fileName, blob);
  };

  const handleExportGroups = async (values: string[]) => {
    // split by groups
    const result = publishers_group
      .map((group) => {
        const members = group.group_data.members.filter((record) =>
          values.includes(record.person_uid)
        );

        const obj = structuredClone(group);
        obj.group_data.members = members;

        return obj;
      })
      .filter((record) => record.group_data.members.length > 0);

    const zip = new JSZip();

    let index = 1;
    for await (const group of result) {
      let folderName = group.group_data.name;

      if (folderName === '') {
        folderName = t('tr_groupNumber', {
          lng: sourceLocale,
          groupNumber: index,
        });
      }

      // Remove invalid characters from folder name
      folderName = folderName.replace(/[<>:"/\\|?*]/g, '_');

      const groupMembers = group.group_data.members
        .filter((publisher) =>
          publishers_others.some(
            (record) => record.person_uid === publisher.person_uid
          )
        )
        .map((publisher) => publisher.person_uid);

      await addCombinedPdfToZip({
        zip,
        fileName: `S-21_${folderName}.pdf`,
        person_uids: groupMembers,
      });

      index++;
    }

    const content = await zip.generateAsync({ type: 'blob' });

    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'EldaCentro_S-21_Cards_Groups.zip';
    link.click();
  };

  const handleExportActive = async (values: string[]) => {
    // Los ids de la categoría "por grupos" llevan el prefijo "group:" (ver
    // useActivePublishers.tsx) — se separan aquí del resto de la selección.
    const byGroupUids = values
      .filter((value) => value.startsWith('group:'))
      .map((value) => value.slice('group:'.length));

    const FTS = publishers_FTS.filter((record) =>
      values.includes(record.person_uid)
    );

    const AP = publishers_AP.filter((record) =>
      values.includes(record.person_uid)
    );

    const publishers = publishers_others.filter((record) =>
      values.includes(record.person_uid)
    );

    const zip = new JSZip();

    await addCombinedPdfToZip({
      zip,
      fileName: `S-21_${t('tr_fulltimeServants', { lng: sourceLocale })}.pdf`,
      person_uids: FTS.map((record) => record.person_uid),
    });

    await addCombinedPdfToZip({
      zip,
      fileName: `S-21_${t('tr_APs', { lng: sourceLocale })}.pdf`,
      person_uids: AP.map((record) => record.person_uid),
    });

    await addCombinedPdfToZip({
      zip,
      fileName: `S-21_${t('tr_activePublishersAll', { lng: sourceLocale })}.pdf`,
      person_uids: publishers.map((record) => record.person_uid),
    });

    // "Todos los demás publicadores (por grupos)" — un PDF combinado por
    // cada grupo de predicación, en vez de uno solo con todos juntos.
    if (byGroupUids.length > 0) {
      const byGroupZip = zip.folder(
        t('tr_activePublishersByGroup', { lng: sourceLocale })
      );

      let index = 1;
      for await (const group of publishers_group) {
        const groupMembers = group.group_data.members
          .filter((publisher) => byGroupUids.includes(publisher.person_uid))
          .map((publisher) => publisher.person_uid);

        let folderName = group.group_data.name;

        if (folderName === '') {
          folderName = t('tr_groupNumber', {
            lng: sourceLocale,
            groupNumber: index,
          });
        }

        folderName = folderName.replace(/[<>:"/\\|?*]/g, '_');

        await addCombinedPdfToZip({
          zip: byGroupZip,
          fileName: `S-21_${folderName}.pdf`,
          person_uids: groupMembers,
        });

        index++;
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });

    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'EldaCentro_S-21_Cards_Actives.zip';
    link.click();
  };

  const handleExportCards = async (values: string[], type: string) => {
    try {
      if (type === 'all') {
        await handleExportAll();
      }

      if (type === 'inactive') {
        await handleExportInactive(values);
      }

      if (type === 'groups') {
        await handleExportGroups(values);
      }

      if (type === 'active') {
        await handleExportActive(values);
      }

      onClose?.();
    } catch (error) {
      onClose?.();

      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  // S-21 de totales de la congregación: un único PDF con las tres tarjetas
  // agregadas (siervos de tiempo completo, precursores auxiliares y
  // publicadores) — las mismas que el ZIP de "exportar todas" incluye al
  // final, pero exportables por sí solas.
  const handleExportTotals = async () => {
    const totals = [
      getCongregationCardsData('FTS'),
      getCongregationCardsData('AP'),
      getCongregationCardsData('Publishers'),
    ];

    const blob = await pdf(
      <TemplateS21DocMulti publishers={totals} lang={sourceLocale} />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'EldaCentro_S-21_Totales.pdf';
    link.click();

    onClose?.();
  };

  const handleAction = async () => {
    try {
      if (type === 'select') {
        setAllOpen(false);
        setSelectOpen(true);
      }

      if (type === 'all') {
        const selected = publishers_active.map((record) => record.person_uid);
        await handleExportCards(selected, 'all');
      }

      if (type === 'totals') {
        await handleExportTotals();
      }
    } catch (error) {
      onClose?.();

      console.error(error);

      displaySnackNotification({
        header: getMessageByCode('error_app_generic-title'),
        message: getMessageByCode(error.message),
        severity: 'error',
      });
    }
  };

  return {
    type,
    handleChangeType,
    allOpen,
    selectOpen,
    handleAction,
    handleExportCards,
  };
};

export default useExportS21;
