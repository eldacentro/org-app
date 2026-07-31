/* eslint-disable react-refresh/only-export-components */
// hook + component pair intentionally co-located (ConfirmDialog + useConfirm)
import { useState, useCallback } from 'react';
import Button from '@components/button';
import Dialog from '@components/dialog';
import DialogFooter from '@components/dialog_footer';
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
  // El `Dialog` de la app, no el de MUI en crudo. Este componente se pintaba
  // su propio papel a mano —radio, fondo, borde, sombra, velo— repitiendo lo
  // que el compartido ya hace, y por eso se quedaba fuera de cualquier arreglo
  // que se hiciera allí (los márgenes seguros de iOS, por ejemplo).
  <Dialog
    open={open}
    onClose={onCancel}
    PaperProps={{ sx: { maxWidth: '444px' } }}
  >
    <Typography className="h2" color="var(--ink)">
      {title}
    </Typography>

    <Typography className="body-regular" color="var(--ink-2)">
      {message}
    </Typography>

    <DialogFooter
      action={
        <Button
          variant="main"
          color={destructive ? 'red' : undefined}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      }
      cancel={
        <Button variant="tertiary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      }
    />
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
    (opts: {
      message: string;
      title?: string;
      confirmLabel?: string;
      destructive?: boolean;
    }) =>
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
