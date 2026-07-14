"use client";

import type { FindingSeverity, MissingItemStatus, RiskStatus } from "@prisma/client";
import type { ContradictionStatus } from "@prisma/client";
import type { ComponentProps } from "react";

import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const FINDING_SEVERITY_OPTIONS: FindingSeverity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

export const RISK_STATUS_OPTIONS: RiskStatus[] = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "DISMISSED",
];

export const CONTRADICTION_STATUS_OPTIONS: ContradictionStatus[] = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "DISMISSED",
];

export const MISSING_STATUS_OPTIONS: MissingItemStatus[] = [
  "OPEN",
  "REQUESTED",
  "RESOLVED",
  "NOT_APPLICABLE",
];

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

export function severityBadgeVariant(
  severity: FindingSeverity | "UNKNOWN" | string | null | undefined,
): BadgeVariant {
  switch (severity) {
    case "CRITICAL":
      return "destructive";
    case "HIGH":
      return "orange";
    case "MEDIUM":
      return "yellow";
    case "LOW":
      return "success";
    default:
      return "outline";
  }
}

export function riskStatusBadgeVariant(status: RiskStatus | string): BadgeVariant {
  switch (status) {
    case "OPEN":
      return "info";
    case "ACKNOWLEDGED":
      return "default";
    case "RESOLVED":
      return "success";
    case "DISMISSED":
      return "secondary";
    default:
      return "outline";
  }
}

export function missingStatusBadgeVariant(status: MissingItemStatus | string): BadgeVariant {
  switch (status) {
    case "OPEN":
      return "info";
    case "REQUESTED":
      return "default";
    case "RESOLVED":
      return "success";
    case "NOT_APPLICABLE":
      return "secondary";
    default:
      return "outline";
  }
}

function BadgeLabel({
  label,
  variant,
  className,
}: {
  label: string;
  variant: BadgeVariant;
  className?: string;
}) {
  return (
    <span className={cn(badgeVariants({ variant }), "normal-case tracking-wider", className)}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

const triggerClass =
  "h-auto min-h-8 w-auto min-w-[7.5rem] gap-1.5 px-2 py-1.5 [&>span]:line-clamp-none";

type SeveritySelectProps = {
  value: FindingSeverity | null | undefined;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (value: FindingSeverity) => void;
  className?: string;
  allowEmptyPlaceholder?: boolean;
};

export function SeveritySelect({
  value,
  disabled,
  ariaLabel,
  onChange,
  className,
  allowEmptyPlaceholder = true,
}: SeveritySelectProps) {
  return (
    <Select
      value={value ?? undefined}
      disabled={disabled}
      onValueChange={(next) => onChange(next as FindingSeverity)}
    >
      <SelectTrigger className={cn(triggerClass, className)} aria-label={ariaLabel}>
        <SelectValue placeholder={allowEmptyPlaceholder ? "Set severity" : undefined}>
          {value ? (
            <BadgeLabel label={value} variant={severityBadgeVariant(value)} />
          ) : (
            <BadgeLabel label="Severity" variant="outline" />
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {FINDING_SEVERITY_OPTIONS.map((option) => (
          <SelectItem key={option} value={option} className="pl-8">
            <BadgeLabel label={option} variant={severityBadgeVariant(option)} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type RiskStatusSelectProps = {
  value: RiskStatus;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (value: RiskStatus) => void;
  className?: string;
};

export function RiskStatusSelect({
  value,
  disabled,
  ariaLabel,
  onChange,
  className,
}: RiskStatusSelectProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(next as RiskStatus)}
    >
      <SelectTrigger className={cn(triggerClass, className)} aria-label={ariaLabel}>
        <SelectValue>
          <BadgeLabel label={value} variant={riskStatusBadgeVariant(value)} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {RISK_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} value={option} className="pl-8">
            <BadgeLabel label={option} variant={riskStatusBadgeVariant(option)} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type ContradictionStatusSelectProps = {
  value: ContradictionStatus;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (value: ContradictionStatus) => void;
  className?: string;
};

export function ContradictionStatusSelect({
  value,
  disabled,
  ariaLabel,
  onChange,
  className,
}: ContradictionStatusSelectProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(next as ContradictionStatus)}
    >
      <SelectTrigger className={cn(triggerClass, className)} aria-label={ariaLabel}>
        <SelectValue>
          <BadgeLabel label={value} variant={riskStatusBadgeVariant(value)} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CONTRADICTION_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} value={option} className="pl-8">
            <BadgeLabel label={option} variant={riskStatusBadgeVariant(option)} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type MissingStatusSelectProps = {
  value: MissingItemStatus;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (value: MissingItemStatus) => void;
  className?: string;
};

export function MissingStatusSelect({
  value,
  disabled,
  ariaLabel,
  onChange,
  className,
}: MissingStatusSelectProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(next as MissingItemStatus)}
    >
      <SelectTrigger className={cn(triggerClass, className)} aria-label={ariaLabel}>
        <SelectValue>
          <BadgeLabel label={value} variant={missingStatusBadgeVariant(value)} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {MISSING_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} value={option} className="pl-8">
            <BadgeLabel label={option} variant={missingStatusBadgeVariant(option)} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
