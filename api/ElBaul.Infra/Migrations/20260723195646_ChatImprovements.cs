using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class ChatImprovements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "ChatMessages",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(4000)",
                oldMaxLength: 4000);

            migrationBuilder.CreateTable(
                name: "RecuerdoEmbeddings",
                columns: table => new
                {
                    RecuerdoId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    Vector = table.Column<float[]>(type: "real[]", nullable: false),
                    Model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecuerdoEmbeddings", x => x.RecuerdoId);
                    table.ForeignKey(
                        name: "FK_RecuerdoEmbeddings_Recuerdos_RecuerdoId",
                        column: x => x.RecuerdoId,
                        principalTable: "Recuerdos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecuerdoEmbeddings_BaulId",
                table: "RecuerdoEmbeddings",
                column: "BaulId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecuerdoEmbeddings");

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                table: "ChatMessages",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");
        }
    }
}
