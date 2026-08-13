using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddSharedLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SharedLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PhotoId = table.Column<Guid>(type: "uuid", nullable: true),
                    RecuerdoId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedBy = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SharedLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SharedLinks_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SharedLinks_Photos_PhotoId",
                        column: x => x.PhotoId,
                        principalTable: "Photos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SharedLinks_Recuerdos_RecuerdoId",
                        column: x => x.RecuerdoId,
                        principalTable: "Recuerdos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SharedLinks_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SharedLinks_BaulId",
                table: "SharedLinks",
                column: "BaulId");

            migrationBuilder.CreateIndex(
                name: "IX_SharedLinks_CreatedBy",
                table: "SharedLinks",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SharedLinks_PhotoId",
                table: "SharedLinks",
                column: "PhotoId");

            migrationBuilder.CreateIndex(
                name: "IX_SharedLinks_RecuerdoId",
                table: "SharedLinks",
                column: "RecuerdoId");

            migrationBuilder.CreateIndex(
                name: "IX_SharedLinks_Token",
                table: "SharedLinks",
                column: "Token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SharedLinks");
        }
    }
}
