import { useEffect, useState } from 'react';
import { UpdateSpec } from 'dexie';
import { useAtomValue } from 'jotai';
import { SettingsType } from '@definition/settings';
import {
  congMasterKeyState,
  congAccessCodeState,
  congRoleState,
} from '@states/settings';
import { VIP_ROLES } from '@constants/index';
import { loadApp, runUpdater } from '@services/app';
import {
  setCongAccountConnected,
  setIsAppLoad,
  setIsSetup,
  setOfflineOverride,
} from '@services/states/app';
import { useFirebaseAuth } from '@hooks/index';
import { apiValidateMe } from '@services/api/user';
import { decryptData } from '@services/encryption/index';
import { dbAppSettingsUpdate } from '@services/dexie/settings';
import { clearKeysSecurely, loadKeysSecurely } from '@services/secure_storage';

const useCongregationEncryption = () => {
  const { user, loading: authLoading } = useFirebaseAuth();

  const congMasterKey = useAtomValue(congMasterKeyState);
  const congAccessCode = useAtomValue(congAccessCodeState);
  const congRole = useAtomValue(congRoleState);

  const roleNeedMasterKey = congRole.some((role) => VIP_ROLES.includes(role));

  const setupMasterKey = roleNeedMasterKey && congMasterKey.length === 0;
  const setupAccessCode = congAccessCode.length === 0;

  // While we look for keys saved on this device we hold back the manual entry
  // form to avoid a flash before silent entry kicks in.
  const [checkingSavedKeys, setCheckingSavedKeys] = useState(
    setupMasterKey || setupAccessCode
  );
  const [autoEntering, setAutoEntering] = useState(false);

  // Attempt silent entry using keys saved on this device. The keys are always
  // validated against the server blobs (decryptData throws on mismatch) BEFORE
  // being written to settings — never auto-fill an unverified key, or loadApp
  // would try to decrypt local data with a wrong key.
  useEffect(() => {
    let cancelled = false;

    const tryAutoEntry = async () => {
      // Wait until Firebase auth has resolved.
      if (authLoading) return;

      // Nothing to fill — the completion effect below handles entry.
      if (!setupMasterKey && !setupAccessCode) {
        if (!cancelled) setCheckingSavedKeys(false);
        return;
      }

      const userId = user?.uid;
      if (!userId) {
        if (!cancelled) setCheckingSavedKeys(false);
        return;
      }

      const saved = await loadKeysSecurely(userId);
      if (!saved) {
        if (!cancelled) setCheckingSavedKeys(false);
        return;
      }

      try {
        const { status, result } = await apiValidateMe();

        // Let the normal per-screen flow handle 403 / 404 / sync mismatch.
        if (status !== 200) {
          if (!cancelled) setCheckingSavedKeys(false);
          return;
        }

        const updates: UpdateSpec<SettingsType> = {};

        if (setupMasterKey) {
          decryptData(result.cong_master_key, saved.masterKey, 'master_key');
          updates['cong_settings.cong_master_key'] = saved.masterKey;
        }

        if (setupAccessCode) {
          decryptData(result.cong_access_code, saved.accessCode, 'access_code');
          updates['cong_settings.cong_access_code'] = saved.accessCode;
        }

        if (cancelled) return;

        // Mark auto-entry before writing settings so the UI keeps showing a
        // loader (never the form) while the completion effect runs.
        setAutoEntering(true);
        await dbAppSettingsUpdate(updates);
      } catch (error) {
        // Saved keys no longer valid (e.g. congregation rotated its keys).
        // Drop them and fall back to manual entry.
        console.error('Auto-entry with saved keys failed:', error);
        await clearKeysSecurely(userId);
        if (!cancelled) {
          setAutoEntering(false);
          setCheckingSavedKeys(false);
        }
      }
    };

    tryAutoEntry();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, authLoading]);

  useEffect(() => {
    const completeEncryptionStage = async () => {
      await runUpdater();

      loadApp();

      setIsSetup(false);

      setTimeout(() => {
        setOfflineOverride(false);
        setCongAccountConnected(true);
        setIsAppLoad(false);
      }, 2000);
    };

    if (!setupMasterKey && !setupAccessCode) completeEncryptionStage();
  }, [setupAccessCode, setupMasterKey]);

  return { setupMasterKey, setupAccessCode, checkingSavedKeys, autoEntering };
};

export default useCongregationEncryption;
