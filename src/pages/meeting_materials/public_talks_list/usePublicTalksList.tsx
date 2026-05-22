import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { PublicTalksViewType } from '@definition/public_talks';
import { publicTalksLocaleState } from '@states/public_talks';
import { dbPublicTalkUpdate } from '@services/dexie/public_talk';

const usePublicTalksList = () => {
  const talksList = useAtomValue(publicTalksLocaleState);

  const [currentView, setCurrentView] = useState<PublicTalksViewType>('list');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleToggleView = () => {
    setCurrentView((prev) => {
      if (prev === 'list') return 'table';
      if (prev === 'table') return 'list';
    });
  };

  const handleSyncTalks = async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      await dbPublicTalkUpdate();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  return { talksList, handleToggleView, currentView, isSyncing, handleSyncTalks };
};

export default usePublicTalksList;
