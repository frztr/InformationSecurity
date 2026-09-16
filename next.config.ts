import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "js-yaml", "nodemailer", "kafkajs", "pdf-lib", "@pdf-lib/fontkit"],
  outputFileTracingIncludes: {
    "/*": ["./src/infrastructure/pdf/fonts/**/*"],
  },
};

export default nextConfig;
