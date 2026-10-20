import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";

import { apiFetch } from "@/shared/client/api-client";
import { queryKeys } from "@/shared/client/query-keys";
import { formatDate } from "@/shared/lib/dates";

import { PAST_EXPIRY_MESSAGE } from "@/contracts/credentials/document";
import {
  credentialFileSchema,
  credentialUploadSchema,
  type CredentialUploadErrors,
} from "@/contracts/credentials/schemas";
import { useFileDrop } from "./use-file-drop";

type Notice = { kind: "success" | "error"; message: string };

export function useCredentialUpload(userId: string, today: string) {
  const queryClient = useQueryClient();
  const expiryRef = useRef<HTMLInputElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [selected, setSelected] = useState<File | null>(null);
  const [errors, setErrors] = useState<CredentialUploadErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const upload = useMutation({
    mutationFn: (body: FormData) => apiFetch("/api/credentials", { method: "POST", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.credential(userId) }),
  });
  const pending = upload.isPending;
  const drop = useFileDrop({ disabled: pending, onFile: selectFile });

  // Activity keeps this page mounted while the nurse is elsewhere; clearing on hide
  // stops an old "Credential saved" from greeting them on return.
  useLayoutEffect(() => {
    return () => setNotice(null);
  }, []);

  function selectFile(file: File | null) {
    setSelected(file);
    setNotice(null);
    const parsed = file ? credentialFileSchema.safeParse(file) : null;
    setErrors((current) => ({
      ...current,
      file: parsed && !parsed.success ? parsed.error.issues[0]?.message : undefined,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const parsed = credentialUploadSchema.safeParse({
      file: data.get("file"),
      expiresOn: data.get("expiresOn"),
    });
    if (!parsed.success) {
      const { fieldErrors } = z.flattenError(parsed.error);
      setErrors({ file: fieldErrors.file?.[0], expiresOn: fieldErrors.expiresOn?.[0] });
      setNotice(null);
      (fieldErrors.file ? drop.inputRef : expiryRef).current?.focus();
      return;
    }

    if (parsed.data.expiresOn < today) {
      setErrors({ expiresOn: PAST_EXPIRY_MESSAGE });
      setNotice(null);
      expiryRef.current?.focus();
      return;
    }

    setErrors({});
    setNotice(null);
    try {
      await upload.mutateAsync(data);
      setFormKey((key) => key + 1);
      setSelected(null);
      setNotice({
        kind: "success",
        message: `Credential saved. Your expiry date is now ${formatDate(parsed.data.expiresOn)}.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not save your credential.",
      });
    }
  }

  return {
    ...drop,
    expiryRef,
    formKey,
    selected,
    errors,
    notice,
    pending,
    selectFile,
    clearExpiryError: () => setErrors((current) => ({ ...current, expiresOn: undefined })),
    dismissNotice: () => setNotice(null),
    handleSubmit,
  };
}
