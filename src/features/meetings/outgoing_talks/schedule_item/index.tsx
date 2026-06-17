import { Box, Autocomplete, TextField as MuiTextField } from '@mui/material';
import { IconClose, IconDelete, IconTalk, IconLocation, IconAdd, IconArrowBack } from '@components/icons';
import { ScheduleItemType } from './index.types';
import {
  DoubleFieldContainer,
  PrimaryFieldContainer,
  SecondaryFieldContainer,
} from '@features/meetings/shared_styles';
import { useAppTranslation, useBreakpoints } from '@hooks/index';
import useScheduleItem from './useScheduleItem';
import AssignmentsWeekDelete from '@features/meetings/assignments_week_delete';
import Button from '@components/button';
import CountrySelector from '@components/country_selector';
import DaySelector from '@components/day_selector';
import IconButton from '@components/icon_button';
import Markup from '@components/text_markup';
import MeetingSection from '@features/meetings/meeting_section';
import PersonSelector from '@features/meetings/person_selector';
import PublicTalkSelector from '@features/meetings/weekend_editor/public_talk_selector';
import ScheduleDelete from '../schedule_delete';
import SongSource from '@features/meetings/song_source';
import TextField from '@components/textfield';
import Typography from '@components/typography';
import TimePicker from '@components/time_picker';
import CongregationSelector from '@components/congregation_selector';
import SongSelector from '@features/meetings/weekend_editor/song_selector';

