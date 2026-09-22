import type { RsaKeyPair } from "@/domain/cryptography/rsa/RsaKeyPair";

/** Состояние системной пары ключей RSA. */
export type RsaKeyStatus = "GENERATING" | "READY";

/**
 * Хранилище системной пары ключей RSA.
 */
export interface ISystemRsaKeyStore {
  /**
   * Возвращает статус генерации и длину модуля в битах.
   * @returns Текущий статус и битовая длина модуля.
   */
  getStatus(): Promise<{ status: RsaKeyStatus; modulusBitLength: number }>;
  /**
   * Возвращает готовую пару ключей или null, если её ещё нет.
   * @returns Пара ключей либо null.
   */
  tryGetKeyPair(): Promise<RsaKeyPair | null>;
  /**
   * Помечает хранилище как находящееся в процессе генерации.
   * @param modulusBitLength Целевая длина модуля в битах.
   */
  markGenerating(modulusBitLength: number): Promise<void>;
  /**
   * Сохраняет готовую пару ключей.
   * @param keyPair Пара ключей RSA.
   */
  saveKeyPair(keyPair: RsaKeyPair): Promise<void>;
}
