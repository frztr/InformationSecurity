import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DefaultAdminEnrollment } from "@/application/administration/PublishDefaultAdminEnrollmentUseCase";

const ROOT = join(tmpdir(), "is-webapp-admin-enrollment");
const FILE = join(ROOT, "enrollment.json");
const LOCK = join(ROOT, "lock");
const MAIL_SENT = join(ROOT, "mail-sent");

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function readOrCreateAdminEnrollment(
  create: () => Promise<DefaultAdminEnrollment>,
): Promise<{ enrollment: DefaultAdminEnrollment; createdNow: boolean }> {
  mkdirSync(ROOT, { recursive: true });
  let createdLock = false;
  try {
    mkdirSync(LOCK);
    createdLock = true;
  } catch {
    createdLock = false;
  }

  if (createdLock) {
    try {
      if (!existsSync(FILE)) {
        const enrollment = await create();
        const temporaryPath = `${FILE}.${process.pid}.tmp`;
        writeFileSync(temporaryPath, JSON.stringify(enrollment));
        renameSync(temporaryPath, FILE);
        return { enrollment, createdNow: true };
      }
    } finally {
      rmSync(LOCK, { recursive: true, force: true });
    }
  }

  const deadline = Date.now() + 20_000;
  while (!existsSync(FILE)) {
    if (Date.now() > deadline) {
      throw new Error("Не удалось дождаться публикации TOTP администратора.");
    }
    await sleep(50);
  }

  return {
    enrollment: JSON.parse(readFileSync(FILE, "utf8")) as DefaultAdminEnrollment,
    createdNow: false,
  };
}

export function isAdminEnrollmentMailSent(): boolean {
  return existsSync(MAIL_SENT) && readFileSync(MAIL_SENT, "utf8").trim() === "ok";
}

export function markAdminEnrollmentMailSent(): void {
  writeFileSync(MAIL_SENT, "ok");
}
