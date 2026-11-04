using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace CipBackend.Controllers;

[ApiController]
[Route("api/debug")]
[Authorize]
public class DebugController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;

    public DebugController(IConfiguration config, IWebHostEnvironment env)
    {
        _config = config;
        _env = env;
    }

    [HttpGet("users")]
    public IActionResult GetConfiguredUsers()
    {
        if (!_env.IsDevelopment() && !string.Equals(_config["EnableDebugEndpoints"], "true", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound(new { error = "Debug endpoints are disabled in non-development environments." });
        }

        var usersSection = _config.GetSection("StaticAuth:Users");
        var list = usersSection.GetChildren().Select(c => new {
            email = c.GetValue<string>("Email"),
            role = c.GetValue<string>("Role")
        }).ToList();
        return Ok(new { count = list.Count, users = list });
    }
}
