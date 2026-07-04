import { AddToCalendarProps } from './index.types';
import { IconAddMonth } from '@components/icons';
import useAddToCalendar from './useAddToCalendar';
import IconButton from '@components/icon_button';
import IconLoading from '@components/icon_loading';

const AddToCalendar = (props: AddToCalendarProps) => {
  const { isProcessing, handleAddToCalendar } = useAddToCalendar(props);

  return (
    <IconButton
      className="upc-add-to-calendar-btn"
      onClick={handleAddToCalendar}
      sx={{
        borderRadius: 'var(--r-sm)',
        border: '1px solid var(--line)',
        padding: '6px',
        flexShrink: 0,
      }}
    >
      {isProcessing ? <IconLoading /> : <IconAddMonth color="var(--brand)" />}
    </IconButton>
  );
};

export default AddToCalendar;
