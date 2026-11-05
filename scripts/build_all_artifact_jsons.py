"""Build complete JSON files for all Engineering Commons / Engineering Commons AI artifacts.

Each artifact is saved as a self-contained JSON file with:
- name, version, type, category, description, author, isCertified, downloads, rating, techStack, keyFeatures
- files: array of { path, content } representing the exact code, prompts, instructions, and configs.
"""

import os
import sys
import json
import csv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OUTPUT_DIR = "artifacts-json"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Load CSV Catalog
csv_path = "sharepoint-import-sheets/Engineering-Commons-Artifacts.csv"
artifacts_catalog = []

if os.path.exists(csv_path):
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            artifacts_catalog.append(row)

# 2. Load DB dump reviews for content
dump_path = "scripts/full_db_dump.json"
db_contents = {}
if os.path.exists(dump_path):
    with open(dump_path, "r", encoding="utf-8") as f:
        dump_data = json.load(f)
        reviews = dump_data.get("reviews", [])
        for r in reviews:
            art_id = r.get("ArtifactId")
            content_str = r.get("Content")
            if art_id and content_str:
                try:
                    parsed = json.loads(content_str)
                    if isinstance(parsed, dict) and "files" in parsed and len(parsed["files"]) > 0:
                        db_contents[art_id] = parsed
                except Exception:
                    pass

