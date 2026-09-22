import fs from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";

/**
 * Несекретные настройки приложения (RSA, Kafka, БД, SMTP, почта, TTL аутентификации).
 */
export type ApplicationSettings = {
  rsa: {
    modulusBitLength: number;
    publicExponent: number;
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
    url: string;
  };
  smtp: {
    host: string;
    port: number;
    from: string;
  };
  mail: {
    domain: string;
    publicOrigin: string;
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

/**
 * Секреты приложения (пароль БД, cookie, мастер-ключ Кузнечика, SMTP, учётная запись администратора).
 */
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

/**
 * Значения настроек по умолчанию до YAML и переменных окружения.
 */
const DEFAULT_APPLICATION_SETTINGS: ApplicationSettings = {
  rsa: {
    modulusBitLength: 32768,
    publicExponent: 65537,
  },
  kafka: {
    brokers: ["kafka:9092"],
    topic: "prime-numbers",
    clientId: "is-webapp",
    groupId: "is-webapp-rsa-key-assembler",
  },
  database: {
    host: "postgres",
    port: 5432,
    name: "information_security",
    user: "is_app",
    url: "",
  },
  smtp: {
    host: "front",
    port: 25,
    from: "noreply@information-security.org",
  },
  mail: mailAddresses("information-security.org", "http://localhost:8025"),
  auth: {
    emailOtpTtlSeconds: 300,
    sessionTtlHours: 12,
    totpIssuer: "InformationSecurity",
    recoveryCodeCount: 10,
    passwordResetTtlMinutes: 30,
    pendingLoginTtlMinutes: 15,
  },
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

function optionalString(raw: string | undefined, fallback: string): string {
  const value = raw?.trim();
  return value ? value : fallback;
}

function optionalNumber(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalCsv(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) {
    return fallback;
  }
  const values = raw.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
  return values.length > 0 ? values : fallback;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function mailAddresses(domain: string, publicOrigin: string): ApplicationSettings["mail"] {
  const origin = trimTrailingSlash(publicOrigin);
  return {
    domain,
    publicOrigin: origin,
    webmailUrl: `${origin}/webmail`,
    signupUrl: `${origin}/admin/user/signup/${domain}`,
  };
}

function resolveMail(mail: ApplicationSettings["mail"]): ApplicationSettings["mail"] {
  const derived = mailAddresses(
    optionalString(process.env.MAIL_DOMAIN, mail.domain),
    optionalString(process.env.MAIL_PUBLIC_ORIGIN, mail.publicOrigin),
  );
  return {
    ...derived,
    webmailUrl: optionalString(process.env.MAIL_WEBMAIL_URL, derived.webmailUrl),
    signupUrl: optionalString(process.env.MAIL_SIGNUP_URL, derived.signupUrl),
  };
}

function resolveConfigDirectory(): string {
  return optionalString(process.env.APP_CONFIG_DIRECTORY, path.join(process.cwd(), "config"));
}

function readSettingsFromFiles(): ApplicationSettings {
  const configDirectory = resolveConfigDirectory();
  const basePath = path.join(configDirectory, "appsettings.yml");
  const fromFiles = fs.existsSync(basePath)
    ? loadYamlFile<Record<string, unknown>>(basePath)
    : {};
  const environmentName = process.env.NODE_ENV === "development" ? "Development" : "Production";
  const overlayPath = path.join(configDirectory, `appsettings.${environmentName}.yml`);
  const overlay = fs.existsSync(overlayPath) ? loadYamlFile<Record<string, unknown>>(overlayPath) : undefined;
  return deepMerge(
    deepMerge(DEFAULT_APPLICATION_SETTINGS as unknown as Record<string, unknown>, fromFiles),
    overlay,
  ) as ApplicationSettings;
}

function applyEnvironmentOverrides(settings: ApplicationSettings): ApplicationSettings {
  return {
    ...settings,
    rsa: {
      ...settings.rsa,
      modulusBitLength: optionalNumber(process.env.RSA_MODULUS_BIT_LENGTH, settings.rsa.modulusBitLength),
    },
    kafka: {
      brokers: optionalCsv(process.env.KAFKA_BROKERS, settings.kafka.brokers),
      topic: optionalString(process.env.KAFKA_TOPIC, settings.kafka.topic),
      clientId: optionalString(process.env.KAFKA_CLIENT_ID, settings.kafka.clientId),
      groupId: optionalString(process.env.KAFKA_GROUP_ID, settings.kafka.groupId),
    },
    mail: resolveMail(settings.mail),
  };
}

function buildDatabaseUrl(settings: ApplicationSettings, secrets: ApplicationSecrets): string {
  const encodedPassword = encodeURIComponent(secrets.database.password);
  return `postgresql://${settings.database.user}:${encodedPassword}@${settings.database.host}:${settings.database.port}/${settings.database.name}`;
}

/**
 * Загружает YAML настроек и secrets.yml, накладывает переменные окружения и собирает DATABASE_URL.
 * @returns Настройки и секреты.
 */
export function loadApplicationConfiguration(): {
  settings: ApplicationSettings;
  secrets: ApplicationSecrets;
} {
  const secrets = loadYamlFile<ApplicationSecrets>(path.join(resolveConfigDirectory(), "secrets.yml"));
  const settings = applyEnvironmentOverrides(readSettingsFromFiles());
  return {
    secrets,
    settings: {
      ...settings,
      database: {
        ...settings.database,
        url: optionalString(process.env.DATABASE_URL, buildDatabaseUrl(settings, secrets)),
      },
    },
  };
}
