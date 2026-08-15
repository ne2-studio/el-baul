using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <summary>
    /// Adds the nullable Photo.OriginalContentHash column together with
    /// IX_Photos_BaulId_OriginalContentHash_Active in the same migration — normally the partial
    /// unique index would need to wait for a separate, later deploy (see docs/.backlog issue
    /// #20 §19: it must not be enforced until backfill-photo-content-hashes and
    /// deduplicate-photos have cleared any historical duplicates), but that ordering constraint
    /// only matters once some rows have a non-null hash. Every existing row starts at NULL,
    /// which the partial index's filter ignores entirely, so creating it here is a no-op against
    /// the current data and only starts protecting genuinely new writes (new uploads immediately
    /// get a hash; backfill/dedup reconcile the rest afterward, merging through
    /// PhotoDuplicateMergeService on the rare occasion backfill itself uncovers a pre-existing,
    /// previously-unflagged duplicate — see BackfillPhotoContentHashesCommand).
    /// </summary>
    public partial class AddPhotoOriginalContentHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OriginalContentHash",
                table: "Photos",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Photos_BaulId_OriginalContentHash_Active",
                table: "Photos",
                columns: new[] { "BaulId", "OriginalContentHash" },
                unique: true,
                filter: "\"Status\" = 'Active' AND \"OriginalContentHash\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Photos_BaulId_OriginalContentHash_Active",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "OriginalContentHash",
                table: "Photos");
        }
    }
}
