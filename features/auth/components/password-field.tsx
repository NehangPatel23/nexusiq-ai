"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { PasswordRequirements } from "@/features/auth/components/password-requirements";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PasswordFieldProps {
  id?: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  error?: string;
  mode?: "create" | "login";
  showRequirements?: boolean;
  confirmPassword?: string;
  showMatch?: boolean;
  labelAction?: React.ReactNode;
  shake?: boolean;
  required?: boolean;
}

export function PasswordField({
  id: idProp,
  name,
  label,
  value,
  onChange,
  autoComplete,
  error,
  mode = "create",
  showRequirements = false,
  confirmPassword,
  showMatch = false,
  labelAction,
  shake = false,
  required = true,
}: PasswordFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;
  const requirementsId = `${id}-requirements`;
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduceMotion = useReducedMotion();

  const shouldShowRequirements =
    mode === "create" && showRequirements && (focused || value.length > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>

      <motion.div
        className="relative"
        animate={shake && !reduceMotion ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={!!error}
          aria-describedby={
            [error ? errorId : null, shouldShowRequirements ? requirementsId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className="pr-11"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </motion.div>

      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {mode === "login" && !error && (
        <p className="text-xs text-muted-foreground">Enter the password for your account</p>
      )}

      <AnimatePresence initial={false}>
        {shouldShowRequirements && (
          <motion.div
            id={requirementsId}
            key="password-requirements"
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <PasswordRequirements
              password={value}
              confirmPassword={confirmPassword}
              showMatch={showMatch}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ConfirmPasswordFieldProps {
  id?: string;
  name: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  password: string;
  error?: string;
  shake?: boolean;
}

export function ConfirmPasswordField({
  id: idProp,
  name,
  label = "Confirm password",
  value,
  onChange,
  password,
  error,
  shake = false,
}: ConfirmPasswordFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();
  const matches = value.length > 0 && value === password;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>

      <motion.div
        className="relative"
        animate={shake && !reduceMotion ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error || (value.length > 0 && !matches)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "pr-11 transition-colors",
            value.length > 0 && !matches && "border-destructive/40 focus-visible:ring-destructive/20",
            value.length > 0 && matches && "border-success/40 focus-visible:ring-success/20",
          )}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </motion.div>

      <AnimatePresence>
        {value.length > 0 && (
          <motion.p
            className={cn(
              "text-xs font-medium",
              matches ? "text-success" : "text-destructive",
            )}
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            {matches ? "Passwords match" : "Passwords do not match"}
          </motion.p>
        )}
      </AnimatePresence>

      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
