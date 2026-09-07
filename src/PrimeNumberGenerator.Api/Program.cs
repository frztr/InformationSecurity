using PrimeNumberGenerator.Api.Workers;
using PrimeNumberGenerator.Infrastructure.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.Sources.Clear();
builder.Configuration
    .AddYamlFile("appsettings.yml", optional: false, reloadOnChange: true)
    .AddYamlFile($"appsettings.{builder.Environment.EnvironmentName}.yml", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables()
    .AddCommandLine(args);

builder.Services.AddHealthChecks();
builder.Services.AddPrimeNumberGeneration(builder.Configuration);
builder.Services.AddHostedService<PrimeNumberGenerationWorker>();

var application = builder.Build();

if (!application.Environment.IsDevelopment())
{
    application.UseHttpsRedirection();
}

application.MapHealthChecks("/health");

application.Run();
