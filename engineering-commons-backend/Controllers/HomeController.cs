using System;
using Microsoft.AspNetCore.Mvc;

namespace EngineeringCommons.Backend.Controllers;

[ApiController]
[Route("/")]
public class HomeController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        var adoToken = Environment.GetEnvironmentVariable("AzureDevOps:Token") ?? 
                       Environment.GetEnvironmentVariable("AzureDevOps__Token") ?? 
                       Environment.GetEnvironmentVariable("AZURE_DEVOPS_TOKEN") ?? 
                       Environment.GetEnvironmentVariable("AZURE_DEVOPS_PAT") ?? 
                       Environment.GetEnvironmentVariable("ADO_TOKEN") ?? 
                       Environment.GetEnvironmentVariable("ADO_PAT");

        var gitHubToken = Environment.GetEnvironmentVariable("GitHub:Token") ?? 
                          Environment.GetEnvironmentVariable("GitHub__Token") ?? 
                          Environment.GetEnvironmentVariable("GITHUB_TOKEN") ?? 
                          Environment.GetEnvironmentVariable("GITHUB_PAT");

        return Ok(new {
            message = "Engineering Commons Backend running (Azure DevOps Marketplace Backend)",
            swagger = "/swagger",
            azureDevOpsConfigured = !string.IsNullOrEmpty(adoToken),
            adoConfigured = !string.IsNullOrEmpty(adoToken),
            gitHubConfigured = !string.IsNullOrEmpty(gitHubToken)
        });
    }
}
