"use client";

import { KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  changePasswordAction,
  deleteAccountAction,
} from "@/features/settings/actions";
import { SettingsPanel } from "@/features/settings/components/settings-panel";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SecurityForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmText, setConfirmText] = useState("");

  function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await changePasswordAction({
        currentPassword: form.get("currentPassword"),
        newPassword: form.get("newPassword"),
        confirmPassword: form.get("confirmPassword"),
      });
      if (!result.success) {
        if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
        else toast.error(result.error.message);
        return;
      }
      toast.success("Password updated");
      event.currentTarget.reset();
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteAccountAction({
        password: deletePassword,
        confirmText,
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Account scheduled for deletion");
      router.push("/login?deleted=1");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <SettingsPanel
        icon={KeyRound}
        title="Change password"
        description="Enter your current password to set a new one."
      >
      <form onSubmit={handlePasswordSubmit} className="max-w-xl space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
            {fieldErrors.currentPassword && (
              <p className="text-sm text-destructive">{fieldErrors.currentPassword[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              autoComplete="new-password"
            />
            {fieldErrors.newPassword && (
              <p className="text-sm text-destructive">{fieldErrors.newPassword[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <p className="text-sm text-destructive">{fieldErrors.confirmPassword[0]}</p>
            )}
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </SettingsPanel>

      <SettingsPanel
        icon={Trash2}
        title="Delete account"
        description="Your account is deactivated immediately and permanently removed after 24 hours. You can recover it by signing in during the grace period. Transfer or delete organizations where you are the sole owner first."
        tone="danger"
      >
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          Delete my account
        </Button>
      </SettingsPanel>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeletePassword("");
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivated now. Permanently removed after 24 hours. Re-enter your password and type
              DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Password</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmText">Type DELETE</Label>
              <Input
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting || confirmText !== "DELETE" || !deletePassword}
              onClick={handleDelete}
            >
              {isDeleting ? "Please wait…" : "Delete account"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
