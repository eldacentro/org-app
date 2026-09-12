import { Box } from '@mui/material';
import IconLoading from '@components/icon_loading';
import { DetailsContainer } from '../shared_styles';
import { UsersOption } from './index.types';
import { useAppTranslation } from '@hooks/index';
import useProfileSettings from './useProfileSettings';
import useUserDetails from '../useUserDetails';
import Autocomplete from '@components/autocomplete';
import AutocompleteMultiple from '@components/autocomplete_multiple';
import Divider from '@components/divider';
import MiniChip from '@components/mini_chip';
import Typography from '@components/typography';
import { comoEntraLaCuenta } from '@services/app/cuenta_acceso';

const ProfileSettings = () => {
  const { t } = useAppTranslation();

  const { isProcessing, currentUser } = useUserDetails();

  // Con qué correo entra esta cuenta, y por dónde. A veces el hermano no lo
  // sabe, y quien administra tiene que poder decírselo. Solo llega a
  // administradores: el servidor no lo manda en ninguna otra respuesta.
  const email = currentUser?.profile.email ?? '';
  const via = comoEntraLaCuenta(currentUser?.profile.auth_provider);
  const esPocket = currentUser?.profile.global_role === 'pocket';

  const {
    persons,
    handleSelectPerson,
    selectedPerson,
    delegatedPersons,
    handleDelegatedPersonsChange,
    handleDeletePerson,
    delegateOptions,
  } = useProfileSettings();

  return (
    <DetailsContainer>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Typography className="h2" color={'var(--black)'}>
            {t('tr_profileSettings')}
          </Typography>
          {isProcessing && <IconLoading color="var(--black)" />}
        </Box>

        {/* Una cuenta normal sin correo (el servidor no pudo leerlo, o todavía
            no se ha desplegado) no enseña nada: mejor callar que decir que no
            tiene. Las Pocket sí lo dicen, porque ahí «sin correo» es la
            respuesta. */}
        {(email || esPocket) && (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Typography className="label-small-semibold" color="var(--ink-3)">
                Correo de la cuenta
              </Typography>

              {email ? (
                <>
                  <Typography
                    className="body-regular"
                    color="var(--ink)"
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    {email}
                  </Typography>

                  {via && (
                    <Typography
                      className="body-small-regular"
                      color="var(--ink-3)"
                    >
                      {`Entra en la app ${via}.`}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography className="body-small-regular" color="var(--ink-3)">
                  No tiene: es una cuenta Pocket y entra con su código de
                  invitación.
                </Typography>
              )}
            </Box>

            <Divider color="var(--line)" />
          </>
        )}

        <Autocomplete
          // Un valor que no cabe se cortaba con puntos suspensivos y no había
          // forma de leerlo entero: dentro de un <input> el texto no puede
          // partirse en dos líneas. Con `multiline` el campo crece a lo alto.
          multiline
          readOnly={isProcessing}
          disableClearable
          label={t('tr_bindWithRecord')}
          options={persons}
          getOptionLabel={(option: UsersOption) => option.person_name}
          isOptionEqualToValue={(option, value) =>
            option.person_uid === value.person_uid
          }
          value={selectedPerson}
          onChange={(_, value: UsersOption) => handleSelectPerson(value)}
          renderOption={(props, option) => (
            <Box
              component="li"
              {...props}
              sx={{ margin: 0, padding: 0 }}
              key={option.person_uid}
            >
              <Typography>{option.person_name}</Typography>
            </Box>
          )}
        />

        <Divider color="var(--line)" />

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <Typography className="h2">{t('tr_delegatePersons')}</Typography>
          <Typography color="var(--grey-400)">
            {t('tr_delegatePersonsDesc')}
          </Typography>
        </Box>

        <AutocompleteMultiple
          readOnly={isProcessing}
          label={t('tr_delegatePersons')}
          fullWidth={true}
          options={delegateOptions}
          getOptionLabel={(option: UsersOption) => option.person_name}
          isOptionEqualToValue={(option, value) =>
            option.person_uid === value.person_uid
          }
          value={delegatedPersons}
          onChange={(_, value: UsersOption[]) =>
            handleDelegatedPersonsChange(value)
          }
          renderOption={(props, option) => (
            <Box
              component="li"
              {...props}
              sx={{ margin: 0, padding: 0 }}
              key={option.person_uid}
            >
              <Typography>{option.person_name}</Typography>
            </Box>
          )}
          renderValue={(value: UsersOption[]) =>
            value.map((option: UsersOption) => {
              return (
                <MiniChip
                  key={option.person_uid}
                  label={option.person_name}
                  edit={true}
                  onDelete={() => handleDeletePerson(option)}
                />
              );
            })
          }
        />
      </Box>
    </DetailsContainer>
  );
};

export default ProfileSettings;
