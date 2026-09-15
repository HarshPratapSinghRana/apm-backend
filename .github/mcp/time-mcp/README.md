# Time MCP Server

Model Context Protocol (MCP) server for retrieving real-time world clock data and converting time between timezones.

Compatible with GitHub Copilot Chat, Claude Code, and VS Code.

## Tools Provided

- `get_current_time`: Returns current date, time, and day of the week for a specified IANA timezone (e.g. `UTC`, `America/New_York`, `Europe/London`, `Asia/Kolkata`).
- `convert_time`: Converts time between source and target timezones.

## GitHub Copilot Integration

Configured in `.vscode/mcp.json`:
```json
{
  "mcpServers": {
    "time-mcp": {
      "command": "python",
      "args": ["-m", "mcp_server_time"]
    }
  }
}
```
