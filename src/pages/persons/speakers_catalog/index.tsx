import { useRef } from 'react';
import Papa from 'papaparse';
import { Box, IconButton, Tooltip } from '@mui/material';
import {
  IconAddCongregation,
  IconImportJson,
  IconExport,
  IconDownload,
  IconDelete,
} from '@components/icons';
import { PageTitle } from '@components/index';
import {
  useAppTranslation,
  useBreakpoints,
  useCurrentUser,
} from '@hooks/index';
import useSpeakersCatalog from './useSpeakersCatalog';
import MyCongregation from '@features/persons/speakers_catalog/my_congregation';
import OtherCongregations from '@features/persons/speakers_catalog/other_congregations';
import NavBarButton from '@components/nav_bar_button';
import appDb from '@db/appDb';
import {
  vistingSpeakerSchema,
  speakersCongregationSchema,
} from '@services/dexie/schema';
import { generateDisplayName } from '@utils/common';
import useSpeakersImportExport from '@features/persons/speakers_catalog/import_export/useSpeakersImportExport';

const SpeakersCatalog = () => {
  const { t } = useAppTranslation();

  const { desktopUp, tablet688Up } = useBreakpoints();

  const { isPublicTalkCoordinator } = useCurrentUser();

  const { handleIsAddingOpen } = useSpeakersCatalog();

  const { exportCSV, downloadTemplate } = useSpeakersImportExport();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handlePurgeCatalog = async () => {
    const confirm = window.confirm(
      '¿Estás seguro de que quieres eliminar COMPLETAMENTE todo el catálogo de oradores y congregaciones? Esta acción es física y no se puede deshacer.'
    );

    if (confirm) {
      try {
        await appDb.visiting_speakers.clear();
        await appDb.speakers_congregations.clear();

        const metadata = await appDb.metadata.get(1);
        if (metadata) {
          metadata.metadata.visiting_speakers.send_local = true;
          metadata.metadata.speakers_congregations.send_local = true;
          await appDb.metadata.put(metadata);
        }

        alert('Catálogo vaciado con éxito.');
        window.location.reload();
      } catch (error) {
        console.error(error);
        alert('Error al vaciar el catálogo.');
      }
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: async (results) => {
        try {
          interface CSVRow {
            'Congregation Name': string;
            'Congregation Number'?: string;
            'First Name': string;
            'Last Name': string;
            'Display Name'?: string;
            Elder?: string;
            'Ministerial Servant'?: string;
            Email?: string;
            Phone?: string;
            Local?: string;
            Talks?: string;
          }

          const speakers = results.data as CSVRow[];
          const currentCongs = await appDb.speakers_congregations.toArray();
          const currentSpeakers = await appDb.visiting_speakers.toArray();
          const now = new Date().toISOString();

          for (const item of speakers) {
            const congName = item['Congregation Name']?.trim();
            const congNumber = item['Congregation Number']?.trim();
            if (!congName) continue;

            const firstName = item['First Name']?.trim() || '';
            const lastName = item['Last Name']?.trim() || '';

            // 1. Encontrar o crear congregación
            let cong = currentCongs.find(
              (c) => c.cong_data.cong_name.value === congName
            );

            if (cong && cong._deleted.value) {
              cong._deleted.value = false;
              cong._deleted.updatedAt = now;
              await appDb.speakers_congregations.put(cong);
            } else if (!cong) {
              cong = structuredClone(speakersCongregationSchema);
              cong.id = crypto.randomUUID();
              cong.cong_data.cong_name = {
                value: congName,
                updatedAt: now,
              };
              cong.cong_data.cong_number = {
                value: congNumber || '',
                updatedAt: now,
              };
              cong.cong_data.request_status = 'approved';
              await appDb.speakers_congregations.add(cong);
              currentCongs.push(cong);
            }

            // 2. Encontrar o crear orador (coincidencia por nombre + apellido + congre)
            let speaker = currentSpeakers.find(
              (s) =>
                s.speaker_data.person_firstname.value === firstName &&
                s.speaker_data.person_lastname.value === lastName &&
                s.speaker_data.cong_id === cong!.id
            );

            if (!speaker) {
              speaker = structuredClone(vistingSpeakerSchema);
              speaker.person_uid = crypto.randomUUID();
            }

            const talksStr = item['Talks'] || '';
            const talks = talksStr
              .split(/[,;]/)
              .filter((t) => t.trim().length > 0)
              .map((t) => ({
                _deleted: false,
                talk_number: parseInt(t.trim(), 10),
                talk_songs: [],
                updatedAt: now,
              }))
              .filter((t) => !isNaN(t.talk_number));

            speaker._deleted = { value: false, updatedAt: now };
            speaker.speaker_data.cong_id = cong!.id;
            speaker.speaker_data.person_firstname = {
              value: firstName,
              updatedAt: now,
            };
            speaker.speaker_data.person_lastname = {
              value: lastName,
              updatedAt: now,
            };
            speaker.speaker_data.person_display_name = {
              value:
                item['Display Name'] ||
                generateDisplayName(lastName, firstName),
              updatedAt: now,
            };
            speaker.speaker_data.elder = {
              value: item['Elder']?.toLowerCase() === 'yes',
              updatedAt: now,
            };
            speaker.speaker_data.ministerial_servant = {
              value: item['Ministerial Servant']?.toLowerCase() === 'yes',
              updatedAt: now,
            };
            speaker.speaker_data.person_email = {
              value: item['Email'] || '',
              updatedAt: now,
            };
            speaker.speaker_data.person_phone = {
              value: item['Phone'] || '',
              updatedAt: now,
            };
            speaker.speaker_data.talks = talks;
            speaker.speaker_data.local = {
              value: item['Local']?.toLowerCase() === 'yes',
              updatedAt: now,
            };

            await appDb.visiting_speakers.put(speaker);
          }

          const metadata = await appDb.metadata.get(1);
          if (metadata) {
            metadata.metadata.visiting_speakers.send_local = true;
            metadata.metadata.speakers_congregations.send_local = true;
            await appDb.metadata.put(metadata);
          }

          alert('Importación completada con éxito.');
          window.location.reload();
        } catch (error) {
          console.error(error);
          alert('Error al procesar el archivo CSV.');
        }
      },
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '16px',
        flexDirection: 'column',
        paddingBottom: !tablet688Up ? '60px' : '0px',
      }}
    >
      <PageTitle
        title={t('tr_speakersCatalog')}
        buttons={
          <>
            {isPublicTalkCoordinator && (
              <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleImportCSV}
                />

                <Tooltip title="VACIAR TODO EL CATÁLOGO (Físicamente)">
                  <IconButton
                    onClick={handlePurgeCatalog}
                    sx={{ color: 'var(--red-main)' }}
                  >
                    <IconDelete width={22} height={22} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Descargar plantilla CSV">
                  <IconButton
                    onClick={downloadTemplate}
                    sx={{ color: 'var(--grey-400)' }}
                  >
                    <IconDownload width={20} height={20} />
                  </IconButton>
                </Tooltip>

                <NavBarButton
                  text="Exportar CSV"
                  icon={<IconExport color="var(--always-white)" />}
                  onClick={exportCSV}
                />

                <NavBarButton
                  text="Importar CSV"
                  icon={<IconImportJson color="var(--always-white)" />}
                  onClick={handleTriggerImport}
                />

                <NavBarButton
                  text={t('tr_btnAdd')}
                  main
                  icon={<IconAddCongregation color="var(--always-white)" />}
                  onClick={handleIsAddingOpen}
                ></NavBarButton>
              </Box>
            )}
          </>
        }
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexDirection: desktopUp ? 'row' : 'column',
          gap: '16px',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        <MyCongregation />
        <OtherCongregations />
      </Box>
    </Box>
  );
};

export default SpeakersCatalog;
