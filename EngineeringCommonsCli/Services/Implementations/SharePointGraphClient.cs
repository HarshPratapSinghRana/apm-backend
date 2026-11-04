using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Newtonsoft.Json.Linq;
using System.Net.Http.Headers;

namespace EngineeringCommonsCli.Services.Implementations;

public class SharePointGraphClient : ISharePointGraphClient, IDisposable
{
    private readonly HttpClient _http;
    private readonly string _hostname = "testmaq.sharepoint.com";
    private readonly string[] _candidateSites = new[]
    {
        "sites/AITeam2",
        "sites/Engineering-Commons",
        "sites/Engineering-Commons",
        "sites/PowerAppsCoderepo-POC"
    };

    private readonly string[] _artifactListAliases = new[]
    {
        "Engineering-Commons-Artifacts",
        "Engineering-Commons-Artifacts",
        "EngineeringCommonsArtifacts",
        "Artifacts"
    };

    private readonly string[] _bountyListAliases = new[]
    {
        "Engineering-Commons-Bounties",
        "Engineering-Commons-Bounties",
        "EngineeringCommonsBounties",
        "Bounties"
    };

    private string? _resolvedSiteId;
    private string? _resolvedSitePath;
    private readonly Dictionary<string, string> _listIdCache = new(StringComparer.OrdinalIgnoreCase);

    // In-memory cache with 15-minute TTL
    private List<ArtifactSpec>? _cachedArtifacts;
    private DateTime _artifactsCacheExpires = DateTime.MinValue;

    private List<BountyCliDto>? _cachedBounties;
    private DateTime _bountiesCacheExpires = DateTime.MinValue;

    public SharePointGraphClient()
    {
        _http = new HttpClient { BaseAddress = new Uri("https://graph.microsoft.com") };
    }

    private async Task<string?> GetSiteIdAsync(string token)
    {
        if (!string.IsNullOrEmpty(_resolvedSiteId)) return _resolvedSiteId;

        foreach (var sitePath in _candidateSites)
        {
            var cleanPath = sitePath.Trim('/');
            using var req = new HttpRequestMessage(HttpMethod.Get, $"/v1.0/sites/{_hostname}:/{cleanPath}");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            req.Headers.UserAgent.ParseAdd("EngineeringCommonsCLI/1.0");

            using var resp = await _http.SendAsync(req);
            if (resp.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                Console.WriteLine("\n[SharePoint] Notice: Your Microsoft SSO access token is expired or unauthorized (HTTP 401).");
                Console.WriteLine("To refresh your session, run: engineering-commons login --sso (or sign in via VS Code Extension)");
                return null;
            }

            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                var obj = JObject.Parse(json);
                _resolvedSiteId = obj["id"]?.ToString();
                _resolvedSitePath = sitePath;
                return _resolvedSiteId;
            }
        }

