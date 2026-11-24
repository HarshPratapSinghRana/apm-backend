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
                var correlationId = context.Response.Headers["X-Correlation-Id"].ToString();
                if (string.IsNullOrWhiteSpace(correlationId))
                {
                    correlationId = Guid.NewGuid().ToString("N");
                    context.Response.Headers["X-Correlation-Id"] = correlationId;
                }

                var (statusCode, title) = ex switch
                {
                    UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
                    KeyNotFoundException => (StatusCodes.Status404NotFound, "Resource Not Found"),
                    ArgumentException or FormatException => (StatusCodes.Status400BadRequest, "Bad Request"),
                    InvalidOperationException => (StatusCodes.Status409Conflict, "Conflict"),
                    _ => (StatusCodes.Status500InternalServerError, "Internal Server Error")
                };

                if (statusCode == StatusCodes.Status500InternalServerError)
                {
                    logger.LogError(ex, "[HTTP 500 ERROR] [{CorrelationId}] {Method} {Path}: {Message}", correlationId, context.Request.Method, context.Request.Path, ex.Message);
                }
                else
                {
                    logger.LogWarning("[HTTP {StatusCode}] [{CorrelationId}] {Method} {Path}: {Message}", statusCode, correlationId, context.Request.Method, context.Request.Path, ex.Message);
                }

                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = statusCode;
                    context.Response.ContentType = "application/json";
                    var isDev = environment.IsDevelopment();
                    var payload = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        error = title,
                        message = (isDev || statusCode != StatusCodes.Status500InternalServerError) ? ex.Message : "An unexpected error occurred while processing your request.",
                        correlationId
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
            var correlationId = context.Request.Headers["X-Correlation-Id"].ToString();
            if (string.IsNullOrWhiteSpace(correlationId))
            {
                correlationId = Guid.NewGuid().ToString("N");
            }
            context.Response.Headers["X-Correlation-Id"] = correlationId;

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
    /// CORS -> Routing -> Authentication -> Authorization
    /// </summary>
    public static IApplicationBuilder UseEngineeringCommonsPipeline(this IApplicationBuilder app)
    {
        app.UseCors();
        app.UseRouting();

        // Standard canonical execution order without redundant middleware
        app.UseAuthentication();
        app.UseAuthorization();

        return app;
    }
}

