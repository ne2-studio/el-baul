using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <summary>
    /// Slice 2 of the multi-vault photo groundwork (docs/.backlog issue #62): enforces "the same
    /// PhotoAsset can be active at most once within a given baúl" at the database level — the
    /// invariant PhotoManager.AddToBaulAsync's "Add to another baúl" operation relies on for race
    /// safety. Purely additive: no data changes, no other schema changes.
    /// </summary>
    public partial class AddPhotoBaulAssetUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Photos_BaulId_PhotoAssetId_Active",
                table: "Photos",
                columns: new[] { "BaulId", "PhotoAssetId" },
                unique: true,
                filter: "\"Status\" = 'Active'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Photos_BaulId_PhotoAssetId_Active",
                table: "Photos");
        }
    }
}
