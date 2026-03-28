FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY booking-service.csproj ./
RUN dotnet restore booking-service.csproj

COPY . ./
RUN dotnet publish booking-service.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish ./

EXPOSE 8082

ENTRYPOINT ["dotnet", "booking-service.dll"]
