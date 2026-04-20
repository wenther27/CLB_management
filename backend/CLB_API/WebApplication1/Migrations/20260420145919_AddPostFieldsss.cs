using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClubManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPostFieldsss : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "CoverImmageUrl",
                table: "Posts",
                newName: "CoverImageUrl");

            migrationBuilder.AlterColumn<bool>(
                name: "IsPinned",
                table: "Posts",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "CoverImageUrl",
                table: "Posts",
                newName: "CoverImmageUrl");

            migrationBuilder.AlterColumn<bool>(
                name: "IsPinned",
                table: "Posts",
                type: "bit",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "bit");
        }
    }
}
