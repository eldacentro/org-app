import React from 'react';
import { Box, Link, IconButton } from '@mui/material';
import { IconCall, IconMail, IconWhatsApp, IconPerson } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { useAtomValue } from 'jotai';
import { speakersCongregationsState } from '@states/speakers_congregations';
import { SpeakerContactInfoType } from './index.types';
import Button from '@components/button';
import Typography from '@components/typography';

const cleanWhatsAppNumber = (phone: string) => {
  let clean = phone.replace(/[\s\-()]/g, '');
  if (clean.startsWith('6') || clean.startsWith('7')) {
    clean = `+34${clean}`;
  }
  return clean;
};

const ContactPhoneRow = ({
  phone,
  label,
  icon,
}: {
  phone: string;
  label: string;
  icon: React.ReactNode;
}) => {
  const cleanPhone = cleanWhatsAppNumber(phone);
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderRadius: 'var(--radius-l)',
        border: '1px solid var(--line)',
        backgroundColor: 'var(--accent-100)',
        width: '100%',
        gap: '12px',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {icon}
        <Box>
          <Typography className="label-small-regular" color="var(--grey-600)">
            {label}
          </Typography>
          <Link underline="none" href={`tel:${phone}`}>
            <Typography
              className="body-small-semibold"
              color="var(--accent-dark)"
              sx={{ wordBreak: 'break-all', marginTop: '2px' }}
            >
              {phone}
            </Typography>
          </Link>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IconButton
          component="a"
          href={`tel:${phone}`}
          sx={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-m)',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--line)',
            color: 'var(--accent-main)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: 'var(--accent-150)',
              borderColor: 'var(--line)',
              transform: 'translateY(-2px)',
              boxShadow: 'var(--hover-shadow)',
            },
            '&:active': {
              transform: 'translateY(0) scale(0.95)',
            },
          }}
        >
          <IconCall width={20} height={20} color="var(--accent-main)" />
        </IconButton>
        <IconButton
          component="a"
          href={`https://wa.me/${cleanPhone}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-m)',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--line)',
            color: 'var(--accent-dark)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: 'var(--accent-150)',
              borderColor: 'var(--line)',
              transform: 'translateY(-2px)',
              boxShadow: 'var(--hover-shadow)',
            },
            '&:active': {
              transform: 'translateY(0) scale(0.95)',
            },
          }}
        >
          <IconWhatsApp width={20} height={20} color="var(--accent-dark)" />
        </IconButton>
      </Box>
    </Box>
  );
};

const ContactEmailRow = ({
  email,
  label,
  icon,
}: {
  email: string;
  label: string;
  icon: React.ReactNode;
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderRadius: 'var(--radius-l)',
        border: '1px solid var(--line)',
        backgroundColor: 'var(--accent-100)',
        width: '100%',
        gap: '12px',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {icon}
        <Box>
          <Typography className="label-small-regular" color="var(--grey-600)">
            {label}
          </Typography>
          <Link underline="none" href={`mailto:${email}`}>
            <Typography
              className="body-small-semibold"
              color="var(--accent-dark)"
              sx={{ wordBreak: 'break-all', marginTop: '2px' }}
            >
              {email}
            </Typography>
          </Link>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <IconButton
          component="a"
          href={`mailto:${email}`}
          sx={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-m)',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--line)',
            color: 'var(--accent-main)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: 'var(--accent-150)',
              borderColor: 'var(--line)',
              transform: 'translateY(-2px)',
              boxShadow: 'var(--hover-shadow)',
            },
            '&:active': {
              transform: 'translateY(0) scale(0.95)',
            },
          }}
        >
          <IconMail width={20} height={20} color="var(--accent-main)" />
        </IconButton>
      </Box>
    </Box>
  );
};

const SpeakerContactInfo = ({ speaker, onClose }: SpeakerContactInfoType) => {
  const { t } = useAppTranslation();
  const congregations = useAtomValue(speakersCongregationsState);

  const speakerCong = congregations.find(
    (record) => record.id === speaker.speaker_data.cong_id
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {speaker.speaker_data.person_phone.value.length > 0 ? (
        <ContactPhoneRow
          phone={speaker.speaker_data.person_phone.value}
          label={t('tr_phoneNumber')}
          icon={<IconCall color="var(--black)" />}
        />
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-l)',
            border: '1px dashed var(--line)',
            backgroundColor: 'transparent',
            width: '100%',
          }}
        >
          <IconCall color="var(--accent-350)" />
          <Box>
            <Typography className="label-small-regular" color="var(--accent-350)">
              {t('tr_phoneNumber')}
            </Typography>
            <Typography className="body-small-semibold" color="var(--accent-350)" sx={{ marginTop: '2px' }}>
              —
            </Typography>
          </Box>
        </Box>
      )}

      {speaker.speaker_data.person_email.value.length > 0 ? (
        <ContactEmailRow
          email={speaker.speaker_data.person_email.value}
          label={t('tr_emailAddress')}
          icon={<IconMail color="var(--black)" />}
        />
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-l)',
            border: '1px dashed var(--line)',
            backgroundColor: 'transparent',
            width: '100%',
          }}
        >
          <IconMail color="var(--accent-350)" />
          <Box>
            <Typography className="label-small-regular" color="var(--accent-350)">
              {t('tr_emailAddress')}
            </Typography>
            <Typography className="body-small-semibold" color="var(--accent-350)" sx={{ marginTop: '2px' }}>
              —
            </Typography>
          </Box>
        </Box>
      )}

      {speakerCong && (
        <>
          {(speakerCong.cong_data.public_talk_coordinator.name.value.length > 0 ||
            speakerCong.cong_data.public_talk_coordinator.phone.value.length > 0 ||
            speakerCong.cong_data.public_talk_coordinator.email.value.length > 0) && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                borderTop: '1px solid var(--line)',
                paddingTop: '16px',
              }}
            >
              <Typography className="body-small-semibold" color="var(--accent-dark)">
                {t('tr_publicTalkCoordinator')}
              </Typography>
              {speakerCong.cong_data.public_talk_coordinator.name.value.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-l)',
                    border: '1px solid var(--line)',
                    backgroundColor: 'var(--accent-100)',
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <IconPerson color="var(--black)" />
                    <Box>
                      <Typography className="label-small-regular" color="var(--grey-600)">
                        {t('tr_name')}
                      </Typography>
                      <Typography
                        className="body-small-semibold"
                        color="var(--accent-dark)"
                        sx={{ marginTop: '2px' }}
                      >
                        {speakerCong.cong_data.public_talk_coordinator.name.value}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              {speakerCong.cong_data.public_talk_coordinator.phone.value.length > 0 && (
                <ContactPhoneRow
                  phone={speakerCong.cong_data.public_talk_coordinator.phone.value}
                  label={t('tr_phoneNumber')}
                  icon={<IconCall color="var(--black)" />}
                />
              )}
              {speakerCong.cong_data.public_talk_coordinator.email.value.length > 0 && (
                <ContactEmailRow
                  email={speakerCong.cong_data.public_talk_coordinator.email.value}
                  label={t('tr_emailAddress')}
                  icon={<IconMail color="var(--black)" />}
                />
              )}
            </Box>
          )}

          {(speakerCong.cong_data.coordinator.name.value.length > 0 ||
            speakerCong.cong_data.coordinator.phone.value.length > 0 ||
            speakerCong.cong_data.coordinator.email.value.length > 0) && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                borderTop: '1px solid var(--line)',
                paddingTop: '16px',
              }}
            >
              <Typography className="body-small-semibold" color="var(--accent-dark)">
                {t('tr_coordinator')}
              </Typography>
              {speakerCong.cong_data.coordinator.name.value.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-l)',
                    border: '1px solid var(--line)',
                    backgroundColor: 'var(--accent-100)',
                    width: '100%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <IconPerson color="var(--black)" />
                    <Box>
                      <Typography className="label-small-regular" color="var(--grey-600)">
                        {t('tr_name')}
                      </Typography>
                      <Typography
                        className="body-small-semibold"
                        color="var(--accent-dark)"
                        sx={{ marginTop: '2px' }}
                      >
                        {speakerCong.cong_data.coordinator.name.value}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              {speakerCong.cong_data.coordinator.phone.value.length > 0 && (
                <ContactPhoneRow
                  phone={speakerCong.cong_data.coordinator.phone.value}
                  label={t('tr_phoneNumber')}
                  icon={<IconCall color="var(--black)" />}
                />
              )}
              {speakerCong.cong_data.coordinator.email.value.length > 0 && (
                <ContactEmailRow
                  email={speakerCong.cong_data.coordinator.email.value}
                  label={t('tr_emailAddress')}
                  icon={<IconMail color="var(--black)" />}
                />
              )}
            </Box>
          )}
        </>
      )}

      <Button variant="main" onClick={onClose} sx={{ width: '100%', marginTop: '8px' }}>
        {t('tr_close')}
      </Button>
    </Box>
  );
};

export default SpeakerContactInfo;
