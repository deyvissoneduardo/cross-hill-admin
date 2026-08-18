"use client";

import { useState } from "react";

import { Field } from "@/src/shared/components/Field";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
};

export function PasswordField({ id, name, label }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const actionLabel = isVisible ? "Esconder senha" : "Mostrar senha";

  return (
    <Field
      id={id}
      name={name}
      type={isVisible ? "text" : "password"}
      label={label}
      autoComplete="current-password"
      required
      suffixIcon={
        <button
          type="button"
          aria-label={actionLabel}
          aria-pressed={isVisible}
          title={actionLabel}
          onClick={() => setIsVisible((visible) => !visible)}
          className="flex size-9 items-center justify-center rounded-md text-(--color-muted) hover:text-(--color-foreground) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--color-focus-ring)"
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <path
        d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6-9.75-6-9.75-6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <path
        d="m3 3 18 18M10.6 6.12A9.93 9.93 0 0 1 12 6c6.25 0 9.75 6 9.75 6a17 17 0 0 1-2.15 2.88M6.2 6.2C3.63 8.05 2.25 12 2.25 12s3.5 6 9.75 6a9.7 9.7 0 0 0 3.05-.48M9.88 9.88a3 3 0 0 0 4.24 4.24"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
