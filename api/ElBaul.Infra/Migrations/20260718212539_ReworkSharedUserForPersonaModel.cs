using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class ReworkSharedUserForPersonaModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Nickname is added nullable first so it can be backfilled from the still-present
            // Email column before that column is dropped.
            migrationBuilder.AddColumn<string>(
                name: "Nickname",
                table: "SharedUsers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE \"SharedUsers\" SET \"Nickname\" = COALESCE(split_part(\"Email\", '@', 1), 'Persona')");

            migrationBuilder.AlterColumn<string>(
                name: "Nickname",
                table: "SharedUsers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.DropIndex(
                name: "IX_SharedUsers_BaulId_Email",
                table: "SharedUsers");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "SharedUsers");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "SharedUsers");

            migrationBuilder.CreateIndex(
                name: "IX_SharedUsers_BaulId_UserId",
                table: "SharedUsers",
                columns: new[] { "BaulId", "UserId" },
                unique: true,
                filter: "\"UserId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SharedUsers_BaulId_UserId",
                table: "SharedUsers");

            migrationBuilder.DropColumn(
                name: "Nickname",
                table: "SharedUsers");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "SharedUsers",
                type: "character varying(320)",
                maxLength: 320,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "SharedUsers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_SharedUsers_BaulId_Email",
                table: "SharedUsers",
                columns: new[] { "BaulId", "Email" },
                unique: true);
        }
    }
}
