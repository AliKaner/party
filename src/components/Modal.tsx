"use client";

export default function Modal({
  onClose,
  children,
  maxWidth = 480,
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0.1 0.01 280 / 0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="anim-pop-in relative w-full overflow-y-auto"
        style={{
          maxWidth,
          maxHeight: "88%",
          background: "var(--panel-alt)",
          border: "1px solid var(--border-strong)",
          borderRadius: 22,
          padding: 28,
          boxShadow: "0 30px 70px rgba(0,0,0,0.55)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute cursor-pointer"
          style={{
            top: 14,
            right: 18,
            background: "none",
            border: "none",
            color: "var(--muted)",
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
