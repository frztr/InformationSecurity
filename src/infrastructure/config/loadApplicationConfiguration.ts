import fs from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";

export type ApplicationSettings = {
  rsa: {
    modulusBitLength: number;
    publicExponent: number;
    millerRabinWitnessRoundCount: number;
    trialDivisionPrimeCount: number;
  };
  kafka: {
    brokers: string[];
    topic: string;
    clientId: string;
    groupId: string;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
  };
  smtp: {
    host: string;
    port: number;
    from: string;
  };
  mail: {
    domain: string;
    webmailUrl: string;
    signupUrl: string;
  };
  auth: {
    emailOtpTtlSeconds: number;
    sessionTtlHours: number;
    totpIssuer: string;
    recoveryCodeCount: number;
    passwordResetTtlMinutes: number;
    pendingLoginTtlMinutes: number;
  };
};

export type ApplicationSecrets = {
  database: {
    password: string;
  };
  session: {
    cookieSecret: string;
  };
  kuznyechik: {
    masterKeyHex: string;
  };
  smtp: {
    user: string;
    password: string;
  };
  admin: {
    email: string;
    login: string;
    password: string;
  };
};

function loadYamlFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return loadYaml(raw) as T;
}

function deepMerge<T extends Record<string, unknown>>(base: T, overlay: Record<string, unknown> | undefined): T {
  if (!overlay) {
    return base;
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const existing = result[key];
    if (value && typeof value === "object" && !Array.isArray(value) && existing && typeof existing === "object") {
      result[key] = deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export function loadApplicationSettings(): ApplicationSettings {
  const configDirectory = resolveConfigDirectory();
  const base = loadYamlFile<ApplicationSettings>(path.join(configDirectory, "appsettings.yml"));
  const environmentName = process.env.NODE_ENV === "development" ? "Development" : "Production";
  const overlayPath = path.join(configDirectory, `appsettings.${environmentName}.yml`);
  if (!fs.existsSync(overlayPath)) {
    return base;
  }
  const overlay = loadYamlFile<Record<string, unknown>>(overlayPath);
  return deepMerge(base as unknown as Record<string, unknown>, overlay) as ApplicationSettings;
}

function resolveConfigDirectory(): string {
  const fromEnvironment = process.env.APP_CONFIG_DIRECTORY;
  if (fromEnvironment) {
    return fromEnvironment;
  }
  return path.join(process.cwd(), "config");
}

export function loadApplicationSecrets(): ApplicationSecrets {
  return loadYamlFile<ApplicationSecrets>(path.join(resolveConfigDirectory(), "secrets.yml"));
}

export function buildDatabaseUrl(settings: ApplicationSettings, secrets: ApplicationSecrets): string {
  const fromEnvironment = process.env.DATABASE_URL;
  if (fromEnvironment) {
    return fromEnvironment;
  }
  const encodedPassword = encodeURIComponent(secrets.database.password);
  return `postgresql://${settings.database.user}:${encodedPassword}@${settings.database.host}:${settings.database.port}/${settings.database.name}`;
}
