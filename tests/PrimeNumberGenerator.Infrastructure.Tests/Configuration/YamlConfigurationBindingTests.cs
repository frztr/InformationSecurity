using FluentAssertions;
using Microsoft.Extensions.Configuration;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Application.Publishing;
using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;

namespace PrimeNumberGenerator.Infrastructure.Tests.Configuration;

public sealed class YamlConfigurationBindingTests
{
    [Fact]
    public void YamlFile_ShouldBindPrimeNumberGenerationOptionsIncluding16384BitLength()
    {
        var configuration = LoadYaml(
            """
            PrimeNumberGeneration:
              BitLength: 16384
              MillerRabinWitnessRoundCount: 8
              TrialDivisionPrimeCount: 2048
              PauseBetweenGenerations: 00:00:01
              ParallelSearchWorkerCount: 0
              ReservedIdleProcessorCount: 1
              MaxProcessorUtilizationPercent: 100
              WorkerThreadPriority: BelowNormal
            Publishing:
              Destination: Kafka
            Kafka:
              BootstrapServers: localhost:9094
              Topic: prime-numbers
              ClientId: prime-number-generator
            """);

        var generationOptions = new PrimeNumberGenerationOptions();
        configuration.GetSection(PrimeNumberGenerationOptions.SectionName).Bind(generationOptions);

        var publishingOptions = new PublishingOptions();
        configuration.GetSection(PublishingOptions.SectionName).Bind(publishingOptions);

        var kafkaOptions = new KafkaOptions();
        configuration.GetSection(KafkaOptions.SectionName).Bind(kafkaOptions);

        generationOptions.BitLength.Should().Be(16384);
        generationOptions.MillerRabinWitnessRoundCount.Should().Be(8);
        generationOptions.TrialDivisionPrimeCount.Should().Be(2048);
        generationOptions.PauseBetweenGenerations.Should().Be(TimeSpan.FromSeconds(1));
        generationOptions.ParallelSearchWorkerCount.Should().Be(0);
        generationOptions.ReservedIdleProcessorCount.Should().Be(1);
        generationOptions.MaxProcessorUtilizationPercent.Should().Be(100);
        generationOptions.WorkerThreadPriority.Should().Be(SearchWorkerPriority.BelowNormal);
        publishingOptions.Destination.Should().Be(PublishingDestination.Kafka);
        kafkaOptions.BootstrapServers.Should().Be("localhost:9094");
        kafkaOptions.Topic.Should().Be("prime-numbers");
        kafkaOptions.ClientId.Should().Be("prime-number-generator");
    }

    [Fact]
    public void YamlFile_ShouldBindConsoleDestination()
    {
        var configuration = LoadYaml(
            """
            Publishing:
              Destination: Console
            """);

        var publishingOptions = new PublishingOptions();
        configuration.GetSection(PublishingOptions.SectionName).Bind(publishingOptions);

        publishingOptions.Destination.Should().Be(PublishingDestination.Console);
    }

    private static IConfigurationRoot LoadYaml(string yaml)
    {
        var filePath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid():N}.yml");
        File.WriteAllText(filePath, yaml);

        try
        {
            return new ConfigurationBuilder()
                .AddYamlFile(filePath, optional: false, reloadOnChange: false)
                .Build();
        }
        finally
        {
            File.Delete(filePath);
        }
    }
}
