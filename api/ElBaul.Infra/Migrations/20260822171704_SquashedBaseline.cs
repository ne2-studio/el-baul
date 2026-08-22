using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <summary>
    /// Replaces the 54 migrations from InitialCreate (2026-07-12) through
    /// AddUserActivityDaily (2026-08-22) with the single schema they'd produced. Regenerated
    /// from the current model via `dotnet ef migrations add`, then hand-edited to append the
    /// three `analytics.*` tables that live outside the EF model (raw SQL only — see the
    /// comment in Up()/Down()). Safe because prod's `__EFMigrationsHistory` is manually seeded
    /// with a `SquashedBaseline` row before this ships, so MigrateAsync() treats it as already
    /// applied and never re-runs it; only fresh databases (tests, new dev envs) actually
    /// execute it. The squashed-away migrations still live in git history if anyone ever needs
    /// to see the step-by-step evolution.
    /// </summary>
    public partial class SquashedBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TvPairings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClaimedSessionToken = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TvPairings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastAccessAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WeeklyDigestEnabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    HasSeenOnboarding = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    LastPushDigestSentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PushTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Token = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    Platform = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PushTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PushTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SentEmails",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Subject = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    RecipientEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    TemplateVersion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Locale = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DeduplicationKey = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ProviderMessageId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    SendAttemptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    ActivitySince = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ActivityUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FirstClickedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FirstOpenedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SentEmails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SentEmails_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EmailLinkClicks",
                columns: table => new
                {
                    Token = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    SentEmailId = table.Column<Guid>(type: "uuid", nullable: false),
                    LinkKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DestinationUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FirstClickedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastClickedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClickCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailLinkClicks", x => x.Token);
                    table.ForeignKey(
                        name: "FK_EmailLinkClicks_SentEmails_SentEmailId",
                        column: x => x.SentEmailId,
                        principalTable: "SentEmails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BaulFeedCursors",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    LastSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BaulFeedCursors", x => new { x.UserId, x.BaulId });
                    table.ForeignKey(
                        name: "FK_BaulFeedCursors_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BaulInviteLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BaulInviteLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BaulInviteLinks_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Baules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CustodioId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ChapterCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CoverPhotoId = table.Column<Guid>(type: "uuid", nullable: true),
                    CoverCropScale = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false, defaultValue: 1m),
                    CoverCropX = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false, defaultValue: 0.5m),
                    CoverCropY = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false, defaultValue: 0.5m)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Baules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Baules_Users_CustodioId",
                        column: x => x.CustodioId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ChatMemories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SourceMessageId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatMemories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChatMemories_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChatMemories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ChatMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChatMessages_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChatMessages_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RemovalRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    PhotoId = table.Column<Guid>(type: "uuid", nullable: false),
                    PhotoStorageKey = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RequesterName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RequesterEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Reason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    RequestDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RemovalRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RemovalRequests_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TvSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TvSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TvSessions_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TvSessions_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ChatMemoryEmbeddings",
                columns: table => new
                {
                    ChatMemoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Vector = table.Column<float[]>(type: "real[]", nullable: false),
                    Model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatMemoryEmbeddings", x => x.ChatMemoryId);
                    table.ForeignKey(
                        name: "FK_ChatMemoryEmbeddings_ChatMemories_ChatMemoryId",
                        column: x => x.ChatMemoryId,
                        principalTable: "ChatMemories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Chapters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PhotoCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false, defaultValue: ""),
                    CoverPhotoId = table.Column<Guid>(type: "uuid", nullable: true),
                    CoverCropScale = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false, defaultValue: 1m),
                    CoverCropX = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false, defaultValue: 0.5m),
                    CoverCropY = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false, defaultValue: 0.5m)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Chapters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Chapters_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Photos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChapterId = table.Column<Guid>(type: "uuid", nullable: true),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    UploadedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClientUploadId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Active"),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletionReason = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    UploadBatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    ConfirmedNoPersonas = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    OriginalSizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    OriginalContentHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Height = table.Column<int>(type: "integer", nullable: false),
                    Width = table.Column<int>(type: "integer", nullable: false),
                    OriginalHeight = table.Column<int>(type: "integer", nullable: true),
                    OriginalWidth = table.Column<int>(type: "integer", nullable: true),
                    DateDay = table.Column<int>(type: "integer", nullable: true),
                    DateMonth = table.Column<int>(type: "integer", nullable: true),
                    DateYear = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Photos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Photos_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Photos_Chapters_ChapterId",
                        column: x => x.ChapterId,
                        principalTable: "Chapters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Personas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Nickname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    InvitedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Biografia = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    AvatarPhotoId = table.Column<Guid>(type: "uuid", nullable: true),
                    AvatarCropScale = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false, defaultValue: 1m),
                    AvatarCropX = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false, defaultValue: 0.5m),
                    AvatarCropY = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false, defaultValue: 0.5m)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Personas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Personas_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Personas_Photos_AvatarPhotoId",
                        column: x => x.AvatarPhotoId,
                        principalTable: "Photos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Personas_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Recuerdos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PhotoId = table.Column<Guid>(type: "uuid", nullable: true),
                    ChapterId = table.Column<Guid>(type: "uuid", nullable: true),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Text = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Recuerdos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Recuerdos_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Recuerdos_Chapters_ChapterId",
                        column: x => x.ChapterId,
                        principalTable: "Chapters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Recuerdos_Photos_PhotoId",
                        column: x => x.PhotoId,
                        principalTable: "Photos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Recuerdos_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PhotoPersonaTags",
                columns: table => new
                {
                    PhotoId = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonaId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhotoPersonaTags", x => new { x.PhotoId, x.PersonaId });
                    table.ForeignKey(
                        name: "FK_PhotoPersonaTags_Personas_PersonaId",
                        column: x => x.PersonaId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PhotoPersonaTags_Photos_PhotoId",
                        column: x => x.PhotoId,
                        principalTable: "Photos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RecuerdoEmbeddings",
                columns: table => new
                {
                    RecuerdoId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    Vector = table.Column<float[]>(type: "real[]", nullable: false),
                    Model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecuerdoEmbeddings", x => x.RecuerdoId);
                    table.ForeignKey(
                        name: "FK_RecuerdoEmbeddings_Recuerdos_RecuerdoId",
                        column: x => x.RecuerdoId,
                        principalTable: "Recuerdos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SharedLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PhotoId = table.Column<Guid>(type: "uuid", nullable: true),
                    RecuerdoId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SharedLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SharedLinks_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SharedLinks_Photos_PhotoId",
                        column: x => x.PhotoId,
                        principalTable: "Photos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SharedLinks_Recuerdos_RecuerdoId",
                        column: x => x.RecuerdoId,
                        principalTable: "Recuerdos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SharedLinks_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BaulFeedCursors_BaulId",
                table: "BaulFeedCursors",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_BaulInviteLinks_BaulId",
                table: "BaulInviteLinks",
                column: "BaulId",
                unique: true,
                filter: "\"RevokedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_BaulInviteLinks_CreatedBy",
                table: "BaulInviteLinks",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_BaulInviteLinks_Token",
                table: "BaulInviteLinks",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Baules_CoverPhotoId",
                table: "Baules",
                column: "CoverPhotoId");

            migrationBuilder.CreateIndex(
                name: "IX_Baules_CustodioId",
                table: "Baules",
                column: "CustodioId");

            migrationBuilder.CreateIndex(
                name: "IX_Chapters_BaulId",
                table: "Chapters",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_Chapters_CoverPhotoId",
                table: "Chapters",
                column: "CoverPhotoId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatMemories_BaulId_UserId",
                table: "ChatMemories",
                columns: new[] { "BaulId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMemories_UserId",
                table: "ChatMemories",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatMemoryEmbeddings_BaulId_UserId",
                table: "ChatMemoryEmbeddings",
                columns: new[] { "BaulId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_BaulId_UserId",
                table: "ChatMessages",
                columns: new[] { "BaulId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_UserId",
                table: "ChatMessages",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_EmailLinkClicks_SentEmailId",
                table: "EmailLinkClicks",
                column: "SentEmailId");

            migrationBuilder.CreateIndex(
                name: "IX_Personas_AvatarPhotoId",
                table: "Personas",
                column: "AvatarPhotoId");

            migrationBuilder.CreateIndex(
                name: "IX_Personas_BaulId",
                table: "Personas",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_Personas_BaulId_UserId",
                table: "Personas",
                columns: new[] { "BaulId", "UserId" },
                unique: true,
                filter: "\"UserId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Personas_UserId",
                table: "Personas",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PhotoPersonaTags_BaulId",
                table: "PhotoPersonaTags",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_PhotoPersonaTags_PersonaId",
                table: "PhotoPersonaTags",
                column: "PersonaId");

            migrationBuilder.CreateIndex(
                name: "IX_Photos_BaulId",
                table: "Photos",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_Photos_BaulId_OriginalContentHash_Active",
                table: "Photos",
                columns: new[] { "BaulId", "OriginalContentHash" },
                unique: true,
                filter: "\"Status\" = 'Active' AND \"OriginalContentHash\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Photos_ChapterId",
                table: "Photos",
                column: "ChapterId");

            migrationBuilder.CreateIndex(
                name: "IX_Photos_ClientUploadId",
                table: "Photos",
                column: "ClientUploadId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Photos_UploadBatchId",
                table: "Photos",
                column: "UploadBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_PushTokens_Token",
                table: "PushTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PushTokens_UserId",
                table: "PushTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RecuerdoEmbeddings_BaulId",
                table: "RecuerdoEmbeddings",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_Recuerdos_BaulId",
                table: "Recuerdos",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_Recuerdos_ChapterId",
                table: "Recuerdos",
                column: "ChapterId");

            migrationBuilder.CreateIndex(
                name: "IX_Recuerdos_PhotoId",
                table: "Recuerdos",
                column: "PhotoId");

            migrationBuilder.CreateIndex(
                name: "IX_Recuerdos_UserId",
                table: "Recuerdos",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RemovalRequests_BaulId",
                table: "RemovalRequests",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_SentEmails_DeduplicationKey",
                table: "SentEmails",
                column: "DeduplicationKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SentEmails_UserId",
                table: "SentEmails",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SharedLinks_BaulId",
                table: "SharedLinks",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_SharedLinks_CreatedBy",
                table: "SharedLinks",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SharedLinks_PhotoId",
                table: "SharedLinks",
                column: "PhotoId");

            migrationBuilder.CreateIndex(
                name: "IX_SharedLinks_RecuerdoId",
                table: "SharedLinks",
                column: "RecuerdoId");

            migrationBuilder.CreateIndex(
                name: "IX_SharedLinks_Token",
                table: "SharedLinks",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TvPairings_Code",
                table: "TvPairings",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TvSessions_BaulId",
                table: "TvSessions",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_TvSessions_CreatedBy",
                table: "TvSessions",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_TvSessions_Token",
                table: "TvSessions",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_BaulFeedCursors_Baules_BaulId",
                table: "BaulFeedCursors",
                column: "BaulId",
                principalTable: "Baules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BaulInviteLinks_Baules_BaulId",
                table: "BaulInviteLinks",
                column: "BaulId",
                principalTable: "Baules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Baules_Photos_CoverPhotoId",
                table: "Baules",
                column: "CoverPhotoId",
                principalTable: "Photos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Chapters_Photos_CoverPhotoId",
                table: "Chapters",
                column: "CoverPhotoId",
                principalTable: "Photos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // The `analytics` schema is queried/written via raw SQL (UserSessionRepository,
            // UserBaulActivityDailyAggregator, UserActivityDailyAggregator), not mapped as EF
            // entities, so `dotnet ef migrations add` can't regenerate it from the model — see
            // this migration's XML doc comment for why it's carried here by hand.
            migrationBuilder.Sql("""
                CREATE SCHEMA IF NOT EXISTS analytics;

                CREATE TABLE analytics.user_sessions (
                    id uuid NOT NULL,
                    user_id text NOT NULL,
                    opened_at timestamptz NOT NULL,
                    date date NOT NULL,
                    platform text NOT NULL,
                    entry_source text NOT NULL,
                    CONSTRAINT pk_user_sessions PRIMARY KEY (id)
                );

                CREATE INDEX ix_user_sessions_date
                    ON analytics.user_sessions (date);

                CREATE INDEX ix_user_sessions_user_date
                    ON analytics.user_sessions (user_id, date);

                CREATE TABLE analytics.user_baul_activity_daily (
                    date date NOT NULL,
                    user_id text NOT NULL,
                    baul_id uuid NOT NULL,
                    is_contributor boolean NOT NULL,
                    CONSTRAINT pk_user_baul_activity_daily PRIMARY KEY (date, user_id, baul_id)
                );

                CREATE INDEX ix_user_baul_activity_daily_baul_date
                    ON analytics.user_baul_activity_daily (baul_id, date);

                CREATE INDEX ix_user_baul_activity_daily_contributor_date
                    ON analytics.user_baul_activity_daily (is_contributor, date);

                CREATE TABLE analytics.user_activity_daily (
                    date date NOT NULL,
                    active_users_1d integer NOT NULL,
                    active_users_7d integer NOT NULL,
                    active_users_30d integer NOT NULL,
                    CONSTRAINT pk_user_activity_daily PRIMARY KEY (date)
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // See the matching block at the end of Up() — these three tables live outside the
            // EF model, so they don't show up in the auto-generated Drop*Table calls below.
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS analytics.user_activity_daily;
                DROP TABLE IF EXISTS analytics.user_baul_activity_daily;
                DROP TABLE IF EXISTS analytics.user_sessions;
                DROP SCHEMA IF EXISTS analytics;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_Chapters_Baules_BaulId",
                table: "Chapters");

            migrationBuilder.DropForeignKey(
                name: "FK_Photos_Baules_BaulId",
                table: "Photos");

            migrationBuilder.DropForeignKey(
                name: "FK_Chapters_Photos_CoverPhotoId",
                table: "Chapters");

            migrationBuilder.DropTable(
                name: "BaulFeedCursors");

            migrationBuilder.DropTable(
                name: "BaulInviteLinks");

            migrationBuilder.DropTable(
                name: "ChatMemoryEmbeddings");

            migrationBuilder.DropTable(
                name: "ChatMessages");

            migrationBuilder.DropTable(
                name: "EmailLinkClicks");

            migrationBuilder.DropTable(
                name: "PhotoPersonaTags");

            migrationBuilder.DropTable(
                name: "PushTokens");

            migrationBuilder.DropTable(
                name: "RecuerdoEmbeddings");

            migrationBuilder.DropTable(
                name: "RemovalRequests");

            migrationBuilder.DropTable(
                name: "SharedLinks");

            migrationBuilder.DropTable(
                name: "TvPairings");

            migrationBuilder.DropTable(
                name: "TvSessions");

            migrationBuilder.DropTable(
                name: "ChatMemories");

            migrationBuilder.DropTable(
                name: "SentEmails");

            migrationBuilder.DropTable(
                name: "Personas");

            migrationBuilder.DropTable(
                name: "Recuerdos");

            migrationBuilder.DropTable(
                name: "Baules");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Photos");

            migrationBuilder.DropTable(
                name: "Chapters");
        }
    }
}
