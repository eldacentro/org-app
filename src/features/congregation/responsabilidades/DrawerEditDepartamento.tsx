import { useState, useEffect } from 'react';
import { Box, Stack, Chip } from '@mui/material';
import { Drawer } from '@components/index';
import TextField from '@components/textfield';
import Button from '@components/button';
import { IconSave, IconDelete } from '@components/icons';
import { useBreakpoints } from '@hooks/index';
import { Departamento, DepartamentoSimple, DepartamentoExtended } from '@definition/responsabilidades';
import { PersonSelect, PersonMultiSelect, PersonOption } from './components';
import Typography from '@components/typography';

interface DrawerEditDepartamentoProps {
  open: boolean;
  departamento: Departamento;
  varones: PersonOption[];
  onClose: () => void;
  onSave: (val: Departamento) => void;
  onDelete: () => void;
}

const DrawerEditDepartamento = ({
  open,
  departamento,
  varones,
  onClose,
  onSave,
  onDelete,
}: DrawerEditDepartamentoProps) => {
  const { tabletDown } = useBreakpoints();
  const [localDep, setLocalDep] = useState<Departamento>(departamento);

  useEffect(() => {
    if (open) {
      setLocalDep(departamento);
    }
  }, [open, departamento]);

  const isExtended = localDep.type === 'extended';

  const updateField = (field: string, val: string) => {
    setLocalDep((prev) => ({ ...prev, [field]: val } as Departamento));
  };

  const updateMembers = (members: string[]) => {
    setLocalDep((prev) => ({ ...prev, members } as DepartamentoExtended));
  };

  const toggleType = () => {
    if (isExtended) {
      const { members: _, ...rest } = localDep as DepartamentoExtended;
      void _;
      setLocalDep({ ...rest, type: 'simple' } as DepartamentoSimple);
    } else {
      setLocalDep({
        ...localDep,
        type: 'extended',
        members: [],
      } as DepartamentoExtended);
    }
  };

  const handleSave = () => {
    onSave(localDep);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor={tabletDown ? 'bottom' : 'right'}
      title="Editar departamento"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, p: '8px 0' }}>
        <TextField
          value={localDep.name}
          onChange={(e) => updateField('name', e.target.value)}
          label="Nombre del departamento"
          fullWidth
        />
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--accent-100)', borderRadius: 'var(--r-md)' }}>
          <Typography className="body-regular-semibold" color="var(--black)">
            Tipo de Estructura
          </Typography>
          <Chip
            label={isExtended ? 'Compleja' : 'Simple'}
            clickable
            onClick={toggleType}
            sx={{
              background: isExtended ? 'var(--accent-main)' : 'var(--line)',
              color: isExtended ? 'var(--always-white)' : 'var(--ink-2)',
              fontWeight: 600,
              height: '32px',
              px: '8px',
            }}
          />
        </Box>

        <PersonSelect
          value={localDep.responsable}
          options={varones}
          label="Responsable"
          onChange={(uid) => updateField('responsable', uid)}
        />
        
        <PersonSelect
          value={localDep.auxiliar ?? ''}
          options={varones}
          label="Auxiliar (opcional)"
          onChange={(uid) => updateField('auxiliar', uid)}
        />

        {isExtended && (
          <PersonMultiSelect
            value={(localDep as DepartamentoExtended).members}
            options={varones}
            label="Hermanos que colaboran"
            onChange={updateMembers}
          />
        )}
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
              backgroundColor: 'var(--red-secondary)',
              borderColor: 'var(--red-main)',
            }
          }}
        >
          Eliminar Departamento
        </Button>
      </Stack>
    </Drawer>
  );
};

export default DrawerEditDepartamento;
