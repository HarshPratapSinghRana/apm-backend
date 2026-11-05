/* ─── Starter Project Templates ─── */

export interface TemplateFile {
  name: string;
  type: "file" | "folder";
  code?: string;
  children?: TemplateFile[];
}

export interface ProjectTemplate {
  id: string;
  architecture: "No Code" | "Low Code" | "Pro Code";
  framework: string;
  label: string;
  description: string;
  techStack: string[];
  structure: TemplateFile;
}

/* ─── Helper: inject use-case specifics into template strings ─── */
export function hydrateTemplate(
  code: string,
  vars: { title: string; description: string; features: string[]; id: string }
): string {
  return code
    .replace(/\{\{TITLE\}\}/g, vars.title)
    .replace(/\{\{DESCRIPTION\}\}/g, vars.description)
    .replace(/\{\{ID\}\}/g, vars.id)
    .replace(/\{\{SLUG\}\}/g, vars.id.replace(/[^a-z0-9]/gi, "_"))
    .replace(/\{\{FEATURES_LIST\}\}/g, vars.features.map((f) => `  - ${f}`).join("\n"))
    .replace(/\{\{FEATURES_PYTHON\}\}/g, vars.features.map((f) => `    "${f}",`).join("\n"));
}

/* ═══════════════════════════════════════
   PRO CODE TEMPLATES
   ═══════════════════════════════════════ */

const proCodePythonFastAPI: ProjectTemplate = {
  id: "pro-python-fastapi",
  architecture: "Pro Code",
  framework: "Python + FastAPI",
  label: "Python + FastAPI Agent",
  description: "Full-stack AI agent with FastAPI backend, Semantic Kernel orchestration, and Docker support.",
  techStack: ["Python 3.11", "FastAPI", "Semantic Kernel", "Docker", "pytest"],
  structure: {
    name: "{{SLUG}}",
    type: "folder",
    children: [
      {
        name: "README.md",
        type: "file",
        code: `# {{TITLE}}

{{DESCRIPTION}}

## Features
{{FEATURES_LIST}}

## Quick Start

\`\`\`bash
# 1. Clone and setup
cp .env.example .env
# Edit .env with your API keys

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run
uvicorn src.main:app --reload --port 8000
\`\`\`

## Docker

\`\`\`bash
docker build -t {{SLUG}} .
docker run -p 8000:8000 --env-file .env {{SLUG}}
\`\`\`

## Project Structure
\`\`\`
├── src/
│   ├── main.py          # FastAPI entry point
│   ├── agent.py          # AI agent logic
│   ├── config.py         # Settings & env vars
│   └── tools/
│       └── sample_tool.py
├── tests/
│   └── test_agent.py
├── Dockerfile
├── requirements.txt
└── .env.example
\`\`\`
`,
      },
      {
        name: "requirements.txt",
        type: "file",
        code: `fastapi==0.115.0
uvicorn[standard]==0.32.0
semantic-kernel==1.15.0
python-dotenv==1.0.1
pydantic==2.10.0
httpx==0.27.0
pytest==8.3.0
pytest-asyncio==0.24.0
`,
      },
      {
        name: ".env.example",
        type: "file",
        code: `# LLM Configuration
GEMINI_API_KEY=your-gemini-api-key
# Or use Azure OpenAI:
# AZURE_OPENAI_API_KEY=your-key
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_OPENAI_DEPLOYMENT=gpt-4o

# App
APP_NAME={{TITLE}}
DEBUG=true
PORT=8000
`,
      },
      {
        name: "Dockerfile",
        type: "file",
        code: `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
`,
      },
      {
        name: "src",
        type: "folder",
        children: [
          {
            name: "main.py",
            type: "file",
            code: `"""{{TITLE}} — FastAPI entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .agent import process_request

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "agent": settings.app_name}


@app.post("/chat")
async def chat(request: dict):
    """Process a user message through the AI agent."""
    message = request.get("message", "")
    result = await process_request(message)
    return {"reply": result}
`,
          },
          {
            name: "agent.py",
            type: "file",
            code: `"""{{TITLE}} — AI Agent logic."""

import os
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.google.google_ai import GoogleAIChatCompletion
from .config import settings


def _build_kernel() -> Kernel:
    """Initialize Semantic Kernel with configured LLM."""
    kernel = Kernel()

    if settings.gemini_api_key:
        kernel.add_service(
            GoogleAIChatCompletion(
                gemini_model_id="gemini-2.5-flash",
                api_key=settings.gemini_api_key,
            )
        )

    return kernel


kernel = _build_kernel()

SYSTEM_PROMPT = """You are an AI agent for: {{TITLE}}.

{{DESCRIPTION}}

Your capabilities include:
{{FEATURES_LIST}}

Respond helpfully and accurately. If you don't know something, say so.
"""


async def process_request(message: str) -> str:
    """Process a user message and return the agent's response."""
    try:
        chat = kernel.get_service(type=GoogleAIChatCompletion)
        # Simple completion — extend with tools as needed
        response = await chat.get_chat_message_contents(
            chat_history=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
        )
        return response[0].content if response else "I couldn't process that request."
    except Exception as e:
        return f"Agent error: {str(e)}"
`,
          },
          {
            name: "config.py",
            type: "file",
            code: `"""Configuration via environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_name: str = os.getenv("APP_NAME", "{{TITLE}}")
    debug: bool = os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")
    port: int = int(os.getenv("PORT", "8000"))

    # LLM keys
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    azure_openai_api_key: str | None = os.getenv("AZURE_OPENAI_API_KEY")
    azure_openai_endpoint: str | None = os.getenv("AZURE_OPENAI_ENDPOINT")
    azure_openai_deployment: str | None = os.getenv("AZURE_OPENAI_DEPLOYMENT")


settings = Settings()
`,
          },
          {
            name: "tools",
            type: "folder",
            children: [
              {
                name: "sample_tool.py",
                type: "file",
                code: `"""Sample tool — extend with your domain logic."""

from semantic_kernel.functions import kernel_function


class SampleTool:
    \"\"\"Example tool that the agent can invoke.\"\"\"

    @kernel_function(description="Get the current status of the system")
    def get_status(self) -> str:
        return "System is operational."

    @kernel_function(description="Search for relevant information")
    def search(self, query: str) -> str:
        # TODO: Implement actual search logic
        return f"Search results for: {query}"
`,
              },
            ],
          },
        ],
      },
      {
        name: "tests",
        type: "folder",
        children: [
          {
            name: "test_agent.py",
            type: "file",
            code: `"""Tests for {{TITLE}}."""

import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_chat_endpoint():
    response = client.post("/chat", json={"message": "Hello"})
    assert response.status_code == 200
    assert "reply" in response.json()
`,
          },
        ],
      },
    ],
  },
};

