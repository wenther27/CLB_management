using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ClubManagement.API.Data;
using ClubManagement.API.Service;
using ClubManagement.API.AuthService;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Add services to container
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

// ========== CẤU HÌNH AUTHENTICATION ==========
var jwtKey = builder.Configuration["JwtSettings:SecretKey"] ??
             builder.Configuration["Jwt:Key"] ??
             "DefaultSecretKey123!@#$%^&*()_+CLUBMANAGEMENT";

var jwtIssuer = builder.Configuration["JwtSettings:Issuer"] ??
                builder.Configuration["Jwt:Issuer"] ??
                "https://localhost:5190";

var jwtAudience = builder.Configuration["JwtSettings:Audience"] ??
                  builder.Configuration["Jwt:Audience"] ??
                  "ClubManagementAPI";

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

// ========== CÁC SERVICE KHÁC ==========
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(); // ← Dòng này cần package Swashbuckle.AspNetCore

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy => policy
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});

// Dependency Injection
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddScoped<IMemberService, MemberService>();

// Background service: tự động khoá/mở hoạt động theo thời gian
// Cấu hình tại appsettings.json > "ActivityAutoClose"
builder.Services.AddHostedService<ActivityAutoCloseService>();

// Cấu hình upload file
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 10 * 1024 * 1024;
    options.ValueLengthLimit = int.MaxValue;
    options.MemoryBufferThreshold = 1024 * 1024;
});

var app = builder.Build();

// Tạo thư mục uploads nếu chưa tồn tại
var uploadsFolder = Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "uploads", "activities");
if (!Directory.Exists(uploadsFolder))
{
    Directory.CreateDirectory(uploadsFolder);
}

app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// FIX: CORS phải đứng TRƯỚC Authentication/Authorization
// FIX: Bỏ UseHttpsRedirection khi dev với HTTP (localhost:5190)
//      vì redirect HTTP→HTTPS sẽ làm mất header Authorization
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();