using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    /// <inheritdoc />
    public partial class ConvertMiembroRoleToColaborador : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Miembro (read-only) no longer exists as a role — everyone who isn't an
            // admin becomes a Colaborador.
            migrationBuilder.Sql(
                "UPDATE \"SharedUsers\" SET \"Role\" = 'Colaborador' WHERE \"Role\" = 'Miembro'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data-only migration; the original Miembro/Colaborador split can't be
            // reconstructed, so Down is intentionally a no-op.
        }
    }
}
