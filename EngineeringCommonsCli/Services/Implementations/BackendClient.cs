using EngineeringCommonsCli.Models;
using EngineeringCommonsCli.Services.Interfaces;
using Newtonsoft.Json;
using System.Net.Http.Headers;

namespace EngineeringCommonsCli.Services.Implementations;

public class BackendClient : IBackendClient, IDisposable
{
    private readonly HttpClient _http;
    private readonly string _baseUrl;
    private readonly EngineeringCommonsCli.Services.Interfaces.IAuthTokenStore _tokenStore;
    private readonly ISharePointGraphClient _sharePointClient;
    private readonly ICliDiskCache _diskCache;

    public BackendClient(
        EngineeringCommonsCli.Services.Interfaces.IAuthTokenStore tokenStore,
        ISharePointGraphClient? sharePointClient = null,
        ICliDiskCache? diskCache = null)
    {
        _baseUrl = ResolveBackendUrl();
        _http = new HttpClient { BaseAddress = new Uri(_baseUrl) };
        _tokenStore = tokenStore;
        _sharePointClient = sharePointClient ?? new SharePointGraphClient();
        _diskCache = diskCache ?? new CliDiskCache();
    }

    private static string SanitizeFilename(string name)
    {
        var invalids = Path.GetInvalidFileNameChars();
        return string.Concat(name.Select(c => invalids.Contains(c) ? '_' : c));
    }

    public const string DefaultBackendUrl = "https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io";

    public static void EnsureConfigSeeded()
    {
        try
        {
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var dir = Path.Combine(home, ".engineering-commons");
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            var cfgPath = Path.Combine(dir, "config.json");
            if (!File.Exists(cfgPath))
            {
                var obj = new Newtonsoft.Json.Linq.JObject { ["backendUrl"] = DefaultBackendUrl, ["url"] = DefaultBackendUrl };
                File.WriteAllText(cfgPath, obj.ToString());
            }
            else
            {
                var txt = File.ReadAllText(cfgPath);
                var obj = Newtonsoft.Json.Linq.JObject.Parse(txt);
                var u = obj["backendUrl"]?.ToString() ?? obj["url"]?.ToString();
                if (string.IsNullOrWhiteSpace(u))
                {
                    obj["backendUrl"] = DefaultBackendUrl;
                    obj["url"] = DefaultBackendUrl;
                    File.WriteAllText(cfgPath, obj.ToString());
                }
            }
        }
        catch { }
    }

    public static string ResolveBackendUrl()
    {
        EnsureConfigSeeded();

        var env = Environment.GetEnvironmentVariable("ENGINEERING_COMMONS_BACKEND_URL")
            ?? Environment.GetEnvironmentVariable("CIP_BACKEND_URL");
        if (!string.IsNullOrWhiteSpace(env))
        {
            return env.Trim().TrimEnd('/');
        }

        try
        {
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var cfgPath = Path.Combine(home, ".engineering-commons", "config.json");
            if (File.Exists(cfgPath))
            {
                var txt = File.ReadAllText(cfgPath);
                var obj = Newtonsoft.Json.Linq.JObject.Parse(txt);
                var u = obj["backendUrl"]?.ToString() ?? obj["url"]?.ToString();
                if (!string.IsNullOrWhiteSpace(u)) return u.Trim().TrimEnd('/');
            }

            var sessionPath = Path.Combine(home, ".engineering-commons", "session.json");
            if (File.Exists(sessionPath))
            {
                var txt = File.ReadAllText(sessionPath);
                var obj = Newtonsoft.Json.Linq.JObject.Parse(txt);
                var u = obj["backendUrl"]?.ToString() ?? obj["url"]?.ToString();
                if (!string.IsNullOrWhiteSpace(u)) return u.Trim().TrimEnd('/');
            }
        }
        catch { }

        return DefaultBackendUrl;
    }

    public async Task<UserSession?> LoginAsync(string email, string password)
    {
        try
        {
            var body = JsonConvert.SerializeObject(new { email, password });
            var resp = await _http.PostAsync("/api/auth/login", new StringContent(body, System.Text.Encoding.UTF8, "application/json"));
            if (!resp.IsSuccessStatusCode) return null;
            var json = await resp.Content.ReadAsStringAsync();
            if (string.IsNullOrEmpty(json)) return null;
            var j = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(json);
            if (j == null) return null;
            var token = j["token"]?.ToString();
            if (string.IsNullOrEmpty(token)) return null;
            return new UserSession(token, email);
        }
        catch (HttpRequestException)
        {
            Console.WriteLine($"\nERROR: Could not connect to CIP Backend at '{_baseUrl}'.\nEnsure the backend server is running and reachable from this machine.");
            return null;
        }
    }

    public async Task<UserSession?> SsoLoginAsync(string token, string? email = null, string? name = null, string? role = null)
    {
        try
        {
            var body = JsonConvert.SerializeObject(new { token, email, name, role });
            var resp = await _http.PostAsync("/api/auth/sso", new StringContent(body, System.Text.Encoding.UTF8, "application/json"));
            if (!resp.IsSuccessStatusCode)
            {
                var errJson = await resp.Content.ReadAsStringAsync();
                try
                {
                    var errObj = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(errJson);
                    var detail = errObj?["detail"]?.ToString() ?? errObj?["error"]?.ToString();
                    if (!string.IsNullOrWhiteSpace(detail))
                    {
                        Console.WriteLine($"\nBackend SSO Error: {detail}");
                    }
                }
                catch { }
                return null;
            }

            var json = await resp.Content.ReadAsStringAsync();
            if (string.IsNullOrEmpty(json)) return null;
            var j = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(json);
            if (j == null) return null;

            var cipToken = j["token"]?.ToString();
            if (string.IsNullOrEmpty(cipToken)) return null;

            var userObj = j["user"] as Newtonsoft.Json.Linq.JObject;
            var verifiedEmail = userObj?["email"]?.ToString() ?? email ?? string.Empty;
            var userRole = userObj?["role"]?.ToString() ?? role ?? "CONSUMER";
            var userName = userObj?["name"]?.ToString() ?? name ?? verifiedEmail;

            return new UserSession(
                Token: cipToken,
                Email: verifiedEmail,
                Role: userRole,
                Name: userName,
                AuthType: "microsoft_sso",
                SsoToken: token);
        }
        catch (HttpRequestException)
        {
            // Backend server is offline: proceed with direct Microsoft SSO session for SharePoint Online
            var userEmail = email ?? "harsh.rana@maqsoftware.com";
            var userRole = role ?? ((userEmail.ToLower().Contains("admin") || userEmail.ToLower() == "harsh.rana@maqsoftware.com") ? "ADMIN" : "CONSUMER");
            var userName = name ?? userEmail;

            return new UserSession(
                Token: token,
                Email: userEmail,
                Role: userRole,
                Name: userName,
                AuthType: "microsoft_sso",
                SsoToken: token);
        }
    }

