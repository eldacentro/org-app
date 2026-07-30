import { Box, Stack } from '@mui/material';
import { ReactSortable } from 'react-sortablejs';
import { useAppTranslation } from '@hooks/index';
import { GroupMembersProps, UsersOption } from './index.types';
import useGroupMembers from './useGroupMembers';
import Autocomplete from '@components/autocomplete';
import MemberItem from './member_item';
import Typography from '@components/typography';

const GroupMembers = (props: GroupMembersProps) => {
  const { t } = useAppTranslation();

  const {
    publishers_unassigned,
    handleAddPublisher,
    members,
    handleDragChange,
    handleRemove,
    handleInputChange,
    inputValue,
    handleMove,
  } = useGroupMembers(props);

  return (
    <Stack spacing="8px" width="100%">
      <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
        {members.length > 0 && (
          <ReactSortable
            list={members}
            setList={handleDragChange}
            handle=".scrollable-icon"
          >
            {members.map((member, i) => (
              <MemberItem
                key={member.id}
                member={member.id}
                onDelete={handleRemove}
                onSubir={() => handleMove(i, -1)}
                onBajar={() => handleMove(i, 1)}
              />
            ))}
          </ReactSortable>
        )}
      </Box>

      <Autocomplete
        // Un valor que no cabe se cortaba con puntos suspensivos y no había
        // forma de leerlo entero: dentro de un <input> el texto no puede
        // partirse en dos líneas. Con `multiline` el campo crece a lo alto.
        multiline
        variant="standard"
        label={t('tr_addPublishers')}
        options={publishers_unassigned}
        getOptionLabel={(option: UsersOption) => option.person_name}
        isOptionEqualToValue={(option, value) =>
          option.person_uid === value?.person_uid
        }
        value={null}
        inputValue={inputValue}
        onInputChange={(_, value) => handleInputChange(value)}
        onChange={(e, value: UsersOption) => handleAddPublisher(value)}
        renderOption={(props, option) => (
          <Box
            component="li"
            {...props}
            sx={{ margin: 0, padding: 0 }}
            key={option.person_uid}
          >
            <Typography>{option.person_name}</Typography>
          </Box>
        )}
      />
    </Stack>
  );
};

export default GroupMembers;
