using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddChatMemories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChatMemories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SourceMessageId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatMemories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChatMemories_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChatMemories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ChatMemoryEmbeddings",
                columns: table => new
                {
                    ChatMemoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Vector = table.Column<float[]>(type: "real[]", nullable: false),
                    Model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatMemoryEmbeddings", x => x.ChatMemoryId);
                    table.ForeignKey(
                        name: "FK_ChatMemoryEmbeddings_ChatMemories_ChatMemoryId",
                        column: x => x.ChatMemoryId,
                        principalTable: "ChatMemories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMemories_BaulId_UserId",
                table: "ChatMemories",
                columns: new[] { "BaulId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMemories_UserId",
                table: "ChatMemories",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatMemoryEmbeddings_BaulId_UserId",
                table: "ChatMemoryEmbeddings",
                columns: new[] { "BaulId", "UserId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChatMemoryEmbeddings");

            migrationBuilder.DropTable(
                name: "ChatMemories");
        }
    }
}