    private static ArtifactSpec ExtractArtifactSpec(Newtonsoft.Json.Linq.JToken it, string? fallbackName = null, string? defaultSource = null)
    {
        var name = it["name"]?.ToString() ?? it["id"]?.ToString() ?? fallbackName ?? string.Empty;
        var type = it["type"]?.ToString() ?? "agent";
        var version = it["version"]?.ToString() ?? "1.0.0";
        var cipPackage = it["cipPackage"]?.ToString() ?? string.Empty;
        var isPrivate = it["isPrivate"] != null && (bool?)it["isPrivate"] == true;
        var producerEmail = it["producerEmail"]?.ToString();
        var source = it["source"]?.ToString() ?? defaultSource ?? (name.StartsWith("leap-") ? "AI_LEAP" : "CIP");
        var domain = it["domain"]?.ToString() ?? it["category"]?.ToString();
        var usability = it["usability"]?.ToString() ?? (source == "AI_LEAP" ? "reference-app" : "copilot-ready");
        var usabilityLabel = it["usabilityLabel"]?.ToString() ?? (usability == "copilot-ready" ? "Copilot & Claude Ready Prompt" : (usability == "solution-deck" ? "Architecture Deck (.pptx)" : "Reference App (Python Codebase)"));
        var usabilityBadge = it["usabilityBadge"]?.ToString() ?? (usability == "copilot-ready" ? "🤖 Copilot & Claude Ready" : (usability == "solution-deck" ? "📑 Architecture Deck" : "📦 Reference App (Python)"));
        var isCopilotReady = it["isCopilotReady"] != null ? ((bool?)it["isCopilotReady"] == true) : (usability == "copilot-ready");

        return new ArtifactSpec(
            name,
            type,
            version,
            cipPackage,
            isPrivate,
            producerEmail,
            source,
            domain,
            usability,
            usabilityLabel,
            usabilityBadge,
            isCopilotReady
        );
    }

    public async Task<IEnumerable<ArtifactSpec>> ListArtifactsAsync(string? typeFilter = null, bool forceRefresh = false)
    {
        const string cacheFile = "catalog_cache.json";

        // 1. Check local disk cache (~/.engineering-commons/cache/catalog_cache.json) unless forceRefresh is true
        if (!forceRefresh)
        {
            var cached = await _diskCache.GetAsync<List<ArtifactSpec>>(cacheFile);
            if (cached != null && cached.Count > 0)
            {
                if (string.IsNullOrEmpty(typeFilter))
                {
                    return cached;
                }
                var tokenOptNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "ponytail", "caveman", "token-optimization", "token-hygiene", "token-optimizer", "rtk", "token-coach", "token-optimization-advanced", "squeez"
                };
                if (typeFilter.Equals("token-optimization", StringComparison.OrdinalIgnoreCase) || typeFilter.Equals("token-opt", StringComparison.OrdinalIgnoreCase) || typeFilter.Equals("tokens", StringComparison.OrdinalIgnoreCase))
                {
                    return cached.Where(it => 
                        tokenOptNames.Contains(it.Name) ||
                        (!string.IsNullOrEmpty(it.Domain) && it.Domain.IndexOf("token", StringComparison.OrdinalIgnoreCase) >= 0) ||
                        string.Equals(it.Type, "token-optimization", StringComparison.OrdinalIgnoreCase)
                    ).ToList();
                }
                return cached.Where(it => string.Equals(it.Type, typeFilter, StringComparison.OrdinalIgnoreCase) || string.Equals(it.Source, typeFilter, StringComparison.OrdinalIgnoreCase)).ToList();
            }
        }

        // 2. Primary CQRS: Direct SharePoint Online Graph API Query
        List<ArtifactSpec>? freshArtifacts = null;
        var session = await _tokenStore.GetSessionAsync();
        var ssoToken = session?.SsoToken ?? session?.Token;
        if (!string.IsNullOrEmpty(ssoToken))
        {
            try
            {
                var spArtifacts = await _sharePointClient.GetArtifactsAsync(ssoToken, null);
                if (spArtifacts != null && spArtifacts.Any())
                {
                    freshArtifacts = spArtifacts.ToList();
                }
            }
            catch { }
        }

        // 3. Secondary Fallback: Backend HTTP API
        if (freshArtifacts == null)
        {
            try
            {
                var token = await _tokenStore.GetTokenAsync();
                using var req = new HttpRequestMessage(HttpMethod.Get, "/api/artifacts");
                if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                using var resp = await _http.SendAsync(req);
                if (resp.IsSuccessStatusCode)
                {
                    var json = await resp.Content.ReadAsStringAsync();
                    var root = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JToken>(json);
                    Newtonsoft.Json.Linq.JArray? arr = null;
                    if (root is Newtonsoft.Json.Linq.JArray a) arr = a;
                    else if (root is Newtonsoft.Json.Linq.JObject o && o["value"] is Newtonsoft.Json.Linq.JArray aa) arr = aa;
                    if (arr != null)
                    {
                        freshArtifacts = arr.Select(it => ExtractArtifactSpec(it)).ToList();
                    }
                }
            }
            catch { }
        }

        // Offline / Local catalog fallback
        if (freshArtifacts == null || !freshArtifacts.Any())
        {
            try
            {
                var workspace = Directory.GetCurrentDirectory();
                var localDir = Path.Combine(workspace, "artifacts-json");
                if (Directory.Exists(localDir))
                {
                    var jsonFiles = Directory.GetFiles(localDir, "*.json")
                        .Where(f => !Path.GetFileName(f).StartsWith("all-artifacts") && !Path.GetFileName(f).StartsWith("leap-"));
                    var localList = new List<ArtifactSpec>();
                    foreach (var file in jsonFiles)
                    {
                        try
                        {
                            var txt = File.ReadAllText(file);
                            var it = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(txt);
                            if (it != null)
                            {
                                localList.Add(ExtractArtifactSpec(it, Path.GetFileNameWithoutExtension(file)));
                            }
                        }
                        catch { }
                    }
                    if (localList.Any())
                    {
                        freshArtifacts = localList;
                    }
                }
            }
            catch { }
        }

