using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace ElBaul.Infra.Migrations
{
    [DbContext(typeof(ElBaulDbContext))]
    [Migration("20260822180000_AddNotificationPreferencesDaily")]
    public partial class AddNotificationPreferencesDaily : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE TABLE analytics.notification_preferences_daily (
                    date date NOT NULL,
                    email_digest_enabled_users integer NOT NULL,
                    push_eligible_users integer NOT NULL,
                    CONSTRAINT pk_notification_preferences_daily PRIMARY KEY (date)
                );
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS analytics.notification_preferences_daily;
                """);
        }
    }
}
