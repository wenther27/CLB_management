using System.Text.Json.Serialization;

namespace ClubManagement.API.DTOs.FundContributions
{
    public class SepayTransactionListResponseDTO
    {
        [JsonPropertyName("status")]
        public int Status { get; set; }

        [JsonPropertyName("transactions")]
        public List<SepayTransactionItemDTO> Transactions { get; set; } = new();
    }

    public class SepayTransactionItemDTO
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("transaction_date")]
        public string? TransactionDate { get; set; }

        [JsonPropertyName("account_number")]
        public string? AccountNumber { get; set; }

        [JsonPropertyName("amount_in")]
        public string? AmountIn { get; set; }

        [JsonPropertyName("amount_out")]
        public string? AmountOut { get; set; }

        [JsonPropertyName("code")]
        public string? Code { get; set; }

        [JsonPropertyName("transaction_content")]
        public string? TransactionContent { get; set; }

        [JsonPropertyName("reference_number")]
        public string? ReferenceNumber { get; set; }

        [JsonPropertyName("bank_brand_name")]
        public string? BankBrandName { get; set; }
    }

    public class SepaySyncResultDTO
    {
        public bool Configured { get; set; }
        public int CheckedCount { get; set; }
        public int IncomingCount { get; set; }
        public int ProcessedCount { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
