"use client";

import { useLoginForm } from "../hooks/use-login-form";

const inputClass =
  "h-[52px] w-full rounded-control border border-input-border bg-surface px-4 text-base text-text placeholder:text-text-muted aria-[invalid=true]:border-danger-text";

export function LoginForm() {
  const { state, formAction, pending, showPassword, togglePassword } = useLoginForm();
  const invalid = state.error ? true : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.error ? (
        <div
          role="alert"
          data-testid="notification-banner"
          className="rounded-control bg-danger-bg px-4 py-3 text-sm font-medium text-danger-text"
        >
          {state.error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          aria-invalid={invalid}
          data-testid="login-email-input"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={invalid}
            data-testid="login-password-input"
            className={`${inputClass} pr-14`}
          />
          <button
            type="button"
            onClick={togglePassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-control text-text-muted hover:text-text"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {showPassword ? null : <path d="M4 4l16 16" />}
            </svg>
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        data-testid="login-submit-button"
        className="h-[52px] w-full rounded-control bg-brand-800 text-base font-medium text-on-brand hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
