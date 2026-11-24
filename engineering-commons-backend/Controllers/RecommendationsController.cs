using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EngineeringCommons.Backend.Services.Interfaces;

namespace EngineeringCommons.Backend.Controllers;

[ApiController]
[Route("api/artifacts/recommend")]
[Authorize]
public class RecommendationsController : ControllerBase
{
    private readonly IArtifactRecommendationService _recommendationService;

    public RecommendationsController(IArtifactRecommendationService recommendationService)
    {
        _recommendationService = recommendationService;
    }

    [HttpPost]
    public async Task<IActionResult> RecommendArtifacts([FromBody] RecommendationRequest? request)
    {
        var email = User.Identity?.Name ?? string.Empty;
        var req = request ?? new RecommendationRequest();

        // Enforce maximum input bounds to prevent payload exhaustion
        if (req.Technologies != null && req.Technologies.Count > 50)
            req.Technologies = req.Technologies.GetRange(0, 50);

        if (req.Dependencies != null && req.Dependencies.Count > 100)
            req.Dependencies = req.Dependencies.GetRange(0, 100);

        if (req.FileExtensions != null && req.FileExtensions.Count > 50)
            req.FileExtensions = req.FileExtensions.GetRange(0, 50);

        var recommendations = await _recommendationService.RecommendAsync(req, email);
        return Ok(recommendations);
    }
}
