using System;
using System.Collections.Generic;

namespace EngineeringCommons.Backend.Models;

/// <summary>
/// Strongly-typed request/response Data Transfer Objects (DTOs) 
/// standardizing API contracts across Backend, Gateway, CLI, and VS Code extension.
/// </summary>

public class CheckDuplicateRequestDto
{
    public string? ArtifactId { get; set; }
    public string? Name { get; set; }
    public string? Type { get; set; }
    public string? ArtifactType { get; set; }
    public string? Content { get; set; }
}

public class SubmitChangeRequestDto
{
    public string? ArtifactId { get; set; }
    public string? Type { get; set; }
    public bool IsPrivate { get; set; } = false;
    public string? AllowedContributors { get; set; }
    public string? AllowedReviewers { get; set; }
    public string? AllowedConsumers { get; set; }
    public string? Content { get; set; }
    public int SlaTargetMinutes { get; set; } = BountyConstants.DefaultSlaTargetMinutes;
    public List<ArtifactFileEntryDto>? Files { get; set; }
}

public class ArtifactFileEntryDto
{
    public string Path { get; set; } = string.Empty;
    public string? Content { get; set; }
}

public class UpdateVisibilityRequestDto
{
    public bool IsPrivate { get; set; }
    public string? AllowedContributors { get; set; }
    public string? AllowedReviewers { get; set; }
    public string? AllowedConsumers { get; set; }
}

public class UserProfileDto
{
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class AuthSuccessResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string? SsoToken { get; set; }
    public UserProfileDto User { get; set; } = new();
}

public class OperationResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public object? Data { get; set; }
}

public class SubmitChangeResponseDto
{
    public bool Success { get; set; } = true;
    public string ReviewId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Version { get; set; }
}

