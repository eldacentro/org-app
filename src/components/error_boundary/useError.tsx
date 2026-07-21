import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { useAppTranslation } from '@hooks/index';
import { userSignOut } from '@services/firebase/auth';
import { dbAppDelete } from '@services/dexie/app';
import { ErrorBoundaryProps } from './index.types';

/**
 * Custom hook to manage error handling.
 *
 * @returns {{
 *   t: Function,
 *   handleReload: Function,
 *   handleDelete: Function,
 *   error: { message?: string; data?: string }
 * }} Object containing functions and error data.
 */
const useError = ({ updatePwa }: ErrorBoundaryProps) => {
  const error: { message?: string; data?: string; stack?: string } =
    useRouteError();

  const { t } = useAppTranslation();

  useEffect(() => {
    if (error) {
      const errMsg = error.message || '';
      const errData = error.data || '';
      const isChunkError =
        errMsg.includes('dynamically imported module') ||
        errData.includes('dynamically imported module') ||
        errMsg.includes('Importing a module script failed') ||
        errData.includes('Importing a module script failed') ||
        errMsg.includes('MIME type') ||
        errData.includes('MIME type') ||
        errMsg.includes('text/html') ||
        errData.includes('text/html');

      if (isChunkError) {
        const hasReloaded = window.sessionStorage.getItem('chunk-reload-occurred');
        if (!hasReloaded) {
          window.sessionStorage.setItem('chunk-reload-occurred', 'true');
          window.location.reload();
        }
      }
    }
  }, [error]);

  const handleReload = () => {
    try {
      updatePwa();

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    await dbAppDelete();
    await userSignOut();

    window.location.href = './';
  };

  return { t, handleReload, handleDelete, error };
};

export default useError;
