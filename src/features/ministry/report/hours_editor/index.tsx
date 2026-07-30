import { Box } from '@mui/material';
import { HoursEditorProps } from './index.types';
import useHoursEditor from './useHoursEditor';
import MinusButton from '@components/minus_button';
import PlusButton from '@components/plus_button';
import TimeField from '@components/timefield';
import { STEPPER_TRACK } from '../stepper_track';

const HoursEditor = (props: HoursEditorProps) => {
  const { handleDecrement, handleIncrement, handleValueChange, inputValue } =
    useHoursEditor(props);

  return (
    <Box sx={STEPPER_TRACK}>
      <MinusButton onClick={handleDecrement} />
      <TimeField
        className="h2"
        value={inputValue}
        onChange={handleValueChange}
        hoursLength={props.hoursLength}
      />
      <PlusButton onClick={handleIncrement} />
    </Box>
  );
};

export default HoursEditor;
