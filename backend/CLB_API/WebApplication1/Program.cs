using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ClubManagement.API.Data;
using ClubManagement.API.Service;
using ClubManagement.API.AuthService;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

// ========== DATABASE ==========
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// ========== JWT CONFIG ==========
var jwtKey = builder.Configuration["JwtSettings:SecretKey"] ??
             builder.Configuration["Jwt:Key"] ??
             "DefaultSecretKey123!@#$%^&*()_+CLUBMANAGEMENT";

var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ??
                builder.Configuration["Jwt:Issuer"] ??
                "https://localhost:5190";

var jwtAudience = builder.Configuration["JwtSettings:Audience"] ??
                  builder.Configuration["Jwt:Audience"] ??
                  "ClubManagementAPI";

// ========== AUTHENTICATION ==========
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// ========== CONTROLLERS ==========
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ========== CORS ==========
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy => policy
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});

// ========== MEMORY CACHE (OTP + pending register) ==========
builder.Services.AddMemoryCache();

// ========== DEPENDENCY INJECTION ==========
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddScoped<IMemberService, MemberService>();
builder.Services.AddScoped<IMemberApplicationService, MemberApplicationService>();
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IFundService, FundService>();
builder.Services.AddScoped<IFundContributionService, FundContributionService>();
builder.Services.AddHttpClient<ISepayTransactionSyncService, SepayTransactionSyncService>();

// Background service: tá»± Ä‘á»™ng khoÃ¡/má»Ÿ hoáº¡t Ä‘á»™ng theo thá»i gian
builder.Services.AddHostedService<ActivityAutoCloseService>();
builder.Services.AddHostedService<SepayTransactionPollingService>();

// ========== UPLOAD FILE ==========
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10 * 1024 * 1024; // 10 MB
    options.ValueLengthLimit = int.MaxValue;
    options.MemoryBufferThreshold = 1024 * 1024;
});

// ========== BUILD APP ==========
var app = builder.Build();

// Táº¡o thÆ° má»¥c uploads náº¿u chÆ°a tá»“n táº¡i
var uploadsFolder = Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "uploads", "activities");
if (!Directory.Exists(uploadsFolder))
    Directory.CreateDirectory(uploadsFolder);

app.UseStaticFiles();

// QUAN TRá»ŒNG: thá»© tá»± middleware
// CORS â†’ Authentication â†’ Authorization â†’ Controllers
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