const ScheduleItem = (props: ScheduleItemType) => {
  const { t } = useAppTranslation();

  const { laptopUp } = useBreakpoints();

  const {
    congregationFullname,
    schedule,
    week,
    handleCountryChange,
    congConnected,
    congName,
    handleCongNameChange,
    handleCongNameSave,
    use24hFormat,
    congAddress,
    handleCongAddressChange,
    handleCongAddressSave,
    handleMeetingDayChange,
    meetingDay,
    handleMeetingTimeChange,
    meetingTime,
    clearAll,
    handleCloseClearAll,
    handleOpenClearAll,
    isDelete,
    handleOpenDelete,
    handleCloseDelete,
    country,
    handleSelectCongregation,
    handleCongSearchOverride,
    songSelectorOpen,
    handleCloseSongSelector,
    // Catalog
    catalogCongregations,
    selectedCatalogCong,
    isManualInput,
    setIsManualInput,
    handleSelectFromCatalog,
  } = useScheduleItem(props);

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {clearAll && (
        <AssignmentsWeekDelete
          open={clearAll}
          meeting="weekend"
          schedule_id={schedule.id}
          week={week}
          onClose={handleCloseClearAll}
        />
      )}

      {isDelete && (
        <ScheduleDelete
          onClose={handleCloseDelete}
          open={isDelete}
          schedule_id={schedule.id}
          week={week}
        />
      )}

      {songSelectorOpen && (
        <SongSelector
          onClose={handleCloseSongSelector}
          schedule_id={schedule.id}
          week={week}
        />
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography className="h2">{t('tr_outgoingTalk')}</Typography>
        {!schedule.synced && (
          <IconButton sx={{ padding: '4px' }} onClick={handleOpenDelete}>
            <IconDelete width={22} height={22} color="var(--red-dark)" />
          </IconButton>
        )}
      </Box>

      {schedule.synced && (
        <Markup
          content={t('tr_outgoingTalkSynced', {
            congregation: congregationFullname,
          })}
          className="body-regular"
          color="var(--grey-400)"
        />
      )}

      <MeetingSection
        part={t('tr_publicTalk')}
        color="var(--weekend-meeting)"
        icon={<IconTalk color="var(--always-white)" />}
        alwaysExpanded={true}
      >
        <DoubleFieldContainer
          sx={{ flexDirection: laptopUp ? 'row' : 'column' }}
        >
          <PrimaryFieldContainer>
            <SongSource
              label={t('tr_openingSong')}
              meeting="weekend"
              type="outgoing"
              schedule_id={schedule.id}
              week={week}
              isEdit={!schedule.synced}
            />
          </PrimaryFieldContainer>
          <SecondaryFieldContainer
            sx={{ maxWidth: laptopUp ? '360px' : '100%' }}
          />
        </DoubleFieldContainer>

        <DoubleFieldContainer
          sx={{ flexDirection: laptopUp ? 'row' : 'column' }}
        >
          <PrimaryFieldContainer>
            <PublicTalkSelector
              readOnly={schedule.synced}
              week={week}
              showSpeakerCount={true}
              type="localSpeaker"
              schedule_id={schedule.id}
            />
          </PrimaryFieldContainer>
          <SecondaryFieldContainer
            sx={{ maxWidth: laptopUp ? '360px' : '100%' }}
          >
            <PersonSelector
              readOnly={schedule.synced}
              week={week}
              label={t('tr_speaker')}
              assignment="WM_Speaker_Outgoing"
              talk={schedule.public_talk}
              schedule_id={schedule.id}
            />
          </SecondaryFieldContainer>
        </DoubleFieldContainer>
      </MeetingSection>

      <Typography className="h4">{t('tr_hostCongregation')}</Typography>

      {!isManualInput ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Autocomplete
            options={catalogCongregations}
            getOptionLabel={(option) =>
              `${option.cong_data.cong_name.value}${
                option.cong_data.cong_number.value
                  ? ` (${option.cong_data.cong_number.value})`
                  : ''
              }`
            }
            value={selectedCatalogCong ?? null}
            onChange={(_e, val) => handleSelectFromCatalog(val)}
            readOnly={schedule.synced}
            renderInput={(params) => (
              <MuiTextField
                {...params}
                label={t('tr_congregation')}
                size="small"
              />
            )}
            isOptionEqualToValue={(option, value) =>
              option.id === value?.id ||
              option.cong_data.cong_name.value === value?.cong_data.cong_name.value
            }
            noOptionsText="No hay congregaciones en el catálogo"
          />

          {/* Show details of selected congregation */}
          {selectedCatalogCong && (
            <Box
              sx={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                p: 1.5,
                borderRadius: 'var(--radius-l)',
                backgroundColor: 'var(--accent-50)',
                border: '1px solid var(--line)',
              }}
            >
              {selectedCatalogCong.cong_data.cong_location.address.value && (
                <Typography sx={{ fontSize: '13px', color: 'var(--grey-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconLocation width={16} height={16} color="currentColor" />
                  {selectedCatalogCong.cong_data.cong_location.address.value}
                </Typography>
              )}
            </Box>
          )}

          {!schedule.synced && (
            <Box
              onClick={() => setIsManualInput(true)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                color: 'var(--accent-main)',
                fontSize: '13px',
                fontWeight: '500',
                width: 'fit-content',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              <IconAdd width={16} height={16} color="currentColor" />
              {t('tr_addCongregation', 'Añadir nueva congregación')}
            </Box>
          )}
        </Box>
      ) : (
        <>
          {congConnected ? (
            <>
              <Box
                sx={{
                  display: 'flex',
                  gap: '16px',
                  flexDirection: laptopUp ? 'row' : 'column',
                }}
              >
                <CountrySelector
                  readOnly={schedule.synced}
                  value={country}
                  handleCountryChange={handleCountryChange}
                  autoLoad={true}
                />

                <CongregationSelector
                  freeSolo={true}
                  readOnly={country === null || schedule.synced}
                  label={t('tr_congregation')}
                  country_guid={country?.countryGuid}
                  setCongregation={handleSelectCongregation}
                  freeSoloChange={handleCongSearchOverride}
                  freeSoloValue={country ? congregationFullname : ''}
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  gap: '16px',
                  flexDirection: laptopUp ? 'row' : 'column',
                }}
              >
                <TextField
                  label={t('tr_kingdomHallAddress')}
                  slotProps={{ input: { readOnly: schedule.synced } }}
                  value={congAddress}
                  onChange={(e) => handleCongAddressChange(e.target.value)}
                  onBlur={handleCongAddressSave}
                  sx={{ flex: 1 }}
                />

                <DaySelector
                  readOnly={schedule.synced}
                  label={t('tr_weekendMeeting')}
                  value={meetingDay}
                  onChange={handleMeetingDayChange}
                  sx={{ flex: 0.7 }}
                />

                <TimePicker
                  readOnly={schedule.synced}
                  ampm={!use24hFormat}
                  label={t('tr_timerLabelTime')}
                  value={meetingTime}
                  onChange={handleMeetingTimeChange}
                  sx={{ flex: 0.5 }}
                />
              </Box>
            </>
          ) : (
            <>
              <Box
                sx={{
                  display: 'flex',
                  gap: '16px',
                  flexDirection: laptopUp ? 'row' : 'column',
                }}
              >
                <TextField
                  label={t('tr_congregation')}
                  slotProps={{ input: { readOnly: schedule.synced } }}
                  value={congName}
                  onChange={(e) => handleCongNameChange(e.target.value)}
                  onBlur={handleCongNameSave}
                  sx={{ flex: 1 }}
                />

                <TextField
                  label={t('tr_kingdomHallAddress')}
                  slotProps={{ input: { readOnly: schedule.synced } }}
                  value={congAddress}
                  onChange={(e) => handleCongAddressChange(e.target.value)}
                  onBlur={handleCongAddressSave}
                  sx={{ flex: 1 }}
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  gap: '16px',
                  flexDirection: laptopUp ? 'row' : 'column',
                }}
              >
                <DaySelector
                  readOnly={schedule.synced}
                  label={t('tr_weekendMeeting')}
                  value={meetingDay}
                  onChange={handleMeetingDayChange}
                  sx={{ flex: 0.7 }}
                />

                <TimePicker
                  readOnly={schedule.synced}
                  ampm={!use24hFormat}
                  label={t('tr_timerLabelTime')}
                  value={meetingTime}
                  onChange={handleMeetingTimeChange}
                  sx={{ flex: 0.5 }}
                />
              </Box>
            </>
          )}

          {!schedule.synced && (
            <Box
              onClick={() => setIsManualInput(false)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                color: 'var(--grey-500)',
                fontSize: '13px',
                fontWeight: '500',
                width: 'fit-content',
                '&:hover': { color: 'var(--accent-main)', textDecoration: 'underline' },
              }}
            >
              <IconArrowBack width={16} height={16} color="currentColor" />
              {t('tr_selectFromCatalog', 'Seleccionar del catálogo')}
            </Box>
          )}
        </>
      )}

      {!schedule.synced && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            color="red"
            startIcon={<IconClose />}
            onClick={handleOpenClearAll}
          >
            {t('tr_clearAll')}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ScheduleItem;
