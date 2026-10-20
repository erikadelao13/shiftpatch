import { useActionState, useState } from "react";

import { signIn, type SignInState } from "@/actions/auth";

const initialState: SignInState = { email: "" };

export function useLoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return {
    state,
    formAction,
    pending,
    showPassword,
    togglePassword: () => setShowPassword((shown) => !shown),
  };
}