const proCodeDotNet: ProjectTemplate = {
  id: "pro-dotnet",
  architecture: "Pro Code",
  framework: ".NET + C#",
  label: ".NET Semantic Kernel Agent",
  description: "C# agent with ASP.NET Core, Semantic Kernel, and Docker support.",
  techStack: [".NET 8", "ASP.NET Core", "Semantic Kernel", "Docker", "xUnit"],
  structure: {
    name: "{{SLUG}}",
    type: "folder",
    children: [
      {
        name: "README.md",
        type: "file",
        code: `# {{TITLE}}

{{DESCRIPTION}}

## Features
{{FEATURES_LIST}}

## Quick Start
\`\`\`bash
dotnet restore
dotnet run --project src/{{SLUG}}.Api
\`\`\`

## Docker
\`\`\`bash
docker build -t {{SLUG}} .
docker run -p 8000:8080 --env-file .env {{SLUG}}
\`\`\`
`,
      },
      {
        name: "{{SLUG}}.sln",
        type: "file",
        code: `// Solution file — open with Visual Studio or dotnet CLI
// dotnet new sln && dotnet sln add src/{{SLUG}}.Api/{{SLUG}}.Api.csproj
`,
      },
      {
        name: ".env.example",
        type: "file",
        code: `GEMINI_API_KEY=your-gemini-api-key
APP_NAME={{TITLE}}
`,
      },
      {
        name: "Dockerfile",
        type: "file",
        code: `FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/{{SLUG}}.Api/{{SLUG}}.Api.csproj", "{{SLUG}}.Api/"]
RUN dotnet restore "{{SLUG}}.Api/{{SLUG}}.Api.csproj"
COPY src/ .
RUN dotnet publish "{{SLUG}}.Api/{{SLUG}}.Api.csproj" -c Release -o /app/publish

FROM base AS final
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "{{SLUG}}.Api.dll"]
`,
      },
      {
        name: "src",
        type: "folder",
        children: [
          {
            name: "{{SLUG}}.Api",
            type: "folder",
            children: [
              {
                name: "Program.cs",
                type: "file",
                code: `using Microsoft.SemanticKernel;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();

// Register Semantic Kernel
var kernel = Kernel.CreateBuilder()
    .AddGoogleAIGeminiChatCompletion("gemini-2.5-flash",
        builder.Configuration["GEMINI_API_KEY"] ?? "")
    .Build();
builder.Services.AddSingleton(kernel);

var app = builder.Build();

app.MapGet("/health", () => new { status = "ok", agent = "{{TITLE}}" });

app.MapPost("/chat", async (ChatRequest req, Kernel k) =>
{
    var chat = k.GetRequiredService<IChatCompletionService>();
    var result = await chat.GetChatMessageContentAsync(req.Message);
    return new { reply = result.Content };
});

app.Run();

record ChatRequest(string Message);
`,
              },
              {
                name: "{{SLUG}}.Api.csproj",
                type: "file",
                code: `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.SemanticKernel" Version="1.15.0" />
  </ItemGroup>
</Project>
`,
              },
            ],
          },
        ],
      },
    ],
  },
};

