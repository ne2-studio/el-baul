using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class BackfillCustodianSharedUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Maintenance script: custodians didn't use to have their own SharedUsers row
            // (it was synthesized in application code instead). From now on every baul
            // must have a real Custodio row, so this backfills the ones missing it.
            migrationBuilder.Sql(
                """
                INSERT INTO "SharedUsers" ("Id","BaulId","UserId","Nickname","Role","InvitedDate")
                SELECT gen_random_uuid(), b."Id", b."CustodioId",
                       COALESCE(NULLIF(u."Name", ''), split_part(u."Email", '@', 1), 'Custodio'),
                       'Custodio', b."CreatedAt"
                FROM "Baules" b
                JOIN "Users" u ON u."Id" = b."CustodioId"
                WHERE NOT EXISTS (
                    SELECT 1 FROM "SharedUsers" su WHERE su."BaulId" = b."Id" AND su."UserId" = b."CustodioId"
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data-only migration; reverting would require distinguishing backfilled
            // rows from ones created normally afterwards, so Down is intentionally a no-op.
        }
    }
}
