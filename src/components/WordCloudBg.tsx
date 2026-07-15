import { WORDS } from "@/lib/words";

/** Diagonal literary word-cloud backdrop (stand-in for word-cloud-bg.png),
 *  dimmed under a purple-to-dark gradient overlay. Deterministic layout so
 *  server and client render identically. */
export default function WordCloudBg() {
  const cols = 7;
  const perCol = 14;
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute flex"
        style={{
          inset: "-25%",
          transform: "rotate(-18deg)",
          gap: 28,
          justifyContent: "center",
        }}
      >
        {Array.from({ length: cols }, (_, col) => (
          <div key={col} className="flex flex-col" style={{ gap: 18 }}>
            {Array.from({ length: perCol }, (_, row) => {
              const word = WORDS[(col * 37 + row * 13) % WORDS.length];
              const big = (col + row) % 3 === 0;
              return (
                <span
                  key={row}
                  className="font-display"
                  style={{
                    fontSize: big ? 34 : 20,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    color: `oklch(0.96 0.005 280 / ${big ? 0.16 : 0.09})`,
                    letterSpacing: "0.04em",
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.55 0.19 300 / 0.55) 0%, oklch(0.15 0.02 280 / 0.88) 100%)",
        }}
      />
    </div>
  );
}
