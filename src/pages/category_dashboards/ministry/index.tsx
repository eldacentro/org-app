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

const MinistryDashboard = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  const { isPublisher, isServiceCommittee, enable_AP_application } =
    useCurrentUser();

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
        {/* Territorios lo ve todo el mundo. Estuvo detrás de un interruptor
            de Ajustes ("Habilitar Territorios (Temporal)") mientras el módulo
            se terminaba; ya está terminado, así que el interruptor se retiró y
            la puerta queda abierta. Lo de dentro sigue repartido por rol: un
            publicador ve SUS territorios, y el panel de responsables (el
            engranaje) solo aparece para quien puede gestionarlos —eso lo
            decide `useIsTerritoryManager`, no esta tarjeta. */}
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
            aplicación. Solo se abría escribiendo la dirección a mano.

            `enable_AP_application` es la bandera que ya estaba escrita en
            `useCurrentUser` para justo esto —y que tampoco usaba nadie—: pide
            congregación conectada, publicador BAUTIZADO y ningún precursorado
            abierto. Con eso, a un precursor regular (y al especial, al
            misionero y al auxiliar de continuo) no le sale: no tiene nada que
            solicitar. Al auxiliar de un mes suelto sí, porque su tramo lleva
            fecha de fin y no cuenta como abierto. */}
        {enable_AP_application && (
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
