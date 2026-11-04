using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using CipBackend.Services.Interfaces;

namespace CipBackend.Services.Implementations;

public class MicrosoftGraphEmailClient : IMicrosoftGraphEmailClient
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<MicrosoftGraphEmailClient> _logger;

    private readonly string _instance;
    private readonly string _tenantId;
    private readonly string _clientId;
    private readonly string? _clientSecret;
    private readonly string _senderMailbox;
    private readonly string? _fallbackSenderMailbox;
    private readonly bool _enabled;
    private readonly bool _saveToSentItems;

    private readonly SemaphoreSlim _tokenLock = new(1, 1);
    private string? _cachedToken;
    private DateTime _tokenExpiryUtc = DateTime.MinValue;
    private string? _lastTokenError;

    public MicrosoftGraphEmailClient(
        HttpClient httpClient,
        IConfiguration config,
        ILogger<MicrosoftGraphEmailClient> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;

        _instance = _config["GraphEmail:Instance"] ?? "https://login.microsoftonline.com/";
        _tenantId = _config["GraphEmail:TenantId"] 
            ?? Environment.GetEnvironmentVariable("GRAPH_TENANT_ID") 
            ?? "e4d98dd2-9199-42e5-ba8b-da3e763ede2e";
        _clientId = _config["GraphEmail:ClientId"] 
            ?? Environment.GetEnvironmentVariable("GRAPH_CLIENT_ID") 
            ?? "a5f3ba81-4c95-4c74-afd9-38b72cf39156";
        _clientSecret = _config["GraphEmail:ClientSecret"] 
            ?? Environment.GetEnvironmentVariable("GRAPH_CLIENT_SECRET");
        _senderMailbox = _config["GraphEmail:SenderMailbox"] 
            ?? Environment.GetEnvironmentVariable("GRAPH_SENDER_MAILBOX") 
            ?? "cip-notifications@maqsoftware.com";
        _fallbackSenderMailbox = _config["GraphEmail:FallbackSenderMailbox"] 
            ?? Environment.GetEnvironmentVariable("GRAPH_FALLBACK_MAILBOX") 
            ?? "harsh.rana@maqsoftware.com";

        var enabledStr = _config["GraphEmail:Enabled"] ?? Environment.GetEnvironmentVariable("GRAPH_ENABLED");
        _enabled = !bool.TryParse(enabledStr, out var en) || en;

        var saveStr = _config["GraphEmail:SaveToSentItems"] ?? Environment.GetEnvironmentVariable("GRAPH_SAVE_SENT");
        _saveToSentItems = !bool.TryParse(saveStr, out var s) || s;
    }

    public bool IsConfigured => _enabled && !string.IsNullOrWhiteSpace(_clientSecret);
    public string SenderMailbox => _senderMailbox;
    public string TenantId => _tenantId;
    public string ClientId => _clientId;

    public async Task<string?> AcquireAccessTokenAsync()
    {
        if (!IsConfigured)
        {
            _lastTokenError = "Graph client secret is not configured in appsettings.json or GRAPH_CLIENT_SECRET";
            return null;
        }

        if (!string.IsNullOrEmpty(_cachedToken) && DateTime.UtcNow < _tokenExpiryUtc.AddMinutes(-5))
        {
            return _cachedToken;
        }

        await _tokenLock.WaitAsync();
        try
        {
            if (!string.IsNullOrEmpty(_cachedToken) && DateTime.UtcNow < _tokenExpiryUtc.AddMinutes(-5))
            {
                return _cachedToken;
            }

            var tokenEndpoint = $"{_instance.TrimEnd('/')}/{_tenantId}/oauth2/v2.0/token";
            var form = new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = _clientId,
                ["client_secret"] = _clientSecret!,
                ["scope"] = "https://graph.microsoft.com/.default"
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, tokenEndpoint)
            {
                Content = new FormUrlEncodedContent(form)
            };

            var response = await _httpClient.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _lastTokenError = $"OAuth2 Token Request failed ({response.StatusCode}): {content}";
                _logger.LogWarning("[MicrosoftGraph] Failed to acquire application token: {Error}", _lastTokenError);
                return null;
            }

            using var doc = JsonDocument.Parse(content);
            if (doc.RootElement.TryGetProperty("access_token", out var tokenProp))
            {
                _cachedToken = tokenProp.GetString();
                int expiresIn = doc.RootElement.TryGetProperty("expires_in", out var expProp) ? expProp.GetInt32() : 3599;
                _tokenExpiryUtc = DateTime.UtcNow.AddSeconds(expiresIn);
                _lastTokenError = null;
                _logger.LogInformation("[MicrosoftGraph] Successfully acquired Bearer token for ClientId {ClientId}. Valid until {Expiry:u}", _clientId, _tokenExpiryUtc);
                return _cachedToken;
            }

            _lastTokenError = "Token endpoint response did not contain 'access_token'.";
            return null;
        }
        catch (Exception ex)
        {
            _lastTokenError = ex.Message;
            _logger.LogError(ex, "[MicrosoftGraph] Exception while acquiring token from {Instance}", _instance);
            return null;
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    public async Task<GraphSendResult> SendMailAsync(string recipientEmail, string subject, string htmlBody, string? plainTextBody = null)
    {
        if (!_enabled)
        {
            return new GraphSendResult(false, 0, "Microsoft Graph email delivery is disabled in configuration.", _senderMailbox, null);
        }

        if (string.IsNullOrWhiteSpace(_clientSecret))
        {
            return new GraphSendResult(false, 0, "Microsoft Graph ClientSecret is not configured.", _senderMailbox, null);
        }

        var token = await AcquireAccessTokenAsync();
        if (string.IsNullOrEmpty(token))
        {
            return new GraphSendResult(false, 401, $"Could not obtain Graph OAuth token: {_lastTokenError}", _senderMailbox, null);
        }

        // Try primary mailbox first
        var result = await SendWithMailboxAsync(_senderMailbox, recipientEmail, subject, htmlBody, token);
        
        // If 404 (mailbox not found / not provisioned yet) and fallback mailbox is different, try fallback
        if (!result.Success && result.StatusCode == 404 && !string.IsNullOrWhiteSpace(_fallbackSenderMailbox) && !string.Equals(_senderMailbox, _fallbackSenderMailbox, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("[MicrosoftGraph] Primary mailbox {Primary} returned 404. Retrying with fallback mailbox {Fallback}", _senderMailbox, _fallbackSenderMailbox);
            result = await SendWithMailboxAsync(_fallbackSenderMailbox, recipientEmail, subject, htmlBody, token);
        }

        return result;
    }

    private async Task<GraphSendResult> SendWithMailboxAsync(string mailbox, string recipientEmail, string subject, string htmlBody, string token)
    {
        try
        {
            var endpoint = $"https://graph.microsoft.com/v1.0/users/{Uri.EscapeDataString(mailbox)}/sendMail";

            var payload = new
            {
                message = new
                {
                    subject = subject,
                    body = new
                    {
                        contentType = "HTML",
                        content = htmlBody
                    },
                    toRecipients = new[]
                    {
                        new
                        {
                            emailAddress = new
                            {
                                address = recipientEmail
                            }
                        }
                    }
                },
                saveToSentItems = _saveToSentItems
            };

            var json = JsonSerializer.Serialize(payload);
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[MicrosoftGraph] Mail sent successfully to {Recipient} via mailbox {Mailbox} (Status {Code})", recipientEmail, mailbox, (int)response.StatusCode);
                return new GraphSendResult(true, (int)response.StatusCode, null, mailbox, responseContent);
            }

            var errorMsg = $"Graph API sendMail failed ({response.StatusCode}): {responseContent}";
            _logger.LogWarning("[MicrosoftGraph] {ErrorMsg}", errorMsg);
            return new GraphSendResult(false, (int)response.StatusCode, errorMsg, mailbox, responseContent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[MicrosoftGraph] Exception sending email to {Recipient} via {Mailbox}", recipientEmail, mailbox);
            return new GraphSendResult(false, 500, ex.Message, mailbox, null);
        }
    }

    public GraphStatusDto GetStatus()
    {
        bool tokenAcquired = !string.IsNullOrEmpty(_cachedToken) && DateTime.UtcNow < _tokenExpiryUtc;
        string tokenStatus = tokenAcquired 
            ? $"Active (Expires: {_tokenExpiryUtc:u})" 
            : (_lastTokenError ?? (string.IsNullOrWhiteSpace(_clientSecret) ? "No ClientSecret configured" : "Pending first request"));

        return new GraphStatusDto(
            Enabled: _enabled,
            HasClientSecret: !string.IsNullOrWhiteSpace(_clientSecret),
            TenantId: _tenantId,
            ClientId: _clientId,
            SenderMailbox: _senderMailbox,
            FallbackSenderMailbox: _fallbackSenderMailbox,
            TokenAcquired: tokenAcquired,
            TokenStatus: tokenStatus
        );
    }
}
