import type { EmailOtpPurpose, IEmailOtpRepository } from "@/domain/identity/IEmailOtpRepository";
import type { IRecoveryCodeRepository } from "@/domain/identity/IRecoveryCodeRepository";
import { generateDecimalOtp, generateRecoveryCode, hashOpaqueSecret } from "@/infrastructure/identity/SecretDigest";

/**
 * Выпускает одноразовый код из письма и сохраняет его хэш.
 * @param emailOtpRepository Хранилище кодов.
 * @param userId Идентификатор пользователя.
 * @param purpose Назначение кода.
 * @param ttlSeconds Срок действия в секундах.
 * @returns Код открытым текстом.
 */
export async function issueEmailOtp(
  emailOtpRepository: IEmailOtpRepository,
  userId: string,
  purpose: EmailOtpPurpose,
  ttlSeconds: number,
): Promise<string> {
  const otpCode = generateDecimalOtp(6);
  await emailOtpRepository.create(
    userId,
    purpose,
    hashOpaqueSecret(otpCode),
    new Date(Date.now() + ttlSeconds * 1000),
  );
  return otpCode;
}

/**
 * Поглощает предъявленный код из письма.
 * @param emailOtpRepository Хранилище кодов.
 * @param userId Идентификатор пользователя.
 * @param purpose Назначение кода.
 * @param otpCode Предъявленный код.
 * @returns `true`, если код принят.
 */
export async function consumeEmailOtp(
  emailOtpRepository: IEmailOtpRepository,
  userId: string,
  purpose: EmailOtpPurpose,
  otpCode: string,
): Promise<boolean> {
  return emailOtpRepository.consumeUnused(userId, purpose, hashOpaqueSecret(otpCode.trim()), new Date());
}

/**
 * Заменяет набор кодов восстановления пользователя.
 * @param recoveryCodeRepository Хранилище кодов.
 * @param userId Идентификатор пользователя.
 * @param count Число новых кодов.
 * @returns Коды открытым текстом.
 */
export async function issueRecoveryCodes(
  recoveryCodeRepository: IRecoveryCodeRepository,
  userId: string,
  count: number,
): Promise<string[]> {
  const recoveryCodes = Array.from({ length: count }, () => generateRecoveryCode());
  await recoveryCodeRepository.replaceAll(
    userId,
    recoveryCodes.map((code) => hashOpaqueSecret(code)),
  );
  return recoveryCodes;
}
