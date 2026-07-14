"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

import { ConfirmProvider } from "@/hooks/use-confirm";

export function Providers({
  children,
  theme = "dark",
}: {
  children: React.ReactNode;
  theme?: "dark" | "light";
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        {children}
        <Toaster
          theme={theme}
          position="bottom-right"
          duration={4500}
          toastOptions={{
            duration: 4500,
            classNames: {
              toast:
                "surface-elevated border-border/60 text-foreground shadow-soft font-sans",
            },
          }}
        />
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
