using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddAlbumIdAndNullablePhotoIdToRecuerdo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "PhotoId",
                table: "Recuerdos",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "AlbumId",
                table: "Recuerdos",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Recuerdos_AlbumId",
                table: "Recuerdos",
                column: "AlbumId");

            migrationBuilder.AddForeignKey(
                name: "FK_Recuerdos_Albums_AlbumId",
                table: "Recuerdos",
                column: "AlbumId",
                principalTable: "Albums",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Recuerdos_Albums_AlbumId",
                table: "Recuerdos");

            migrationBuilder.DropIndex(
                name: "IX_Recuerdos_AlbumId",
                table: "Recuerdos");

            migrationBuilder.DropColumn(
                name: "AlbumId",
                table: "Recuerdos");

            migrationBuilder.AlterColumn<Guid>(
                name: "PhotoId",
                table: "Recuerdos",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