/* ═══════════════════════════════════════
   LOW CODE TEMPLATES
   ═══════════════════════════════════════ */

const lowCodeLogicApp: ProjectTemplate = {
  id: "low-logic-app",
  architecture: "Low Code",
  framework: "Azure Logic Apps",
  label: "Azure Logic Apps Workflow",
  description: "Pre-configured Logic App workflow with AI action steps and connectors.",
  techStack: ["Azure Logic Apps", "Azure AI Services", "HTTP Connectors"],
  structure: {
    name: "{{SLUG}}-logic-app",
    type: "folder",
    children: [
      {
        name: "README.md",
        type: "file",
        code: `# {{TITLE}} — Logic App Workflow

{{DESCRIPTION}}

## Deployment
1. Open Azure Portal → Logic Apps → Create
2. Import \`workflow.json\` into the Logic App Designer
3. Configure connections (API keys, endpoints)
4. Enable the workflow

## Features
{{FEATURES_LIST}}
`,
      },
      {
        name: "workflow.json",
        type: "file",
        code: `{
  "$schema": "https://schema.management.azure.com/schemas/2016-06-01/workflowdefinition.json#",
  "contentVersion": "1.0.0.0",
  "triggers": {
    "When_a_HTTP_request_is_received": {
      "type": "Request",
      "kind": "Http",
      "inputs": {
        "schema": {
          "type": "object",
          "properties": {
            "message": { "type": "string" }
          }
        }
      }
    }
  },
  "actions": {
    "Call_AI_Service": {
      "type": "Http",
      "inputs": {
        "method": "POST",
        "uri": "@{parameters('ai_endpoint')}",
        "headers": {
          "Content-Type": "application/json",
          "api-key": "@{parameters('ai_api_key')}"
        },
        "body": {
          "messages": [
            { "role": "system", "content": "You are: {{TITLE}}. {{DESCRIPTION}}" },
            { "role": "user", "content": "@{triggerBody()?['message']}" }
          ]
        }
      },
      "runAfter": {}
    },
    "Send_Response": {
      "type": "Response",
      "inputs": {
        "statusCode": 200,
        "body": {
          "reply": "@{body('Call_AI_Service')?['choices'][0]?['message']?['content']}"
        }
      },
      "runAfter": { "Call_AI_Service": ["Succeeded"] }
    }
  },
  "parameters": {
    "ai_endpoint": { "type": "String", "defaultValue": "https://your-openai.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-01" },
    "ai_api_key": { "type": "SecureString" }
  }
}
`,
      },
      {
        name: "parameters.json",
        type: "file",
        code: `{
  "ai_endpoint": "https://your-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-01",
  "ai_api_key": "REPLACE_WITH_YOUR_KEY"
}
`,
      },
    ],
  },
};

const lowCodePowerAutomate: ProjectTemplate = {
  id: "low-power-automate",
  architecture: "Low Code",
  framework: "Power Automate",
  label: "Power Automate Flow",
  description: "Exportable Power Automate cloud flow with AI Builder integration.",
  techStack: ["Power Automate", "AI Builder", "Dataverse", "HTTP Connector"],
  structure: {
    name: "{{SLUG}}-power-flow",
    type: "folder",
    children: [
      {
        name: "README.md",
        type: "file",
        code: `# {{TITLE}} — Power Automate Flow

{{DESCRIPTION}}

## Setup Instructions
1. Go to https://flow.microsoft.com
2. Click "Import" → select \`flow-package.zip\`
3. Map connections (Office 365, AI Builder, HTTP)
4. Update the AI prompt in the "AI Builder" action
5. Turn on the flow

## Features
{{FEATURES_LIST}}

## Flow Overview
- **Trigger**: When an item is created / HTTP request
- **Action 1**: AI Builder — process input with GPT
- **Action 2**: Parse & route response
- **Action 3**: Send notification / update record
`,
      },
      {
        name: "flow-definition.json",
        type: "file",
        code: `{
  "name": "{{TITLE}}",
  "description": "{{DESCRIPTION}}",
  "trigger": {
    "type": "Automated",
    "connector": "When a new item is created (SharePoint / Dataverse)"
  },
  "actions": [
    {
      "step": 1,
      "type": "AI Builder - Create text with GPT",
      "prompt": "{{DESCRIPTION}}. Process the following input and provide a structured response.",
      "input": "@{triggerOutputs()?['body/input']}"
    },
    {
      "step": 2,
      "type": "Parse JSON",
      "content": "@{outputs('AI_Builder')?['body/response']}"
    },
    {
      "step": 3,
      "type": "Send an email (V2)",
      "to": "@{triggerOutputs()?['body/requestor']}",
      "subject": "{{TITLE}} — Results Ready",
      "body": "@{outputs('Parse_JSON')?['body/summary']}"
    }
  ]
}
`,
      },
    ],
  },
};

