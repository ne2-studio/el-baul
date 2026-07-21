using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailLinkClickTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FirstClickedAt",
                table: "SentEmails",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EmailLinkClicks",
                columns: table => new
                {
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    SentEmailId = table.Column<Guid>(type: "uuid", nullable: false),
                    LinkKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DestinationUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FirstClickedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastClickedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClickCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailLinkClicks", x => x.Token);
                    table.ForeignKey(
                        name: "FK_EmailLinkClicks_SentEmails_SentEmailId",
                        column: x => x.SentEmailId,
                        principalTable: "SentEmails",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmailLinkClicks_SentEmailId",
                table: "EmailLinkClicks",
                column: "SentEmailId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmailLinkClicks");

            migrationBuilder.DropColumn(
                name: "FirstClickedAt",
                table: "SentEmails");
        }
    }
}
