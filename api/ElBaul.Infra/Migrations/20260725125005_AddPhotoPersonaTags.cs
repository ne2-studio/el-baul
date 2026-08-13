using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddPhotoPersonaTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PhotoPersonaTags",
                columns: table => new
                {
                    PhotoId = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonaId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhotoPersonaTags", x => new { x.PhotoId, x.PersonaId });
                    table.ForeignKey(
                        name: "FK_PhotoPersonaTags_Personas_PersonaId",
                        column: x => x.PersonaId,
                        principalTable: "Personas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PhotoPersonaTags_Photos_PhotoId",
                        column: x => x.PhotoId,
                        principalTable: "Photos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PhotoPersonaTags_BaulId",
                table: "PhotoPersonaTags",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_PhotoPersonaTags_PersonaId",
                table: "PhotoPersonaTags",
                column: "PersonaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PhotoPersonaTags");
        }
    }
}
