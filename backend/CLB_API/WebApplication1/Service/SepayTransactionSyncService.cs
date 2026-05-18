using ClubManagement.API.DTOs.FundContributions;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;

namespace ClubManagement.API.Service
{
    public interface ISepayTransactionSyncService
    {
        Task<SepaySyncResultDTO> SyncRecentTransactionsAsync(CancellationToken cancellationToken = default);
    }

    public class SepayTransactionSyncService : ISepayTransactionSyncService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly IFundContributionService _fundContributionService;

        public SepayTransactionSyncService(
            HttpClient httpClient,
            IConfiguration configuration,
            IFundContributionService fundContributionService)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _fundContributionService = fundContributionService;
        }

        public async Task<SepaySyncResultDTO> SyncRecentTransactionsAsync(CancellationToken cancellationToken = default)
        {
            var token = _configuration["FundPayment:SepayApiToken"];
            var accountNo = _configuration["FundPayment:AccountNo"];

            if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(accountNo))
            {
                return new SepaySyncResultDTO
                {
                    Configured = false,
                    Message = "Chưa cấu hình SepayApiToken hoặc AccountNo"
                };
            }

            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"https://my.sepay.vn/userapi/transactions/list?account_number={Uri.EscapeDataString(accountNo)}&limit=100");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var payload = await JsonSerializer.DeserializeAsync<SepayTransactionListResponseDTO>(
                stream,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken);

            var transactions = payload?.Transactions ?? new List<SepayTransactionItemDTO>();
            var incoming = transactions
                .Where(t => ParseDecimal(t.AmountIn) > 0)
                .OrderBy(t => ParseLong(t.Id))
                .ToList();

            var processed = 0;
            foreach (var transaction in incoming)
            {
                var dto = new SepayWebhookDTO
                {
                    Id = ParseLong(transaction.Id),
                    Gateway = transaction.BankBrandName,
                    TransactionDate = transaction.TransactionDate,
                    AccountNumber = transaction.AccountNumber,
                    Code = transaction.Code,
                    Content = transaction.TransactionContent,
                    TransferType = "in",
                    Description = transaction.TransactionContent,
                    TransferAmount = ParseDecimal(transaction.AmountIn),
                    ReferenceCode = transaction.ReferenceNumber
                };

                var result = await _fundContributionService.ProcessSepayWebhookAsync(dto);
                if (result.Success) processed++;
            }

            return new SepaySyncResultDTO
            {
                Configured = true,
                CheckedCount = transactions.Count,
                IncomingCount = incoming.Count,
                ProcessedCount = processed,
                Message = "Đã đồng bộ giao dịch SePay"
            };
        }

        private static decimal ParseDecimal(string? value)
            => decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var result)
                ? result
                : 0;

        private static long ParseLong(string? value)
            => long.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var result)
                ? result
                : 0;
    }

    public class SepayTransactionPollingService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SepayTransactionPollingService> _logger;

        public SepayTransactionPollingService(
            IServiceScopeFactory scopeFactory,
            ILogger<SepayTransactionPollingService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var syncService = scope.ServiceProvider.GetRequiredService<ISepayTransactionSyncService>();
                    await syncService.SyncRecentTransactionsAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    // Ứng dụng đang dừng.
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Không thể đồng bộ giao dịch SePay");
                }

                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            }
        }
    }
}
