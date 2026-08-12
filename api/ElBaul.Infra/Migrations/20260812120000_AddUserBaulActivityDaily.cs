using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    [DbContext(typeof(ElBaulDbContext))]
    [Migration("20260812120000_AddUserBaulActivityDaily")]
    public partial class AddUserBaulActivityDaily : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE SCHEMA IF NOT EXISTS analytics;

                CREATE TABLE analytics.user_baul_activity_daily (
                    date date NOT NULL,
                    user_id text NOT NULL,
                    baul_id uuid NOT NULL,
                    is_contributor boolean NOT NULL,
                    CONSTRAINT pk_user_baul_activity_daily PRIMARY KEY (date, user_id, baul_id)
                );

                CREATE INDEX ix_user_baul_activity_daily_baul_date
                    ON analytics.user_baul_activity_daily (baul_id, date);

                CREATE INDEX ix_user_baul_activity_daily_contributor_date
                    ON analytics.user_baul_activity_daily (is_contributor, date);
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS analytics.user_baul_activity_daily;
                DROP SCHEMA IF EXISTS analytics;
                """);
        }
    }
}
