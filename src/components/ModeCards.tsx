"use client";

import { GameMode, MODES } from "@/lib/constants";

export default function ModeCards({
  selected,
  onSelect,
  keys,
  disabled = false,
}: {
  selected: GameMode | null;
  onSelect?: (mode: GameMode) => void;
  keys?: GameMode[];
  disabled?: boolean;
}) {
  const modes = keys ? MODES.filter((m) => keys.includes(m.key)) : MODES;
  return (
    <div className="flex flex-wrap gap-3">
      {modes.map((m) => {
        const isSelected = selected === m.key;
        const clickable = !!onSelect && !disabled;
        return (
          <button
            key={m.key}
            type="button"
            onClick={clickable ? () => onSelect(m.key) : undefined}
            className="flex flex-col gap-1.5 text-left"
            style={{
              flex: 1,
              minWidth: 180,
              background: isSelected ? "oklch(0.27 0.06 300)" : "var(--panel)",
              border: `2px solid ${isSelected ? "var(--accent)" : "transparent"}`,
              borderRadius: 16,
              padding: 16,
              cursor: clickable ? "pointer" : "default",
              opacity: clickable || isSelected ? 1 : 0.55,
              transition: "border-color 0.15s",
            }}
          >
            <div className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>
              {m.title}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>{m.desc}</div>
          </button>
        );
      })}
    </div>
  );
}
