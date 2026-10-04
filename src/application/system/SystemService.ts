import type { ICollectedPrimeNumberRepository } from "@/domain/cryptography/primes/ICollectedPrimeNumberRepository";
import type { ApplicationSettings } from "@/infrastructure/config/loadApplicationConfiguration";

/**
 * Сводка состояния RSA, Kafka и почты.
 */
export type SystemStatus = {
  rsa: { modulusBitLength: number };
  kafka: {
    brokers: string[];
    topic: string;
    expectedPrimeBitLength: number;
    collectedPrimeCount: number;
  };
  mail: {
    domain: string;
    webmailUrl: string;
    signupUrl: string;
  };
};

/**
 * Чтение сводки состояния системы.
 */
export class SystemService {
  public constructor(
    private readonly collectedPrimeNumberRepository: ICollectedPrimeNumberRepository,
    private readonly settings: ApplicationSettings,
  ) {}

  /**
   * Собирает длину модуля RSA, число простых из Kafka и адреса почты.
   */
  public async getSystemStatus(): Promise<SystemStatus> {
    const modulusBitLength = this.settings.rsa.modulusBitLength;
    const expectedPrimeBitLength = modulusBitLength / 2;
    const collectedPrimeCount = await this.collectedPrimeNumberRepository.countByBitLength(expectedPrimeBitLength);

    return {
      rsa: { modulusBitLength },
      kafka: {
        brokers: this.settings.kafka.brokers,
        topic: this.settings.kafka.topic,
        expectedPrimeBitLength,
        collectedPrimeCount,
      },
      mail: {
        domain: this.settings.mail.domain,
        webmailUrl: this.settings.mail.webmailUrl,
        signupUrl: this.settings.mail.signupUrl,
      },
    };
  }
}
