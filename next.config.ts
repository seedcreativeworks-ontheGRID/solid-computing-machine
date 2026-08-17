import type { NextConfig } from "next";

// GitHub Pages build only — see scripts/static-export.sh and docs/plan.md.
// Config files (unlike per-route `dynamic`/`dynamicParams` exports) aren't
// statically parsed, so a runtime env-var branch here is fine.
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        basePath: "/solid-computing-machine",
      }
    : {}),
};

export default nextConfig;
