FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["ElBaul.Api.Lite/ElBaul.Api.Lite.csproj", "ElBaul.Api.Lite/"]
COPY ["ElBaul.Core/ElBaul.Core.csproj", "ElBaul.Core/"]
COPY ["ElBaul.Infra.Common/ElBaul.Infra.Common.csproj", "ElBaul.Infra.Common/"]
COPY ["ElBaul.Infra.Lite/ElBaul.Infra.Lite.csproj", "ElBaul.Infra.Lite/"]
COPY ["ElBaul.Api.Common/ElBaul.Api.Common.csproj", "ElBaul.Api.Common/"]
RUN dotnet restore "ElBaul.Api.Lite/ElBaul.Api.Lite.csproj"

# Copy the rest of the code
COPY . .

# Build and publish
RUN dotnet publish "ElBaul.Api.Lite/ElBaul.Api.Lite.csproj" -c Release -o /app/publish

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
WORKDIR /app

# Alpine ships no tzdata by default — TimeZoneInfo.FindSystemTimeZoneById("Europe/Madrid")
# (UserSessionManager, the daily aggregation jobs) throws TimeZoneNotFoundException without it.
RUN apk upgrade --no-cache \
    && apk add --no-cache tzdata

COPY --from=build /app/publish .

# Expose port
EXPOSE 8080

# Set the entry point
ENTRYPOINT ["dotnet", "ElBaul.Api.Lite.dll"]
