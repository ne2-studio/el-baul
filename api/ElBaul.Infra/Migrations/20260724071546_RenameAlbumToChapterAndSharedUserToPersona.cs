using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class RenameAlbumToChapterAndSharedUserToPersona : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Pure metadata rename (Postgres ALTER TABLE/INDEX ... RENAME ...): no data copy,
            // no backfill, applies instantly regardless of table size. Dependent foreign keys
            // survive table renames automatically (Postgres tracks them by OID, not by name);
            // only the constraint/index *names* are stale afterward, which we fix up explicitly
            // below so nothing in the schema still reads "Album"/"SharedUser".
            migrationBuilder.RenameTable(
                name: "Albums",
                newName: "Chapters");

            migrationBuilder.Sql("ALTER TABLE \"Chapters\" RENAME CONSTRAINT \"PK_Albums\" TO \"PK_Chapters\";");

            migrationBuilder.RenameIndex(
                table: "Chapters",
                name: "IX_Albums_BaulId",
                newName: "IX_Chapters_BaulId");

            migrationBuilder.Sql("ALTER TABLE \"Chapters\" RENAME CONSTRAINT \"FK_Albums_Baules_BaulId\" TO \"FK_Chapters_Baules_BaulId\";");

            migrationBuilder.RenameColumn(
                name: "AlbumCount",
                table: "Baules",
                newName: "ChapterCount");

            migrationBuilder.RenameColumn(
                name: "AlbumId",
                table: "Photos",
                newName: "ChapterId");

            migrationBuilder.RenameIndex(
                table: "Photos",
                name: "IX_Photos_AlbumId",
                newName: "IX_Photos_ChapterId");

            migrationBuilder.Sql("ALTER TABLE \"Photos\" RENAME CONSTRAINT \"FK_Photos_Albums_AlbumId\" TO \"FK_Photos_Chapters_ChapterId\";");

            migrationBuilder.RenameColumn(
                name: "AlbumId",
                table: "Recuerdos",
                newName: "ChapterId");

            migrationBuilder.RenameIndex(
                table: "Recuerdos",
                name: "IX_Recuerdos_AlbumId",
                newName: "IX_Recuerdos_ChapterId");

            migrationBuilder.Sql("ALTER TABLE \"Recuerdos\" RENAME CONSTRAINT \"FK_Recuerdos_Albums_AlbumId\" TO \"FK_Recuerdos_Chapters_ChapterId\";");

            migrationBuilder.RenameTable(
                name: "SharedUsers",
                newName: "Personas");

            migrationBuilder.Sql("ALTER TABLE \"Personas\" RENAME CONSTRAINT \"PK_SharedUsers\" TO \"PK_Personas\";");

            migrationBuilder.RenameIndex(
                table: "Personas",
                name: "IX_SharedUsers_BaulId",
                newName: "IX_Personas_BaulId");

            migrationBuilder.RenameIndex(
                table: "Personas",
                name: "IX_SharedUsers_UserId",
                newName: "IX_Personas_UserId");

            migrationBuilder.RenameIndex(
                table: "Personas",
                name: "IX_SharedUsers_BaulId_UserId",
                newName: "IX_Personas_BaulId_UserId");

            migrationBuilder.Sql("ALTER TABLE \"Personas\" RENAME CONSTRAINT \"FK_SharedUsers_Baules_BaulId\" TO \"FK_Personas_Baules_BaulId\";");

            migrationBuilder.Sql("ALTER TABLE \"Personas\" RENAME CONSTRAINT \"FK_SharedUsers_Users_UserId\" TO \"FK_Personas_Users_UserId\";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Personas\" RENAME CONSTRAINT \"FK_Personas_Users_UserId\" TO \"FK_SharedUsers_Users_UserId\";");

            migrationBuilder.Sql("ALTER TABLE \"Personas\" RENAME CONSTRAINT \"FK_Personas_Baules_BaulId\" TO \"FK_SharedUsers_Baules_BaulId\";");

            migrationBuilder.RenameIndex(
                table: "Personas",
                name: "IX_Personas_BaulId_UserId",
                newName: "IX_SharedUsers_BaulId_UserId");

            migrationBuilder.RenameIndex(
                table: "Personas",
                name: "IX_Personas_UserId",
                newName: "IX_SharedUsers_UserId");

            migrationBuilder.RenameIndex(
                table: "Personas",
                name: "IX_Personas_BaulId",
                newName: "IX_SharedUsers_BaulId");

            migrationBuilder.Sql("ALTER TABLE \"Personas\" RENAME CONSTRAINT \"PK_Personas\" TO \"PK_SharedUsers\";");

            migrationBuilder.RenameTable(
                name: "Personas",
                newName: "SharedUsers");

            migrationBuilder.Sql("ALTER TABLE \"Recuerdos\" RENAME CONSTRAINT \"FK_Recuerdos_Chapters_ChapterId\" TO \"FK_Recuerdos_Albums_AlbumId\";");

            migrationBuilder.RenameIndex(
                table: "Recuerdos",
                name: "IX_Recuerdos_ChapterId",
                newName: "IX_Recuerdos_AlbumId");

            migrationBuilder.RenameColumn(
                name: "ChapterId",
                table: "Recuerdos",
                newName: "AlbumId");

            migrationBuilder.Sql("ALTER TABLE \"Photos\" RENAME CONSTRAINT \"FK_Photos_Chapters_ChapterId\" TO \"FK_Photos_Albums_AlbumId\";");

            migrationBuilder.RenameIndex(
                table: "Photos",
                name: "IX_Photos_ChapterId",
                newName: "IX_Photos_AlbumId");

            migrationBuilder.RenameColumn(
                name: "ChapterId",
                table: "Photos",
                newName: "AlbumId");

            migrationBuilder.RenameColumn(
                name: "ChapterCount",
                table: "Baules",
                newName: "AlbumCount");

            migrationBuilder.Sql("ALTER TABLE \"Chapters\" RENAME CONSTRAINT \"FK_Chapters_Baules_BaulId\" TO \"FK_Albums_Baules_BaulId\";");

            migrationBuilder.RenameIndex(
                table: "Chapters",
                name: "IX_Chapters_BaulId",
                newName: "IX_Albums_BaulId");

            migrationBuilder.Sql("ALTER TABLE \"Chapters\" RENAME CONSTRAINT \"PK_Chapters\" TO \"PK_Albums\";");

            migrationBuilder.RenameTable(
                name: "Chapters",
                newName: "Albums");
        }
    }
}
