import { Box, Divider, FormControlLabel, RadioGroup } from '@mui/material';
import {
  useAppTranslation,
  useBreakpoints,
  useCurrentUser,
} from '@hooks/index';
import useBasicInfo from './useBasicInfo';
import Badge from '@components/badge';
import DatePicker from '@components/date_picker';
import Radio from '@components/radio';
import TextField from '@components/textfield';
import Typography from '@components/typography';
import YearsCount from '@components/years_count';
import Tooltip from '@components/tooltip';

const PersonBasicInfo = () => {
  const { t } = useAppTranslation();

  const { tabletDown } = useBreakpoints();

  const { isPersonEditor } = useCurrentUser();

  const {
    person,
    handleChangeBirthDate,
    age,
    handleToggleGender,
    handleChangeFirstname,
    handleChangeLastname,
    handleChangeDisplayName,
    handleChangeFullname,
    handleChangeAddress,
    handleChangeEmailAddress,
    handleChangePhone,
    ageToYearsAndMonths,
    nameFlex,
    isInactive,
    displayNameEnabled,
    isCurrentPersonMemberOfAFamily,
    familyHeadName,
    isFamilyHead
  } = useBasicInfo();

  return (
    <Box
      sx={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        display: 'flex',
        padding: '16px',
        gap: '16px',
        flexDirection: 'column',
        borderRadius: 'var(--shape-xl)',
        flex: 1,
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          minHeight: '28px',
        }}
      >
        <Typography className="h2">{t('tr_basicInformation')}</Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {person.person_data.archived.value && (
            <Badge
              size="big"
              color="red"
              text={t('tr_archived')}
              sx={{ width: 'fit-content' }}
            />
          )}

          {isInactive && (
            <Badge
              size="big"
              color="red"
              text={t('tr_inactive')}
              sx={{ width: 'fit-content' }}
            />
          )}

          {person.person_data.disqualified.value && (
            <Badge
              size="big"
              color="red"
              text={t('tr_disqualified')}
              sx={{ width: 'fit-content' }}
            />
          )}
        </Box>
        {(isCurrentPersonMemberOfAFamily || isFamilyHead) && (
          <Box
            sx={{
              padding: '4px 8px',
              backgroundColor: 'var(--line)',
              borderRadius: 'var(--shape-full)',
              display: 'flex',
              alignItems: 'center',
              width: 'fit-content',
            }}
          >
            <Typography fontSize={16} color="var(--accent-dark)">
              {t('tr_family')}: {familyHeadName}
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          marginTop: '8px',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexDirection: nameFlex,
          }}
        >
          <TextField
            label={t('tr_firstname')}
            value={person.person_data.person_firstname.value}
            onChange={(e) => handleChangeFirstname(e.target.value)}
            slotProps={{ input: { readOnly: !isPersonEditor } }}
          />
          <TextField
            label={t('tr_lastname')}
            value={person.person_data.person_lastname.value}
            onChange={(e) => handleChangeLastname(e.target.value)}
            slotProps={{ input: { readOnly: !isPersonEditor } }}
          />
        </Box>

        <TextField
          label={t('tr_fullName')}
          value={person.person_data.person_fullname?.value ?? ''}
          onChange={(e) => handleChangeFullname(e.target.value)}
          slotProps={{ input: { readOnly: !isPersonEditor } }}
        />

        {displayNameEnabled && (
          <TextField
            label={t('tr_displayName')}
            value={person.person_data.person_display_name.value}
            onChange={(e) => handleChangeDisplayName(e.target.value)}
            slotProps={{ input: { readOnly: !isPersonEditor } }}
          />
        )}
      </Box>

      <RadioGroup
        value={person.person_data.male.value ? 'male' : 'female'}
        onChange={
          isPersonEditor ? (e) => handleToggleGender(e.target.value) : null
        }
        sx={{
          marginLeft: '4px',
          flexDirection: 'row',
          gap: tabletDown ? '16px' : '24px',
          flexWrap: 'wrap',
        }}
      >
        <FormControlLabel
          value="male"
          control={<Radio />}
          label={<Typography>{t('tr_male')}</Typography>}
        />
        <FormControlLabel
          value="female"
          control={<Radio />}
          label={<Typography>{t('tr_female')}</Typography>}
        />
      </RadioGroup>

      <Divider sx={{ borderColor: 'var(--line)' }} />

      {/* La fecha y, al lado, la edad que se deduce de ella.
          La edad tenía el ancho clavado (120px, o 140px si el número era
          largo) y "Edad: 30.4" no cabía: se partía en dos líneas, la caja
          crecía más alta que el campo y le asomaba por debajo — parecía que
          chocaba con él. Ahora la caja mide lo que mide su texto, el texto no
          se parte, y `stretch` la deja EXACTAMENTE a la altura del campo. */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: '8px',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <DatePicker
            label={t('tr_dateOfBirth')}
            value={
              person.person_data.birth_date.value === null
                ? null
                : new Date(person.person_data.birth_date.value)
            }
            onChange={handleChangeBirthDate}
            maxDate={new Date()}
            readOnly={!isPersonEditor}
          />
        </Box>

        <Tooltip
          title={t('tr_ageInYearsAndMonths', ageToYearsAndMonths(age))}
          show={age !== '0'}
        >
          <YearsCount>{t('tr_userAge', { userAge: age })}</YearsCount>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: 'var(--line)' }} />

      <Box
        sx={{
          display: 'flex',
          gap: '16px',
          marginTop: '8px',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexDirection: tabletDown ? 'column' : 'row',
          }}
        >
          <TextField
            label={t('tr_emailAddress')}
            value={person.person_data.email.value}
            onChange={(e) => handleChangeEmailAddress(e.target.value)}
            slotProps={{ input: { readOnly: !isPersonEditor } }}
          />
          <TextField
            label={t('tr_phoneNumber')}
            value={person.person_data.phone.value}
            onChange={(e) => handleChangePhone(e.target.value)}
            slotProps={{ input: { readOnly: !isPersonEditor } }}
          />
        </Box>

        <TextField
          label={t('tr_address')}
          value={person.person_data.address.value}
          onChange={(e) => handleChangeAddress(e.target.value)}
          slotProps={{ input: { readOnly: !isPersonEditor } }}
        />
      </Box>
    </Box>
  );
};

export default PersonBasicInfo;
