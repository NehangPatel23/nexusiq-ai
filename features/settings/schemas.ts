import { z } from "zod";

import { passwordSchema } from "@/features/auth/schemas";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmText: z.literal("DELETE", {
    errorMap: () => ({ message: 'Type DELETE to confirm' }),
  }),
});

export const notificationPrefsSchema = z.object({
  processingComplete: z.boolean(),
  riskFound: z.boolean(),
  taskAssigned: z.boolean(),
  emailDigest: z.boolean(),
});

export const themeSchema = z.object({
  theme: z.enum(["dark", "light"]),
});

export const aiSettingsSchema = z.object({
  baseUrl: z.union([z.string().url("Enter a valid URL").max(500), z.literal("")]).optional(),
  chatModel: z.string().min(1).max(100).optional(),
  embedModel: z.string().min(1).max(100).optional(),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>;
export type ThemeInput = z.infer<typeof themeSchema>;
export type AiSettingsInput = z.infer<typeof aiSettingsSchema>;
