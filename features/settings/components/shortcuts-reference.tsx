import { Keyboard } from "lucide-react";

import { SettingsPanel } from "@/features/settings/components/settings-panel";

export function ShortcutsReference() {
  const rows = [
    { keys: "⌘ K / Ctrl K", action: "Open command palette" },
    { keys: "/", action: "Focus search (when available)" },
    { keys: "?", action: "Keyboard shortcuts help" },
    { keys: "Esc", action: "Close dialogs and menus" },
    { keys: "U", action: "Upload to data room (from palette)" },
  ];

  return (
    <SettingsPanel
      icon={Keyboard}
      title="Keyboard shortcuts"
      description="Accelerate common workflows without leaving the keyboard."
    >
      <div className="overflow-hidden rounded-xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="px-4 py-3 font-medium">Shortcut</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.keys} className="border-b border-border/40 last:border-0">
                <td className="px-4 py-3">
                  <kbd className="rounded-md border border-border/60 bg-muted/40 px-2 py-1 font-mono text-xs">
                    {row.keys}
                  </kbd>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SettingsPanel>
  );
}
