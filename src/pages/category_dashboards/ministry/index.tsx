import { Box } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import {
  IconMinistryReport,
  IconInTerritory,
  IconCart,
  IconMapOverview,
  IconAuxiliaryPioneer,
} from '@icons/index';

import { useAtomValue } from 'jotai';
import { territoriesEnabledPublishersState } from '@states/settings';
import { congAccountConnectedState } from '@states/app';
import { useIsTerritoryManager } from '@features/territories/useIsTerritoryManager';

const MinistryDashboard = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  const { isPublisher, isServiceCommittee } = useCurrentUser();
  const territoriesEnabled = useAtomValue(territoriesEnabledPublishersState);
  const isConnected = useAtomValue(congAccountConnectedState);

  // Quien gestiona Territorios tiene que poder entrar SIEMPRE. El interruptor
  // `territories_enabled_publishers` viene apagado de fábrica y decide otra
  // cosa —si lo ven los publicadores—, así que con él apagado un anciano que
  // no esté en el comité de servicio, o el hermano del departamento
  // "Territorios", se quedaban sin ninguna puerta a un módulo que sí pueden
  // gestionar.
  const isTerritoryManager = useIsTerritoryManager();

  const handleTileClick = (path: string) => {
    navigate(path);
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 'var(--dash-measure)',
        margin: '0 auto',
        paddingTop: '16px',
      }}
    >
      <PageTitle title={t('tr_ministry', 'Predicación')} />
      <div className="tile-grid">
        {(isServiceCommittee || territoriesEnabled || isTerritoryManager) && (
          <button
            type="button"
            className="tile-item c-blue active-press full-width"
            onClick={() => handleTileClick('/congregation/territories')}
          >
            <div className="ti">
              <IconMapOverview color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">Territorios</div>
            </div>
            <svg
              className="chev-icon"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}

        {/* Exhibidores */}
        {isServiceCommittee && (
          <button
            type="button"
            className="tile-item c-blue active-press full-width"
            onClick={() => handleTileClick('/exhibitors')}
          >
            <div className="ti">
              <IconCart color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">Exhibidores</div>
            </div>
            <svg
              className="chev-icon"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}

        {/* Salidas de predicación */}
        {isServiceCommittee && (
          <button
            type="button"
            className="tile-item c-blue active-press full-width"
            onClick={() => handleTileClick('/predicacion-salidas')}
          >
            <div className="ti">
              <IconInTerritory color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">Salidas de predicación</div>
            </div>
            <svg
              className="chev-icon"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}

        {/* Informe */}
        {isPublisher && (
          <button
            type="button"
            className="tile-item c-blue active-press full-width"
            onClick={() => handleTileClick('/ministry-report')}
          >
            <div className="ti">
              <IconMinistryReport color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">
                {t('tr_report', 'Informe de predicación')}
              </div>
            </div>
            <svg
              className="chev-icon"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}

        {/* Solicitud de precursor auxiliar.
            La página existe y está enrutada desde siempre, pero no había forma
            de llegar a ella: ni tarjeta, ni botón, ni un `navigate` en toda la
            aplicación. Solo se abría escribiendo la dirección a mano. La ruta
            pide publicador Y congregación conectada, así que la tarjeta
            también. */}
        {isPublisher && isConnected && (
          <button
            type="button"
            className="tile-item c-blue active-press full-width"
            onClick={() => handleTileClick('/auxiliary-pioneer-application')}
          >
            <div className="ti">
              <IconAuxiliaryPioneer
                color="var(--brand)"
                width={22}
                height={22}
              />
            </div>
            <div className="tile-body">
              <div className="tile-name">
                {t('tr_applicationAuxiliaryPioneer')}
              </div>
            </div>
            <svg
              className="chev-icon"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>
    </Box>
  );
};

export default MinistryDashboard;
