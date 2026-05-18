using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClubManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFundContributions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FundCollectionPeriods",
                columns: table => new
                {
                    FundCollectionPeriodID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserID = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FundCollectionPeriods", x => x.FundCollectionPeriodID);
                    table.ForeignKey(
                        name: "FK_FundCollectionPeriods_Users_CreatedByUserID",
                        column: x => x.CreatedByUserID,
                        principalTable: "Users",
                        principalColumn: "UserID");
                });

            migrationBuilder.CreateTable(
                name: "FundContributions",
                columns: table => new
                {
                    FundContributionID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FundCollectionPeriodID = table.Column<int>(type: "int", nullable: false),
                    MemberID = table.Column<int>(type: "int", nullable: false),
                    ExpectedAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentCode = table.Column<string>(type: "nvarchar(25)", maxLength: 25, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SepayTransactionID = table.Column<long>(type: "bigint", nullable: true),
                    BankReferenceCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    BankContent = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    FundTransactionID = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FundContributions", x => x.FundContributionID);
                    table.ForeignKey(
                        name: "FK_FundContributions_FundCollectionPeriods_FundCollectionPeriodID",
                        column: x => x.FundCollectionPeriodID,
                        principalTable: "FundCollectionPeriods",
                        principalColumn: "FundCollectionPeriodID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FundContributions_FundTransactions_FundTransactionID",
                        column: x => x.FundTransactionID,
                        principalTable: "FundTransactions",
                        principalColumn: "FundTransactionID");
                    table.ForeignKey(
                        name: "FK_FundContributions_Members_MemberID",
                        column: x => x.MemberID,
                        principalTable: "Members",
                        principalColumn: "MemberID");
                });

            migrationBuilder.CreateTable(
                name: "SepayWebhookEvents",
                columns: table => new
                {
                    SepayWebhookEventID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SepayTransactionID = table.Column<long>(type: "bigint", nullable: false),
                    ReferenceCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Content = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    TransferAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    IsMatched = table.Column<bool>(type: "bit", nullable: false),
                    FundContributionID = table.Column<int>(type: "int", nullable: true),
                    ReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SepayWebhookEvents", x => x.SepayWebhookEventID);
                    table.ForeignKey(
                        name: "FK_SepayWebhookEvents_FundContributions_FundContributionID",
                        column: x => x.FundContributionID,
                        principalTable: "FundContributions",
                        principalColumn: "FundContributionID");
                });

            migrationBuilder.CreateIndex(
                name: "IX_FundCollectionPeriods_CreatedByUserID",
                table: "FundCollectionPeriods",
                column: "CreatedByUserID");

            migrationBuilder.CreateIndex(
                name: "IX_FundCollectionPeriods_Year_Month",
                table: "FundCollectionPeriods",
                columns: new[] { "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FundContributions_FundCollectionPeriodID_MemberID",
                table: "FundContributions",
                columns: new[] { "FundCollectionPeriodID", "MemberID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FundContributions_FundTransactionID",
                table: "FundContributions",
                column: "FundTransactionID");

            migrationBuilder.CreateIndex(
                name: "IX_FundContributions_MemberID",
                table: "FundContributions",
                column: "MemberID");

            migrationBuilder.CreateIndex(
                name: "IX_FundContributions_PaymentCode",
                table: "FundContributions",
                column: "PaymentCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FundContributions_SepayTransactionID",
                table: "FundContributions",
                column: "SepayTransactionID",
                unique: true,
                filter: "[SepayTransactionID] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SepayWebhookEvents_FundContributionID",
                table: "SepayWebhookEvents",
                column: "FundContributionID");

            migrationBuilder.CreateIndex(
                name: "IX_SepayWebhookEvents_SepayTransactionID",
                table: "SepayWebhookEvents",
                column: "SepayTransactionID",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SepayWebhookEvents");

            migrationBuilder.DropTable(
                name: "FundContributions");

            migrationBuilder.DropTable(
                name: "FundCollectionPeriods");
        }
    }
}
