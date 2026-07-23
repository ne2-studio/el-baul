using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <summary>
    /// Makes Recuerdo.BaulId mandatory. MUST NOT be deployed until `backfill-recuerdo-baul-id`
    /// has been run against production with zero remaining candidates (`--dry-run` reports
    /// "0 recuerdo(s) to check") — see the "Maintenance commands" section of api/README.md.
    /// Deliberately has no defaultValue: if any row still has a null BaulId, `ALTER COLUMN
    /// ... SET NOT NULL` fails outright (Postgres rejects it) and the app fails to start
    /// (migrations run at startup, Program.cs) — that's the intended gate. A defaultValue
    /// would instead silently paper over any remaining nulls with a garbage placeholder.
    /// </summary>
    public partial class MakeRecuerdoBaulIdRequired : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "BaulId",
                table: "Recuerdos",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "BaulId",
                table: "Recuerdos",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");
        }
    }
}
