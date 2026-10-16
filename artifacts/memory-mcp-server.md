# Knowledge Graph Memory MCP Server

**Artifact Name**: `memory-mcp-server`  
**Artifact Type**: `mcpserver`  
**Version**: `1.0.0`  
**Category**: `AI & Infrastructure`  
**License**: `MIT`  
**Source**: [Model Context Protocol GitHub Repository](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)

---

## Overview

The **Knowledge Graph Memory MCP Server** is an official Model Context Protocol (MCP) server that provides persistent graph-based memory for AI assistants (such as Claude Desktop, GitHub Copilot, and Cursor).

Rather than storing unstructured text or relying solely on sliding conversation windows, this MCP server structures knowledge as an interrelated graph of **Entities**, **Relations**, and **Observations**, persisted into a local `.jsonl` database.

---

## MCP Server Architecture & Tools

This server exposes 9 first-class MCP tools:

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `create_entities` | `entities: Array<{ name, entityType, observations }>` | Creates one or more new entities in the knowledge graph. |
| `create_relations` | `relations: Array<{ from, to, relationType }>` | Links two existing entities with a directed semantic relation (e.g. `owns`, `depends_on`, `authored`). |
| `add_observations` | `observations: Array<{ entityName, contents }>` | Appends new factual observations to existing entities. |
| `delete_entities` | `entityNames: string[]` | Removes entities and cascades relation deletion. |
| `delete_observations` | `deletions: Array<{ entityName, observations }>` | Removes specific obsolete observations from an entity. |
| `delete_relations` | `relations: Array<{ from, to, relationType }>` | Removes specific relation edges between entities. |
| `read_graph` | *(none)* | Reads the entire knowledge graph structure. |
| `search_nodes` | `query: string` | Performs semantic & keyword search across entity names and observations. |
| `open_nodes` | `names: string[]` | Inspects specific nodes and their complete relation neighborhoods. |

---

## MCP Configuration

To register this MCP server in Claude Desktop, VS Code, or Antigravity, add the following configuration to your `mcpSettings.json` or `.apm/mcp.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "${workspaceFolder}/.memory/graph.jsonl"
      }
    }
  }
}
```

---

## Verification & Certification

- **MCP Compliance**: Conforms strictly to Model Context Protocol Specification v1.0.0.
- **Data Privacy**: All data is stored locally in JSON Lines (`.jsonl`) format; zero external telemetry or cloud leakage.
- **Enterprise Certification**: Verified and certified by MAQ Software AI Leap & Engineering Commons review boards.
