using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonaAvatarPhotoCrop : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AvatarCropScale",
                table: "Personas",
                type: "numeric(4,2)",
                precision: 4,
                scale: 2,
                nullable: false,
                defaultValue: 1m);

            migrationBuilder.AddColumn<decimal>(
                name: "AvatarCropX",
                table: "Personas",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.5m);

            migrationBuilder.AddColumn<decimal>(
                name: "AvatarCropY",
                table: "Personas",
                type: "numeric(5,4)",
                precision: 5,
                scale: 4,
                nullable: false,
                defaultValue: 0.5m);

            migrationBuilder.AddColumn<Guid>(
                name: "AvatarPhotoId",
                table: "Personas",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Personas_AvatarPhotoId",
                table: "Personas",
                column: "AvatarPhotoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Personas_Photos_AvatarPhotoId",
                table: "Personas",
                column: "AvatarPhotoId",
                principalTable: "Photos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Personas_Photos_AvatarPhotoId",
                table: "Personas");

            migrationBuilder.DropIndex(
                name: "IX_Personas_AvatarPhotoId",
                table: "Personas");

            migrationBuilder.DropColumn(
                name: "AvatarCropScale",
                table: "Personas");

            migrationBuilder.DropColumn(
                name: "AvatarCropX",
                table: "Personas");

            migrationBuilder.DropColumn(
                name: "AvatarCropY",
                table: "Personas");

            migrationBuilder.DropColumn(
                name: "AvatarPhotoId",
                table: "Personas");
        }
    }
}
