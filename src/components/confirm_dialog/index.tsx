/* eslint-disable react-refresh/only-export-components */
// hook + component pair intentionally co-located (ConfirmDialog + useConfirm)
import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Button from '@components/button';
import Typography from '@components/typography';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────
const ConfirmDialog = ({
  open,
  title = 'Confirmar',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <Dialog
    open={open}
    onClose={onCancel}
    maxWidth="xs"
    fullWidth
    PaperProps={{
      sx: {
        borderRadius: '20px',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--pop-up-shadow)',
      },
    }}
    slotProps={{
      backdrop: { style: { backgroundColor: 'var(--accent-dark-overlay)' } },
    }}
  >
    <DialogTitle sx={{ color: 'var(--ink)', fontWeight: 700, pb: 0 }}>
      {title}
    </DialogTitle>
    <DialogContent sx={{ pt: 1.5 }}>
      <Typography variant="body2" sx={{ color: 'var(--ink-2)' }}>
        {message}
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
      <Button variant="tertiary" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant={destructive ? 'secondary' : 'main'}
        onClick={onConfirm}
        sx={destructive ? { color: 'var(--red-main)', borderColor: 'var(--red-main)' } : undefined}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

// ── Hook ───────────────────────────────────────────────────────────────────────
interface ConfirmState {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  resolve: (value: boolean) => void;
}

const INITIAL: ConfirmState = {
  open: false,
  message: '',
  resolve: () => {},
};

/**
 * Hook that returns a `confirm()` function and a `<ConfirmDialogNode>` to
 * mount once in the component JSX. Usage:
 *
 * ```tsx
 * const { confirm, ConfirmDialogNode } = useConfirm();
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({ message: '¿Borrar esto?' });
 *   if (!ok) return;
 *   // …
 * };
 *
 * return <>{ConfirmDialogNode} <YourUI /></>;
 * ```
 */
export const useConfirm = () => {
  const [state, setState] = useState<ConfirmState>(INITIAL);

  const confirm = useCallback(
    (opts: { message: string; title?: string; confirmLabel?: string; destructive?: boolean }) =>
      new Promise<boolean>((resolve) =>
        setState({ open: true, resolve, ...opts })
      ),
    []
  );

  const handleConfirm = useCallback(() => {
    state.resolve(true);
    setState(INITIAL);
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve(false);
    setState(INITIAL);
  }, [state]);

  const ConfirmDialogNode = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      destructive={state.destructive}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmDialogNode };
};

export default ConfirmDialog;
