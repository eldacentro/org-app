import { useRef, ChangeEvent, useState, MouseEvent } from 'react';
import Papa from 'papaparse';
import { Box, Menu, MenuItem, Typography } from '@mui/material';
import {
  IconAddCongregation,
  IconImportJson,
  IconExport,
  IconDownload,
  IconDelete,
  IconSettings,
} from '@components/icons';
import { PageTitle } from '@components/index';
import {
  useAppTranslation,
  useBreakpoints,
  useCurrentUser,
} from '@hooks/index';
import { useAtomValue } from 'jotai';
import { congNameState, congNumberState } from '@states/settings';
import { personsActiveState } from '@states/persons';
import useSpeakersCatalog from './useSpeakersCatalog';
import MyCongregation from '@features/persons/speakers_catalog/my_congregation';
import OtherCongregations from '@features/persons/speakers_catalog/other_congregations';
import NavBarButton from '@components/nav_bar_button';
import appDb from '@db/appDb';
import {
  vistingSpeakerSchema,
  speakersCongregationSchema,
} from '@services/dexie/schema';
import { dbSpeakersCongregationsCreateLocal } from '@services/dexie/speakers_congregations';
import { generateDisplayName } from '@utils/common';
import useSpeakersImportExport from '@features/persons/speakers_catalog/import_export/useSpeakersImportExport';

