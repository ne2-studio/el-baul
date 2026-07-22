using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddBaulIdToRecuerdo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BaulId",
                table: "Recuerdos",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Recuerdos_BaulId",
                table: "Recuerdos",
                column: "BaulId");

            migrationBuilder.AddForeignKey(
                name: "FK_Recuerdos_Baules_BaulId",
                table: "Recuerdos",
                column: "BaulId",
                principalTable: "Baules",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Recuerdos_Baules_BaulId",
                table: "Recuerdos");

            migrationBuilder.DropIndex(
                name: "IX_Recuerdos_BaulId",
                table: "Recuerdos");

            migrationBuilder.DropColumn(
                name: "BaulId",
                table: "Recuerdos");
        }
    }
}
