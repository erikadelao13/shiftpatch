import { useState } from "react";

import type { CancellationReason } from "@/contracts/shifts/types";
import { REASON_COPY, type ReopenMode, type ReopenTarget } from "../lib/reopen";
import { useModalDialog } from "./use-modal-dialog";

type ReopenShiftDialogOptions = {
  mode: ReopenMode;
  shift: ReopenTarget | null;
  onClose: () => void;
  onConfirm: (shift: ReopenTarget, reason: CancellationReason) => Promise<void>;
};

export function useReopenShiftDialog({ mode, shift, onClose, onConfirm }: ReopenShiftDialogOptions) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agencyReason, setAgencyReason] = useState<CancellationReason>("advance");
  const reason = mode === "agency" ? agencyReason : "advance";
  const dialog = useModalDialog(shift !== null, pending);

  function handleClose() {
    setError(null);
    setAgencyReason("advance");
    onClose();
  }

  async function handleConfirm() {
    if (!shift || pending) return;
    setError(null);
    setPending(true);
    try {
      await onConfirm(shift, reason);
      dialog.close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : REASON_COPY[reason].failure);
    } finally {
      setPending(false);
    }
  }

  return { ...dialog, pending, error, reason, agencyReason, setAgencyReason, handleClose, handleConfirm };
}
