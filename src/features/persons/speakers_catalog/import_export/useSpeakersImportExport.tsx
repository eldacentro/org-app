import { useCallback } from 'react';
import Papa from 'papaparse';
import { useAtomValue } from 'jotai';
import { visitingSpeakersActiveState } from '@states/visiting_speakers';
import { speakersCongregationsState } from '@states/speakers_congregations';
import { congNameState, congNumberState } from '@states/settings';
import { personsActiveState } from '@states/persons';

const useSpeakersImportExport = () => {
  const speakers = useAtomValue(visitingSpeakersActiveState);
  const congregations = useAtomValue(speakersCongregationsState);
  const homeCongName = useAtomValue(congNameState);
  const homeCongNumber = useAtomValue(congNumberState);
  const persons = useAtomValue(personsActiveState);

  const exportCSV = useCallback(() => {
    const exportData = speakers.map((speaker) => {
      const isLocal = speaker.speaker_data.local.value;
      const findPerson = isLocal
        ? persons.find((p) => p.person_uid === speaker.person_uid)
        : null;

      const cong = congregations.find(
        (c) => c.id === speaker.speaker_data.cong_id
      );

      const congName = isLocal
        ? homeCongName
        : cong?.cong_data.cong_name.value || '';
      const congNumber = isLocal
        ? '9357'
        : cong?.cong_data.cong_number.value || '';

      return {
        'Congregation Name': congName,
        'Congregation Number': congNumber,
        'First Name':
          findPerson?.person_data.person_firstname.value ||
          speaker.speaker_data.person_firstname.value,
        'Last Name':
          findPerson?.person_data.person_lastname.value ||
          speaker.speaker_data.person_lastname.value,
        'Display Name':
          findPerson?.person_data.person_display_name.value ||
          speaker.speaker_data.person_display_name.value,
        'Elder': speaker.speaker_data.elder.value ? 'Yes' : 'No',
        'Ministerial Servant': speaker.speaker_data.ministerial_servant.value
          ? 'Yes'
          : 'No',
        'Email':
          findPerson?.person_data.email.value ||
          speaker.speaker_data.person_email.value,
        'Phone':
          findPerson?.person_data.phone.value ||
          speaker.speaker_data.person_phone.value,
        'Local': isLocal ? 'Yes' : 'No',
        'Talks': speaker.speaker_data.talks.map((t) => t.talk_number).join(';'),
      };
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `speakers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  }, [speakers, congregations]);

  const downloadTemplate = useCallback(() => {
    const template = [
      {
        'Congregation Name': 'Example Congregation',
        'Congregation Number': '12345',
        'First Name': 'John',
        'Last Name': 'Doe',
        'Display Name': 'John Doe',
        'Elder': 'Yes',
        'Ministerial Servant': 'No',
        'Email': 'john.doe@example.com',
        'Phone': '+123456789',
        'Local': 'No',
        'Talks': '1;22;53',
      },
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'speakers_import_template.csv');
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return { exportCSV, downloadTemplate };
};

export default useSpeakersImportExport;
