import { useCallback } from 'react';
import Papa from 'papaparse';
import { useAtomValue } from 'jotai';
import { visitingSpeakersActiveState } from '@states/visiting_speakers';
import { speakersCongregationsState } from '@states/speakers_congregations';
import { congNameState } from '@states/settings';
import { personsActiveState } from '@states/persons';

const useSpeakersImportExport = () => {
  const speakers = useAtomValue(visitingSpeakersActiveState);
  const congregations = useAtomValue(speakersCongregationsState);
  const homeCongName = useAtomValue(congNameState);
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
        'Outgoing': speaker.speaker_data.local.value === false ? 'Yes' : 'No',
        'Congregation Address': cong?.cong_data.cong_location.address.value || '',
        'Weekend Meeting Day': cong?.cong_data.weekend_meeting.weekday.value !== undefined
          ? String(cong.cong_data.weekend_meeting.weekday.value)
          : '',
        'Weekend Meeting Time': cong?.cong_data.weekend_meeting.time.value || '',
        'PTCoordinator Name': cong?.cong_data.public_talk_coordinator.name.value || '',
        'PTCoordinator Phone': cong?.cong_data.public_talk_coordinator.phone.value || '',
        'PTCoordinator Email': cong?.cong_data.public_talk_coordinator.email.value || '',
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
  }, [speakers, congregations, homeCongName, persons]);

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
        'Outgoing': 'Yes',
        'Congregation Address': '123 Kingdom Hall Rd',
        'Weekend Meeting Day': '6',
        'Weekend Meeting Time': '10:00',
        'PTCoordinator Name': 'Jane Smith',
        'PTCoordinator Phone': '+987654321',
        'PTCoordinator Email': 'jane.smith@example.com',
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
