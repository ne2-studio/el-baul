using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonaProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvatarPhotoKey",
                table: "SharedUsers",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "SharedUsers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvatarPhotoKey",
                table: "SharedUsers");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "SharedUsers");
        }
    }
}
