using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClubManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberStudentCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StudentCode",
                table: "Members",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE m
                SET StudentCode = u.Username
                FROM Members m
                INNER JOIN Users u ON m.UserID = u.UserID
                WHERE m.StudentCode IS NULL
                  AND u.Username IS NOT NULL
                  AND u.Username NOT LIKE '%[^0-9]%';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StudentCode",
                table: "Members");
        }
    }
}
