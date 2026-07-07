export interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "minLength",
    label: "At least 8 characters",
    test: (password) => password.length >= 8,
  },
  {
    id: "maxLength",
    label: "No more than 128 characters",
    test: (password) => password.length <= 128,
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    test: (password) => /\d/.test(password),
  },
];

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export function evaluatePasswordRequirements(password: string) {
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
}

export function allPasswordRequirementsMet(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password));
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 0;

  const metCount = PASSWORD_REQUIREMENTS.filter((r) => r.test(password)).length;

  if (password.length < 8) return 1;
  if (metCount <= 2) return 2;
  if (metCount <= 4) return 3;
  return 4;
}

export const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  0: "Enter a password",
  1: "Too short",
  2: "Weak",
  3: "Good",
  4: "Strong",
};
