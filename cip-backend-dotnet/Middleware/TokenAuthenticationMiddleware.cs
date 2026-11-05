using System.Security.Claims;
using CipBackend.Services.Interfaces;

namespace CipBackend.Middleware;

public class TokenAuthenticationMiddleware
{
    private readonly RequestDelegate _next;

    public TokenAuthenticationMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext ctx, ITokenService tokens)
    {
        var auth = ctx.Request.Headers["Authorization"].ToString();
        if (!string.IsNullOrEmpty(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = auth.Substring("Bearer ".Length).Trim();
            var user = tokens.ValidateToken(token);
            if (user != null)
            {
                var claims = new[] { new Claim(ClaimTypes.Name, user.Email), new Claim(ClaimTypes.Role, user.Role) };
                var id = new ClaimsIdentity(claims, "Token");
                ctx.User = new ClaimsPrincipal(id);
            }
        }
        await _next(ctx);
    }
}
