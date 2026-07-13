"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__empty__";

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type AppSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
};

export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled,
  className,
  triggerClassName,
  id,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: AppSelectProps) {
  const internalValue = value === "" ? EMPTY_VALUE : value;

  return (
    <Select
      value={internalValue}
      onValueChange={(next) => onValueChange(next === EMPTY_VALUE ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={cn(triggerClassName, className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value === "" ? EMPTY_VALUE : option.value}
            value={option.value === "" ? EMPTY_VALUE : option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
