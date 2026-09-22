import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  serverExternalPackages: ["@prisma/client", "prisma", "js-yaml", "nodemailer", "kafkajs", "pdf-lib", "@pdf-lib/fontkit"],
  outputFileTracingIncludes: {
    "/*": ["./src/infrastructure/pdf/fonts/**/*"],
  },
};

export default nextConfig;
