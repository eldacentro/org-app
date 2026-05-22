import { AssignmentGroupType } from './index.types';
import useAssignmentGroup from './useAssignmentGroup';
import AssignmentsCheckList from '@components/assignments_checklist';
import Checkbox from '@components/checkbox';
import Tooltip from '@components/tooltip';
import { useAtomValue } from 'jotai';
import { useAppTranslation } from '@hooks/index';
import { personCurrentDetailsState } from '@states/persons';
import { visitingSpeakersActiveState } from '@states/visiting_speakers';
import { dbVisitingSpeakersUpdate } from '@services/dexie/visiting_speakers';
import { AssignmentCode } from '@definition/assignment';
import { Box } from '@mui/material';

const AssignmentGroup = ({
  header,
  color,
  items,
  id,
  onHeaderChange,
  onItemChange,
  checkedItems,
  male,
  disqualified = false,
  readOnly,
  sx,
}: AssignmentGroupType) => {
  const { t } = useAppTranslation();
  const person = useAtomValue(personCurrentDetailsState);
  const visitingSpeakers = useAtomValue(visitingSpeakersActiveState);

  const {
    checkAssignmentDisabled,
    checkGroupDisabled,
    isMinistryDisabled,
    isDisabledByGender,
    getTooltipsForAssignmentTitles,
  } = useAssignmentGroup(male);

  const speakerRecord = visitingSpeakers.find(
    (s) => s.person_uid === person.person_uid
  );

  const hasSpeakerRecord = !!speakerRecord;
  const isOutgoingSpeaker = hasSpeakerRecord && speakerRecord.speaker_data.local.value === false;

  const handleToggleOutgoingSpeaker = async (isOutgoing: boolean) => {
    if (!speakerRecord) return;
    await dbVisitingSpeakersUpdate(
      {
        'speaker_data.local': {
          value: !isOutgoing,
          updatedAt: new Date().toISOString(),
        },
      },
      person.person_uid
    );
  };

  return (
    <Tooltip
      followCursor
      title={getTooltipsForAssignmentTitles(id, items)}
      show={isMinistryDisabled(id, items) || isDisabledByGender(id)}
    >
      <AssignmentsCheckList
        sx={sx}
        header={header}
        color={color}
        disabled={
          disqualified ||
          checkGroupDisabled(id) ||
          isMinistryDisabled(id, items)
        }
        onChange={(checked) => onHeaderChange(checked, id)}
        readOnly={readOnly}
      >
        {items.map((assignment) => (
          <Box key={assignment.code} sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Checkbox
              readOnly={readOnly}
              label={assignment.name}
              checked={
                checkAssignmentDisabled(assignment.code)
                  ? false
                  : checkedItems.includes(assignment.code)
              }
              onChange={(_, checked) => onItemChange(checked, assignment.code)}
              className="body-small-regular"
              disabled={disqualified || checkAssignmentDisabled(assignment.code)}
              sx={
                assignment.borderTop
                  ? {
                      borderTop: '1px solid var(--accent-200)',
                      marginTop: '4px',
                      paddingTop: '8px',
                    }
                  : {}
              }
            />

            {assignment.code === AssignmentCode.WM_Speaker &&
              checkedItems.includes(AssignmentCode.WM_Speaker) &&
              hasSpeakerRecord && (
                <Checkbox
                  readOnly={readOnly}
                  label={t('tr_outgoingSpeakerOption')}
                  checked={isOutgoingSpeaker}
                  onChange={(_, checked) => handleToggleOutgoingSpeaker(checked)}
                  className="body-small-regular"
                  sx={{
                    marginLeft: '24px',
                    marginTop: '-4px',
                    marginBottom: '8px',
                    paddingLeft: '8px',
                    borderLeft: '2px solid var(--accent-300)',
                  }}
                />
              )}
          </Box>
        ))}
      </AssignmentsCheckList>
    </Tooltip>
  );
};

export default AssignmentGroup;

