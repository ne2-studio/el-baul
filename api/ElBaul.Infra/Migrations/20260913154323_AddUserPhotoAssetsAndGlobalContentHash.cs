using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPhotoAssetsAndGlobalContentHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserPhotoAssets",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PhotoAssetId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPhotoAssets", x => new { x.UserId, x.PhotoAssetId });
                    table.ForeignKey(
                        name: "FK_UserPhotoAssets_PhotoAssets_PhotoAssetId",
                        column: x => x.PhotoAssetId,
                        principalTable: "PhotoAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // Backfill UserPhotoAssets from existing PhotoAsset.UploadedBy (Slice 2.5,
            // docs/.backlog issue #62): UploadedBy already correctly names "whoever contributed
            // this asset" for every PhotoAsset created so far — the AddPhotoAssetUploadedBy
            // migration derived it from each asset's own originating Photo, and every PhotoAsset
            // created before this slice is still strictly 1:1 with a single originating
            // Photo/user (global asset reuse didn't exist yet), so this can never create two
            // relations for one legitimate upload nor attribute an asset to the wrong
            // contributor.
            migrationBuilder.Sql(
                """
                INSERT INTO "UserPhotoAssets" ("UserId", "PhotoAssetId", "AddedAt")
                SELECT pa."UploadedBy", pa."Id", pa."CreatedAt"
                FROM "PhotoAssets" pa
                ON CONFLICT ("UserId", "PhotoAssetId") DO NOTHING
                """);

            // Before locking OriginalContentHash to be globally unique below, resolve any
            // pre-existing collisions: every PhotoAsset created before this slice got its own
            // row even for byte-identical content re-uploaded to a different baúl or by a
            // different user (global reuse didn't exist yet), so two or more distinct PhotoAsset
            // rows can legitimately share a hash today. Retroactively merging those into one
            // canonical row would mean repointing every Photo/UserPhotoAsset that references the
            // "losing" rows — a much larger, riskier migration than this slice needs (see
            // docs/.backlog issue #62 §11 on not guessing duplicate identity across ambiguous
            // legacy data). Instead: the oldest asset in each colliding group keeps its hash —
            // it's the one future uploads of that content will match against — and every other
            // asset in the group keeps its own bytes, Photos and UserPhotoAssets exactly as they
            // are, just with its OriginalContentHash cleared. It becomes a legacy asset with no
            // usable hash, the same state genuinely pre-hash PhotoAssets are already in, rather
            // than being deleted or merged.
            migrationBuilder.Sql(
                """
                WITH ranked AS (
                    SELECT "Id",
                           ROW_NUMBER() OVER (PARTITION BY "OriginalContentHash" ORDER BY "CreatedAt", "Id") AS rn
                    FROM "PhotoAssets"
                    WHERE "OriginalContentHash" IS NOT NULL
                )
                UPDATE "PhotoAssets" pa
                SET "OriginalContentHash" = NULL
                FROM ranked
                WHERE pa."Id" = ranked."Id" AND ranked.rn > 1
                """);

            migrationBuilder.CreateIndex(
                name: "IX_PhotoAssets_OriginalContentHash",
                table: "PhotoAssets",
                column: "OriginalContentHash",
                unique: true,
                filter: "\"OriginalContentHash\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_UserPhotoAssets_PhotoAssetId",
                table: "UserPhotoAssets",
                column: "PhotoAssetId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserPhotoAssets");

            migrationBuilder.DropIndex(
                name: "IX_PhotoAssets_OriginalContentHash",
                table: "PhotoAssets");
        }
    }
}
