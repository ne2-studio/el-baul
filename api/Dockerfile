FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["ElBaul.Api/ElBaul.Api.csproj", "ElBaul.Api/"]
COPY ["ElBaul/ElBaul.csproj", "ElBaul/"]
COPY ["ElBaul.Infra/ElBaul.Infra.csproj", "ElBaul.Infra/"]
COPY ["ElBaul.Maintenance/ElBaul.Maintenance.csproj", "ElBaul.Maintenance/"]
RUN dotnet restore "ElBaul.Api/ElBaul.Api.csproj"

# Copy the rest of the code
COPY . .

# Build and publish
RUN dotnet build "ElBaul.Api/ElBaul.Api.csproj" -c Release -o /app/build
RUN dotnet publish "ElBaul.Api/ElBaul.Api.csproj" -c Release -o /app/publish

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
WORKDIR /app
COPY --from=build /app/publish .

# Expose port
EXPOSE 8080

# Set the entry point
ENTRYPOINT ["dotnet", "ElBaul.Api.dll"]
