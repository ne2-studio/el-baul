FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["ServiceTemplate.Api/ServiceTemplate.Api.csproj", "ServiceTemplate.Api/"]
COPY ["ServiceTemplate/ServiceTemplate.csproj", "ServiceTemplate/"]
COPY ["ServiceTemplate.Infra/ServiceTemplate.Infra.csproj", "ServiceTemplate.Infra/"]
RUN dotnet restore "ServiceTemplate.Api/ServiceTemplate.Api.csproj"

# Copy the rest of the code
COPY . .

# Build and publish
RUN dotnet build "ServiceTemplate.Api/ServiceTemplate.Api.csproj" -c Release -o /app/build
RUN dotnet publish "ServiceTemplate.Api/ServiceTemplate.Api.csproj" -c Release -o /app/publish

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .

# Expose port
EXPOSE 8080

# Set the entry point
ENTRYPOINT ["dotnet", "ServiceTemplate.Api.dll"]
