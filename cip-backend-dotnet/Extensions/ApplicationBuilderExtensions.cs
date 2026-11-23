using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EngineeringCommons.Backend.Extensions;

/// <summary>
/// Modular application pipeline extensions encapsulating global exception handling,
/// enterprise HTTP security headers, and middleware pipeline configuration.
/// </summary>
public static class ApplicationBuilderExtensions
{
    /// <summary>
    /// Configures centralized structured JSON exception handling for unhandled errors.
    /// </summary>
    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app, ILogger logger, IWebHostEnvironment environment)
    {
        return app.Use(async (context, next) =>
        {
            try
            {
                await next();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "[HTTP 500 ERROR] {Method} {Path}: {Message}", context.Request.Method, context.Request.Path, ex.Message);

                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    context.Response.ContentType = "application/json";
                    var isDev = environment.IsDevelopment();
                    var payload = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        error = "Internal Server Error",
                        message = isDev ? ex.Message : "An unexpected error occurred while processing your request."
                    });
                    await context.Response.WriteAsync(payload);
                }
            }
        });
    }

    /// <summary>
    /// Enforces enterprise HTTP response headers (OWASP Zero-Trust compliance).
    /// </summary>
    public static IApplicationBuilder UseEnterpriseSecurityHeaders(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers["X-Frame-Options"] = "DENY";
            context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
            context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
            context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';";
            await next();
        });
    }

    /// <summary>
    /// Configures the core security middleware pipeline with correct execution order:
    /// CORS -> Routing -> Token Authentication -> Authorization
    /// </summary>
    public static IApplicationBuilder UseEngineeringCommonsPipeline(this IApplicationBuilder app)
    {
        app.UseCors();
        app.UseRouting();

        // Authentication MUST execute before Authorization
        app.UseMiddleware<EngineeringCommons.Backend.Middleware.TokenAuthenticationMiddleware>();
        app.UseAuthentication();
        app.UseAuthorization();

        return app;
    }
}