const SpeakersCatalog = () => {
  const { t } = useAppTranslation();

  const { desktopUp, tablet688Up } = useBreakpoints();

  const { isPublicTalkCoordinator } = useCurrentUser();

  const homeCongName = useAtomValue(congNameState);
  const homeCongNumber = useAtomValue(congNumberState);
  const persons = useAtomValue(personsActiveState);

  const { handleIsAddingOpen } = useSpeakersCatalog();

  const { exportCSV, downloadTemplate } = useSpeakersImportExport();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleOpenMenu = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportClick = () => {
    handleCloseMenu();
    handleTriggerImport();
  };

  const handleExportClick = () => {
    handleCloseMenu();
    exportCSV();
  };

  const handleDownloadTemplateClick = () => {
    handleCloseMenu();
    downloadTemplate();
  };

  const handlePurgeClick = () => {
    handleCloseMenu();
    handlePurgeCatalog();
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

  const handleImportCSV = async (e: ChangeEvent<HTMLInputElement>) => {
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
            Outgoing?: string;
            'Congregation Address'?: string;
            'Weekend Meeting Day'?: string;
            'Weekend Meeting Time'?: string;
            'PTCoordinator Name'?: string;
            'PTCoordinator Phone'?: string;
            'PTCoordinator Email'?: string;
            Talks?: string;
          }

          const speakers = results.data as CSVRow[];
          const currentCongs = await appDb.speakers_congregations.toArray();
          const currentSpeakers = await appDb.visiting_speakers.toArray();
          const allSchedules = await appDb.sched.toArray();
          const now = new Date().toISOString();

          const normalize = (str: string) =>
            str
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim();

          // Asegurar que la congregación local existe en speakers_congregations
          const localCong = currentCongs.find(
            (c) =>
              normalize(c.cong_data.cong_name.value) === normalize(homeCongName) ||
              c.cong_data.cong_number.value === homeCongNumber
          );

          if (!localCong) {
            await dbSpeakersCongregationsCreateLocal();
            const updatedCongs = await appDb.speakers_congregations.toArray();
            currentCongs.splice(0, currentCongs.length, ...updatedCongs);
          }

          for (const item of speakers) {
            const congName = item['Congregation Name']?.trim();
            const congNumber = item['Congregation Number']?.trim();
            if (!congName) continue;

            const firstName = item['First Name']?.trim() || '';
            const lastName = item['Last Name']?.trim() || '';
            const isLocal = item['Local']?.toLowerCase() === 'yes';

            // 1. Encontrar o crear congregación
            let congId = '';

            // Comprobar si es la congregación local (por nombre o número)
            const isHomeCong =
              normalize(congName) === normalize(homeCongName) ||
              (congNumber && congNumber === homeCongNumber);

            if (isHomeCong) {
              const localCong = currentCongs.find(
                (c) =>
                  normalize(c.cong_data.cong_name.value) ===
                    normalize(homeCongName) ||
                  c.cong_data.cong_number.value === homeCongNumber
              );
              congId = localCong?.id || '';
            } else {
              let cong = currentCongs.find(
                (c) =>
                  normalize(c.cong_data.cong_name.value) === normalize(congName) ||
                  (congNumber && c.cong_data.cong_number.value === congNumber)
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
              congId = cong!.id;
            }

            // 1b. Actualizar datos extendidos de la congregación si están presentes
            const congObj = currentCongs.find((c) => c.id === congId);
            if (congObj) {
              let isCongModified = false;

              if (item['Congregation Address'] !== undefined) {
                congObj.cong_data.cong_location.address = {
                  value: item['Congregation Address']?.trim() || '',
                  updatedAt: now,
                };
                isCongModified = true;
              }

              if (item['Weekend Meeting Day'] !== undefined) {
                const dayVal = parseInt(item['Weekend Meeting Day']?.trim() || '', 10);
                if (!isNaN(dayVal)) {
                  congObj.cong_data.weekend_meeting.weekday = {
                    value: dayVal,
                    updatedAt: now,
                  };
                  isCongModified = true;
                }
              }

              if (item['Weekend Meeting Time'] !== undefined) {
                congObj.cong_data.weekend_meeting.time = {
                  value: item['Weekend Meeting Time']?.trim() || '',
                  updatedAt: now,
                };
                isCongModified = true;
              }

              if (item['PTCoordinator Name'] !== undefined) {
                congObj.cong_data.public_talk_coordinator.name = {
                  value: item['PTCoordinator Name']?.trim() || '',
                  updatedAt: now,
                };
                isCongModified = true;
              }

              if (item['PTCoordinator Phone'] !== undefined) {
                congObj.cong_data.public_talk_coordinator.phone = {
                  value: item['PTCoordinator Phone']?.trim() || '',
                  updatedAt: now,
                };
                isCongModified = true;
              }

              if (item['PTCoordinator Email'] !== undefined) {
                congObj.cong_data.public_talk_coordinator.email = {
                  value: item['PTCoordinator Email']?.trim() || '',
                  updatedAt: now,
                };
                isCongModified = true;
              }

              if (isCongModified) {
                await appDb.speakers_congregations.put(congObj);
              }
            }

            // 2. Si es local, buscar primero en la tabla de personas
            let existingPersonUid = '';
            if (isLocal) {
              const findPerson = persons.find(
                (p) =>
                  normalize(p.person_data.person_firstname.value) ===
                    normalize(firstName) &&
                  normalize(p.person_data.person_lastname.value) ===
                    normalize(lastName)
              );
              if (findPerson) {
                existingPersonUid = findPerson.person_uid;
              }
            }

            // 3. Encontrar o crear registro de orador
            // Buscamos por nombre o por el UID de la persona si ya la tenemos
            let speaker = currentSpeakers.find(
              (s) =>
                (normalize(s.speaker_data.person_firstname.value) ===
                  normalize(firstName) &&
                  normalize(s.speaker_data.person_lastname.value) ===
                    normalize(lastName) &&
                  s.speaker_data.cong_id === congId) ||
                (existingPersonUid !== '' && s.person_uid === existingPersonUid)
            );

            let isNewSpeaker = false;
            if (!speaker) {
              speaker = structuredClone(vistingSpeakerSchema);

              let resolvedUid = existingPersonUid;

              if (!resolvedUid) {
                const normalize = (str: string) =>
                  str
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]/g, '')
                    .trim();

                const fn = normalize(firstName);
                const ln = normalize(lastName);
                const disp = item['Display Name'] ? normalize(item['Display Name']) : '';
                const genDisp = normalize(generateDisplayName(lastName, firstName));

                for (const sched of allSchedules) {
                  if (!sched.weekend_meeting) continue;

                  const speakerParts = [
                    ...(sched.weekend_meeting.speaker?.part_1 || []),
                    ...(sched.weekend_meeting.speaker?.part_2 || []),
                    ...(sched.weekend_meeting.speaker?.substitute || [])
                  ];

                  const match = speakerParts.find((sp) => {
                    if (!sp.value || !sp.name) return false;
                    const spName = normalize(sp.name);
                    return (
                      spName === fn + ln ||
                      spName === ln + fn ||
                      (disp && spName === disp) ||
                      spName === genDisp
                    );
                  });

                  if (match) {
                    resolvedUid = match.value;
                    break;
                  }
                }
              }

              speaker.person_uid = resolvedUid || crypto.randomUUID();
              isNewSpeaker = true;
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
            speaker.speaker_data.cong_id = congId;
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
            let speakerLocal = isLocal;
            if (item['Outgoing'] !== undefined && item['Outgoing'] !== '') {
              const isOutgoing = item['Outgoing']?.toLowerCase() === 'yes';
              speakerLocal = isLocal ? !isOutgoing : false;
            } else {
              if (isHomeCong && talks.length > 0) {
                speakerLocal = false;
              }
            }

            speaker.speaker_data.local = {
              value: speakerLocal,
              updatedAt: now,
            };

            await appDb.visiting_speakers.put(speaker);

            if (isNewSpeaker) {
              currentSpeakers.push(speaker);
            }
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

                <NavBarButton
                  text="Importar / Exportar"
                  icon={<IconSettings color="var(--always-white)" />}
                  onClick={handleOpenMenu}
                />

                <Menu
                  anchorEl={anchorEl}
                  open={openMenu}
                  onClose={handleCloseMenu}
                  sx={{
                    marginTop: '8px',
                    '& li': {
                      borderBottom: '1px solid var(--accent-200)',
                    },
                    '& li:last-child': {
                      borderBottom: 'none',
                    },
                  }}
                  slotProps={{
                    paper: {
                      className: 'small-card-shadow',
                      style: {
                        borderRadius: 'var(--radius-l)',
                        border: '1px solid var(--accent-200)',
                        backgroundColor: 'var(--white)',
                      },
                    },
                  }}
                >
                  <MenuItem
                    onClick={handleImportClick}
                    sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <IconImportJson color="var(--black)" />
                    <Typography>Importar CSV</Typography>
                  </MenuItem>

                  <MenuItem
                    onClick={handleExportClick}
                    sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <IconExport color="var(--black)" />
                    <Typography>Exportar CSV</Typography>
                  </MenuItem>

                  <MenuItem
                    onClick={handleDownloadTemplateClick}
                    sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <IconDownload color="var(--black)" />
                    <Typography>Descargar plantilla CSV</Typography>
                  </MenuItem>

                  <MenuItem
                    onClick={handlePurgeClick}
                    sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <IconDelete color="var(--red-main)" />
                    <Typography color="var(--red-main)">Vaciar todo el catálogo</Typography>
                  </MenuItem>
                </Menu>

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