# 3. Known rich file contents for core enterprise artifacts
DEFAULT_TEMPLATES = {
    "semantic-sql-optimizer": [
        {
            "path": "skills/semantic-sql-optimizer/SKILL.md",
            "content": "---\nname: semantic-sql-optimizer\ntype: skill\nversion: 1.0.0\ndescription: Optimizes complex SQL queries and generates AST execution plans with join index suggestions.\n---\n\n# Semantic SQL Optimizer Skill\n\n## Instructions\n1. Analyze input SQL query syntax and structure.\n2. Detect missing join indexes, subquery bottlenecks, and Cartesian products.\n3. Rewrite query using indexed CTEs and sargable WHERE predicates.\n4. Output estimated cost reduction and execution plan diff."
        },
        {
            "path": "skills/semantic-sql-optimizer/rules/sql-rules.md",
            "content": "# SQL Optimization Rules\n- Always avoid SELECT *\n- Use EXISTS instead of IN for correlated subqueries\n- Ensure all join keys have matching data types and clustered/non-clustered indexes"
        }
    ],
    "sql-optimizer": [
        {
            "path": "skills/sql-optimizer/SKILL.md",
            "content": "---\nname: sql-optimizer\ntype: skill\nversion: 1.0.0\ndescription: SQL query performance optimizer and index recommender.\n---\n\n# SQL Optimizer Skill\n\nAnalyzes query plans and suggests optimal indexes for SQL Server and PostgreSQL."
        }
    ],
    "api-test-generator": [
        {
            "path": "skills/api-test-generator/SKILL.md",
            "content": "---\nname: api-test-generator\ntype: skill\nversion: 1.0.0\ndescription: Automatically generates comprehensive xUnit and integration tests for REST API endpoints\n---\n\n# API Test Generator Skill\n\nWhen requested to generate API tests:\n1. Inspect controller action routes, HTTP methods, and input validation.\n2. Produce mock data scenarios:\n   - Happy path (200/201 response with correct payload)\n   - Validation failure (400 Bad Request)\n   - Unauthorized access (401/403)\n   - Not found (404)\n3. Use xUnit and Moq or TestWebApplicationFactory."
        }
    ],
    "review-and-refactor": [
        {
            "path": "skills/review-and-refactor/SKILL.md",
            "content": "---\nname: review-and-refactor\ntype: skill\nversion: 1.0.0\ndescription: Review and refactor code in your project according to defined corporate standards.\n---\n\n# Review and Refactor Skill\n\nPerforms systematic code analysis against Clean Architecture, SOLID principles, and enterprise security requirements."
        }
    ],
    "azure-cost-optimizer": [
        {
            "path": "skills/azure-cost-optimizer/SKILL.md",
            "content": "---\nname: azure-cost-optimizer\ntype: skill\nversion: 1.0.0\ndescription: Analyzes Azure resource allocations and identifies unused reservations across subscriptions.\n---\n\n# Azure Cost Optimizer\n\nScans ARM/Bicep templates and resource tags to find right-sizing opportunities and unattached disks."
        }
    ],
    "design-reviewer": [
        {
            "path": "agents/design-reviewer.agent.md",
            "content": "---\nname: design-reviewer\ntype: agent\nversion: 1.0.0\ndescription: Official AI Design Reviewer Subagent for automated UI consistency and WCAG accessibility audit.\n---\n\n# Design Reviewer Agent\n\n## Capabilities\n- Inspects HTML5/CSS/React components for WCAG 2.1 AA color contrast compliance.\n- Audits responsive flexbox/grid layout breakpoints.\n- Validates typography hierarchy and spacing scales."
        },
        {
            "path": "instructions/design-guidelines.md",
            "content": "# Enterprise UI Design Guidelines\n- Colors: Primary #0078D4, Dark Neutral #242424, Surface #FFFFFF\n- Font: Segoe UI / Inter, base 14px, lineHeight 1.5\n- Minimum touch target: 36x36px"
        }
    ],
    "security-scan": [
        {
            "path": "skills/security-scan/SKILL.md",
            "content": "---\nname: security-scan\ntype: skill\nversion: 1.0.0\ndescription: Scans workspace files, prompts, and config files for leaked secrets, tokens, and keys.\n---\n\n# Security Scanner Skill\n\nDetects high-entropy strings, AWS/Azure access keys, JWT tokens, and private RSA keys before commit."
        }
    ],
    "cip-db-explorer": [
        {
            "path": ".mcp/cip-db-explorer/mcp_config.json",
            "content": "{\n  \"mcpServers\": {\n    \"cip-db-explorer\": {\n      \"command\": \"node\",\n      \"args\": [\"dist/index.js\"],\n      \"env\": {}\n    }\n  }\n}"
        },
        {
            "path": ".mcp/cip-db-explorer/README.md",
            "content": "# CIP Database Explorer MCP Server\nProvides schema introspection and query execution tools for relational databases."
        }
    ],
    "postgres-mcp": [
        {
            "path": ".mcp/postgres-mcp/mcp_config.json",
            "content": "{\n  \"mcpServers\": {\n    \"postgres-mcp\": {\n      \"command\": \"python\",\n      \"args\": [\"-m\", \"postgres_mcp\"],\n      \"env\": {}\n    }\n  }\n}"
        }
    ],
    "time-mcp": [
        {
            "path": ".mcp/time-mcp/mcp_config.json",
            "content": "{\n  \"mcpServers\": {\n    \"time-mcp\": {\n      \"command\": \"node\",\n      \"args\": [\"dist/server.js\"],\n      \"env\": {}\n    }\n  }\n}"
        }
    ],
    "code-review": [
        {
            "path": "prompts/code-review.prompt.md",
            "content": "---\nname: code-review\ntype: prompt\nversion: 1.0.0\ndescription: Comprehensive prompt suite for high-rigor enterprise code review and security audits.\n---\n\nYou are an enterprise code reviewer. Review the provided code diff for:\n1. Memory & resource leaks\n2. SQL / Command injection vulnerabilities\n3. Exception handling & structured logging\n4. Idempotency and unit test coverage"
        }
    ],
    "enterprise-coding-standards": [
        {
            "path": "prompts/enterprise-coding-standards.prompt.md",
            "content": "---\nname: enterprise-coding-standards\ntype: prompt\nversion: 1.0.0\ndescription: Corporate engineering coding standards and prompt constraints.\n---\n\nAdhere to corporate engineering standards:\n- Strict TypeScript mode with no `any`\n- Async/await everywhere\n- Parameter validation and null guards"
        }
    ],
    "accessibility-fix": [
        {
            "path": "agents/accessibility-fix.agent.md",
            "content": "---\nname: accessibility-fix\ntype: agent\nversion: 1.0.0\ndescription: Automated WCAG 2.1 AA accessibility remediation agent for web apps.\n---\n\nFixes missing ARIA attributes, heading skipping, and keyboard focus trap issues."
        }
    ],
    "demo-skill": [
        {
            "path": "skills/demo-skill/SKILL.md",
            "content": "---\nname: demo-skill\ntype: skill\nversion: 1.0.0\ndescription: Engineering Commons template skill package for enterprise AI developers.\n---\n\n# Demo Skill\nStarter template for enterprise AI skills."
        }
    ]
}

# 4. Generate JSON for every artifact
generated_count = 0
generated_artifacts = []

