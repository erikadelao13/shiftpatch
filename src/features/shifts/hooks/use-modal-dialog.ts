import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from "react";

export function useModalDialog(open: boolean, locked: boolean) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    dialogRef.current?.close();
  }

  function preventCancelWhileLocked(event: SyntheticEvent<HTMLDialogElement>) {
    if (locked) event.preventDefault();
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget && !locked) close();
  }

  return { dialogRef, close, preventCancelWhileLocked, closeOnBackdrop };
}
