using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using PrimeNumberGenerator.Domain.PrimeNumbers;
using PrimeNumberGenerator.Infrastructure.Publishing;

namespace PrimeNumberGenerator.Infrastructure.Tests.Publishing;

public sealed class ConsolePrimeNumberPublisherTests
{
    [Fact]
    public async Task PublishAsync_ShouldComplete_ForAValidPrimeNumber()
    {
        var publisher = new ConsolePrimeNumberPublisher(NullLogger<ConsolePrimeNumberPublisher>.Instance);
        var primeNumber = PrimeNumber.Create(17, new BitLength(5), DateTimeOffset.UtcNow);

        var act = async () => await publisher.PublishAsync(primeNumber, CancellationToken.None);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task PublishAsync_ShouldThrow_WhenPrimeNumberIsNull()
    {
        var publisher = new ConsolePrimeNumberPublisher(NullLogger<ConsolePrimeNumberPublisher>.Instance);

        var act = async () => await publisher.PublishAsync(null!, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }
}
