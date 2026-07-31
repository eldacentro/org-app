import { Box } from '@mui/material';
import { useNavigate } from 'react-router';
import { useAtomValue } from 'jotai';
import { useAppTranslation, useCurrentUser } from '@hooks/index';
import PageTitle from '@components/page_title';
import {
  IconPerson,
  IconGroups,
  IconPioneerForm,
  IconNextEvents,
  IconAssignment,
  IconMapOverview,
  IconInformationBoard,
  IconClean,
  IconCalendarWeek,
  IconAirplaneTicket,
} from '@icons/index';
import { useDocumentos } from '@features/documentos/useDocumentos';
import { unseenDocumentosCountState } from '@states/documentos';
import useCircuitVisitAccess from '@features/circuit_visit/useCircuitVisitAccess';

const CongregationDashboard = () => {
  const { t } = useAppTranslation();
  const navigate = useNavigate();

  const { isElder, isPersonViewer } = useCurrentUser();
  const { tier: circuitVisitTier } = useCircuitVisitAccess();

  useDocumentos(); // Para cargar los documentos en el estado
  const unseenCount = useAtomValue(unseenDocumentosCountState);

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
      <PageTitle title={t('tr_congregation', 'Congregación')} />
      <div className="tile-grid">
        {/* Personas */}
        {(isPersonViewer || isElder) && (
          <button
            type="button"
            className="tile-item c-blue active-press full-width"
            onClick={() => handleTileClick('/persons')}
          >
            <div className="ti">
              <IconPerson color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">{t('tr_persons', 'Personas')}</div>
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

        {/* Ausencias — solo ancianos: los periodos llevan comentarios
            personales y hoy solo los ve quien puede abrir fichas. */}
        {isElder && (
          <button
            type="button"
            className="tile-item c-blue active-press full-width"
            onClick={() => handleTileClick('/congregation/ausencias')}
          >
            <div className="ti">
              <IconAirplaneTicket color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">Ausencias</div>
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

        {/* Grupos de predicación */}
        <button
          type="button"
          className="tile-item c-blue active-press full-width"
          onClick={() => handleTileClick('/field-service-groups')}
        >
          <div className="ti">
            <IconGroups color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">
              {t('tr_fieldServiceGroups', 'Grupos de predicación')}
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

        {/* Responsabilidades */}
        <button
          type="button"
          className="tile-item c-blue active-press full-width"
          onClick={() => handleTileClick('/congregation/responsabilidades')}
        >
          <div className="ti">
            <IconAssignment color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">Responsabilidades</div>
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

        {/* Plan de Evacuación (visible para todos) */}
        <button
          type="button"
          className="tile-item c-blue active-press full-width"
          onClick={() => handleTileClick('/congregation/evacuacion')}
        >
          <div className="ti">
            <IconMapOverview color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">Plan de evacuación</div>
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

        {/* Visita del Superintendente de Circuito — SOLO ancianos: es la
            herramienta de quien la organiza. Lo que los hermanos necesitan
            está en su pestaña de Programas semanales, que sale sola mientras
            hay visita. El tier sigue mandando dentro de la página. */}
        {isElder && circuitVisitTier !== 'none' && (
          <button
            type="button"
            className="tile-item c-blue active-press full-width"
            onClick={() => handleTileClick('/congregation/circuit-visit')}
          >
            <div className="ti">
              <IconCalendarWeek color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">Visita del superintendente</div>
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

        {/* Limpieza */}
        <button
          type="button"
          className="tile-item c-blue active-press full-width"
          onClick={() => handleTileClick('/congregation/limpieza')}
        >
          <div className="ti">
            <IconClean color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">Limpieza del Salón</div>
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

        {/* Documentos */}
        <button
          type="button"
          className="tile-item c-blue active-press full-width"
          onClick={() => handleTileClick('/congregation/documentos')}
        >
          <div className="ti">
            <IconInformationBoard color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div
              className="tile-name"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Documentos
              {unseenCount > 0 && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: 'var(--shape-full)',
                    backgroundColor: 'var(--blue-main)',
                  }}
                />
              )}
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

        {/* Solicitudes de precursor */}
        {isElder && (
          <button
            type="button"
            className="tile-item c-blue active-press full-width"
            onClick={() => handleTileClick('/pioneer-applications')}
          >
            <div className="ti">
              <IconPioneerForm color="var(--brand)" width={22} height={22} />
            </div>
            <div className="tile-body">
              <div className="tile-name">
                {t('tr_pioneerApplications', 'Solicitudes de precursor')}
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

        {/* Próximos eventos */}
        <button
          type="button"
          className="tile-item c-blue active-press full-width"
          onClick={() => handleTileClick('/activities/upcoming-events')}
        >
          <div className="ti">
            <IconNextEvents color="var(--brand)" width={22} height={22} />
          </div>
          <div className="tile-body">
            <div className="tile-name">Próximos eventos</div>
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
      </div>
    </Box>
  );
};

export default CongregationDashboard;
