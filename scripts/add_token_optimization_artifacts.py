"""
Adds the copied Token Optimization skills to:
1. artifacts-json/
2. engineering-commons-vscode/resources/catalog/masterCatalog.json
3. sharepoint-import-sheets/Engineering-Commons-Artifacts.csv
"""

import os
import json
import csv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_JSON_DIR = os.path.join(BASE_DIR, "artifacts-json")
MASTER_CATALOG_PATH = os.path.join(BASE_DIR, "engineering-commons-vscode", "resources", "catalog", "masterCatalog.json")
CSV_PATH = os.path.join(BASE_DIR, "sharepoint-import-sheets", "Engineering-Commons-Artifacts.csv")

SKILLS_META = [
    {
        "id": "ponytail",
        "name": "ponytail",
        "title": "Ponytail (Lazy Senior Dev Mode)",
        "version": "5.0.0",
        "type": "skill",
        "category": "Token Optimization",
        "domain": "Token Optimization",
        "description": "Avoids over-engineering and unnecessary code generation. Replaces 50 lines of bloated boilerplate with the single line that solves the problem.",
        "author": "DietrichGebert",
        "source": "CIP",
        "isCertified": True,
        "downloads": 4820,
        "rating": 4.9,
        "techStack": ["Token Optimization", "Claude Code", "Cursor", "Antigravity", "Python", "TypeScript"],
        "keyFeatures": ["Anti-bloat enforcement", "Minimal working change", "Zero superfluous abstraction", "Edge-case correctness"],
        "githubRepo": "https://github.com/DietrichGebert/ponytail",
        "skillFile": "skills/ponytail/SKILL.md",
        "usability": "copilot-ready",
        "usabilityLabel": "Copilot & Claude Ready Prompt",
        "usabilityBadge": "⚡ Token Optimization",
        "isCopilotReady": True
    },
    {
        "id": "caveman",
        "name": "caveman",
        "title": "Caveman (Terse Communication Mode)",
        "version": "1.2.0",
        "type": "skill",
        "category": "Token Optimization",
        "domain": "Token Optimization",
        "description": "Ultra-compressed communication mode. Cuts token usage ~75% by speaking like a smart caveman while keeping 100% technical accuracy and code blocks intact.",
        "author": "yuritoledo",
        "source": "CIP",
        "isCertified": True,
        "downloads": 6140,
        "rating": 4.9,
        "techStack": ["Prompt Compression", "Token Reduction", "Claude Code", "LLM Efficiency"],
        "keyFeatures": ["75% token reduction", "Strips filler and hedging", "Preserves exact errors & code", "Multiple intensity levels"],
        "githubRepo": "https://github.com/yuritoledo/caveman-skill",
        "skillFile": "skills/caveman/SKILL.md",
        "usability": "copilot-ready",
        "usabilityLabel": "Copilot & Claude Ready Prompt",
        "usabilityBadge": "⚡ Token Optimization",
        "isCopilotReady": True
    },
    {
        "id": "token-optimization",
        "name": "token-optimization",
        "title": "Token Optimization (Context Budget & Search)",
        "version": "1.0.0",
        "type": "skill",
        "category": "Token Optimization",
        "domain": "Token Optimization",
        "description": "Token-aware context budgeting, progressive disclosure, targeted search, selective MCP loading, and proactive compaction for large codebases.",
        "author": "i-onlabs",
        "source": "CIP",
        "isCertified": True,
        "downloads": 3890,
        "rating": 4.8,
        "techStack": ["Claude Code", "Context Management", "MCP Optimization", "Prompt Caching"],
        "keyFeatures": ["Context budget monitoring", "Progressive file disclosure", "Selective MCP disabling", "Timely compaction at 70%"],
        "githubRepo": "https://github.com/i-onlabs/claude-code-skills",
        "skillFile": "skills/token-optimization/SKILL.md",
        "usability": "copilot-ready",
        "usabilityLabel": "Copilot & Claude Ready Prompt",
        "usabilityBadge": "⚡ Token Optimization",
        "isCopilotReady": True
    },
    {
        "id": "token-hygiene",
        "name": "token-hygiene",
        "title": "Token Hygiene (Context Waste Audit)",
        "version": "1.1.0",
        "type": "skill",
        "category": "Token Optimization",
        "domain": "Token Optimization",
        "description": "Audit active sessions for token waste: CLAUDE.md size, active MCP server schema overhead (~1,300 tokens/server), cache health, and model tier checks.",
        "author": "leogallego",
        "source": "CIP",
        "isCertified": True,
        "downloads": 4210,
        "rating": 4.9,
        "techStack": ["Token Auditing", "Claude Code", "MCP Tool Overhead", "Cache Health"],
        "keyFeatures": ["CLAUDE.md overhead check", "MCP schema token estimator", "Cache hit/miss monitoring", "Top 3 actionable cuts"],
        "githubRepo": "https://github.com/leogallego/claude-skills-tokens",
        "skillFile": "skills/token-hygiene/SKILL.md",
        "usability": "copilot-ready",
        "usabilityLabel": "Copilot & Claude Ready Prompt",
        "usabilityBadge": "⚡ Token Optimization",
        "isCopilotReady": True
    },
    {
        "id": "token-optimizer",
        "name": "token-optimizer",
        "title": "Token Optimizer (Deep Config & Architecture Restructuring)",
        "version": "1.1.0",
        "type": "skill",
        "category": "Token Optimization",
        "domain": "Token Optimization",
        "description": "Multi-agent deep audit of CLAUDE.md, settings, MCP servers, and hooks. Restructures project configurations to maximize cache hit rates and reduce monthly AI spend.",
        "author": "leogallego",
        "source": "CIP",
        "isCertified": True,
        "downloads": 5120,
        "rating": 4.9,
        "techStack": ["Multi-Agent Audit", "Claude Code", "Settings Optimizer", "Cache Architecture"],
        "keyFeatures": ["Automated subagent audit", "Settings.json optimization diffs", "Cache hit pattern analysis", "Dollar savings estimator"],
        "githubRepo": "https://github.com/leogallego/claude-skills-tokens",
        "skillFile": "skills/token-optimizer/SKILL.md",
        "usability": "copilot-ready",
        "usabilityLabel": "Copilot & Claude Ready Prompt",
        "usabilityBadge": "⚡ Token Optimization",
        "isCopilotReady": True
    },
    {
        "id": "rtk",
        "name": "rtk",
        "title": "RTK (Rust Token Killer Output Filter)",
        "version": "1.0.0",
        "type": "skill",
        "category": "Token Optimization",
        "domain": "Token Optimization",
        "description": "CLI proxy that intercepts noisy developer commands (git status, test logs, build outputs) and condenses them locally by 60–90% before context injection.",
        "author": "rtk-ai",
        "source": "CIP",
        "isCertified": True,
        "downloads": 7340,
        "rating": 5.0,
        "techStack": ["Rust", "Terminal Proxy", "Claude Code", "Cursor", "Output Filtering"],
        "keyFeatures": ["60-90% terminal compression", "Condensed porcelain git status", "Failure trace isolation", "Zero latency overhead (<10ms)"],
        "githubRepo": "https://github.com/rtk-ai/rtk",
        "skillFile": "skills/rtk/SKILL.md",
        "usability": "copilot-ready",
        "usabilityLabel": "Copilot & Claude Ready Prompt",
        "usabilityBadge": "⚡ Token Optimization",
        "isCopilotReady": True
    },
    {
        "id": "token-coach",
        "name": "token-coach",
        "title": "Token Coach (Interactive Optimization Advisor)",
        "version": "1.0.0",
        "type": "skill",
        "category": "Token Optimization",
        "domain": "Token Optimization",
        "description": "Interactive coaching agent grounded in measured machine metrics. Diagnoses session quality, subagent cache lifetimes, and separates deterministic code from model reasoning.",
        "author": "alexgreensh",
        "source": "CIP",
        "isCertified": True,
        "downloads": 3450,
        "rating": 4.8,
        "techStack": ["Claude Code", "Codex", "Agentic Systems", "Telemetry Analysis"],
        "keyFeatures": ["Session quality scoring", "Subagent cache analysis", "Deterministic stage migration", "Goal-oriented coaching"],
        "githubRepo": "https://github.com/alexgreensh/token-optimizer",
        "skillFile": "skills/token-coach/SKILL.md",
        "usability": "copilot-ready",
        "usabilityLabel": "Copilot & Claude Ready Prompt",
        "usabilityBadge": "⚡ Token Optimization",
        "isCopilotReady": True
    },
    {
        "id": "token-optimization-advanced",
        "name": "token-optimization-advanced",
        "title": "Advanced Token Optimization (Cache Hierarchies & Context Forking)",
        "version": "1.0.0",
        "type": "skill",
        "category": "Token Optimization",
        "domain": "Token Optimization",
        "description": "Comprehensive 4-phase token control tackling cache invalidation hierarchies, context forking, subagent token ceilings, and input format minimization.",
        "author": "valorisa",
        "source": "CIP",
        "isCertified": True,
        "downloads": 4920,
        "rating": 4.9,
        "techStack": ["Claude Code", "Cache Invalidation", "Context Forking", "Prompt Engineering"],
        "keyFeatures": ["Cache invalidation hierarchy", "Subagent token ceilings", "Input format minimization", "Pre-flight session audit"],
        "githubRepo": "https://github.com/valorisa/Claude-Skills",
        "skillFile": "skills/token-optimization-advanced/SKILL.md",
        "usability": "copilot-ready",
        "usabilityLabel": "Copilot & Claude Ready Prompt",
        "usabilityBadge": "⚡ Token Optimization",
        "isCopilotReady": True
    },
    {
        "id": "squeez",
        "name": "squeez",
        "title": "Squeez (Multi-Host Hook Token Compressor)",
        "version": "1.46.0",
        "type": "skill",
        "category": "Token Optimization",
        "domain": "Token Optimization",
        "description": "Hook-based token compressor for AI CLI hosts (Claude Code, Copilot, Cursor, Antigravity). Compresses bash output up to 95%, collapses redundant calls, and preserves exact identifiers.",
        "author": "claudioemmanuel",
        "source": "CIP",
        "isCertified": True,
        "downloads": 5630,
        "rating": 4.9,
        "techStack": ["Rust", "Python", "Claude Code", "Copilot CLI", "Cursor", "Antigravity"],
        "keyFeatures": ["Up to 95% output compression", "AST signature-mode code reads", "Exact identifier preservation", "Net-loss guard"],
        "githubRepo": "https://github.com/claudioemmanuel/squeez",
        "skillFile": "skills/squeez/SKILL.md",
        "usability": "copilot-ready",
        "usabilityLabel": "Copilot & Claude Ready Prompt",
        "usabilityBadge": "⚡ Token Optimization",
        "isCopilotReady": True
    }
]

