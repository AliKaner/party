import { hueColor } from "@/lib/constants";

export default function Avatar({
  name,
  hue,
  url,
  size = 34,
  ring,
}: {
  name: string;
  hue: number;
  url?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: size * 0.42,
    color: "white",
    background: hueColor(hue),
    overflow: "hidden",
    boxShadow: ring ? `0 0 0 4px oklch(0.62 0.19 300 / 0.5), 0 0 30px oklch(0.62 0.19 300 / 0.55)` : undefined,
  };
  return (
    <div style={style}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        (name[0] || "?").toUpperCase()
      )}
    </div>
  );
}
