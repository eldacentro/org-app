import { Stack } from '@mui/material';
import { IconAccount, IconClose } from '@icons/index';
import IconLoading from '@components/icon_loading';
import { useAppTranslation } from '@hooks/index';
import { JoinRequestProps } from './index.types';
import useJoinRequest from './useJoinRequest';
import AcceptRequest from '../accept';
import Button from '@components/button';
import Typography from '@components/typography';

const JoinRequest = (props: JoinRequestProps) => {
  const { t } = useAppTranslation();

  const { type, request } = props;

  const {
    fullname,
    handleAcceptRequest,
    handleDeclineRequest,
    isProcessingAccept,
    isProcessingDecline,
  } = useJoinRequest(props);

  return (
    <Stack
      justifyContent="space-between"
      sx={{
        backgroundColor: type === 'page' ? 'var(--card)' : 'var(--accent-150)',
        border:
          type === 'page'
            ? '1px dashed var(--line)'
            : '1px solid var(--line)',
        padding: '8px 15px',
        borderRadius: 'var(--radius-l)',
        flexDirection: { mobile: 'column', tablet: 'row' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing="8px">
        {type === 'page' && <IconAccount color="var(--black)" />}
        <Typography className="h4">{fullname}</Typography>
      </Stack>

      <Stack direction="row" alignItems="center">
        <Button
          sx={{ height: '32px', minHeight: '32px' }}
          className={'body-small-semibold'}
          startIcon={
            isProcessingDecline ? (
              <IconLoading color="red" />
            ) : (
              <IconClose color={'red'} />
            )
          }
          variant={'secondary'}
          color={'red'}
          onClick={handleDeclineRequest}
        >
          {t('tr_reject')}
        </Button>

        <AcceptRequest
          fullname={fullname}
          userId={request.user}
          isLoading={isProcessingAccept}
          onConfirm={handleAcceptRequest}
        />
      </Stack>
    </Stack>
  );
};

export default JoinRequest;
