"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  // NEXT_PUBLIC_CONVEX_URL is inlined at build time. Fall back to a
  // placeholder address when it's missing so prerendering (which never opens
  // a connection — auth-gated queries are all "skip" server-side) can't
  // crash the build; at runtime the console warning is the signal to set it.
  const client = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      console.warn(
        "NEXT_PUBLIC_CONVEX_URL is not set — configure it (see .env.example) or the app cannot reach Convex."
      );
    }
    return new ConvexReactClient(url || "https://unconfigured-deployment.convex.cloud");
  }, []);
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
