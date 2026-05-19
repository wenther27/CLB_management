using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClubManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFlexibleFundCollections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FundCollectionPeriods_Year_Month",
                table: "FundCollectionPeriods");

            migrationBuilder.AddColumn<int>(
                name: "ActivityID",
                table: "FundCollectionPeriods",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "FundCollectionPeriods",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "Đóng quỹ");

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "FundCollectionPeriods",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(@"
                UPDATE FundCollectionPeriods
                SET Title = N'Quỹ tháng ' + RIGHT('0' + CAST([Month] AS varchar(2)), 2) + '/' + CAST([Year] AS varchar(4))
                WHERE Title = N'' OR Title IS NULL;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_FundCollectionPeriods_ActivityID",
                table: "FundCollectionPeriods",
                column: "ActivityID");

            migrationBuilder.CreateIndex(
                name: "IX_FundCollectionPeriods_Year_Month",
                table: "FundCollectionPeriods",
                columns: new[] { "Year", "Month" });

            migrationBuilder.AddForeignKey(
                name: "FK_FundCollectionPeriods_Activities_ActivityID",
                table: "FundCollectionPeriods",
                column: "ActivityID",
                principalTable: "Activities",
                principalColumn: "ActivityID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FundCollectionPeriods_Activities_ActivityID",
                table: "FundCollectionPeriods");

            migrationBuilder.DropIndex(
                name: "IX_FundCollectionPeriods_ActivityID",
                table: "FundCollectionPeriods");

            migrationBuilder.DropIndex(
                name: "IX_FundCollectionPeriods_Year_Month",
                table: "FundCollectionPeriods");

            migrationBuilder.DropColumn(
                name: "ActivityID",
                table: "FundCollectionPeriods");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "FundCollectionPeriods");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "FundCollectionPeriods");

            migrationBuilder.CreateIndex(
                name: "IX_FundCollectionPeriods_Year_Month",
                table: "FundCollectionPeriods",
                columns: new[] { "Year", "Month" },
                unique: true);
        }
    }
}
