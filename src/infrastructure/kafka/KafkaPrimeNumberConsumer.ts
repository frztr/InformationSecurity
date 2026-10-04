import { Kafka, type Consumer, logLevel } from "kafkajs";
import type { ICollectedPrimeNumberRepository } from "@/domain/cryptography/primes/ICollectedPrimeNumberRepository";

/**
 * Параметры потребителя Kafka для простых чисел.
 */
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
 * Копит простые из топика Kafka. Пары RSA из них собираются отдельно, по одной на ключ.
 */
export class KafkaPrimeNumberConsumer {
  private consumer: Consumer | null = null;
  private started = false;

  public constructor(
    private readonly settings: KafkaPrimeConsumerSettings,
    private readonly collectedPrimeNumberRepository: ICollectedPrimeNumberRepository,
    private readonly modulusBitLength: number,
  ) {}

  /**
   * Ожидаемая битовая длина простых: половина длины модуля RSA.
   * @returns Число бит простого.
   */
  public expectedPrimeBitLength(): number {
    return this.modulusBitLength / 2;
  }

  /**
   * Подписывается на топик и сохраняет простые нужной длины.
   * @returns Ничего после успешного подключения.
   */
  public async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;

    let attempt = 0;
    for (;;) {
      attempt += 1;
      try {
        await this.connectAndConsume();
        return;
      } catch (error: unknown) {
        console.error(`Kafka consumer простых, попытка ${attempt}:`, error);
        await this.disconnectConsumer();
        await delay(Math.min(15_000, 1000 * attempt));
      }
    }
  }

  /**
   * Подключается к Kafka, при необходимости создаёт топик и сохраняет сообщения с простыми.
   */
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
      },
    });

    console.info(
      `Приём ${this.expectedPrimeBitLength()}-битных простых из Kafka (${this.settings.topic}) для ключей RSA-${this.modulusBitLength}.`,
    );
  }

  /**
   * Создаёт топик простых чисел, если его ещё нет.
   * @param kafka Клиент Kafka.
   */
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

  /**
   * Отключает потребителя перед повторным подключением.
   */
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
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
