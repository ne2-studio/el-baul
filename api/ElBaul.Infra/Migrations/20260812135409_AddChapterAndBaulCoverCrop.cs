using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddChapterAndBaulCoverCrop : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CoverCropScale",
                table: "Chapters",
                type: "numeric(4,2)",
                precision: 4,
                scale: 2,
                nullable: false,
                defaultValue: 1m);

            migrationBuilder.AddColumn<decimal>(
                name: "CoverCropX",
                table: "Chapters",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.5m);

            migrationBuilder.AddColumn<decimal>(
                name: "CoverCropY",
                table: "Chapters",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.5m);

            migrationBuilder.AddColumn<decimal>(
                name: "CoverCropScale",
                table: "Baules",
                type: "numeric(4,2)",
                precision: 4,
                scale: 2,
                nullable: false,
                defaultValue: 1m);

            migrationBuilder.AddColumn<decimal>(
                name: "CoverCropX",
                table: "Baules",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.5m);

            migrationBuilder.AddColumn<decimal>(
                name: "CoverCropY",
                table: "Baules",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.5m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CoverCropScale",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "CoverCropX",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "CoverCropY",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "CoverCropScale",
                table: "Baules");

            migrationBuilder.DropColumn(
                name: "CoverCropX",
                table: "Baules");

            migrationBuilder.DropColumn(
                name: "CoverCropY",
                table: "Baules");
        }
    }
}
