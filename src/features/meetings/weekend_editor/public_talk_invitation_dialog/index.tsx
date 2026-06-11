import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import Button from '@components/button';
import { IconMail, IconCancelFilled } from '@components/icons';

type PublicTalkInvitationDialogProps = {
  open: boolean;
  onClose: () => void;
  onGenerate: () => void;
  speakerName: string;
};

const PublicTalkInvitationDialog = ({
  open,
  onClose,
  onGenerate,
  speakerName,
}: PublicTalkInvitationDialogProps) => {

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generar Invitación</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1">
          Has asignado a <strong>{speakerName}</strong> como orador visitante.
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          ¿Desea generar una invitación en PDF y enviársela al discursante?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="secondary" onClick={onClose} startIcon={<IconCancelFilled />}>
          No por ahora
        </Button>
        <Button
          variant="main"
          onClick={() => {
            onGenerate();
            onClose();
          }}
          startIcon={<IconMail />}
        >
          Sí, generar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PublicTalkInvitationDialog;
