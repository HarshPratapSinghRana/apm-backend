using System;
using System.Collections.Generic;

namespace EngineeringCommonsCli.Models;

public record AccessRequestCliDto(
    string Id,
    string UserEmail,
    string RequestedRole,
    string CurrentRole,
    string Status,
    string? Reason,
    string? AdminEmail,
    string? AdminNotes,
    DateTime RequestedAt,
    DateTime? ReviewedAt
);

public record UserRoleStatusCliDto(
    string Email,
    string CurrentRole,
    bool IsCertifiedReviewer,
    IEnumerable<AccessRequestCliDto> Requests
);

public record UserRoleRecordDto(
    string UserEmail,
    string Role,
    bool IsCertifiedReviewer,
    string? GrantedBy,
    string? Notes,
    DateTime GrantedAt,
    DateTime UpdatedAt
);
