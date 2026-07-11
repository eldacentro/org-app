import { useEffect, useRef, useState } from 'react';
import { Avatar, Box, CircularProgress } from '@mui/material';
import { useAtomValue } from 'jotai';
import { isAppDataSyncingState, lastAppDataSyncState } from '@states/app';
import { useLiveQuery } from 'dexie-react-hooks';
import appDb from '@db/appDb';
import {
  IconCheckCircle,
  IconExpand,
  IconHeaderAccount,
  IconNoConnection,
} from '@icons/index';
import { useAccountHeaderIcon } from './useAccountHeaderIcon';
import { isTest } from '@constants/index';

// Cuánto tiempo se muestra el check verde de "todo actualizado" tras
// completarse una sincronización (la confirmación sutil que luego se retira)
const SYNCED_BADGE_MS = 4000;

/**
 * Functional component for rendering the user's avatar or a default icon
 * with an indicator for offline status. Additionally, it includes an expand icon
 * that rotates based on the `isMoreOpen` prop.
 *
 * @param {function} [props.handleOpenMore] - Event handler function for opening more options. Optional.
 * @param {boolean} [props.isMoreOpen=false] - Indicates whether the "more options" menu is open. Defaults to false.
 *
 * @returns {JSX.Element} The AccountHeaderIcon component.
 */
const AccountHeaderIcon = ({
  handleOpenMore,
  isMoreOpen = false,
}: {
  handleOpenMore?: (e: unknown) => void;
  isMoreOpen?: boolean;
}) => {
  const { userAvatar, isOffline } = useAccountHeaderIcon();

  const isRed = !isTest && isOffline;

  const isSyncing = useAtomValue(isAppDataSyncingState);
  const lastSync = useAtomValue(lastAppDataSyncState);
  const isPendingSync = useLiveQuery(async () => {
    const metadata = await appDb.metadata.get(1);
    if (!metadata) return false;
    return Object.values(metadata.metadata).some((table) => table.send_local === true);
  }, []);

  // Confirmación sutil de "todo actualizado": al terminar CUALQUIER ciclo de
  // sync (también las descargas silenciosas de cambios ajenos) aparece un
  // check verde durante unos segundos y se retira solo. Así cada uno puede
  // ver que acaba de recibir lo último sin que la app parezca siempre ocupada.
  const [showSynced, setShowSynced] = useState(false);
  const prevSyncingRef = useRef(false);
  const lastSyncRef = useRef(lastSync);
  lastSyncRef.current = lastSync;

  useEffect(() => {
    const justFinished = prevSyncingRef.current && !isSyncing;
    prevSyncingRef.current = isSyncing;

    // tras un fallo (BACKUP_FAILED) no hay nada que confirmar
    if (!justFinished || lastSyncRef.current === 'error') return;

    setShowSynced(true);
    const timer = setTimeout(() => setShowSynced(false), SYNCED_BADGE_MS);

    return () => clearTimeout(timer);
  }, [isSyncing]);

  return (
    <Box
      role="button"
      tabIndex={0}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: '2px',
        borderRadius: 'var(--radius-max)',
        border: `1px solid ${isRed ? 'var(--red-main)' : 'var(--accent-200)'}`,
        backgroundColor: 'var(--accent-150)',
        padding: '4px 6px 4px 4px',
        alignItems: 'center',
        cursor: 'pointer',

        '&:focus-visible': {
          outline: 'var(--accent-main) auto 1px',
        },

        '&:hover': {
          backgroundColor: 'var(--accent-200)',
          borderColor: isRed ? 'var(--red-main)' : 'var(--accent-300)',
        },
      }}
      onClick={handleOpenMore}
      onKeyDown={(e) =>
        e.key === 'Enter' || e.key === ' ' ? handleOpenMore(e) : null
      }
    >
      <Box
        sx={{
          width: '24px',
          height: '24px',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            width: '24px',
            height: '24px',
            borderRadius: 'var(--radius-max)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {userAvatar ? (
            <Avatar
              alt="Avatar"
              src={userAvatar}
              sx={{
                width: '24px',
                height: '24px',
              }}
            />
          ) : (
            <IconHeaderAccount
              width={24}
              height={24}
              color="var(--accent-main)"
            />
          )}
          {isRed && (
            <Box
              sx={{
                width: '32px',
                height: '75%',
                position: 'absolute',
                bottom: '0',
                left: 'calc(50% - 16px)',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                background:
                  'linear-gradient(180deg, rgba(202, 38, 38, 0) 0%, #CA2626 100%)',
              }}
            >
              <IconNoConnection color="var(--always-white)" width={12} height={12} />
            </Box>
          )}
        </Box>
        {/* El circulito azul solo cuando el ciclo está subiendo TUS cambios
            (había send_local al arrancar). Con el sync instantáneo, cada
            edición de cualquier hermano dispara una descarga en segundo
            plano en todos los dispositivos — si el circulito girara también
            en esas, parecería estar sincronizando "lento" todo el rato.
            Las descargas ajenas son silenciosas (como en Documentos). */}
        {isSyncing && isPendingSync ? (
          <CircularProgress
            size={28}
            thickness={4}
            sx={{
              position: 'absolute',
              top: -2,
              left: -2,
              color: 'var(--accent-main)',
              zIndex: 1
            }}
          />
        ) : isPendingSync ? (
          <Box
            sx={{
              position: 'absolute',
              top: -2, left: -2, right: -2, bottom: -2,
              borderRadius: '50%',
              border: '2px solid var(--orange-main)',
              zIndex: 1
            }}
          />
        ) : showSynced ? (
          <Box
            sx={{
              position: 'absolute',
              bottom: -3,
              right: -3,
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: 'var(--white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <IconCheckCircle
              width={13}
              height={13}
              color="var(--green-main)"
            />
          </Box>
        ) : null}
      </Box>
      <IconExpand
        width={16}
        color="var(--accent-400)"
        sx={{
          transition: 'transform 0.3s',
          transform: isMoreOpen ? 'rotate(180deg)' : 'none',
        }}
      />
    </Box>
  );
};

export default AccountHeaderIcon;
