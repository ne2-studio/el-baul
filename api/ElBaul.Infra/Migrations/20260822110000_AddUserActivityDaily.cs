using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    [DbContext(typeof(ElBaulDbContext))]
    [Migration("20260822110000_AddUserActivityDaily")]
    public partial class AddUserActivityDaily : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE TABLE analytics.user_activity_daily (
                    date date NOT NULL,
                    active_users_1d integer NOT NULL,
                    active_users_7d integer NOT NULL,
                    active_users_30d integer NOT NULL,
                    CONSTRAINT pk_user_activity_daily PRIMARY KEY (date)
                );
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS analytics.user_activity_daily;
                """);
        }
    }
}