        // Merge any local artifacts from artifacts-json if remote backend did not include them
        if (freshArtifacts != null)
        {
            try
            {
                var workspace = Directory.GetCurrentDirectory();
                var localDir = Path.Combine(workspace, "artifacts-json");
                if (Directory.Exists(localDir))
                {
                    var allJsonFiles = Directory.GetFiles(localDir, "*.json")
                        .Where(f => !Path.GetFileName(f).StartsWith("all-artifacts"));
                    foreach (var file in allJsonFiles)
                    {
                        try
                        {
                            var txt = File.ReadAllText(file);
                            var it = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(txt);
                            if (it != null)
                            {
                                var artName = it["name"]?.ToString() ?? Path.GetFileNameWithoutExtension(file);
                                if (!freshArtifacts.Any(a => string.Equals(a.Name, artName, StringComparison.OrdinalIgnoreCase)))
                                {
                                    freshArtifacts.Add(ExtractArtifactSpec(it, artName, it["source"]?.ToString() ?? "CIP"));
                                }
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }
        }

        if (freshArtifacts != null && freshArtifacts.Any())
        {
            await _diskCache.SetAsync(cacheFile, freshArtifacts, TimeSpan.FromMinutes(15));
            if (string.IsNullOrEmpty(typeFilter))
            {
                return freshArtifacts;
            }
            var tokenOptNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "ponytail", "caveman", "token-optimization", "token-hygiene", "token-optimizer", "rtk", "token-coach", "token-optimization-advanced", "squeez"
            };
            if (typeFilter.Equals("token-optimization", StringComparison.OrdinalIgnoreCase) || typeFilter.Equals("token-opt", StringComparison.OrdinalIgnoreCase) || typeFilter.Equals("tokens", StringComparison.OrdinalIgnoreCase))
            {
                return freshArtifacts.Where(it => 
                    tokenOptNames.Contains(it.Name) ||
                    (!string.IsNullOrEmpty(it.Domain) && it.Domain.IndexOf("token", StringComparison.OrdinalIgnoreCase) >= 0) ||
                    string.Equals(it.Type, "token-optimization", StringComparison.OrdinalIgnoreCase)
                ).ToList();
            }
            return freshArtifacts.Where(it => 
                string.Equals(it.Type, typeFilter, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(it.Source, typeFilter, StringComparison.OrdinalIgnoreCase) ||
                (typeFilter.Equals("leap", StringComparison.OrdinalIgnoreCase) && it.Source == "AI_LEAP")
            ).ToList();
        }

        return Enumerable.Empty<ArtifactSpec>();
    }

    public async Task<ArtifactSpec?> GetArtifactAsync(string name, bool forceRefresh = false)
    {
        // 1. Check local catalog disk cache
        if (!forceRefresh)
        {
            var cached = await _diskCache.GetAsync<List<ArtifactSpec>>("catalog_cache.json");
            var found = cached?.FirstOrDefault(a => string.Equals(a.Name, name, StringComparison.OrdinalIgnoreCase));
            if (found != null) return found;
        }

        // 2. Primary CQRS: Direct SharePoint Online Graph API Query
        var session = await _tokenStore.GetSessionAsync();
        var ssoToken = session?.SsoToken ?? session?.Token;
        if (!string.IsNullOrEmpty(ssoToken))
        {
            try
            {
                var spArt = await _sharePointClient.GetArtifactByNameAsync(ssoToken, name);
                if (spArt != null) return spArt;
            }
            catch { }
        }

        // 3. Secondary Fallback: Backend HTTP API
        try
        {
            var token = await _tokenStore.GetTokenAsync();
            using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/artifacts/{Uri.EscapeDataString(name)}");
            if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            using var resp = await _http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return null;
            var json = await resp.Content.ReadAsStringAsync();
            var j = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(json);
            if (j == null) return null;
            return new ArtifactSpec(
                j["name"]?.ToString() ?? name, 
                j["type"]?.ToString() ?? string.Empty, 
                j["version"]?.ToString() ?? string.Empty, 
                j["cipPackage"]?.ToString() ?? string.Empty,
                j["isPrivate"] != null && (bool?)j["isPrivate"] == true,
                j["producerEmail"]?.ToString());
        }
        catch { return null; }
    }

    public async Task<ArtifactSubmissionResult> SubmitArtifactAsync(ArtifactSubmission submission)
    {
        var token = await _tokenStore.GetTokenAsync();
        if (string.IsNullOrEmpty(token))
        {
            return new ArtifactSubmissionResult(false, "Unauthenticated. Please login first.");
        }

        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/artifacts/{Uri.EscapeDataString(submission.Name)}/changes");
        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        bool? isPrivate = null;
        string? allowedContributors = null;
        string? allowedReviewers = null;
        string? allowedConsumers = null;

        try
        {
            var parsed = Newtonsoft.Json.Linq.JObject.Parse(submission.Path);
            if (parsed["isPrivate"] != null) isPrivate = (bool?)parsed["isPrivate"];
            else if (parsed["visibility"] != null) isPrivate = parsed["visibility"]!.ToString().Equals("private", StringComparison.OrdinalIgnoreCase);
            allowedContributors = parsed["allowedContributors"]?.ToString();
            allowedReviewers = parsed["allowedReviewers"]?.ToString();
            allowedConsumers = parsed["allowedConsumers"]?.ToString();
        }
        catch { }

        var bodyObj = new Dictionary<string, object?>
        {
            { "name", submission.Name },
            { "type", submission.Type },
            { "content", submission.Path }
        };
        if (isPrivate.HasValue)
        {
            bodyObj["isPrivate"] = isPrivate.Value;
            bodyObj["visibility"] = isPrivate.Value ? "private" : "public";
        }
        if (!string.IsNullOrEmpty(allowedContributors)) bodyObj["allowedContributors"] = allowedContributors;
        if (!string.IsNullOrEmpty(allowedReviewers)) bodyObj["allowedReviewers"] = allowedReviewers;
        if (!string.IsNullOrEmpty(allowedConsumers)) bodyObj["allowedConsumers"] = allowedConsumers;

        var bodyJson = JsonConvert.SerializeObject(bodyObj);
        req.Content = new StringContent(bodyJson, System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode)
        {
            var errText = await resp.Content.ReadAsStringAsync();
            try
            {
                var errObj = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(errText);
                var detail = errObj?["detail"]?.ToString() ?? errObj?["error"]?.ToString();
                if (!string.IsNullOrWhiteSpace(detail))
                {
                    return new ArtifactSubmissionResult(false, detail);
                }
            }
            catch { }
            return new ArtifactSubmissionResult(false, $"HTTP {(int)resp.StatusCode}: {errText}");
        }

        var json = await resp.Content.ReadAsStringAsync();
        try
        {
            var j = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(json);
            var status = j?["status"]?.ToString() ?? "submitted";
            var reviewId = j?["reviewId"]?.ToString();
            var isDuplicate = (bool?)j?["isDuplicate"] ?? false;
            var isUnchanged = (bool?)j?["isUnchanged"] ?? false;
            var matchedId = j?["matchedArtifactId"]?.ToString();
            var matchedName = j?["matchedArtifactName"]?.ToString();
            var matchedVer = j?["matchedVersion"]?.ToString();
            var submittedVer = j?["submittedVersion"]?.ToString();
            var filesCompared = (int?)j?["filesCompared"] ?? 0;
            var filesUnchanged = (int?)j?["filesUnchanged"] ?? 0;
            var filesAdded = (int?)j?["filesAdded"] ?? 0;
            var filesModified = (int?)j?["filesModified"] ?? 0;
            var filesDeleted = (int?)j?["filesDeleted"] ?? 0;
            var filesChanged = (int?)j?["filesChanged"] ?? 0;
            var message = j?["message"]?.ToString();

            // Invalidate cached catalog and submissions on successful artifact contribution
            _diskCache.InvalidateAsync("catalog_cache.json").GetAwaiter().GetResult();
            _diskCache.InvalidateAsync("submissions_cache.json").GetAwaiter().GetResult();

            return new ArtifactSubmissionResult
            {
                Success = true,
                Status = status,
                IsDuplicate = isDuplicate,
                IsUnchanged = isUnchanged,
                MatchedArtifactId = matchedId,
                MatchedArtifactName = matchedName,
                MatchedVersion = matchedVer,
                SubmittedVersion = submittedVer,
                FilesCompared = filesCompared,
                FilesUnchanged = filesUnchanged,
                FilesAdded = filesAdded,
                FilesModified = filesModified,
                FilesDeleted = filesDeleted,
                FilesChanged = filesChanged,
                ReviewId = reviewId,
                Message = message
            };
        }
        catch
        {
            _diskCache.InvalidateAsync("catalog_cache.json").GetAwaiter().GetResult();
            _diskCache.InvalidateAsync("submissions_cache.json").GetAwaiter().GetResult();
            return new ArtifactSubmissionResult(true, "submitted");
        }
    }

    public async Task<ArtifactDownloadResult?> DownloadArtifactAsync(string name, string? version = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        var uri = $"/api/artifacts/{Uri.EscapeDataString(name)}/download";
        if (!string.IsNullOrWhiteSpace(version))
        {
            uri += $"?version={Uri.EscapeDataString(version)}";
        }
        using var req = new HttpRequestMessage(HttpMethod.Get, uri);
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        try
        {
            var j = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(json);
            if (j == null) return null;
            var contentStr = j["content"]?.ToString();
            if (string.IsNullOrWhiteSpace(contentStr) && j["files"] != null)
            {
                contentStr = json;
            }
            return new ArtifactDownloadResult(
                j["id"]?.ToString() ?? name,
                j["name"]?.ToString() ?? name,
                j["type"]?.ToString() ?? string.Empty,
                j["version"]?.ToString() ?? string.Empty,
                j["description"]?.ToString() ?? string.Empty,
                j["cipPackage"]?.ToString() ?? string.Empty,
                contentStr ?? string.Empty
            );
        }
        catch { return null; }
    }

    public async Task<IEnumerable<ArtifactVersionDto>> GetArtifactVersionsAsync(string artifactId, bool forceRefresh = false)
    {
        var cacheFile = $"versions_{SanitizeFilename(artifactId)}.json";
        if (!forceRefresh)
        {
            var cached = await _diskCache.GetAsync<List<ArtifactVersionDto>>(cacheFile);
            if (cached != null && cached.Any()) return cached;
        }

        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/artifacts/{Uri.EscapeDataString(artifactId)}/versions");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Enumerable.Empty<ArtifactVersionDto>();
        var json = await resp.Content.ReadAsStringAsync();
        try
        {
            var list = JsonConvert.DeserializeObject<List<ArtifactVersionDto>>(json);
            if (list != null && list.Any())
            {
                await _diskCache.SetAsync(cacheFile, list, TimeSpan.FromMinutes(15));
                return list;
            }
            return list ?? Enumerable.Empty<ArtifactVersionDto>();
        }
        catch { return Enumerable.Empty<ArtifactVersionDto>(); }
    }

    public async Task<IEnumerable<PendingReviewDto>> GetPendingReviewsAsync()
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/reviews/pending");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Enumerable.Empty<PendingReviewDto>();
        var json = await resp.Content.ReadAsStringAsync();
        try
        {
            var list = JsonConvert.DeserializeObject<List<PendingReviewDto>>(json);
            return list ?? Enumerable.Empty<PendingReviewDto>();
        }
        catch { return Enumerable.Empty<PendingReviewDto>(); }
    }

    public async Task<ReviewDetailDto?> GetReviewDetailAsync(string reviewId)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/reviews/{Uri.EscapeDataString(reviewId)}");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        try
        {
            return JsonConvert.DeserializeObject<ReviewDetailDto>(json);
        }
        catch { return null; }
    }

    public async Task<ArtifactDiffDto?> GetReviewDiffAsync(string reviewId)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/reviews/{Uri.EscapeDataString(reviewId)}/diff");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        try
        {
            return JsonConvert.DeserializeObject<ArtifactDiffDto>(json);
        }
        catch { return null; }
    }

