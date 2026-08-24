using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <summary>
    /// Splits User.Name into User.Nombre/User.Apellidos (see ticket #53). Bundles the schema
    /// change with a one-time backfill of existing rows, same shape as prior data-carrying
    /// migrations in this file (e.g. BackfillCustodianSharedUsers, ReworkSharedUserForPersonaModel
    /// in git history): add the new nullable columns, backfill from the old column while both
    /// still exist, then drop the old column.
    /// </summary>
    public partial class SplitUserNombreApellidos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Nombre",
                table: "Users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Apellidos",
                table: "Users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            // Splits each existing Name on whitespace: first word -> Nombre, remaining word(s)
            // (joined by a single space) -> Apellidos. Mirrors PersonNameNormalizer.Split's
            // normalization (trim, collapse internal whitespace, initcap title-cases each word
            // the same way Postgres' initcap() does) so backfilled rows match what the app's
            // OIDC sync would have produced for the same raw name.
            migrationBuilder.Sql(
                """
                WITH normalized AS (
                    SELECT "Id", regexp_replace(btrim("Name"), '\s+', ' ', 'g') AS full_name
                    FROM "Users"
                    WHERE "Name" IS NOT NULL AND btrim("Name") <> ''
                )
                UPDATE "Users" u
                SET "Nombre" = initcap(split_part(n.full_name, ' ', 1)),
                    "Apellidos" = NULLIF(initcap(regexp_replace(n.full_name, '^\S+\s*', '')), '')
                FROM normalized n
                WHERE u."Id" = n."Id";
                """);

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            // Best-effort reconstruction only — Nombre/Apellidos hold normalized (title-cased,
            // whitespace-collapsed) values, so this won't exactly reproduce the original Name
            // for rows whose raw value wasn't already in that form.
            migrationBuilder.Sql(
                """
                UPDATE "Users"
                SET "Name" = NULLIF(btrim(concat_ws(' ', "Nombre", "Apellidos")), '')
                WHERE "Nombre" IS NOT NULL OR "Apellidos" IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "Nombre",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Apellidos",
                table: "Users");
        }
    }
}