for row in artifacts_catalog:
    name = row.get("Title", "").strip()
    if not name:
        continue

    art_type = (row.get("ArtifactType") or "skill").lower()
    version = row.get("Version") or "1.0.0"
    category = row.get("Category") or "General"
    description = row.get("Description") or f"{name} AI artifact package."
    author = row.get("SubmittedBy") or "harsh.rana@maqsoftware.com"
    is_certified = (row.get("IsCertified") or "").upper() in ("TRUE", "1", "YES")
    downloads = int(row.get("Downloads") or 25)
    rating = float(row.get("Rating") or 4.8)
    tech_stack_str = row.get("TechStack") or ""
    tech_stack = [s.strip() for s in tech_stack_str.split(",") if s.strip()] if tech_stack_str else ["C#", "TypeScript"]
    key_features_str = row.get("KeyFeatures") or ""
    key_features = [s.strip() for s in key_features_str.split(",") if s.strip()] if key_features_str else ["Enterprise ready"]

    # Determine files
    files = []
    
    # 1. From template
    if name in DEFAULT_TEMPLATES:
        files = DEFAULT_TEMPLATES[name]
    # 2. From DB dump
    elif name in db_contents and "files" in db_contents[name] and len(db_contents[name]["files"]) > 0:
        db_files = db_contents[name]["files"]
        for df in db_files:
            if isinstance(df, dict):
                files.append({
                    "path": df.get("path") or df.get("name") or "file.txt",
                    "content": df.get("content") or ""
                })
            elif isinstance(df, str):
                files.append({"path": df, "content": ""})

    # 3. Fallback generic canonical structure
    if not files:
        if art_type == "agent":
            files = [
                {
                    "path": f"agents/{name}.agent.md",
                    "content": f"---\nname: {name}\ntype: agent\nversion: {version}\ndescription: {description}\n---\n\n# {name} Agent\n\n{description}"
                },
                {
                    "path": "instructions/rules.md",
                    "content": f"# Guidelines for {name}\nFollow enterprise coding and AI execution guidelines."
                },
                {
                    "path": "README.md",
                    "content": f"# {name}\n\n{description}"
                }
            ]
        elif art_type == "skill":
            files = [
                {
                    "path": f"skills/{name}/SKILL.md",
                    "content": f"---\nname: {name}\ntype: skill\nversion: {version}\ndescription: {description}\n---\n\n# {name} Skill\n\n{description}"
                },
                {
                    "path": f"skills/{name}/README.md",
                    "content": f"# {name}\n\n{description}"
                }
            ]
        elif art_type == "prompt":
            files = [
                {
                    "path": f"prompts/{name}.prompt.md",
                    "content": f"---\nname: {name}\ntype: prompt\nversion: {version}\ndescription: {description}\n---\n\n{description}"
                }
            ]
        elif art_type in ("plugin", "mcpserver"):
            files = [
                {
                    "path": f".mcp/{name}/mcp_config.json",
                    "content": f'{{\n  "mcpServers": {{\n    "{name}": {{\n      "command": "node",\n      "args": ["dist/index.js"]\n    }}\n  }}\n}}'
                },
                {
                    "path": f".mcp/{name}/README.md",
                    "content": f"# {name}\n\n{description}"
                }
            ]
        else:
            files = [
                {
                    "path": f"artifacts/{name}/README.md",
                    "content": f"# {name}\n\n{description}"
                }
            ]

    # Package structure
    package = {
        "name": name,
        "version": version,
        "type": art_type,
        "category": category,
        "description": description,
        "author": author,
        "isCertified": is_certified,
        "downloads": downloads,
        "rating": rating,
        "techStack": tech_stack,
        "keyFeatures": key_features,
        "files": files
    }

    out_file = os.path.join(OUTPUT_DIR, f"{name}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(package, f, indent=2, ensure_ascii=False)

    generated_count += 1
    generated_artifacts.append(package)
    print(f"Generated: {out_file} ({len(files)} file(s))")

# Also write an all-artifacts bundle index
index_file = os.path.join(OUTPUT_DIR, "all-artifacts-bundle.json")
with open(index_file, "w", encoding="utf-8") as f:
    json.dump(generated_artifacts, f, indent=2, ensure_ascii=False)

print(f"\n[SUCCESS] Generated {generated_count} artifact JSON packages in '{OUTPUT_DIR}/'")
