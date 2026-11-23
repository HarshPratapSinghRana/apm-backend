namespace EngineeringCommons.Backend.Models;

/// <summary>
/// Architectural constants and standardized configuration values for Bounties, SLAs, and Rewards.
/// Replaces magic literals and numbers across the backend.
/// </summary>
public static class BountyConstants
{
    public const int DefaultSlaTargetMinutes = 1440; // 24 hours
    public const int DefaultAutoReleaseHours = 24;
    public const int DefaultCredits = 100;
    public const int DefaultPoints = 50;

    public static class Statuses
    {
        public const string Open = "Open";
        public const string Claimed = "Claimed";
        public const string InProgress = "InProgress";
        public const string UnderReview = "UnderReview";
        public const string Completed = "Completed";
    }

    public static class ResolutionPreferences
    {
        public const string OpenToCommunity = "OpenToCommunity";
        public const string SelfResolution = "SelfResolution";
    }
}

