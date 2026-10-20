import { useState, type FormEvent } from "react";

import { newShiftSchema, toFieldErrors, type NewShiftErrors, type NewShiftInput } from "@/contracts/shifts/schemas";
import { useModalDialog } from "./use-modal-dialog";

type PostShiftDialogOptions = {
  open: boolean;
  onClose: () => void;
  onPost: (shift: NewShiftInput) => Promise<void>;
};

export function usePostShiftDialog({ open, onClose, onPost }: PostShiftDialogOptions) {
  const [errors, setErrors] = useState<NewShiftErrors>({});
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const dialog = useModalDialog(open, pending);

  function handleClose() {
    setErrors({});
    setFormError(null);
    setFormKey((key) => key + 1);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const parsed = newShiftSchema.safeParse({
      role: data.get("role"),
      date: data.get("date"),
      startTime: data.get("startTime"),
      endTime: data.get("endTime"),
    });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setFormError(null);
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);
    try {
      await onPost(parsed.data);
      dialog.close();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not post the shift.");
    } finally {
      setPending(false);
    }
  }

  return { ...dialog, errors, formKey, pending, formError, handleClose, handleSubmit };
}
