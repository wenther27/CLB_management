using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClubManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentCardImageToMemberApplications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StudentCardImageUrl",
                table: "MemberApplications",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StudentCardImageUrl",
                table: "MemberApplications");
        }
    }
}
