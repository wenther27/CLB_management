using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClubManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class SeedRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Posts_ExecutiveBoard_userID",
                table: "Posts");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_ExecutiveBoard_ExecutiveBoardBoardID",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_ExecutiveBoardBoardID",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ExecutiveBoardBoardID",
                table: "Users");

            migrationBuilder.RenameColumn(
                name: "userID",
                table: "Posts",
                newName: "ExecutiveBoardBoardID");

            migrationBuilder.RenameIndex(
                name: "IX_Posts_userID",
                table: "Posts",
                newName: "IX_Posts_ExecutiveBoardBoardID");

            migrationBuilder.CreateIndex(
                name: "IX_ExecutiveBoard_userID",
                table: "ExecutiveBoard",
                column: "userID");

            migrationBuilder.AddForeignKey(
                name: "FK_ExecutiveBoard_Users_userID",
                table: "ExecutiveBoard",
                column: "userID",
                principalTable: "Users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_ExecutiveBoard_ExecutiveBoardBoardID",
                table: "Posts",
                column: "ExecutiveBoardBoardID",
                principalTable: "ExecutiveBoard",
                principalColumn: "BoardID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExecutiveBoard_Users_userID",
                table: "ExecutiveBoard");

            migrationBuilder.DropForeignKey(
                name: "FK_Posts_ExecutiveBoard_ExecutiveBoardBoardID",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_ExecutiveBoard_userID",
                table: "ExecutiveBoard");

            migrationBuilder.RenameColumn(
                name: "ExecutiveBoardBoardID",
                table: "Posts",
                newName: "userID");

            migrationBuilder.RenameIndex(
                name: "IX_Posts_ExecutiveBoardBoardID",
                table: "Posts",
                newName: "IX_Posts_userID");

            migrationBuilder.AddColumn<int>(
                name: "ExecutiveBoardBoardID",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_ExecutiveBoardBoardID",
                table: "Users",
                column: "ExecutiveBoardBoardID");

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_ExecutiveBoard_userID",
                table: "Posts",
                column: "userID",
                principalTable: "ExecutiveBoard",
                principalColumn: "BoardID");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_ExecutiveBoard_ExecutiveBoardBoardID",
                table: "Users",
                column: "ExecutiveBoardBoardID",
                principalTable: "ExecutiveBoard",
                principalColumn: "BoardID");
        }
    }
}
