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
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();

// Background service: tự động khoá/mở hoạt động theo thời gian
builder.Services.AddHostedService<ActivityAutoCloseService>();

// ========== UPLOAD FILE ==========
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10 * 1024 * 1024; // 10 MB
    options.ValueLengthLimit = int.MaxValue;
    options.MemoryBufferThreshold = 1024 * 1024;
});

// ========== BUILD APP ==========
var app = builder.Build();

// Tạo thư mục uploads nếu chưa tồn tại
var uploadsFolder = Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "uploads", "activities");
if (!Directory.Exists(uploadsFolder))
    Directory.CreateDirectory(uploadsFolder);

app.UseStaticFiles();

// QUAN TRỌNG: thứ tự middleware
// CORS → Authentication → Authorization → Controllers
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();