using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonaSpouseRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PersonaSpouseRelationships",
                columns: table => new
                {
                    PersonaId1 = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonaId2 = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonaSpouseRelationships", x => new { x.PersonaId1, x.PersonaId2 });
                    table.ForeignKey(
                        name: "FK_PersonaSpouseRelationships_Personas_PersonaId1",
                        column: x => x.PersonaId1,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PersonaSpouseRelationships_Personas_PersonaId2",
                        column: x => x.PersonaId2,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PersonaSpouseRelationships_BaulId",
                table: "PersonaSpouseRelationships",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonaSpouseRelationships_PersonaId2",
                table: "PersonaSpouseRelationships",
                column: "PersonaId2");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PersonaSpouseRelationships");
        }
    }
}
