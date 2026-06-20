import { Box, Menu, Stack } from '@mui/material';
import {
  IconAssistant,
  IconOverseer,
  IconMore,
  IconRemovePerson,
  IconPerson,
} from '@components/icons';
import { useAppTranslation } from '@hooks/index';
import { GroupMemberProps } from './index.types';
import useMember from './useMember';
import IconButton from '@components/icon_button';
import MenuItem from '@components/menuitem';
import RemovePerson from '../remove_person';
import Typography from '@components/typography';

const GroupMember = (props: GroupMemberProps) => {
  const { t } = useAppTranslation();

  const {
    member_name,
    member_desc,
    icon_hover_color,
    anchorEl,
    handleCloseMenu,
    handleOpenMenu,
    open,
    item_hover_color,
    make_assistant,
    make_overseer,
    handleMakeOverseer,
    handleMakeAssistant,
    handleCloseRemove,
    handleOpenRemove,
    handlePersonRemove,
    removeOpen,
    isServiceCommittee,
    label_overseer,
    isPioneer,
  } = useMember(props);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: 'var(--radius-m)',
        transition: 'background-color 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        '&:hover': {
          backgroundColor: item_hover_color,
          transform: 'translateX(6px)',
        },
      }}
    >
      {removeOpen && (
        <RemovePerson
          action={handlePersonRemove}
          group_id={props.group_id}
          index={props.index}
          member={props.member}
          onClose={handleCloseRemove}
          open={removeOpen}
        />
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: props.member.isOverseer || props.member.isAssistant ? `rgba(var(--group-${props.index}-base), 0.12)` : 'var(--accent-100)',
            color: props.member.isOverseer || props.member.isAssistant ? `var(--group-${props.index})` : 'var(--grey-350)',
            boxShadow: props.member.isOverseer || props.member.isAssistant ? `0 2px 6px rgba(var(--group-${props.index}-base), 0.15)` : 'none',
            flexShrink: 0,
            transition: 'transform 0.2s ease',
            '&:hover': {
              transform: 'scale(1.08)',
            }
          }}
        >
          {props.member.isOverseer && <IconOverseer color="currentColor" width={18} height={18} />}
          {props.member.isAssistant && <IconAssistant color="currentColor" width={18} height={18} />}
          {!props.member.isOverseer && !props.member.isAssistant && <IconPerson color="currentColor" width={18} height={18} />}
        </Box>

        <Stack>
          <Typography
            className={isPioneer ? 'body-medium-semibold' : 'body-medium-regular'}
            color="var(--black)"
            sx={{ fontWeight: isPioneer ? 600 : 400 }}
          >
            {member_name}
          </Typography>

          {member_desc && (
            <Typography
              className="label-small-medium"
              color={'var(--grey-350)'}
              sx={{ opacity: 0.85 }}
            >
              {member_desc}
            </Typography>
          )}
        </Stack>
      </Box>

      {props.editable && isServiceCommittee && (
        <>
          <IconButton
            onClick={handleOpenMenu}
            sx={{
              padding: 0,
              '&:hover': { backgroundColor: icon_hover_color },
            }}
          >
            <IconMore color="var(--grey-400)" />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleCloseMenu}
            sx={{
              marginTop: '8px',
              '& li': {
                borderBottom: '1px solid var(--line)',
              },
              '& li:last-child': {
                borderBottom: 'none',
              },
            }}
            slotProps={{
              paper: {
                className: 'small-card-shadow',
                style: {
                  borderRadius: 'var(--radius-l)',
                  border: '1px solid var(--line)',
                  backgroundColor: 'var(--card)',
                },
              },
            }}
          >
            {make_overseer && (
              <MenuItem
                onClick={handleMakeOverseer}
                sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <IconOverseer color="var(--black)" />
                <Typography>{t(label_overseer)}</Typography>
              </MenuItem>
            )}

            {make_assistant && (
              <MenuItem
                onClick={handleMakeAssistant}
                sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <IconAssistant color="var(--black)" />
                <Typography>{t('tr_makeAssistant')}</Typography>
              </MenuItem>
            )}

            <MenuItem
              onClick={handleOpenRemove}
              sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <IconRemovePerson color="var(--red-main)" />
              <Typography color="var(--red-main)">
                {t('tr_removeFromGroups')}
              </Typography>
            </MenuItem>
          </Menu>
        </>
      )}
    </Box>
  );
};

export default GroupMember;
