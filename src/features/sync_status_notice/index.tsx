import InfoTip from '@components/info_tip';
import useSyncStatusNotice from './useSyncStatusNotice';

const SyncStatusNotice = () => {
  const { visible, message } = useSyncStatusNotice();

  if (!visible) return null;

  return (
    <InfoTip
      isBig={false}
      color="warning"
      text={message}
      sx={{ marginBottom: '16px' }}
    />
  );
};

export default SyncStatusNotice;
