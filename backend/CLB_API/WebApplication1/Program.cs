
using ClubManagement.API.Data;
using ClubManagement.API.Service;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Thêm CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});

builder.Services.AddScoped<ClubManagement.API.AuthService.IAuthService,
                           ClubManagement.API.AuthService.AuthService>();
builder.Services.AddScoped<IActivityService, ActivityService>();
// Cho phép serve file tĩnh từ wwwroot


// Tăng giới hạn upload lên 10MB (mặc định chỉ ~28MB, nhưng nên set rõ)
builder.Services.Configure<FormOptions>(o => {
    o.MultipartBodyLengthLimit = 10 * 1024 * 1024; // 10MB
});


var app = builder.Build();
app.UseStaticFiles();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll"); // Áp dụng CORS policy
app.UseAuthorization();
app.MapControllers();

app.Run();