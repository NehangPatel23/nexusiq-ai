"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ConfirmDialog,
  type ConfirmDialogVariant,
} from "@/components/ui/confirm-dialog";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const queueRef = useRef<PendingConfirm[]>([]);
  const isOpenRef = useRef(false);

  const processNext = useCallback(() => {
    if (isOpenRef.current || queueRef.current.length === 0) return;

    const next = queueRef.current.shift();
    if (!next) return;

    isOpenRef.current = true;
    setPending(next);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        queueRef.current.push({ ...options, resolve });
        processNext();
      }),
    [processNext],
  );

  const closeDialog = useCallback(
    (result: boolean) => {
      if (!pending) return;

      pending.resolve(result);
      isOpenRef.current = false;
      setPending(null);
      processNext();
    },
    [pending, processNext],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeDialog(false);
      }
    },
    [closeDialog],
  );

  const handleConfirm = useCallback(() => {
    closeDialog(true);
  }, [closeDialog]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending ? (
        <ConfirmDialog
          open
          onOpenChange={handleOpenChange}
          title={pending.title}
          description={pending.description}
          confirmLabel={pending.confirmLabel}
          cancelLabel={pending.cancelLabel}
          variant={pending.variant}
          onConfirm={handleConfirm}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return context.confirm;
}
