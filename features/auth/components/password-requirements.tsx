"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";

import {
  evaluatePasswordRequirements,
  getPasswordStrength,
  STRENGTH_LABELS,
  type PasswordStrength,
} from "@/features/auth/lib/password-requirements";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  0: "bg-muted/50",
  1: "bg-destructive/70",
  2: "bg-warning/80",
  3: "bg-primary/80",
  4: "bg-success",
};

interface PasswordRequirementsProps {
  password: string;
  confirmPassword?: string;
  showMatch?: boolean;
  className?: string;
}

function RequirementItem({ label, met, index }: { label: string; met: boolean; index: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      className="flex items-center gap-2.5 text-sm"
      initial={reduceMotion ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...easeOut, delay: index * 0.04 }}
    >
      <motion.span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
          met
            ? "border-success/40 bg-success/15 text-success"
            : "border-border/60 bg-muted/30 text-muted-foreground",
        )}
        animate={reduceMotion ? undefined : met ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 0.25 }}
        aria-hidden="true"
      >
        {met ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5 opacity-40" />}
      </motion.span>
      <span className={cn("transition-colors", met ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </motion.li>
  );
}

function StrengthMeter({ password }: { password: string }) {
  const reduceMotion = useReducedMotion();
  const strength = getPasswordStrength(password);
  const segments = 4;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">Password strength</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={STRENGTH_LABELS[strength]}
            className={cn(
              "text-xs font-medium",
              strength <= 1 && "text-destructive",
              strength === 2 && "text-warning",
              strength === 3 && "text-primary",
              strength === 4 && "text-success",
            )}
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            {STRENGTH_LABELS[strength]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex gap-1.5" role="meter" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={4}>
        {Array.from({ length: segments }).map((_, i) => {
          const active = i < strength;
          return (
            <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
              <motion.div
                className={cn("h-full rounded-full", STRENGTH_COLORS[strength])}
                initial={reduceMotion ? { width: active ? "100%" : "0%" } : { width: "0%" }}
                animate={{ width: active ? "100%" : "0%" }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PasswordRequirements({
  password,
  confirmPassword = "",
  showMatch = false,
  className,
}: PasswordRequirementsProps) {
  const requirements = evaluatePasswordRequirements(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-muted/20 p-4",
        className,
      )}
    >
      <StrengthMeter password={password} />

      <ul className="mt-4 space-y-2" aria-label="Password requirements">
        {requirements.map((requirement, index) => (
          <RequirementItem
            key={requirement.id}
            label={requirement.label}
            met={requirement.met}
            index={index}
          />
        ))}
        {showMatch && (
          <RequirementItem
            label="Passwords match"
            met={passwordsMatch}
            index={requirements.length}
          />
        )}
      </ul>
    </div>
  );
}
