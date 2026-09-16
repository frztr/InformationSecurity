import { Kafka, type Consumer, logLevel } from "kafkajs";
import type { CollectedPrimeNumberRepository } from "@/domain/cryptography/primes/CollectedPrimeNumberRepository";
import { RsaKeyPairAssembler } from "@/domain/cryptography/rsa/RsaKeyPairAssembler";
import type { SystemRsaKeyStore } from "@/domain/cryptography/rsa/SystemRsaKeyStore";

export type KafkaPrimeConsumerSettings = {
  brokers: string[];
  topic: string;
  clientId: string;
  groupId: string;
};

type PrimeNumberPublishedMessage = {
  decimalValue: string;
  bitLength: number;
  generatedAtUtc: string;
};

/**
 * Забирает простые числа из Kafka (ветка IS-prime-number-generator)
 * и собирает из двух 16384-битных простых ключ RSA-32768.
 */
export class KafkaRsaKeyAssembler {
  private consumer: Consumer | null = null;
  private started = false;

  public constructor(
    private readonly settings: KafkaPrimeConsumerSettings,
    private readonly collectedPrimeNumberRepository: CollectedPrimeNumberRepository,
    private readonly systemRsaKeyStore: SystemRsaKeyStore,
    private readonly rsaKeyPairAssembler: RsaKeyPairAssembler,
    private readonly publicExponent: bigint,
    private readonly modulusBitLength: number,
  ) {}

  public expectedPrimeBitLength(): number {
    return this.modulusBitLength / 2;
  }

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;

    const existingKey = await this.systemRsaKeyStore.tryGetKeyPair();
    if (existingKey && existingKey.publicKey.modulusBitLength === this.modulusBitLength) {
      return;
    }

    await this.systemRsaKeyStore.markGenerating(this.modulusBitLength);
    const assembledFromStoredPrimes = await this.tryAssembleFromStoredPrimes();
    if (assembledFromStoredPrimes) {
      return;
    }

    let attempt = 0;
    for (;;) {
      attempt += 1;
      try {
        await this.connectAndConsume();
        return;
      } catch (error: unknown) {
        console.error(`Kafka RSA consumer, попытка ${attempt}:`, error);
        await this.disconnectConsumer();
        await delay(Math.min(15_000, 1000 * attempt));
      }
    }
  }

  private async connectAndConsume(): Promise<void> {
    const kafka = new Kafka({
      clientId: this.settings.clientId,
      brokers: this.settings.brokers,
      logLevel: logLevel.WARN,
      connectionTimeout: 10_000,
      retry: { initialRetryTime: 500, retries: 12 },
    });

    await this.ensureTopicExists(kafka);

    this.consumer = kafka.consumer({ groupId: this.settings.groupId });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.settings.topic, fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const alreadyReady = await this.systemRsaKeyStore.tryGetKeyPair();
        if (alreadyReady && alreadyReady.publicKey.modulusBitLength === this.modulusBitLength) {
          return;
        }

        if (!message.value) {
          return;
        }

        const payload = JSON.parse(message.value.toString("utf8")) as PrimeNumberPublishedMessage;
        if (payload.bitLength !== this.expectedPrimeBitLength()) {
          console.info(
            `Пропущено простое ${payload.bitLength} бит: для RSA-${this.modulusBitLength} нужны ${this.expectedPrimeBitLength()}-битные.`,
          );
          return;
        }

        await this.collectedPrimeNumberRepository.addIfAbsent(payload.decimalValue, payload.bitLength);
        const assembled = await this.tryAssembleFromStoredPrimes();
        if (assembled) {
          console.info(`Ключ RSA-${this.modulusBitLength} собран из простых, опубликованных в Kafka.`);
        }
      },
    });

    console.info(
      `Ожидание ${this.expectedPrimeBitLength()}-битных простых из Kafka (${this.settings.topic}) для RSA-${this.modulusBitLength}.`,
    );
  }

  private async ensureTopicExists(kafka: Kafka): Promise<void> {
    const admin = kafka.admin();
    await admin.connect();
    try {
      const topics = await admin.listTopics();
      if (topics.includes(this.settings.topic)) {
        return;
      }
      await admin.createTopics({
        waitForLeaders: true,
        topics: [{ topic: this.settings.topic, numPartitions: 1, replicationFactor: 1 }],
      });
    } finally {
      await admin.disconnect();
    }
  }

  private async disconnectConsumer(): Promise<void> {
    if (!this.consumer) {
      return;
    }
    try {
      await this.consumer.disconnect();
    } catch {
      // повторное подключение важнее ошибки disconnect
    }
    this.consumer = null;
  }

  private async tryAssembleFromStoredPrimes(): Promise<boolean> {
    const storedPrimes = await this.collectedPrimeNumberRepository.listByBitLength(this.expectedPrimeBitLength());
    const primeValues = storedPrimes.map((item) => BigInt(item.decimalValue));
    const keyPair = this.rsaKeyPairAssembler.tryAssembleFromPool(
      primeValues,
      this.publicExponent,
      this.modulusBitLength,
    );
    if (!keyPair) {
      return false;
    }
    await this.systemRsaKeyStore.saveKeyPair(keyPair);
    return true;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
