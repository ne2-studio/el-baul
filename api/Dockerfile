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

# ElBaul.Maintenance is a separate executable (see docs/operations/maintenance-commands.md) —
# published into the same output directory so it ships in the same image/container as the web
# app, runnable via `docker exec <container> dotnet ElBaul.Maintenance.dll <command>`.
RUN dotnet publish "ElBaul.Maintenance/ElBaul.Maintenance.csproj" -c Release -o /app/publish

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
WORKDIR /app

# imagemagick-heic pulls in libheif, giving `magick` HEIC/HEIF decode support; imagemagick-jpeg
# is the JPEG delegate, needed separately since Alpine splits format support into subpackages.
# Both used by HeicToJpegPhotoImageNormalizer to re-encode iPhone photos to JPEG at upload time.
RUN apk add --no-cache imagemagick imagemagick-heic imagemagick-jpeg

COPY --from=build /app/publish .

# Expose port
EXPOSE 8080

# Set the entry point
ENTRYPOINT ["dotnet", "ElBaul.Api.dll"]
