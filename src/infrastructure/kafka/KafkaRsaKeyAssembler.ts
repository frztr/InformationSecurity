import { Kafka, type Consumer, logLevel } from "kafkajs";
import type { ICollectedPrimeNumberRepository } from "@/domain/cryptography/primes/ICollectedPrimeNumberRepository";
import { bitLengthOf } from "@/domain/cryptography/primes/BigIntegerArithmetic";
import { RsaKeyPairAssembler } from "@/domain/cryptography/rsa/RsaKeyPairAssembler";
import type { ISystemRsaKeyStore } from "@/domain/cryptography/rsa/ISystemRsaKeyStore";

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
 * Сохраняет простые из топика Kafka и собирает системную пару RSA, когда в пуле достаточно подходящих простых.
 */
export class KafkaRsaKeyAssembler {
  private consumer: Consumer | null = null;
  private started = false;

  public constructor(
    private readonly settings: KafkaPrimeConsumerSettings,
    private readonly collectedPrimeNumberRepository: ICollectedPrimeNumberRepository,
    private readonly systemRsaKeyStore: ISystemRsaKeyStore,
    private readonly rsaKeyPairAssembler: RsaKeyPairAssembler,
    private readonly publicExponent: bigint,
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
   * Запускает сборку: при готовом ключе нужной длины выходит; иначе помечает GENERATING, пробует пул и подписывается на Kafka с повторами.
   * @returns Ничего после успешного подключения или если ключ уже готов.
   */
  public async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;

    const existingKey = await this.systemRsaKeyStore.tryGetKeyPair();
    if (existingKey && bitLengthOf(existingKey.publicKey.modulus) === this.modulusBitLength) {
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

  /**
   * Подключается к Kafka, при необходимости создаёт топик и обрабатывает сообщения с простыми.
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
        const alreadyReady = await this.systemRsaKeyStore.tryGetKeyPair();
        if (alreadyReady && bitLengthOf(alreadyReady.publicKey.modulus) === this.modulusBitLength) {
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

  /**
   * Пытается собрать пару RSA из накопленных простых нужной длины.
   * @returns `true`, если пара сохранена в хранилище ключей.
   */
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
