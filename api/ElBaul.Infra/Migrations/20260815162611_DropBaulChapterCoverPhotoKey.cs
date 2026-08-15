using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class DropBaulChapterCoverPhotoKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CoverPhotoKey",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "CoverPhotoKey",
                table: "Baules");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CoverPhotoKey",
                table: "Chapters",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CoverPhotoKey",
                table: "Baules",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }
    }
}
