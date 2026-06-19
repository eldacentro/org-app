import { useEffect, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useManualSync } from '@hooks/index';
import { adminRoleState } from '@states/settings';
import { joinRequestsCountState } from '@states/congregation';

const useCongregation = () => {
  const { isSyncing, isConnected, secondaryText, handleManualSync } =
    useManualSync();

  const isUserAdmin = useAtomValue(adminRoleState);
  const joinRequestsCount = useAtomValue(joinRequestsCountState);

  const requests_count = useMemo(() => {
    if (joinRequestsCount === 0) return;

    return joinRequestsCount.toString();
  }, [joinRequestsCount]);

  useEffect(() => {
    if (isConnected) {
      const svgIcon = document.querySelector<SVGElement>('.organized-sync-icon');
      if (svgIcon) {
        const g = svgIcon.querySelector('g');
        const checkMark = g.querySelector('path');
        checkMark.style.animation = 'fade-out 0s ease-in-out forwards';
      }
    }
  }, [isConnected]);

  useEffect(() => {
    if (isSyncing) {
      const svgIcon = document.querySelector<SVGElement>(
        '.organized-sync-icon'
      );
      if (svgIcon) {
        const g = svgIcon.querySelector('g');
        const checkMark = g.querySelector('path');

        checkMark.style.animation = 'fade-out 0s ease-in-out forwards';
        svgIcon.style.animation = 'rotate 2s linear infinite';
      }
    }
  }, [isSyncing]);

  useEffect(() => {
    if (!isSyncing && isConnected) {
      const svgIcon = document.querySelector<SVGElement>(
        '.organized-sync-icon'
      );
      if (svgIcon) {
        const g = svgIcon.querySelector('g');
        const checkMark = g.querySelector('path');

        svgIcon.style.animation = '';
        checkMark.style.animation = 'fade-in 0.25s ease-in-out forwards';
      }
    }
  }, [isSyncing, isConnected]);

  return {
    secondaryText,
    handleManualSync,
    isConnected,
    isUserAdmin,
    requests_count,
  };
};

export default useCongregation;
