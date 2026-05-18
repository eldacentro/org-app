import { useCallback } from 'react';
import Papa from 'papaparse';
import { useAtomValue } from 'jotai';
import { visitingSpeakersActiveState } from '@states/visiting_speakers';
import { speakersCongregationsState } from '@states/speakers_congregations';

const useSpeakersImportExport = () => {
  const speakers = useAtomValue(visitingSpeakersActiveState);
  const congregations = useAtomValue(speakersCongregationsState);

  const exportCSV = useCallback(() => {
    const exportData = speakers.map((speaker) => {
      const cong = congregations.find(
        (c) => c.id === speaker.speaker_data.cong_id
      );

      return {
        'Congregation Name': cong?.cong_data.cong_name.value || '',
        'Congregation Number': cong?.cong_data.cong_number.value || '',
        'First Name': speaker.speaker_data.person_firstname.value,
        'Last Name': speaker.speaker_data.person_lastname.value,
        'Display Name': speaker.speaker_data.person_display_name.value,
        'Elder': speaker.speaker_data.elder.value ? 'Yes' : 'No',
        'Ministerial Servant': speaker.speaker_data.ministerial_servant.value ? 'Yes' : 'No',
        'Email': speaker.speaker_data.person_email.value,
        'Phone': speaker.speaker_data.person_phone.value,
        'Local': speaker.speaker_data.local.value ? 'Yes' : 'No',
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
