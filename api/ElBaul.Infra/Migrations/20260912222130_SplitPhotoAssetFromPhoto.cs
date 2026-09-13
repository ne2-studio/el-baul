using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <summary>
    /// Slice 1 of the multi-vault photo groundwork (docs/.backlog issue #62): splits the
    /// asset-intrinsic columns (StorageKey, dimensions, sizes) off Photo into their own
    /// PhotoAssets table, referenced via the new Photo.PhotoAssetId. Every existing Photo gets
    /// its own PhotoAsset, reusing the same Id — see Photo.Create's doc comment for why that's
    /// safe (nothing yet lets two Photos share one PhotoAsset). No data is lost: every moved
    /// column is copied into PhotoAssets before being dropped from Photos.
    /// </summary>
    public partial class SplitPhotoAssetFromPhoto : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PhotoAssets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false, defaultValue: 0L),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OriginalSizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    OriginalContentHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Height = table.Column<int>(type: "integer", nullable: false),
                    Width = table.Column<int>(type: "integer", nullable: false),
                    OriginalHeight = table.Column<int>(type: "integer", nullable: true),
                    OriginalWidth = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhotoAssets", x => x.Id);
                });

            // Backfill: one PhotoAsset per existing Photo, reusing the Photo's own Id — see
            // Photo.Create's doc comment. Runs before the old columns are dropped below so
            // nothing is lost.
            migrationBuilder.Sql(
                """
                INSERT INTO "PhotoAssets" ("Id", "StorageKey", "SizeBytes", "CreatedAt", "OriginalSizeBytes", "OriginalContentHash", "Height", "Width", "OriginalHeight", "OriginalWidth")
                SELECT "Id", "StorageKey", "SizeBytes", "CreatedAt", "OriginalSizeBytes", "OriginalContentHash", "Height", "Width", "OriginalHeight", "OriginalWidth"
                FROM "Photos";
                """);

            migrationBuilder.AddColumn<Guid>(
                name: "PhotoAssetId",
                table: "Photos",
                type: "uuid",
                nullable: true);

            // Every Photo points at the PhotoAsset backfilled above under the same Id.
            migrationBuilder.Sql(
                """UPDATE "Photos" SET "PhotoAssetId" = "Id";""");

            migrationBuilder.AlterColumn<Guid>(
                name: "PhotoAssetId",
                table: "Photos",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Photos_PhotoAssetId",
                table: "Photos",
                column: "PhotoAssetId");

            migrationBuilder.AddForeignKey(
                name: "FK_Photos_PhotoAssets_PhotoAssetId",
                table: "Photos",
                column: "PhotoAssetId",
                principalTable: "PhotoAssets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // OriginalContentHash deliberately stays on Photos too (see Photo.OriginalContentHash's
            // doc comment) — IX_Photos_BaulId_OriginalContentHash_Active still needs it there.
            migrationBuilder.DropColumn(
                name: "Height",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "OriginalHeight",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "OriginalSizeBytes",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "OriginalWidth",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "SizeBytes",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "StorageKey",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "Width",
                table: "Photos");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Height",
                table: "Photos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OriginalHeight",
                table: "Photos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "OriginalSizeBytes",
                table: "Photos",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OriginalWidth",
                table: "Photos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SizeBytes",
                table: "Photos",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StorageKey",
                table: "Photos",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Width",
                table: "Photos",
                type: "integer",
                nullable: true);

            // Best-effort restore from each Photo's own PhotoAsset before it's dropped below —
            // only exact for the 1:1 shape this slice guarantees; a later slice where PhotoAssetId
            // is shared across Photos would need a real decision here instead.
            migrationBuilder.Sql(
                """
                UPDATE "Photos" p
                SET "StorageKey" = a."StorageKey", "SizeBytes" = a."SizeBytes", "Width" = a."Width", "Height" = a."Height",
                    "OriginalWidth" = a."OriginalWidth", "OriginalHeight" = a."OriginalHeight", "OriginalSizeBytes" = a."OriginalSizeBytes"
                FROM "PhotoAssets" a
                WHERE p."PhotoAssetId" = a."Id";
                """);

            migrationBuilder.AlterColumn<string>(
                name: "StorageKey",
                table: "Photos",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000,
                oldNullable: true);

            migrationBuilder.AlterColumn<long>(
                name: "SizeBytes",
                table: "Photos",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "Width",
                table: "Photos",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "Height",
                table: "Photos",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.DropForeignKey(
                name: "FK_Photos_PhotoAssets_PhotoAssetId",
                table: "Photos");

            migrationBuilder.DropIndex(
                name: "IX_Photos_PhotoAssetId",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "PhotoAssetId",
                table: "Photos");

            migrationBuilder.DropTable(
                name: "PhotoAssets");
        }
    }
}
