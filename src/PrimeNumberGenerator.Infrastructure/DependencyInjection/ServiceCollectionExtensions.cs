using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PrimeNumberGenerator.Application.Configuration;
using PrimeNumberGenerator.Application.Generation;
using PrimeNumberGenerator.Application.Publishing;
using PrimeNumberGenerator.Domain.PrimeNumbers.Generation;
using PrimeNumberGenerator.Domain.PrimeNumbers.Primality;
using PrimeNumberGenerator.Domain.PrimeNumbers.Randomness;
using PrimeNumberGenerator.Infrastructure.Publishing;

namespace PrimeNumberGenerator.Infrastructure.DependencyInjection;

/// <summary>
/// Регистрирует службы предметной области, прикладного слоя и инфраструктуры для генерации простых чисел.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Привязывает YAML-настройки и регистрирует генераторы, публикаторы и вспомогательные службы.
    /// </summary>
    public static IServiceCollection AddPrimeNumberGeneration(
        this IServiceCollection serviceCollection,
        IConfiguration configuration)
    {
        serviceCollection
            .AddOptions<PrimeNumberGenerationOptions>()
            .Bind(configuration.GetSection(PrimeNumberGenerationOptions.SectionName))
            .Validate(options => options.BitLength >= 2, "PrimeNumberGeneration:BitLength must be at least 2.")
            .Validate(
                options => options.MillerRabinWitnessRoundCount >= 1,
                "PrimeNumberGeneration:MillerRabinWitnessRoundCount must be at least 1.")
            .Validate(
                options => options.TrialDivisionPrimeCount is >= 1 and <= SmallPrimeNumberTable.MaximumSupportedPrimeCount,
                $"PrimeNumberGeneration:TrialDivisionPrimeCount must be between 1 and {SmallPrimeNumberTable.MaximumSupportedPrimeCount}.")
            .Validate(
                options => options.ParallelSearchWorkerCount >= 0,
                "PrimeNumberGeneration:ParallelSearchWorkerCount must be greater than or equal to 0. Use 0 to choose the worker count automatically.")
            .Validate(
                options => options.ReservedIdleProcessorCount >= 0,
                "PrimeNumberGeneration:ReservedIdleProcessorCount must be greater than or equal to 0.")
            .Validate(
                options => options.MaxProcessorUtilizationPercent is >= 1 and <= 100,
                "PrimeNumberGeneration:MaxProcessorUtilizationPercent must be between 1 and 100.")
            .Validate(
                options => Enum.IsDefined(options.WorkerThreadPriority),
                "PrimeNumberGeneration:WorkerThreadPriority must be Lowest, BelowNormal or Normal.")
            .ValidateOnStart();

        serviceCollection
            .AddOptions<KafkaOptions>()
            .Bind(configuration.GetSection(KafkaOptions.SectionName))
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.BootstrapServers),
                "Kafka:BootstrapServers must not be empty.")
            .Validate(
                options => !string.IsNullOrWhiteSpace(options.Topic),
                "Kafka:Topic must not be empty.")
            .ValidateOnStart();

        serviceCollection.AddSingleton(TimeProvider.System);
        serviceCollection.AddSingleton<IRandomIntegerSource, CryptographicRandomIntegerSource>();
        serviceCollection.AddSingleton<IPrimeCandidateSource, CryptographicOddPrimeCandidateSource>();
        serviceCollection.AddSingleton<IPrimalityTester, MillerRabinPrimalityTester>();
        serviceCollection.AddSingleton<IProcessorLoadGovernor, ProcessorLoadGovernor>();
        serviceCollection.AddSingleton<IPrimeNumberGenerator, ProbablePrimeNumberGenerator>();
        serviceCollection.AddSingleton<PrimeNumberGenerationProcessor>();
        serviceCollection.AddSingleton<IPrimeNumberPublisher, KafkaPrimeNumberPublisher>();

        return serviceCollection;
    }
}
