using Confluent.Kafka;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Application.Publishing;
using PrimeNumberGenerator.Infrastructure.Publishing;

namespace PrimeNumberGenerator.Infrastructure.Tests.Publishing;

public sealed class PrimeNumberPublisherFactoryTests
{
    [Fact]
    public void Resolve_ShouldReturnConsolePublisher_WhenDestinationIsConsole()
    {
        using var testContext = PublisherFactoryTestContext.Create();

        var factory = new PrimeNumberPublisherFactory(
            Options.Create(new PublishingOptions { Destination = PublishingDestination.Console }),
            testContext.ServiceProvider);

        factory.Resolve().Should().BeSameAs(testContext.ConsolePublisher);
    }

    [Fact]
    public void Resolve_ShouldReturnKafkaPublisher_WhenDestinationIsKafka()
    {
        using var testContext = PublisherFactoryTestContext.Create();

        var factory = new PrimeNumberPublisherFactory(
            Options.Create(new PublishingOptions { Destination = PublishingDestination.Kafka }),
            testContext.ServiceProvider);

        factory.Resolve().Should().BeSameAs(testContext.KafkaPublisher);
    }

    [Fact]
    public void Resolve_ShouldThrow_WhenDestinationIsNotSupported()
    {
        using var testContext = PublisherFactoryTestContext.Create();

        var factory = new PrimeNumberPublisherFactory(
            Options.Create(new PublishingOptions { Destination = (PublishingDestination)123 }),
            testContext.ServiceProvider);

        var act = () => factory.Resolve();

        act.Should().Throw<InvalidOperationException>().WithMessage("*Console*Kafka*");
    }

    private sealed class PublisherFactoryTestContext : IDisposable
    {
        public required ServiceProvider ServiceProvider { get; init; }

        public required ConsolePrimeNumberPublisher ConsolePublisher { get; init; }

        public required KafkaPrimeNumberPublisher KafkaPublisher { get; init; }

        public static PublisherFactoryTestContext Create()
        {
            var consolePublisher = new ConsolePrimeNumberPublisher(NullLogger<ConsolePrimeNumberPublisher>.Instance);

            var kafkaProducerFactory = Substitute.For<IKafkaProducerFactory>();
            kafkaProducerFactory.Create().Returns(Substitute.For<IProducer<string, string>>());
            var kafkaPublisher = new KafkaPrimeNumberPublisher(
                kafkaProducerFactory,
                Options.Create(new KafkaOptions()),
                NullLogger<KafkaPrimeNumberPublisher>.Instance);

            var serviceCollection = new ServiceCollection();
            serviceCollection.AddSingleton(consolePublisher);
            serviceCollection.AddSingleton(kafkaPublisher);

            return new PublisherFactoryTestContext
            {
                ServiceProvider = serviceCollection.BuildServiceProvider(),
                ConsolePublisher = consolePublisher,
                KafkaPublisher = kafkaPublisher
            };
        }

        public void Dispose()
        {
            KafkaPublisher.Dispose();
            ServiceProvider.Dispose();
        }
    }
}
