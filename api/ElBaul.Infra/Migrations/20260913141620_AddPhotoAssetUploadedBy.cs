using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddPhotoAssetUploadedBy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Nullable first, then backfilled, then locked to NOT NULL below — every existing
            // PhotoAsset can be backfilled with total confidence because its Id always reuses
            // the Guid of the Photo that originally created it (see Photo.Create's doc comment),
            // so this join finds exactly one row per asset, even one whose Photo has since been
            // soft- or hard-deleted (soft-deleted Photos are untouched by any delete path; a
            // hard-deleted one — the rare admin baúl-deletion path — is the only case this join
            // could miss, and none exist yet since that path predates no data in production).
            migrationBuilder.AddColumn<string>(
                name: "UploadedBy",
                table: "PhotoAssets",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "PhotoAssets" pa
                SET "UploadedBy" = p."UploadedBy"
                FROM "Photos" p
                WHERE p."Id" = pa."Id" AND pa."UploadedBy" IS NULL
                """);

            migrationBuilder.AlterColumn<string>(
                name: "UploadedBy",
                table: "PhotoAssets",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UploadedBy",
                table: "PhotoAssets");
        }
    }
}
