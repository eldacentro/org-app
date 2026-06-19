import { useState, useEffect } from 'react';
import { Box, TextField, Stack } from '@mui/material';
import { Drawer } from '@components/index';
import Button from '@components/button';
import { IconSave, IconDelete } from '@components/icons';
import { useBreakpoints } from '@hooks/index';
import { AncianoCargo } from '@definition/responsabilidades';
import { PersonSelect, PersonOption } from './components';

interface DrawerEditCargoProps {
  open: boolean;
  cargo: AncianoCargo;
  ancianos: PersonOption[];
  onClose: () => void;
  onSave: (val: AncianoCargo) => void;
  onDelete: () => void;
}

const DrawerEditCargo = ({
  open,
  cargo,
  ancianos,
  onClose,
  onSave,
  onDelete,
}: DrawerEditCargoProps) => {
  const { tabletDown } = useBreakpoints();
  const [localCargo, setLocalCargo] = useState<AncianoCargo>(cargo);

  useEffect(() => {
    if (open) {
      setLocalCargo(cargo);
    }
  }, [open, cargo]);

  const updateField = (field: string, val: string) => {
    setLocalCargo((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = () => {
    onSave(localCargo);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor={tabletDown ? 'bottom' : 'right'}
      title="Editar Cargo"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, p: '8px 0' }}>
        <TextField
          value={localCargo.cargo}
          onChange={(e) => updateField('cargo', e.target.value)}
          label="Nombre del cargo"
          fullWidth
        />
        
        <PersonSelect
          value={localCargo.responsable}
          options={ancianos}
          label="Hno. Responsable"
          onChange={(uid) => updateField('responsable', uid)}
        />
      </Box>

      <Stack spacing="16px" sx={{ mt: '32px' }}>
        <Button
          variant="main"
          onClick={handleSave}
          startIcon={<IconSave />}
        >
          Aplicar Cambios
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            onDelete();
            onClose();
          }}
          startIcon={<IconDelete />}
          color="error"
          sx={{
            color: 'var(--red-main)',
            borderColor: 'var(--red-main)',
            '&:hover': {
              backgroundColor: 'var(--red-100)',
              borderColor: 'var(--red-main)',
            }
          }}
        >
          Eliminar Cargo
        </Button>
      </Stack>
    </Drawer>
  );
};

export default DrawerEditCargo;
