"use client";

import { useEffect } from "react";

interface UseListKeyboardShortcutsOptions {
  enabled?: boolean;
  onNew?: () => void;
  onFocusSearch?: () => void;
}

export function useListKeyboardShortcuts({
  enabled = true,
  onNew,
  onFocusSearch,
}: UseListKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTyping) {
        return;
      }

      if (event.key === "n" && !event.metaKey && !event.ctrlKey && !event.altKey && onNew) {
        event.preventDefault();
        onNew();
        return;
      }

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && onFocusSearch) {
        event.preventDefault();
        onFocusSearch();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onNew, onFocusSearch]);
}