        return null;
    }

    private async Task<string?> GetListIdAsync(string token, string[] candidateListNames)
    {
        var siteId = await GetSiteIdAsync(token);
        if (string.IsNullOrEmpty(siteId)) return null;

        using var req = new HttpRequestMessage(HttpMethod.Get, $"/v1.0/sites/{siteId}/lists?$top=100");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        req.Headers.UserAgent.ParseAdd("EngineeringCommonsCLI/1.0");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;

        var json = await resp.Content.ReadAsStringAsync();
        var root = JObject.Parse(json);
        var lists = root["value"] as JArray;
        if (lists == null) return null;

        foreach (var targetName in candidateListNames)
        {
            if (_listIdCache.TryGetValue(targetName, out var cachedId)) return cachedId;
            var cleanTarget = new string(targetName.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

            foreach (var l in lists)
            {
                var id = l["id"]?.ToString();
                var dName = l["displayName"]?.ToString() ?? string.Empty;
                var name = l["name"]?.ToString() ?? string.Empty;

                var cleanDName = new string(dName.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
                var cleanName = new string(name.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

                if (cleanDName == cleanTarget || cleanName == cleanTarget ||
                    cleanDName.Contains(cleanTarget) || cleanTarget.Contains(cleanDName))
                {
                    if (!string.IsNullOrEmpty(id))
                    {
                        _listIdCache[targetName] = id;
                        return id;
                    }
                }
            }
        }

        return null;
    }

    public async Task<IEnumerable<ArtifactSpec>> GetArtifactsAsync(string token, string? typeFilter = null)
    {
        if (_cachedArtifacts != null && DateTime.UtcNow < _artifactsCacheExpires)
        {
            return FilterArtifacts(_cachedArtifacts, typeFilter);
        }

        try
        {
            var siteId = await GetSiteIdAsync(token);
            if (string.IsNullOrEmpty(siteId)) return Enumerable.Empty<ArtifactSpec>();

            var listId = await GetListIdAsync(token, _artifactListAliases);
            if (string.IsNullOrEmpty(listId)) return Enumerable.Empty<ArtifactSpec>();

            using var req = new HttpRequestMessage(HttpMethod.Get, $"/v1.0/sites/{siteId}/lists/{listId}/items?$expand=fields&$top=500");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            req.Headers.UserAgent.ParseAdd("EngineeringCommonsCLI/1.0");

            using var resp = await _http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return Enumerable.Empty<ArtifactSpec>();

            var json = await resp.Content.ReadAsStringAsync();
            var root = JObject.Parse(json);
            var items = root["value"] as JArray;
            if (items == null) return Enumerable.Empty<ArtifactSpec>();

            var result = new List<ArtifactSpec>();
            foreach (var it in items)
            {
                var fields = it["fields"] as JObject ?? it as JObject;
                if (fields == null) continue;

                var name = fields["Title"]?.ToString() ?? fields["Project_x0020_Title"]?.ToString() ?? fields["name"]?.ToString() ?? fields["id"]?.ToString() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(name)) continue;

                var type = fields["ArtifactType"]?.ToString() ?? fields["Artifact_x0020_Type"]?.ToString() ?? fields["Category"]?.ToString() ?? fields["type"]?.ToString() ?? "skill";
                var version = fields["Version"]?.ToString() ?? fields["version"]?.ToString() ?? "1.0.0";
                var visibility = fields["Visibility"]?.ToString() ?? fields["visibility"]?.ToString() ?? "Public";
                var isPrivate = visibility.Equals("Private", StringComparison.OrdinalIgnoreCase);
                var producer = fields["Submitted_x0020_By"]?.ToString() ?? fields["SubmittedBy"]?.ToString() ?? fields["producerEmail"]?.ToString() ?? "Engineering Commons";

                result.Add(new ArtifactSpec(name, type, version, string.Empty, isPrivate, producer));
            }

            if (result.Count > 0)
            {
                _cachedArtifacts = result;
                _artifactsCacheExpires = DateTime.UtcNow.AddMinutes(15);
            }

            return FilterArtifacts(result, typeFilter);
        }
        catch
        {
            return Enumerable.Empty<ArtifactSpec>();
        }
    }

    public async Task<ArtifactSpec?> GetArtifactByNameAsync(string token, string name)
    {
        var all = await GetArtifactsAsync(token);
        return all.FirstOrDefault(a => a.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<IEnumerable<BountyCliDto>> GetBountiesAsync(string token, string? status = null, string? category = null)
    {
        if (_cachedBounties != null && DateTime.UtcNow < _bountiesCacheExpires)
        {
            return FilterBounties(_cachedBounties, status, category);
        }

        try
        {
            var siteId = await GetSiteIdAsync(token);
            if (string.IsNullOrEmpty(siteId)) return Enumerable.Empty<BountyCliDto>();

            var listId = await GetListIdAsync(token, _bountyListAliases);
            if (string.IsNullOrEmpty(listId)) return Enumerable.Empty<BountyCliDto>();

            using var req = new HttpRequestMessage(HttpMethod.Get, $"/v1.0/sites/{siteId}/lists/{listId}/items?$expand=fields&$top=500");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            req.Headers.UserAgent.ParseAdd("EngineeringCommonsCLI/1.0");

            using var resp = await _http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return Enumerable.Empty<BountyCliDto>();

            var json = await resp.Content.ReadAsStringAsync();
            var root = JObject.Parse(json);
            var items = root["value"] as JArray;
            if (items == null) return Enumerable.Empty<BountyCliDto>();

            var result = new List<BountyCliDto>();
            foreach (var it in items)
            {
                var id = it["id"]?.ToString() ?? string.Empty;
                var fields = it["fields"] as JObject ?? it as JObject;
                if (fields == null) continue;

                var title = fields["Title"]?.ToString() ?? fields["title"]?.ToString() ?? "Untitled Bounty";
                var cat = fields["Category"]?.ToString() ?? fields["category"]?.ToString() ?? "General";
                var st = fields["Status"]?.ToString() ?? fields["status"]?.ToString() ?? "Open";
                var desc = fields["Description"]?.ToString() ?? fields["description"]?.ToString() ?? string.Empty;
                var claimedBy = fields["ClaimedBy"]?.ToString() ?? fields["Claimed_x0020_By"]?.ToString();
                int credits = 100;
                if (int.TryParse(fields["RewardCredits"]?.ToString() ?? fields["credits"]?.ToString(), out var c))
                {
                    credits = c;
                }

                result.Add(new BountyCliDto
                {
                    Id = id,
                    Title = title,
                    Category = cat,
                    Status = st,
                    Stage = st.Equals("InProgress", StringComparison.OrdinalIgnoreCase) ? "CodeGeneration" : "Open",
                    Description = desc,
                    Credits = credits,
                    ClaimedByEmail = claimedBy,
                    CanClaim = st.Equals("Open", StringComparison.OrdinalIgnoreCase),
                    DueInDays = 7,
                    AutoReleasesHours = 48,
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (result.Count > 0)
            {
                _cachedBounties = result;
                _bountiesCacheExpires = DateTime.UtcNow.AddMinutes(15);
            }

            return FilterBounties(result, status, category);
        }
        catch
        {
            return Enumerable.Empty<BountyCliDto>();
        }
    }

    public async Task<BountyDetailCliDto?> GetBountyByIdAsync(string token, string id)
    {
        var all = await GetBountiesAsync(token);
        var b = all.FirstOrDefault(x => x.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
        if (b == null) return null;

        return new BountyDetailCliDto
        {
            Id = b.Id,
            Title = b.Title,
            Category = b.Category,
            Status = b.Status,
            Stage = b.Stage,
            Description = b.Description,
            Credits = b.Credits,
            ClaimedByEmail = b.ClaimedByEmail,
            CanClaim = b.CanClaim,
            DueInDays = b.DueInDays,
            AutoReleasesHours = b.AutoReleasesHours,
            CreatedAt = b.CreatedAt
        };
    }

    private static IEnumerable<ArtifactSpec> FilterArtifacts(IEnumerable<ArtifactSpec> artifacts, string? typeFilter)
    {
        if (string.IsNullOrWhiteSpace(typeFilter)) return artifacts;
        return artifacts.Where(a => a.Type.Equals(typeFilter, StringComparison.OrdinalIgnoreCase));
    }

    private static IEnumerable<BountyCliDto> FilterBounties(IEnumerable<BountyCliDto> bounties, string? status, string? category)
    {
        var q = bounties;
        if (!string.IsNullOrWhiteSpace(status))
        {
            q = q.Where(b => b.Status.Equals(status, StringComparison.OrdinalIgnoreCase));
        }
        if (!string.IsNullOrWhiteSpace(category))
        {
            q = q.Where(b => b.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
        }
        return q;
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (disposing)
        {
            _http.Dispose();
        }
    }
}