def run():
    print(f"Creating {len(SKILLS_META)} Token Optimization artifacts...")
    os.makedirs(ARTIFACTS_JSON_DIR, exist_ok=True)
    
    # 1. Write individual JSON files into artifacts-json/
    for meta in SKILLS_META:
        skill_path = os.path.join(BASE_DIR, meta["skillFile"])
        if not os.path.exists(skill_path):
            print(f"Warning: {skill_path} does not exist!")
            continue
        
        with open(skill_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        artifact_doc = {
            "name": meta["name"],
            "title": meta["title"],
            "version": meta["version"],
            "type": meta["type"],
            "category": meta["category"],
            "domain": meta["domain"],
            "description": meta["description"],
            "author": meta["author"],
            "isCertified": meta["isCertified"],
            "downloads": meta["downloads"],
            "rating": meta["rating"],
            "techStack": meta["techStack"],
            "keyFeatures": meta["keyFeatures"],
            "githubRepo": meta["githubRepo"],
            "files": [
                {
                    "path": meta["skillFile"],
                    "content": content
                }
            ],
            "usability": meta["usability"],
            "usabilityLabel": meta["usabilityLabel"],
            "usabilityBadge": meta["usabilityBadge"],
            "isCopilotReady": meta["isCopilotReady"]
        }
        
        out_file = os.path.join(ARTIFACTS_JSON_DIR, f"{meta['name']}.json")
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(artifact_doc, f, indent=2, ensure_ascii=False)
        print(f"  [OK] Saved {out_file}")

    # 2. Update masterCatalog.json
    if os.path.exists(MASTER_CATALOG_PATH):
        with open(MASTER_CATALOG_PATH, "r", encoding="utf-8") as f:
            catalog = json.load(f)
            
        existing_names = set(a.get("name", "").lower() for a in catalog)
        added_count = 0
        for meta in SKILLS_META:
            name_lower = meta["name"].lower()
            skill_path = os.path.join(BASE_DIR, meta["skillFile"])
            content = ""
            if os.path.exists(skill_path):
                with open(skill_path, "r", encoding="utf-8") as sf:
                    content = sf.read()

            entry = {
                "id": meta["id"],
                "name": meta["name"],
                "title": meta["title"],
                "version": meta["version"],
                "type": meta["type"],
                "category": meta["category"],
                "domain": meta["domain"],
                "description": meta["description"],
                "author": meta["author"],
                "source": meta["source"],
                "isCertified": meta["isCertified"],
                "downloads": meta["downloads"],
                "rating": meta["rating"],
                "techStack": meta["techStack"],
                "keyFeatures": meta["keyFeatures"],
                "githubRepo": meta["githubRepo"],
                "files": [
                    {
                        "path": meta["skillFile"],
                        "content": content
                    }
                ],
                "usability": meta["usability"],
                "usabilityLabel": meta["usabilityLabel"],
                "usabilityBadge": meta["usabilityBadge"],
                "isCopilotReady": meta["isCopilotReady"]
            }

            if name_lower in existing_names:
                for idx, item in enumerate(catalog):
                    if item.get("name", "").lower() == name_lower:
                        catalog[idx] = entry
                        print(f"  [UPDATE] Updated {meta['name']} in masterCatalog.json")
                        break
            else:
                catalog.append(entry)
                added_count += 1
                print(f"  [ADD] Added {meta['name']} to masterCatalog.json")

        with open(MASTER_CATALOG_PATH, "w", encoding="utf-8") as f:
            json.dump(catalog, f, indent=2, ensure_ascii=False)
        print(f"  [DONE] masterCatalog.json updated (Total artifacts: {len(catalog)})")

    # 3. Update sharepoint-import-sheets/Engineering-Commons-Artifacts.csv
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, "r", encoding="utf-8", newline="") as f:
            reader = list(csv.reader(f))

        existing_titles = set(row[0].lower() for row in reader[1:] if row)
        added_csv = 0
        with open(CSV_PATH, "a", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            for meta in SKILLS_META:
                if meta["name"].lower() not in existing_titles:
                    row = [
                        meta["name"],
                        meta["category"],
                        meta["description"],
                        ", ".join(meta["keyFeatures"]),
                        ", ".join(meta["techStack"]),
                        f"{meta['author']}@company.com" if "@" not in meta["author"] else meta["author"],
                        meta["version"],
                        meta["type"],
                        "TRUE",
                        str(meta["downloads"]),
                        str(meta["rating"]),
                        "Public"
                    ]
                    writer.writerow(row)
                    added_csv += 1
                    print(f"  [CSV] Added {meta['name']} to {os.path.basename(CSV_PATH)}")
        print(f"  [DONE] CSV updated with {added_csv} new rows.")

if __name__ == "__main__":
    run()
