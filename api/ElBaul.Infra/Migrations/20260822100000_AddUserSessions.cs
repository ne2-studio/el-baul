using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    [DbContext(typeof(ElBaulDbContext))]
    [Migration("20260822100000_AddUserSessions")]
    public partial class AddUserSessions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE TABLE analytics.user_sessions (
                    id uuid NOT NULL,
                    user_id text NOT NULL,
                    opened_at timestamptz NOT NULL,
                    date date NOT NULL,
                    platform text NOT NULL,
                    entry_source text NOT NULL,
                    CONSTRAINT pk_user_sessions PRIMARY KEY (id)
                );

                CREATE INDEX ix_user_sessions_date
                    ON analytics.user_sessions (date);

                CREATE INDEX ix_user_sessions_user_date
                    ON analytics.user_sessions (user_id, date);
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS analytics.user_sessions;
                """);
        }
    }
}
