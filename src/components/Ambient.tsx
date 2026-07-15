/** Ambient blurred color blobs + faint grid, behind every screen. */
export default function Ambient() {
  return (
    <div className="pb-ambient" aria-hidden>
      <div
        className="pb-blob"
        style={{
          top: "-12%",
          left: "-6%",
          width: 460,
          height: 460,
          background: "oklch(0.55 0.19 300 / 0.16)",
          filter: "blur(110px)",
        }}
      />
      <div
        className="pb-blob"
        style={{
          top: "30%",
          right: "-10%",
          width: 380,
          height: 380,
          background: "oklch(0.55 0.17 220 / 0.13)",
          filter: "blur(90px)",
        }}
      />
      <div
        className="pb-blob"
        style={{
          bottom: "-10%",
          right: "-8%",
          width: 420,
          height: 420,
          background: "oklch(0.55 0.16 145 / 0.12)",
          filter: "blur(100px)",
        }}
      />
    </div>
  );
}
