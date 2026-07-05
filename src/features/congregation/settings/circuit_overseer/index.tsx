import { FullnameOption } from '@definition/settings';
import {
  useAppTranslation,
  useBreakpoints,
} from '@hooks/index';
import {
  CardSection,
  CardSectionContent,
  CardSectionHeader,
  TwoColumnsRow,
} from '../shared_styles';
import useCircuitOverseer from './useCircuitOverseer';
import useIsCircuitVisitManager from '@features/circuit_visit/useIsCircuitVisitManager';
import TextField from '@components/textfield';
import WeeksList from './weeks_list';
import { Stack } from '@mui/material';

const CircuitOverseer = () => {
  const { t } = useAppTranslation();

  const { tablet600Up } = useBreakpoints();

  // El Coordinador gestiona el programa completo de la visita, así que
  // también debe poder editar aquí la identidad del CO — no solo el Admin.
  const canEdit = useIsCircuitVisitManager();

  const {
    fullnameOption,
    displayNameEnabled,
    displayname,
    firstname,
    handleDisplaynameChange,
    handleDisplaynameSave,
    handleFirstnameChange,
    handleFirstnameSave,
    handleLastnameChange,
    handleLastnameSave,
    lastname,
    spouseName,
    handleSpouseNameChange,
    handleSpouseNameSave,
    phone,
    handlePhoneChange,
    handlePhoneSave,
    email,
    handleEmailChange,
    handleEmailSave,
  } = useCircuitOverseer();

  return (
    <CardSection>
      <CardSectionHeader
        title={t('tr_circuitOverseer')}
        description={t('tr_circuitOverseerSettingDesc')}
      />

      <CardSectionContent>
        <Stack spacing="16px">
          <TwoColumnsRow
            sx={{
              flexDirection: tablet600Up
                ? fullnameOption === FullnameOption.FIRST_BEFORE_LAST
                  ? 'row'
                  : 'row-reverse'
                : fullnameOption === FullnameOption.FIRST_BEFORE_LAST
                  ? 'column'
                  : 'column-reverse',
            }}
          >
            <TextField
              type="text"
              label={t('tr_firstname')}
              value={firstname}
              onChange={(e) => handleFirstnameChange(e.target.value)}
              onKeyUp={handleFirstnameSave}
              slotProps={{ input: { readOnly: !canEdit } }}
            />
            <TextField
              type="text"
              label={t('tr_lastname')}
              value={lastname}
              onChange={(e) => handleLastnameChange(e.target.value)}
              onKeyUp={handleLastnameSave}
              slotProps={{ input: { readOnly: !canEdit } }}
            />
          </TwoColumnsRow>

          {displayNameEnabled && (
            <TextField
              type="text"
              label={t('tr_displayName')}
              value={displayname}
              onChange={(e) => handleDisplaynameChange(e.target.value)}
              onKeyUp={handleDisplaynameSave}
              slotProps={{ input: { readOnly: !canEdit } }}
            />
          )}

          <TextField
            type="text"
            label="Nombre de la esposa (vacío si soltero)"
            value={spouseName}
            onChange={(e) => handleSpouseNameChange(e.target.value)}
            onKeyUp={handleSpouseNameSave}
            slotProps={{ input: { readOnly: !canEdit } }}
          />

          <TwoColumnsRow>
            <TextField
              type="text"
              label={t('tr_phoneNumber')}
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onKeyUp={handlePhoneSave}
              slotProps={{ input: { readOnly: !canEdit } }}
            />
            <TextField
              type="text"
              label={t('tr_emailAddress')}
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onKeyUp={handleEmailSave}
              slotProps={{ input: { readOnly: !canEdit } }}
            />
          </TwoColumnsRow>

          <WeeksList />
        </Stack>
      </CardSectionContent>
    </CardSection>
  );
};

export default CircuitOverseer;
