FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY src/PrimeNumberGenerator.Domain/PrimeNumberGenerator.Domain.csproj src/PrimeNumberGenerator.Domain/
COPY src/PrimeNumberGenerator.Application/PrimeNumberGenerator.Application.csproj src/PrimeNumberGenerator.Application/
COPY src/PrimeNumberGenerator.Infrastructure/PrimeNumberGenerator.Infrastructure.csproj src/PrimeNumberGenerator.Infrastructure/
COPY src/PrimeNumberGenerator.Api/PrimeNumberGenerator.Api.csproj src/PrimeNumberGenerator.Api/

RUN dotnet restore src/PrimeNumberGenerator.Api/PrimeNumberGenerator.Api.csproj

COPY src/ src/
RUN dotnet publish src/PrimeNumberGenerator.Api/PrimeNumberGenerator.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

USER $APP_UID

ENTRYPOINT ["dotnet", "PrimeNumberGenerator.Api.dll"]
