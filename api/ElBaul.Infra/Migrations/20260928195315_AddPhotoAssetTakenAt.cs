using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddPhotoAssetTakenAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DateDay",
                table: "PhotoAssets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DateMonth",
                table: "PhotoAssets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DateYear",
                table: "PhotoAssets",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DateDay",
                table: "PhotoAssets");

            migrationBuilder.DropColumn(
                name: "DateMonth",
                table: "PhotoAssets");

            migrationBuilder.DropColumn(
                name: "DateYear",
                table: "PhotoAssets");
        }
    }
}
