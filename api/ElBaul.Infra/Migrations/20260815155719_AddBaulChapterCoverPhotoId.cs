using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddBaulChapterCoverPhotoId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CoverPhotoId",
                table: "Chapters",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CoverPhotoId",
                table: "Baules",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Chapters_CoverPhotoId",
                table: "Chapters",
                column: "CoverPhotoId");

            migrationBuilder.CreateIndex(
                name: "IX_Baules_CoverPhotoId",
                table: "Baules",
                column: "CoverPhotoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Baules_Photos_CoverPhotoId",
                table: "Baules",
                column: "CoverPhotoId",
                principalTable: "Photos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Chapters_Photos_CoverPhotoId",
                table: "Chapters",
                column: "CoverPhotoId",
                principalTable: "Photos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Baules_Photos_CoverPhotoId",
                table: "Baules");

            migrationBuilder.DropForeignKey(
                name: "FK_Chapters_Photos_CoverPhotoId",
                table: "Chapters");

            migrationBuilder.DropIndex(
                name: "IX_Chapters_CoverPhotoId",
                table: "Chapters");

            migrationBuilder.DropIndex(
                name: "IX_Baules_CoverPhotoId",
                table: "Baules");

            migrationBuilder.DropColumn(
                name: "CoverPhotoId",
                table: "Chapters");

            migrationBuilder.DropColumn(
                name: "CoverPhotoId",
                table: "Baules");
        }
    }
}
