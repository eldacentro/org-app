import { useMemo, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { IconClose } from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { AssignmentsHistoryDialogType } from './index.types';
import AssignmentsHistory from '../assignments_history';
import Dialog from '@components/dialog';
import Tabs from '@components/tabs';
import Typography from '@components/typography';

/**
 * El historial de un hermano, con la asignación que se está repartiendo
 * DELANTE.
 *
 * Antes salía todo mezclado, y para decidir quién preside el domingo da igual
 * que llevara una oración el miércoles: lo que hace falta saber es cuándo
 * presidió por última vez. Es además lo que mira el autocompletado desde que
 * reparte por asignación, así que la primera pestaña enseña exactamente lo que
 * él ve.
 *
 * El historial completo no se va: se queda en la otra pestaña, porque para
 * saber si alguien está muy cargado en general sí hace falta verlo todo.
 */
const AssignmentsHistoryDialog = ({
  open,
  onClose,
  person,
  history,
  assignmentType,
  assignmentLabel,
  historyCurrent,
  allLabel,
}: AssignmentsHistoryDialogType) => {
  const { t } = useAppTranslation();

  const [value, setValue] = useState(0);

  const historyForAssignment = useMemo(() => {
    // Departamentos la trae ya hecha: allí «lo mismo» no es un código de
    // asignación, es un PUESTO (Micro 1, Exterior…), y eso no se puede filtrar
    // desde aquí.
    if (historyCurrent) return historyCurrent;

    if (assignmentType === undefined) return [];

    return history.filter(
      (record) => record.assignment.code === assignmentType
    );
  }, [history, assignmentType, historyCurrent]);

  // Sin saber qué es «lo mismo» no hay nada que separar: se enseña el historial
  // de siempre, sin pestañas.
  const conPestanas = assignmentType !== undefined || Boolean(historyCurrent);

  const tabs = useMemo(
    () => [
      {
        label: assignmentLabel || 'Esta asignación',
        Component: <AssignmentsHistory history={historyForAssignment} />,
      },
      {
        label: allLabel || 'Todas',
        Component: <AssignmentsHistory history={history} />,
      },
    ],
    [assignmentLabel, allLabel, historyForAssignment, history]
  );

  return (
    <Dialog onClose={onClose} open={open} sx={{ padding: '24px' }}>
      <Box
        sx={{
          display: 'flex',
          gap: '4px',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Typography className="h3">{t('tr_assignmentsHistory')}</Typography>
          <Typography color="var(--grey-400)">{person}</Typography>
        </Box>

        <IconButton aria-label="Cerrar" sx={{ padding: 0 }} onClick={onClose}>
          <IconClose color="var(--grey-400)" />
        </IconButton>
      </Box>

      {conPestanas && (
        <Tabs tabs={tabs} value={value} onChange={(tab) => setValue(tab)} />
      )}

      {!conPestanas && <AssignmentsHistory history={history} />}
    </Dialog>
  );
};

export default AssignmentsHistoryDialog;