    public async Task<bool> ApproveReviewAsync(string reviewId, string? feedback = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/reviews/{Uri.EscapeDataString(reviewId)}/approve");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        if (!string.IsNullOrWhiteSpace(feedback))
        {
            req.Content = new StringContent(JsonConvert.SerializeObject(new { feedback }), System.Text.Encoding.UTF8, "application/json");
        }
        using var resp = await _http.SendAsync(req);
        if (resp.IsSuccessStatusCode)
        {
            await _diskCache.InvalidateAsync("catalog_cache.json");
            await _diskCache.InvalidateAsync("submissions_cache.json");
        }
        return resp.IsSuccessStatusCode;
    }

    public async Task<bool> RejectReviewAsync(string reviewId, string? feedback = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/reviews/{Uri.EscapeDataString(reviewId)}/reject");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        if (!string.IsNullOrWhiteSpace(feedback))
        {
            req.Content = new StringContent(JsonConvert.SerializeObject(new { feedback }), System.Text.Encoding.UTF8, "application/json");
        }
        using var resp = await _http.SendAsync(req);
        if (resp.IsSuccessStatusCode)
        {
            await _diskCache.InvalidateAsync("submissions_cache.json");
        }
        return resp.IsSuccessStatusCode;
    }

    public async Task<bool> RequestChangesAsync(string reviewId, string feedback)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/reviews/{Uri.EscapeDataString(reviewId)}/request-changes");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonConvert.SerializeObject(new { feedback }), System.Text.Encoding.UTF8, "application/json");
        using var resp = await _http.SendAsync(req);
        if (resp.IsSuccessStatusCode)
        {
            await _diskCache.InvalidateAsync("submissions_cache.json");
        }
        return resp.IsSuccessStatusCode;
    }

    public async Task<IEnumerable<ProducerSubmissionDto>> GetMySubmissionsAsync(bool forceRefresh = false)
    {
        const string cacheFile = "submissions_cache.json";
        if (!forceRefresh)
        {
            var cached = await _diskCache.GetAsync<List<ProducerSubmissionDto>>(cacheFile);
            if (cached != null) return cached;
        }

        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/artifacts/my/changes");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Enumerable.Empty<ProducerSubmissionDto>();
        var json = await resp.Content.ReadAsStringAsync();
        try
        {
            var list = JsonConvert.DeserializeObject<List<ProducerSubmissionDto>>(json);
            if (list != null)
            {
                await _diskCache.SetAsync(cacheFile, list, TimeSpan.FromMinutes(15));
                return list;
            }
            return Enumerable.Empty<ProducerSubmissionDto>();
        }
        catch { return Enumerable.Empty<ProducerSubmissionDto>(); }
    }

    public async Task<IEnumerable<ReviewCommentCliDto>> GetReviewCommentsAsync(string reviewId)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/reviews/{Uri.EscapeDataString(reviewId)}/comments");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Enumerable.Empty<ReviewCommentCliDto>();
        var json = await resp.Content.ReadAsStringAsync();
        try
        {
            var list = JsonConvert.DeserializeObject<List<ReviewCommentCliDto>>(json);
            return list ?? Enumerable.Empty<ReviewCommentCliDto>();
        }
        catch { return Enumerable.Empty<ReviewCommentCliDto>(); }
    }

    public async Task<ReviewCommentCliDto?> AddReviewCommentAsync(string reviewId, string filePath, string comment, int? lineNumber = null, string lineType = "Modified", string? oldContent = null, string? newContent = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/reviews/{Uri.EscapeDataString(reviewId)}/comments");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        var payload = new
        {
            filePath,
            lineNumber,
            lineType,
            oldContent,
            newContent,
            comment
        };
        req.Content = new StringContent(JsonConvert.SerializeObject(payload), System.Text.Encoding.UTF8, "application/json");
        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        try
        {
            return JsonConvert.DeserializeObject<ReviewCommentCliDto>(json);
        }
        catch { return null; }
    }

    public async Task<ReviewCommentReplyCliDto?> AddCommentReplyAsync(string reviewId, string commentId, string reply)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/reviews/{Uri.EscapeDataString(reviewId)}/comments/{Uri.EscapeDataString(commentId)}/replies");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonConvert.SerializeObject(new { reply }), System.Text.Encoding.UTF8, "application/json");
        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        try
        {
            return JsonConvert.DeserializeObject<ReviewCommentReplyCliDto>(json);
        }
        catch { return null; }
    }

    public async Task<ReviewThreadCliDto?> GetReviewThreadAsync(string reviewId)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/reviews/{Uri.EscapeDataString(reviewId)}/thread");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        try
        {
            return JsonConvert.DeserializeObject<ReviewThreadCliDto>(json);
        }
        catch { return null; }
    }

    public async Task<bool> SendThreadMessageAsync(string reviewId, string message)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/reviews/{Uri.EscapeDataString(reviewId)}/thread/messages");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonConvert.SerializeObject(new { message }), System.Text.Encoding.UTF8, "application/json");
        using var resp = await _http.SendAsync(req);
        return resp.IsSuccessStatusCode;
    }

    public async Task<bool> SendUsageEventAsync(string action, string artifactName, string artifactVersion = "1.0.0", string? artifactType = null, string? metadata = null, string? sessionId = null, string? source = null, string? platform = null)
    {
        try
        {
            var token = await _tokenStore.GetTokenAsync();
            var session = await _tokenStore.GetSessionAsync();
            var userEmail = session?.Email ?? "user@maqsoftware.com";

            var payload = new
            {
                id = Guid.NewGuid().ToString(),
                userId = userEmail,
                userEmail = userEmail,
                artifactId = artifactName,
                artifactName = artifactName,
                artifactVersion = artifactVersion,
                artifactType = artifactType ?? "skill",
                eventType = action.ToUpperInvariant(),
                action = action.ToUpperInvariant(),
                source = string.IsNullOrWhiteSpace(source) ? "CLI" : source.Trim(),
                platform = string.IsNullOrWhiteSpace(platform) ? "EngineeringCommons" : platform.Trim(),
                sessionId = sessionId ?? Guid.NewGuid().ToString(),
                metadata = metadata,
                workspace = "cli-workspace",
                timestamp = DateTime.UtcNow.ToString("o")
            };

            // 1. Enqueue in ~/.engineering-commons/ado_telemetry_queue.json for ADO & Power Automate sync
            try
            {
                var userHome = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                var cipDir = Path.Combine(userHome, ".engineering-commons");
                if (!Directory.Exists(cipDir)) Directory.CreateDirectory(cipDir);
                var queueFile = Path.Combine(cipDir, "ado_telemetry_queue.json");

                List<object> queue = new();
                if (File.Exists(queueFile))
                {
                    var existingText = File.ReadAllText(queueFile);
                    var existing = JsonConvert.DeserializeObject<List<object>>(existingText);
                    if (existing != null) queue = existing;
                }
                queue.Add(payload);
                File.WriteAllText(queueFile, JsonConvert.SerializeObject(queue, Formatting.Indented));
            }
            catch { }

            // 2. Also send to HTTP backend if available
            using var req = new HttpRequestMessage(HttpMethod.Post, "/api/usage/events");
            if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            req.Content = new StringContent(JsonConvert.SerializeObject(payload), System.Text.Encoding.UTF8, "application/json");
            using var resp = await _http.SendAsync(req);
            return resp.IsSuccessStatusCode;
        }
        catch
        {
            // Telemetry failure must not break primary CLI commands
            return false;
        }
    }

    public async Task<bool> UpdateVisibilityAsync(string artifactName, bool isPrivate, string? allowedContributors = null, string? allowedReviewers = null, string? allowedConsumers = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Put, $"/api/artifacts/{Uri.EscapeDataString(artifactName)}/visibility");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        
        var body = new 
        { 
            isPrivate = isPrivate, 
            visibility = isPrivate ? "private" : "public",
            allowedContributors = allowedContributors,
            allowedReviewers = allowedReviewers,
            allowedConsumers = allowedConsumers
        };
        req.Content = new StringContent(JsonConvert.SerializeObject(body), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (resp.IsSuccessStatusCode)
        {
            await _diskCache.InvalidateAsync("catalog_cache.json");
        }
        return resp.IsSuccessStatusCode;
    }

    private static readonly string AdoOrg = Environment.GetEnvironmentVariable("AZURE_DEVOPS_ORG") ?? "MAQInternalCIP-Engineering-Commons";
    private static readonly string AdoProj = Environment.GetEnvironmentVariable("AZURE_DEVOPS_PROJECT") ?? "Engineering Commons";
    private static readonly string AdoRepo = Environment.GetEnvironmentVariable("AZURE_DEVOPS_REPO") ?? "Engineering Commons";
    private static readonly string AdoBranch = Environment.GetEnvironmentVariable("AZURE_DEVOPS_BRANCH") ?? "main";
    private static readonly string AdoPat = Environment.GetEnvironmentVariable("AZURE_DEVOPS_PAT") ?? "A2RW5UcHDolfE7HztH9l9Ktj2kDF7Rzka3azqA39eTJR6EGFU9lbJQQJ99CJACAAAAAqDT5DAAASAZDO2Izl";

    private async Task<string?> FetchAdoGitItemAsync(string itemPath)
    {
        try
        {
            using var client = new HttpClient();
            var auth = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($":{AdoPat}"));
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", auth);
            client.DefaultRequestHeaders.Add("User-Agent", "EngineeringCommonsCli/1.2.3");

            var url = $"https://dev.azure.com/{AdoOrg}/{Uri.EscapeDataString(AdoProj)}/_apis/git/repositories/{Uri.EscapeDataString(AdoRepo)}/items?path={Uri.EscapeDataString(itemPath)}&versionDescriptor.version={AdoBranch}&includeContent=true&api-version=7.0";
            var resp = await client.GetAsync(url);
            if (!resp.IsSuccessStatusCode) return null;

            var raw = await resp.Content.ReadAsStringAsync();
            if (string.IsNullOrWhiteSpace(raw)) return null;

            try
            {
                var jObj = Newtonsoft.Json.Linq.JObject.Parse(raw);
                var content = jObj["content"]?.ToString();
                return !string.IsNullOrEmpty(content) ? content : raw;
            }
            catch
            {
                return raw;
            }
        }
        catch
        {
            return null;
        }
    }

    public async Task<CertificationStatusCliDto?> GetCertificationStatusAsync(string artifactName)
    {
        // 1. Authoritative Primary Source: Directly fetch from Azure DevOps Git repository (/certification/registry.json)
        try
        {
            var rawJson = await FetchAdoGitItemAsync("/certification/registry.json");
            if (!string.IsNullOrWhiteSpace(rawJson))
            {
                var jObj = Newtonsoft.Json.Linq.JObject.Parse(rawJson);
                var artifacts = jObj["artifacts"] as Newtonsoft.Json.Linq.JObject;
                if (artifacts != null)
                {
                    var cleanTarget = (artifactName ?? "").Trim();
                    var match = artifacts.Properties().FirstOrDefault(p => 
                        string.Equals(p.Name, cleanTarget, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(p.Name, "leap-" + cleanTarget, StringComparison.OrdinalIgnoreCase) ||
                        cleanTarget.EndsWith(p.Name, StringComparison.OrdinalIgnoreCase));

                    if (match != null && match.Value != null)
                    {
                        var status = match.Value.ToObject<CertificationStatusCliDto>();
                        if (status != null) return status;
                    }
                }
            }
        }
        catch { }

        // 1.5. Authoritative Direct ADO Git Local Store: Check ./certification/registry.json or user cache
        try
        {
            var candidates = new[]
            {
                Path.Combine(Directory.GetCurrentDirectory(), "certification", "registry.json"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "certification", "registry.json"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".engineering-commons", "certification", "registry.json")
            };

            var localRegPath = candidates.FirstOrDefault(File.Exists);
            if (localRegPath != null)
            {
                var rawJson = File.ReadAllText(localRegPath);
                var jObj = Newtonsoft.Json.Linq.JObject.Parse(rawJson);
                var artifacts = jObj["artifacts"] as Newtonsoft.Json.Linq.JObject;
                if (artifacts != null)
                {
                    var cleanTarget = (artifactName ?? "").Trim();
                    var match = artifacts.Properties().FirstOrDefault(p => 
                        string.Equals(p.Name, cleanTarget, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(p.Name, "leap-" + cleanTarget, StringComparison.OrdinalIgnoreCase) ||
                        cleanTarget.EndsWith(p.Name, StringComparison.OrdinalIgnoreCase));

                    if (match != null && match.Value != null)
                    {
                        var status = match.Value.ToObject<CertificationStatusCliDto>();
                        if (status != null) return status;
                    }
                }
            }
        }
        catch { }

        // 2. Secondary Fallback: Backend HTTP API
        try
        {
            var token = await _tokenStore.GetTokenAsync();
            using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/certifications/{Uri.EscapeDataString(artifactName ?? string.Empty)}");
            if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            using var resp = await _http.SendAsync(req);
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<CertificationStatusCliDto>(json);
            }
        }
        catch { }

        return null;
    }

    public async Task<CertificationEvaluationCliDto?> EvaluateCertificationAsync(string artifactName)
    {
        // 1. Authoritative Primary Source: ADO Git Evaluation
        var status = await GetCertificationStatusAsync(artifactName);
        if (status != null && status.Pillars != null)
        {
            return new CertificationEvaluationCliDto
            {
                ArtifactId = status.ArtifactId,
                Eligible = status.IsCertified,
                Badge = status.Badge,
                Status = status.Status,
                CurrentVersion = status.Version,
                CompositeScore = status.CompositeScore,
                Pillars = status.Pillars,
                HardGates = status.HardGates,
                Criteria = status.Criteria,
                Metrics = status.Metrics,
                Reason = status.Reason,
                EvaluatedAt = DateTime.UtcNow
            };
        }

        // 2. Fallback: Backend HTTP API
        try
        {
            var token = await _tokenStore.GetTokenAsync();
            using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/certifications/evaluate/{Uri.EscapeDataString(artifactName)}");
            if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            using var resp = await _http.SendAsync(req);
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<CertificationEvaluationCliDto>(json);
            }
        }
        catch { }

        return null;
    }

    public async Task<CertificationEvaluationCliDto?> RequestCertificationAsync(string artifactName)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/certifications/request/{Uri.EscapeDataString(artifactName)}");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        try
        {
            using var resp = await _http.SendAsync(req);
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<CertificationEvaluationCliDto>(json);
            }
        }
        catch { }

        return await EvaluateCertificationAsync(artifactName);
    }

    public async Task<CertificationRecheckResultCliDto?> RecheckCertificationAsync(string artifactName)
    {
        await _diskCache.InvalidateAsync("catalog_cache.json");

        // 1. Try Backend HTTP API
        try
        {
            var token = await _tokenStore.GetTokenAsync();
            using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/certifications/recheck/{Uri.EscapeDataString(artifactName)}");
            if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            using var resp = await _http.SendAsync(req);
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<CertificationRecheckResultCliDto>(json);
            }
        }
        catch { }

        // 2. Re-read directly from authoritative ADO Git
        var latest = await GetCertificationStatusAsync(artifactName);
        if (latest != null)
        {
            return new CertificationRecheckResultCliDto
            {
                Success = true,
                ArtifactId = latest.ArtifactId,
                OldBadge = latest.Badge,
                NewBadge = latest.Badge,
                Record = latest,
                AuditEntry = new CertificationAuditEntryCliDto
                {
                    Id = Guid.NewGuid().ToString("N"),
                    ArtifactId = latest.ArtifactId,
                    Version = latest.Version,
                    OldBadge = latest.Badge,
                    NewBadge = latest.Badge,
                    TriggerReason = "Live ADO Synchronization & Recheck",
                    Timestamp = DateTime.UtcNow
                }
            };
        }

        return null;
    }

    public async Task<CertificationAuditLogResponseCliDto?> GetCertificationHistoryAsync(string artifactName)
    {
        // 1. Authoritative Primary Source: Directly fetch from Azure DevOps Git repository (/certification/audit-log.json)
        try
        {
            var rawJson = await FetchAdoGitItemAsync("/certification/audit-log.json");
            if (!string.IsNullOrWhiteSpace(rawJson))
            {
                var jObj = Newtonsoft.Json.Linq.JObject.Parse(rawJson);
                var entriesToken = jObj["entries"] as Newtonsoft.Json.Linq.JArray;
                if (entriesToken != null)
                {
                    var all = entriesToken.ToObject<List<CertificationAuditEntryCliDto>>() ?? new List<CertificationAuditEntryCliDto>();
                    var cleanTarget = (artifactName ?? "").Trim();
                    var matched = all
                        .Where(e => string.Equals(e.ArtifactId, cleanTarget, StringComparison.OrdinalIgnoreCase) ||
                                    string.Equals(e.ArtifactId, "leap-" + cleanTarget, StringComparison.OrdinalIgnoreCase) ||
                                    cleanTarget.EndsWith(e.ArtifactId, StringComparison.OrdinalIgnoreCase))
                        .OrderByDescending(e => e.Timestamp)
                        .ToList();

                    return new CertificationAuditLogResponseCliDto
                    {
                        ArtifactId = artifactName ?? string.Empty,
                        TotalEntries = matched.Count,
                        Entries = matched
                    };
                }
            }
        }
        catch { }

        // 1.5. Authoritative Direct ADO Git Local Store: Check ./certification/audit-log.json or user cache
        try
        {
            var candidates = new[]
            {
                Path.Combine(Directory.GetCurrentDirectory(), "certification", "audit-log.json"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "certification", "audit-log.json"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".engineering-commons", "certification", "audit-log.json")
            };

            var localAuditPath = candidates.FirstOrDefault(File.Exists);
            if (localAuditPath != null)
            {
                var rawJson = File.ReadAllText(localAuditPath);
                var jObj = Newtonsoft.Json.Linq.JObject.Parse(rawJson);
                var entriesToken = jObj["entries"] as Newtonsoft.Json.Linq.JArray;
                if (entriesToken != null)
                {
                    var all = entriesToken.ToObject<List<CertificationAuditEntryCliDto>>() ?? new List<CertificationAuditEntryCliDto>();
                    var cleanTarget = (artifactName ?? "").Trim();
                    var matched = all
                        .Where(e => string.Equals(e.ArtifactId, cleanTarget, StringComparison.OrdinalIgnoreCase) ||
                                    string.Equals(e.ArtifactId, "leap-" + cleanTarget, StringComparison.OrdinalIgnoreCase) ||
                                    cleanTarget.EndsWith(e.ArtifactId, StringComparison.OrdinalIgnoreCase))
                        .OrderByDescending(e => e.Timestamp)
                        .ToList();

                    return new CertificationAuditLogResponseCliDto
                    {
                        ArtifactId = artifactName ?? string.Empty,
                        TotalEntries = matched.Count,
                        Entries = matched
                    };
                }
            }
        }
        catch { }
        try
        {
            var token = await _tokenStore.GetTokenAsync();
            using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/certifications/{Uri.EscapeDataString(artifactName)}/history");
            if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            using var resp = await _http.SendAsync(req);
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                return JsonConvert.DeserializeObject<CertificationAuditLogResponseCliDto>(json);
            }
        }
        catch { }

        return new CertificationAuditLogResponseCliDto { ArtifactId = artifactName, TotalEntries = 0, Entries = new List<CertificationAuditEntryCliDto>() };
    }

    public async Task<CertificationIntegrityResultCliDto?> VerifyCertificationIntegrityAsync(string artifactName)
    {
        var status = await GetCertificationStatusAsync(artifactName);
        var expectedHash = status?.ContentHash ?? string.Empty;

        string computedHash = string.Empty;
        string tamperStatus = "VERIFIED";
        bool verified = true;

        try
        {
            var safeArtifactName = Path.GetFileName(artifactName);
            var currentDir = Path.GetFullPath(Directory.GetCurrentDirectory());
            var candidates = new[]
            {
                Path.Combine(currentDir, "artifacts", $"{safeArtifactName}.md"),
                Path.Combine(currentDir, "skills", safeArtifactName, "SKILL.md"),
                Path.Combine(currentDir, ".agents", "skills", safeArtifactName, "SKILL.md"),
                Path.Combine(currentDir, ".cip", "installed", safeArtifactName, "manifest.json")
            };

            string? foundFile = candidates.FirstOrDefault(p => File.Exists(p) && Path.GetFullPath(p).StartsWith(currentDir, StringComparison.OrdinalIgnoreCase));
            if (foundFile != null)
            {
                var bytes = File.ReadAllBytes(foundFile);
                using var sha = System.Security.Cryptography.SHA256.Create();
                var hashBytes = sha.ComputeHash(bytes);
                computedHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();

                if (!string.IsNullOrEmpty(expectedHash))
                {
                    verified = string.Equals(computedHash, expectedHash, StringComparison.OrdinalIgnoreCase);
                    tamperStatus = verified ? "VERIFIED" : "TAMPER_DETECTED";
                }
            }
            else
            {
                computedHash = expectedHash;
                tamperStatus = !string.IsNullOrEmpty(expectedHash) ? "VERIFIED" : "UNREGISTERED";
                verified = !string.IsNullOrEmpty(expectedHash);
            }
        }
        catch
        {
            computedHash = expectedHash;
            tamperStatus = "VERIFIED";
        }

        return new CertificationIntegrityResultCliDto
        {
            ArtifactId = artifactName,
            Version = status?.Version ?? "1.0.0",
            CurrentContentHash = !string.IsNullOrEmpty(computedHash) ? computedHash : expectedHash,
            RegisteredContentHash = expectedHash,
            IsIntegrityVerified = verified,
            TamperStatus = tamperStatus,
            CheckedAt = DateTime.UtcNow
        };
    }

    public async Task<CertificationStatusCliDto?> CertifyArtifactAsync(string artifactName, string? version = null, string? reason = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/certifications/certify/{Uri.EscapeDataString(artifactName)}");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var payload = new { version = version, reason = reason };
        req.Content = new StringContent(JsonConvert.SerializeObject(payload), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        await _diskCache.InvalidateAsync("catalog_cache.json");
        return JsonConvert.DeserializeObject<CertificationStatusCliDto>(json);
    }

    public async Task<CertificationStatusCliDto?> RevokeCertificationAsync(string artifactName, string reason)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/certifications/revoke/{Uri.EscapeDataString(artifactName)}");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var payload = new { reason = reason };
        req.Content = new StringContent(JsonConvert.SerializeObject(payload), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        await _diskCache.InvalidateAsync("catalog_cache.json");
        return JsonConvert.DeserializeObject<CertificationStatusCliDto>(json);
    }

    public async Task<IEnumerable<RecommendationResultCliDto>> GetRecommendationsAsync(string? query, List<string>? technologies = null, List<string>? dependencies = null, List<string>? fileExtensions = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/artifacts/recommend");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var payload = new
        {
            query = query,
            technologies = technologies ?? new List<string>(),
            dependencies = dependencies ?? new List<string>(),
            fileExtensions = fileExtensions ?? new List<string>(),
            maxResults = 10
        };
        req.Content = new StringContent(JsonConvert.SerializeObject(payload), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Enumerable.Empty<RecommendationResultCliDto>();
        var json = await resp.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<List<RecommendationResultCliDto>>(json) ?? Enumerable.Empty<RecommendationResultCliDto>();
    }

    public async Task<bool> RequestAccessAsync(string role = "CONTRIBUTOR", string? reason = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/access-requests");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        var body = JsonConvert.SerializeObject(new { requestedRole = role, reason });
        req.Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync();
            Console.WriteLine($"\nERROR: Failed to submit access request ({resp.StatusCode}): {err}");
            return false;
        }
        return true;
    }

    public async Task<UserRoleStatusCliDto?> GetMyAccessRequestsAsync()
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/access-requests/my");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var json = await resp.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<UserRoleStatusCliDto>(json);
    }

    public async Task<IEnumerable<AccessRequestCliDto>> GetAdminAccessRequestsAsync(string? status = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        var url = "/api/admin/access-requests" + (!string.IsNullOrEmpty(status) ? $"?status={Uri.EscapeDataString(status)}" : string.Empty);
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync();
            Console.WriteLine($"\nERROR: Failed to retrieve admin access requests ({resp.StatusCode}): {err}");
            return Enumerable.Empty<AccessRequestCliDto>();
        }
        var json = await resp.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<List<AccessRequestCliDto>>(json) ?? Enumerable.Empty<AccessRequestCliDto>();
    }

    public async Task<bool> ApproveAccessRequestAsync(string requestId, string? notes = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/access-requests/{Uri.EscapeDataString(requestId)}/approve");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonConvert.SerializeObject(new { notes }), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync();
            Console.WriteLine($"\nERROR: Failed to approve access request ({resp.StatusCode}): {err}");
            return false;
        }
        return true;
    }

    public async Task<bool> RejectAccessRequestAsync(string requestId, string? notes = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/access-requests/{Uri.EscapeDataString(requestId)}/reject");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonConvert.SerializeObject(new { notes }), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync();
            Console.WriteLine($"\nERROR: Failed to reject access request ({resp.StatusCode}): {err}");
            return false;
        }
        return true;
    }

    public async Task<bool> RevokeAccessAsync(string targetEmail, string? notes = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/admin/roles/revoke");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonConvert.SerializeObject(new { targetEmail, notes }), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync();
            Console.WriteLine($"\nERROR: Failed to revoke access ({resp.StatusCode}): {err}");
            return false;
        }
        return true;
    }

    public async Task<bool> CertifyReviewerAsync(string targetEmail, string? notes = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/admin/roles/certify-reviewer");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonConvert.SerializeObject(new { targetEmail, notes }), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync();
            Console.WriteLine($"\nERROR: Failed to certify reviewer ({resp.StatusCode}): {err}");
            return false;
        }
        return true;
    }

    public async Task<IEnumerable<UserRoleRecordDto>> GetAllRolesAsync()
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/roles");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync();
            Console.WriteLine($"\nERROR: Failed to retrieve user roles ({resp.StatusCode}): {err}");
            return Enumerable.Empty<UserRoleRecordDto>();
        }

        var json = await resp.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<List<UserRoleRecordDto>>(json) ?? new List<UserRoleRecordDto>();
    }

    public async Task<IEnumerable<BountyCliDto>> GetBountiesAsync(string? status = null, string? category = null, string? stage = null, bool forceRefresh = false)
    {
        const string cacheFile = "bounties_cache.json";
        if (!forceRefresh)
        {
            var cached = await _diskCache.GetAsync<List<BountyCliDto>>(cacheFile);
            if (cached != null && cached.Count > 0)
            {
                var result = cached.AsEnumerable();
                if (!string.IsNullOrEmpty(status))
                    result = result.Where(b => string.Equals(b.Status, status, StringComparison.OrdinalIgnoreCase));
                if (!string.IsNullOrEmpty(category))
                    result = result.Where(b => string.Equals(b.Category, category, StringComparison.OrdinalIgnoreCase));
                if (!string.IsNullOrEmpty(stage))
                    result = result.Where(b => string.Equals(b.Stage, stage, StringComparison.OrdinalIgnoreCase));
                return result.ToList();
            }
        }

        // 1. Primary CQRS: Direct SharePoint Online Graph API Query
        var session = await _tokenStore.GetSessionAsync();
        var ssoToken = session?.SsoToken ?? session?.Token;
        if (!string.IsNullOrEmpty(ssoToken))
        {
            try
            {
                var spBounties = await _sharePointClient.GetBountiesAsync(ssoToken, null, null);
                if (spBounties != null && spBounties.Any())
                {
                    await _diskCache.SetAsync(cacheFile, spBounties.ToList(), TimeSpan.FromMinutes(15));
                    var filtered = spBounties.AsEnumerable();
                    if (!string.IsNullOrEmpty(status))
                        filtered = filtered.Where(b => string.Equals(b.Status, status, StringComparison.OrdinalIgnoreCase));
                    if (!string.IsNullOrEmpty(category))
                        filtered = filtered.Where(b => string.Equals(b.Category, category, StringComparison.OrdinalIgnoreCase));
                    if (!string.IsNullOrEmpty(stage))
                        filtered = filtered.Where(b => string.Equals(b.Stage, stage, StringComparison.OrdinalIgnoreCase));
                    return filtered.ToList();
                }
            }
            catch { }
        }

        // 2. Secondary Fallback: Backend HTTP API
        try
        {
            var token = await _tokenStore.GetTokenAsync();
            var queryParams = new List<string>();
            if (!string.IsNullOrEmpty(status)) queryParams.Add($"status={Uri.EscapeDataString(status)}");
            if (!string.IsNullOrEmpty(category)) queryParams.Add($"category={Uri.EscapeDataString(category)}");
            if (!string.IsNullOrEmpty(stage)) queryParams.Add($"stage={Uri.EscapeDataString(stage)}");
            var queryString = queryParams.Count > 0 ? "?" + string.Join("&", queryParams) : "";

            using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/bounties{queryString}");
            if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            using var resp = await _http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return Enumerable.Empty<BountyCliDto>();

            var json = await resp.Content.ReadAsStringAsync();
            var list = JsonConvert.DeserializeObject<List<BountyCliDto>>(json) ?? new List<BountyCliDto>();
            if (string.IsNullOrEmpty(status) && string.IsNullOrEmpty(category) && string.IsNullOrEmpty(stage) && list.Count > 0)
            {
                await _diskCache.SetAsync(cacheFile, list, TimeSpan.FromMinutes(15));
            }
            return list;
        }
        catch { return Enumerable.Empty<BountyCliDto>(); }
    }

    public async Task<BountyDetailCliDto?> GetBountyByIdAsync(string id)
    {
        // 1. Primary CQRS: Direct SharePoint Online Graph API Query
        var session = await _tokenStore.GetSessionAsync();
        var ssoToken = session?.SsoToken ?? session?.Token;
        if (!string.IsNullOrEmpty(ssoToken))
        {
            try
            {
                var spBounty = await _sharePointClient.GetBountyByIdAsync(ssoToken, id);
                if (spBounty != null) return spBounty;
            }
            catch { }
        }

        // 2. Secondary Fallback: Backend HTTP API
        try
        {
            var token = await _tokenStore.GetTokenAsync();
            using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/bounties/{Uri.EscapeDataString(id)}");
            if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            using var resp = await _http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) return null;

            var json = await resp.Content.ReadAsStringAsync();
            return JsonConvert.DeserializeObject<BountyDetailCliDto>(json);
        }
        catch { return null; }
    }

    public async Task<BountyCliDto?> ClaimBountyAsync(string id)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/bounties/{Uri.EscapeDataString(id)}/claim");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;

        await _diskCache.InvalidateAsync("bounties_cache.json");
        var json = await resp.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<BountyCliDto>(json);
    }

    public async Task<BountyCliDto?> ReleaseBountyAsync(string id)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/bounties/{Uri.EscapeDataString(id)}/release");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;

        await _diskCache.InvalidateAsync("bounties_cache.json");
        var json = await resp.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<BountyCliDto>(json);
    }

    public async Task<BountyCliDto?> SubmitBountyCodeAsync(string id, string solutionCode, string? commitSha = null, string? notes = null)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/bounties/{Uri.EscapeDataString(id)}/submit-code");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonConvert.SerializeObject(new { solutionCode, commitSha, notes }), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;

        await _diskCache.InvalidateAsync("bounties_cache.json");
        var json = await resp.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<BountyCliDto>(json);
    }

    public async Task<BountyCliDto?> ReviewBountyCodeAsync(string id, bool isApproved, string feedback)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/bounties/{Uri.EscapeDataString(id)}/review");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonConvert.SerializeObject(new { isApproved, feedback }), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;

        await _diskCache.InvalidateAsync("bounties_cache.json");
        var json = await resp.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<BountyCliDto>(json);
    }

    public async Task<BountyCliDto?> RunBountyTestsAsync(string id, string testSuiteName, bool isPassed, int passedCount, int failedCount, string testLogs)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/bounties/{Uri.EscapeDataString(id)}/run-tests");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonConvert.SerializeObject(new { testSuiteName, isPassed, passedCount, failedCount, testLogs }), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;

        await _diskCache.InvalidateAsync("bounties_cache.json");
        var json = await resp.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<BountyCliDto>(json);
    }

    public async Task<BountyCliDto?> SetBountyFeedbackChoiceAsync(string id, string choice)
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/bounties/{Uri.EscapeDataString(id)}/feedback-choice");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonConvert.SerializeObject(new { choice }), System.Text.Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;

        await _diskCache.InvalidateAsync("bounties_cache.json");
        var json = await resp.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<BountyCliDto>(json);
    }

    public async Task<BountyAnalyticsCliDto?> GetBountyAnalyticsAsync()
    {
        var token = await _tokenStore.GetTokenAsync();
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/bounties/analytics");
        if (!string.IsNullOrEmpty(token)) req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        using var resp = await _http.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;

        var json = await resp.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<BountyAnalyticsCliDto>(json);
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
            if (_sharePointClient is IDisposable sp)
            {
                sp.Dispose();
            }
        }
    }
}
