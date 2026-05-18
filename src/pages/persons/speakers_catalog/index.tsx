import { Box, Button } from '@mui/material';
import { IconAddCongregation, IconImportJson } from '@components/icons';
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
import { vistingSpeakerSchema, speakersCongregationSchema } from '@services/dexie/schema';
import { generateDisplayName } from '@utils/common';

const SpeakersCatalog = () => {
  const { t } = useAppTranslation();

  const { desktopUp, tablet688Up } = useBreakpoints();

  const { isPublicTalkCoordinator } = useCurrentUser();

  const { handleIsAddingOpen } = useSpeakersCatalog();

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        const speakers = jsonData.speakers;
        const currentCongs = await appDb.speakers_congregations.toArray();
        const now = new Date().toISOString();

        console.log('Iniciando importación...');

        for (const item of speakers) {
          let cong = currentCongs.find(c => c.cong_data.cong_name.value === item.congregation.congregation_name);
          
          if (!cong) {
            cong = structuredClone(speakersCongregationSchema);
            cong.id = crypto.randomUUID();
            cong.cong_data.cong_name = { value: item.congregation.congregation_name, updatedAt: now };
            cong.cong_data.cong_number = { value: item.congregation.congregation_number, updatedAt: now };
            cong.cong_data.request_status = 'approved';
            await appDb.speakers_congregations.add(cong);
            currentCongs.push(cong);
          }

          const talks = item.talks.map(t => ({
            _deleted: false,
            talk_number: t.talk_number,
            talk_songs: [],
            updatedAt: now
          }));

          const speaker = structuredClone(vistingSpeakerSchema);
          speaker.person_uid = crypto.randomUUID();
          speaker.speaker_data.cong_id = cong.id;
          speaker.speaker_data.person_firstname = { value: item.person_firstname, updatedAt: now };
          speaker.speaker_data.person_lastname = { value: item.person_lastname, updatedAt: now };
          speaker.speaker_data.person_display_name = { value: item.person_display_name || generateDisplayName(item.person_lastname, item.person_firstname), updatedAt: now };
          speaker.speaker_data.elder = { value: item.elder, updatedAt: now };
          speaker.speaker_data.ministerial_servant = { value: item.ministerial_servant, updatedAt: now };
          speaker.speaker_data.talks = talks;
          speaker.speaker_data.local = { value: false, updatedAt: now };

          await appDb.visiting_speakers.put(speaker);
        }

        const metadata = await appDb.metadata.get(1);
        if (metadata) {
          metadata.metadata.visiting_speakers.send_local = true;
          metadata.metadata.speakers_congregations.send_local = true;
          await appDb.metadata.put(metadata);
        }

        alert('Importación completada. Refresca la página.');
      } catch (error) {
        console.error(error);
        alert('Error al importar el JSON');
      }
    };
    reader.readAsText(file);
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
              <Box sx={{ display: 'flex', gap: '8px' }}>
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  id="import-json-input"
                  onChange={handleImportJSON}
                />
                <label htmlFor="import-json-input">
                  <Button
                    component="span"
                    variant="contained"
                    startIcon={<IconImportJson color="var(--always-white)" />}
                    sx={{
                      backgroundColor: 'var(--main-black)',
                      color: 'var(--always-white)',
                      textTransform: 'none',
                      borderRadius: 'var(--radius-l)',
                      padding: '8px 16px',
                      height: '40px',
                      '&:hover': {
                        backgroundColor: 'var(--main-black-hover)',
                      },
                    }}
                  >
                    Importar JSON
                  </Button>
                </label>
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
