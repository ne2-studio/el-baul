using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddBaulFeedCursors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BaulFeedCursors",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    BaulId = table.Column<Guid>(type: "uuid", nullable: false),
                    LastSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BaulFeedCursors", x => new { x.UserId, x.BaulId });
                    table.ForeignKey(
                        name: "FK_BaulFeedCursors_Baules_BaulId",
                        column: x => x.BaulId,
                        principalTable: "Baules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BaulFeedCursors_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BaulFeedCursors_BaulId",
                table: "BaulFeedCursors",
                column: "BaulId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BaulFeedCursors");
        }
    }
}
