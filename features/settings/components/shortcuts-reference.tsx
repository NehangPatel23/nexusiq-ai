export function ShortcutsReference() {
  const rows = [
    { keys: "⌘ K / Ctrl K", action: "Open command palette" },
    { keys: "/", action: "Focus search (when available)" },
    { keys: "?", action: "Keyboard shortcuts help" },
    { keys: "Esc", action: "Close dialogs and menus" },
    { keys: "U", action: "Upload to data room (from palette)" },
  ];

  return (
    <div className="surface-elevated space-y-6 p-8">
      <div>
        <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
        <p className="text-sm text-muted-foreground">
          Accelerate common workflows without leaving the keyboard.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-muted-foreground">
            <th className="py-2 font-medium">Shortcut</th>
            <th className="py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.keys} className="border-b border-border/40">
              <td className="py-3">
                <kbd className="rounded border border-border/60 bg-muted/40 px-2 py-1 font-mono text-xs">
                  {row.keys}
                </kbd>
              </td>
              <td className="py-3 text-muted-foreground">{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