/* ═══════════════════════════════════════
   NO CODE TEMPLATES
   ═══════════════════════════════════════ */

const noCodeCopilotStudio: ProjectTemplate = {
  id: "no-copilot-studio",
  architecture: "No Code",
  framework: "Copilot Studio",
  label: "Microsoft Copilot Studio Bot",
  description: "Ready-to-deploy Copilot Studio agent definition with topics and AI-powered responses.",
  techStack: ["Copilot Studio", "Power Platform", "Dataverse"],
  structure: {
    name: "{{SLUG}}-copilot",
    type: "folder",
    children: [
      {
        name: "README.md",
        type: "file",
        code: `# {{TITLE}} — Copilot Studio Agent

{{DESCRIPTION}}

## Deployment
1. Open https://copilotstudio.microsoft.com
2. Create a new Copilot
3. Import topics from \`topics.json\`
4. Configure the AI knowledge source
5. Publish to Teams / Web

## Features
{{FEATURES_LIST}}

## Topics
- **Greeting** — Welcomes users and explains capabilities
- **Main Task** — Core agent functionality
- **Fallback** — Handles unknown queries with AI
- **Escalation** — Hands off to a human agent
`,
      },
      {
        name: "topics.json",
        type: "file",
        code: `{
  "agent_name": "{{TITLE}}",
  "description": "{{DESCRIPTION}}",
  "topics": [
    {
      "name": "Greeting",
      "trigger_phrases": ["hello", "hi", "help", "get started"],
      "response": "Welcome! I'm the {{TITLE}} agent. I can help you with:\\n{{FEATURES_LIST}}\\n\\nHow can I assist you today?"
    },
    {
      "name": "Main Task",
      "trigger_phrases": ["analyze", "process", "check", "run", "execute"],
      "response": "I'll process your request now. Please provide the details.",
      "actions": ["AI_GenerativeAnswer"]
    },
    {
      "name": "Fallback",
      "trigger_phrases": [],
      "type": "fallback",
      "response": "Let me use AI to help with that.",
      "actions": ["AI_GenerativeAnswer"]
    },
    {
      "name": "Escalation",
      "trigger_phrases": ["talk to human", "agent", "escalate", "help me"],
      "response": "I'll connect you with a human agent. One moment please.",
      "actions": ["TransferToAgent"]
    }
  ],
  "knowledge_sources": [
    {
      "type": "website",
      "url": "https://your-knowledge-base-url.com"
    }
  ]
}
`,
      },
      {
        name: "settings.json",
        type: "file",
        code: `{
  "agent_name": "{{TITLE}}",
  "language": "en",
  "channels": ["Teams", "Web"],
  "ai_model": "GPT-4o",
  "authentication": "Azure AD",
  "escalation_enabled": true,
  "analytics_enabled": true
}
`,
      },
    ],
  },
};

/* ─── Options for the config form ─── */

export const FRAMEWORK_OPTIONS: Record<string, { label: string; templateId: string }[]> = {
  "Pro Code": [
    { label: "Python + FastAPI", templateId: "pro-python-fastapi" },
    { label: ".NET + C#", templateId: "pro-dotnet" },
  ],
  "Low Code": [
    { label: "Azure Logic Apps", templateId: "low-logic-app" },
    { label: "Power Automate", templateId: "low-power-automate" },
  ],
  "No Code": [
    { label: "Copilot Studio", templateId: "no-copilot-studio" },
  ],
};

export const INCLUDE_OPTIONS = [
  { id: "docker", label: "Docker", default: true, archFilter: ["Pro Code"] },
  { id: "cicd", label: "CI/CD Pipeline", default: false, archFilter: ["Pro Code", "Low Code"] },
  { id: "tests", label: "Tests", default: true, archFilter: ["Pro Code"] },
  { id: "env", label: ".env Config", default: true, archFilter: ["Pro Code", "Low Code"] },
];

/* ─── Template registry ─── */
const ALL_TEMPLATES: ProjectTemplate[] = [
  proCodePythonFastAPI,
  proCodeDotNet,
  lowCodeLogicApp,
  lowCodePowerAutomate,
  noCodeCopilotStudio,
];

export function getTemplate(templateId: string): ProjectTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === templateId);
}

export function getTemplatesForArch(arch: string): ProjectTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.architecture === arch);
}
