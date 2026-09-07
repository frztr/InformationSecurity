using System.Numerics;
using Confluent.Kafka;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Domain.PrimeNumbers;
using PrimeNumberGenerator.Infrastructure.Publishing;

namespace PrimeNumberGenerator.Infrastructure.Tests.Publishing;

public sealed class KafkaPrimeNumberPublisherTests
{
    [Fact]
    public async Task PublishAsync_ShouldSendJsonMessageToConfiguredTopic()
    {
        var producer = Substitute.For<IProducer<string, string>>();
        producer
            .ProduceAsync(Arg.Any<string>(), Arg.Any<Message<string, string>>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(new DeliveryResult<string, string>
            {
                Topic = callInfo.Arg<string>(),
                Partition = new Partition(0),
                Offset = new Offset(12),
                Message = callInfo.Arg<Message<string, string>>(),
                Status = PersistenceStatus.Persisted
            }));

        var kafkaProducerFactory = Substitute.For<IKafkaProducerFactory>();
        kafkaProducerFactory.Create().Returns(producer);

        var kafkaOptions = Options.Create(new KafkaOptions
        {
            BootstrapServers = "localhost:9094",
            Topic = "prime-numbers",
            ClientId = "prime-number-generator-tests"
        });

        using var publisher = new KafkaPrimeNumberPublisher(
            kafkaProducerFactory,
            kafkaOptions,
            NullLogger<KafkaPrimeNumberPublisher>.Instance);

        var primeNumber = PrimeNumber.Create(new BigInteger(17), new BitLength(5), DateTimeOffset.Parse("2026-09-06T12:00:00Z"));

        await publisher.PublishAsync(primeNumber, CancellationToken.None);

        await producer.Received(1).ProduceAsync(
            "prime-numbers",
            Arg.Is<Message<string, string>>(message =>
                message.Key == "5"
                && message.Value.Contains("\"decimalValue\":\"17\"")
                && message.Value.Contains("\"bitLength\":5")),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishAsync_ShouldThrow_WhenPrimeNumberIsNull()
    {
        var kafkaProducerFactory = Substitute.For<IKafkaProducerFactory>();
        kafkaProducerFactory.Create().Returns(Substitute.For<IProducer<string, string>>());

        using var publisher = new KafkaPrimeNumberPublisher(
            kafkaProducerFactory,
            Options.Create(new KafkaOptions()),
            NullLogger<KafkaPrimeNumberPublisher>.Instance);

        var act = async () => await publisher.PublishAsync(null!, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }
}
