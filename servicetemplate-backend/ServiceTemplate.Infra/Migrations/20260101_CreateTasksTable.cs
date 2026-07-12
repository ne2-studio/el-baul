using FluentMigrator;

namespace ServiceTemplate.Infra.Migrations;

[Migration(20260101)]
public class CreateTasksTable : Migration
{
    public override void Up()
    {
        Create.Table("Tasks")
            .WithColumn("Id").AsGuid().PrimaryKey()
            .WithColumn("UserId").AsString(100).NotNullable()
            .WithColumn("Title").AsString(200).NotNullable()
            .WithColumn("CreatedAt").AsDateTimeOffset().NotNullable();

        Create.Index("IX_Tasks_UserId")
            .OnTable("Tasks")
            .OnColumn("UserId");
    }

    public override void Down()
    {
        Delete.Table("Tasks");
    }
}
