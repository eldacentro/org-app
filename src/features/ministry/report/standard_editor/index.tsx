import { Box } from '@mui/material';
import { TextFieldStandardProps } from './index.types';
import { TextFieldStandard } from './index.styles';
import useStandardEditor from './useStandardEditor';
import MinusButton from '@components/minus_button';
import PlusButton from '@components/plus_button';
import Typography from '@components/typography';
import { STEPPER_TRACK } from '../stepper_track';

const StandardEditor = (props: TextFieldStandardProps) => {
  const {
    handleDecrement,
    handleIncrement,
    handleValueChange,
    inputValue,
    handleKeyDown,
  } = useStandardEditor(props);

  // De sólo lectura no hay control que dibujar: es una cifra y ya. El carril
  // llevaría a pensar que se puede tocar.
  if (props.readOnly) {
    return (
      <Typography
        className={props.className || 'h3'}
        color={inputValue === 0 ? 'var(--accent-350)' : 'var(--black)'}
      >
        {inputValue}
      </Typography>
    );
  }

  return (
    <Box sx={STEPPER_TRACK}>
      <MinusButton onClick={handleDecrement} />

      <TextFieldStandard
        type="number"
        value={inputValue}
        onKeyDown={handleKeyDown}
        onChange={handleValueChange}
        slotProps={{
          htmlInput: {
            className: props.className || 'h2',
            inputMode: 'numeric',
            pattern: '[0-9]*',
            style: {
              color: inputValue === 0 ? 'var(--accent-350)' : 'var(--black)',
            },
          },
        }}
      />

      <PlusButton onClick={handleIncrement} />
    </Box>
  );
};

export default StandardEditor;
