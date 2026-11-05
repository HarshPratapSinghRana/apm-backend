import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, color_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="CCCCCC"):
    tblPr = table._tbl.tblPr
    tblBorders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{color}"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(tblBorders)

def add_callout(doc, title, text, bg_hex="F0F4F8", border_hex="2563EB"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    
    # Left border only
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/>'
        f'  <w:top w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:bottom w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    run_t = p.add_run(f"⚙️ {title}\n")
    run_t.font.bold = True
    run_t.font.name = "Segoe UI"
    run_t.font.size = Pt(9.5)
    run_t.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
    
    run_b = p.add_run(text)
    run_b.font.name = "Segoe UI"
    run_b.font.size = Pt(9)
    run_b.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_code_block(doc, code_text):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    set_cell_background(cell, "1E293B")
    set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(code_text)
    run.font.name = "Consolas"
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(0xF1, 0xF5, 0xF9)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def build_docx(filename="Engineering-Commons-CLI-Commands-Guide.docx"):
    doc = docx.Document()
    
    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
        
    # Styles
    COLOR_PRIMARY = RGBColor(0x1E, 0x3A, 0x8A)     # Deep Navy
    COLOR_SECONDARY = RGBColor(0x25, 0x63, 0xEB)   # Royal Blue
    COLOR_DARK = RGBColor(0x0F, 0x17, 0x2A)        # Slate 900
    COLOR_MUTED = RGBColor(0x64, 0x74, 0x8B)       # Slate 500
    
    # 1. Document Title Header
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(2)
    r_title = p_title.add_run("Engineering Commons CLI — Commands & CIP Integration Guide")
    r_title.font.name = "Segoe UI"
    r_title.font.size = Pt(20)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_PRIMARY
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(14)
    r_sub = p_sub.add_run("Concise Reference: Base CIP Functionalities vs. Custom Enterprise Additions")
    r_sub.font.name = "Segoe UI"
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = COLOR_MUTED
    
    # Divider
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_after = Pt(8)
    r_div = p_div.add_run("―" * 58)
    r_div.font.color.rgb = RGBColor(0xCB, 0xD5, 0xE1)

    # 2. Executive Overview & Integration Architecture
    h1 = doc.add_heading(level=1)
    r_h1 = h1.add_run("1. How Engineering Commons CLI Integrates with CIP")
    r_h1.font.name = "Segoe UI"
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = COLOR_PRIMARY
    
    p_intro = doc.add_paragraph()
    p_intro.paragraph_format.space_after = Pt(8)
    p_intro.add_run(
        "Engineering Commons CLI (engineering-commons) is an enterprise-grade extension built on top of the Agent Package Manager (CIP) philosophy. "
        "While standard CIP provides client-side package file operations, Engineering Commons wraps it in a secure, governed 3-tier architecture:"
    )
    
    # Architecture 3 bullets
    arch_bullets = [
        ("Client Workspace Tier (EngineeringCommonsCli): ", "Executes local file discovery, 7-tier heuristic classification, atomic multi-file placement, and orphan cleanup via .cip/installed/ manifests."),
        ("Backend Governance Tier (ASP.NET Core): ", "Manages JWT role authentication (Producer/Reviewer/Consumer), review approval state machines, unified diffing, line comments, and SQLite persistence."),
        ("Private Marketplace Tier (GitHub Org): ", "The backend securely downloads/publishes packages using a server-side PAT. Developer CLI machines never touch or store GitHub tokens.")
    ]
    for bold_text, normal_text in arch_bullets:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        rb = p.add_run(bold_text)
        rb.font.bold = True
        rb.font.name = "Segoe UI"
        rb.font.size = Pt(9.5)
        rn = p.add_run(normal_text)
        rn.font.name = "Segoe UI"
        rn.font.size = Pt(9.5)
        
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 3. High-Level Summary Table
    h2 = doc.add_heading(level=1)
    r_h2 = h2.add_run("2. Quick Comparison: Base CIP vs. Enterprise Additions")
    r_h2.font.name = "Segoe UI"
    r_h2.font.size = Pt(14)
    r_h2.font.bold = True
    r_h2.font.color.rgb = COLOR_PRIMARY
    
    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)
    
    headers = ["Command / Area", "🛠️ Base CIP Capability", "⭐ Explicit Enterprise Addition (Ours)"]
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        set_cell_background(hdr_cells[i], "1E3A8A")
        set_cell_margins(hdr_cells[i], 120, 120, 140, 140)
        p = hdr_cells[i].paragraphs[0]
        p.runs[0].font.bold = True
        p.runs[0].font.name = "Segoe UI"
        p.runs[0].font.size = Pt(9)
        p.runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        
    matrix_data = [
        ("login", "Registry authentication concept", "JWT Bearer token, password masking, role ingestion (Reviewer vs Producer), zero GitHub PAT exposure."),
        ("list", "Listing available packages", "Backend gateway caching, category filtering (--type agent/skill/plugin), tabular formatting."),
        ("list-versions", "Version lookup", "Latest semver tag resolution, multi-file bundle mapping, install command suggestions."),
        ("install", "Single-file copy to disk", "Multi-file placement (.github/agents, skills/, plugins/), path traversal defense, .cip/installed/ manifest, telemetry."),
        ("update", "Package overwrite", "Orphan file reconciliation: adds new files, updates modified files, and deletes removed/obsolete files automatically."),
        ("contribute", "Manual package upload", "7-Tier heuristic classification engine (scans & ignores config files), automated multi-file bundling, review queue submission."),
        ("status", "Not supported in base CIP", "Producer submission dashboard: real-time status badges, decision timestamps, and reviewer feedback notes."),
        ("review", "Not supported in base CIP", "Interactive terminal GUI: colorized unified diff, file/line comments, thread messages, request changes, approval & GitHub publish."),
        ("comment / reply", "Not supported in base CIP", "Direct scriptable line-anchored comments and threaded replies for CI/CD and terminal automation.")
    ]
    
    for row_idx, (cmd, base, ours) in enumerate(matrix_data):
        row = table.add_row()
        bg = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for c_idx, text in enumerate([cmd, base, ours]):
            cell = row.cells[c_idx]
            cell.text = text
            set_cell_background(cell, bg)
            set_cell_margins(cell, 80, 80, 100, 100)
            p = cell.paragraphs[0]
            p.runs[0].font.name = "Segoe UI"
            p.runs[0].font.size = Pt(8.5)
            if c_idx == 0:
                p.runs[0].font.bold = True
                p.runs[0].font.color.rgb = COLOR_PRIMARY
                
    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # 4. Detailed Command-by-Command Breakdown
    h3 = doc.add_heading(level=1)
    r_h3 = h3.add_run("3. Command-by-Command Reference & CIP Integration")
    r_h3.font.name = "Segoe UI"
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True
    r_h3.font.color.rgb = COLOR_PRIMARY
    
    commands_detail = [
        {
            "name": "engineering-commons login",
            "syntax": "engineering-commons login [email] [password]",
            "desc": "Authenticates the developer with the Engineering Commons backend and generates a secure local JWT session.",
            "cip_int": "Replaces standard registry tokens with enterprise JWT authentication. Credentials validate against the ASP.NET Core backend; local session stores role claims without ever handling GitHub PATs.",
            "base": "Registry authentication concept.",
            "ours": "Password masking prompt, JWT session cache (FileAuthTokenStore), zero GitHub PAT exposure, automatic role-based permission routing.",
            "example": "engineering-commons login reviewer@company.com password\n✓ Login successful (Role: Reviewer)"
        },
        {
            "name": "engineering-commons list",
            "syntax": "engineering-commons list [--type <agent|skill|plugin|mcpserver|package>]",
            "desc": "Queries and lists all approved, published AI artifacts in the private marketplace.",
            "cip_int": "Queries the .NET backend gateway, which indexes artifacts stored in the private GitHub organization repository and caches catalog metadata.",
            "base": "Listing packages from registry index.",
            "ours": "Category filtering (--type agent), backend caching gateway, aligned tabular formatting with version info.",
            "example": "engineering-commons list --type agent\nNAME                 TYPE       VERSION \n--------------------------------------------\ndesign-reviewer      agent      1.1.0   \nenterprise-reviewer  agent      1.0.0   "
        },
        {
            "name": "engineering-commons list-versions (versions)",
            "syntax": "engineering-commons list-versions <artifact-name>",
            "desc": "Displays all released historical and current versions of an artifact.",
            "cip_int": "Resolves semver releases from the private GitHub repository via backend metadata index.",
            "base": "Querying package version history.",
            "ours": "Flags (latest) production version, maps underlying package bundle name, outputs copy-paste install commands.",
            "example": "engineering-commons list-versions design-reviewer\n- 1.1.0 (latest)\n- 1.0.0\nTo install: engineering-commons install design-reviewer --version 1.0.0"
        },
        {
            "name": "engineering-commons install",
            "syntax": "engineering-commons install <artifact> [--version <version>]",
            "desc": "Downloads and installs an artifact into canonical workspace directories.",
            "cip_int": "Backend downloads the package from GitHub using its server-side PAT and streams contents to CLI. The ArtifactPlacementService inspects artifact type and extracts multi-file structures safely.",
            "base": "Downloading packages and placing files on disk.",
            "ours": "Multi-file placement (.github/agents, skills/, plugins/, .mcp/), zip slip directory traversal guards, installation manifest tracking (.cip/installed/<artifact>.json), anonymous SQLite telemetry.",
            "example": "engineering-commons install enterprise-reviewer --version 1.0.0\nInstalling multi-file package 'enterprise-reviewer' (4 files)...\n  -> Placed: .github/agents/enterprise-reviewer/cip.yml\n  -> Placed: .github/agents/enterprise-reviewer/rules/security-rules.md\n✓ Installed v1.0.0. Manifest registered at .cip/installed/enterprise-reviewer.json"
        },
        {
            "name": "engineering-commons update",
            "syntax": "engineering-commons update <artifact>",
            "desc": "Reconciles an installed artifact with the newest version and removes obsolete files.",
            "cip_int": "Reads the local .cip/installed/<artifact>.json manifest, compares file paths against the latest package payload, and performs an atomic upgrade.",
            "base": "Upgrading installed packages.",
            "ours": "Orphan File Reconciliation Engine: writes new files, overwrites changed files, and safely deletes obsolete files removed in the new version while preserving user workspace files.",
            "example": "engineering-commons update design-reviewer\nFound new version: v1.1.0 (installed: v1.0.0)\n  - Updated: .github/agents/design-reviewer/instructions.md\n  - Cleaned up obsolete file: legacy-notes.txt\n✓ Successfully updated design-reviewer to v1.1.0!"
        },
        {
            "name": "engineering-commons contribute",
            "syntax": "engineering-commons contribute [artifact-name]",
            "desc": "Scans workspace, classifies AI artifacts, builds packages, and submits them to the review queue.",
            "cip_int": "Integrates ArtifactDiscoveryService and 7-tier ArtifactClassifier to identify agents/skills/plugins, bundles related files, and submits them to POST /api/artifacts/contribute.",
            "base": "Packaging local artifacts for publishing.",
            "ours": "7-Tier Heuristic Classifier (identifies AI artifacts & filters non-artifact config files), multi-file directory bundling, submission to review queue (Draft -> Submitted) instead of unverified direct publish.",
            "example": "engineering-commons contribute enterprise-reviewer\nDiscovered 1 AI artifact (4 files). Filtered 8 config files (package.json, tsconfig.json).\n✓ SUBMISSION SUCCESSFUL!\n  Review ID: f7d78755-bf78-47c5-a1e4-c69e25b10ab2 | Status: Submitted"
        },
        {
            "name": "engineering-commons status (submissions)",
            "syntax": "engineering-commons status [artifact-name]",
            "desc": "Displays submission lifecycle status, reviewer notes, and decision timestamps for producers.",
            "cip_int": "Queries GET /api/artifacts/my/changes to retrieve the state machine status from backend SQLite.",
            "base": "Not supported in base CIP.",
            "ours": "Producer status dashboard, real-time status badges (PENDING ⏳, CHANGES REQUESTED ⚠️, APPROVED ✅, REJECTED ❌), reviewer feedback notes, decision timestamps.",
            "example": "engineering-commons status\n[1] Artifact: review-and-refactor | Status: [REJECTED] ❌\n    Reviewer: reviewer@test.com | Decision At: 2026-08-20 19:11:13 UTC\n    Feedback: \"replace line 12 with updated validation rules.\""
        },
        {
            "name": "engineering-commons review (Interactive Workflow)",
            "syntax": "engineering-commons review [reviewId | artifact-name]",
            "desc": "Opens an interactive terminal review dashboard for reviewers to inspect diffs, comments, and take actions.",
            "cip_int": "Connects to ReviewsController to fetch unified diffs, review threads, and line comments. Submits decisions directly to backend approval/rejection endpoints.",
            "base": "Not supported in base CIP.",
            "ours": "Colorized ANSI unified diff preview, file/line comment viewer, interactive action menu: [1] Add Comment, [2] Reply, [3] Post Message, [4] Request Changes, [5] Approve & Publish to GitHub, [6] Reject.",
            "example": "engineering-commons review\n--- UNIFIED DIFF (rules/security-rules.md) ---\n+ Require AntiForgeryToken on all endpoints.\n💬 FILE & LINE COMMENTS: [Line 2] Please add CSRF protection.\nSelect action [1-6]: 5 (Approve)\n✓ SUCCESS: Submission APPROVED! Published to GitHub Marketplace."
        },
        {
            "name": "engineering-commons comment / reply / request-changes",
            "syntax": "engineering-commons comment <reviewId> --file <path> [--line <n>] --comment <text>\nengineering-commons reply <reviewId> <commentId> --reply <text>\nengineering-commons request-changes <reviewId> --feedback <text>",
            "desc": "Fast scriptable review actions for terminal power users and CI/CD pipelines.",
            "cip_int": "Direct REST bindings to POST /api/reviews/{id}/comments, /replies, and /request-changes endpoints.",
            "base": "Not supported in base CIP.",
            "ours": "Direct CLI command flags, line-type classification (Modified, Added, Deleted), threaded comment reply linking, automatic producer notification events.",
            "example": "engineering-commons comment f7d78755... --file rules/security-rules.md --line 2 --comment \"Fix CSRF\"\n✓ Comment added to rules/security-rules.md line 2 [ID: c112fffe...]"
        }
    ]
    
    for cmd_info in commands_detail:
        h_cmd = doc.add_heading(level=2)
        r_cmd = h_cmd.add_run(f"🔹 {cmd_info['name']}")
        r_cmd.font.name = "Segoe UI"
        r_cmd.font.size = Pt(12)
        r_cmd.font.bold = True
        r_cmd.font.color.rgb = COLOR_SECONDARY
        
        # Syntax code box
        add_code_block(doc, f"Syntax: {cmd_info['syntax']}\n\n{cmd_info['desc']}")
        
        # How CIP Integrates Callout
        add_callout(doc, "How it Works & Integrates with CIP", cmd_info['cip_int'], bg_hex="F8FAFC", border_hex="2563EB")
        
        # Base vs Ours Table
        tbl_comp = doc.add_table(rows=2, cols=2)
        tbl_comp.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(tbl_comp)
        
        c00, c01 = tbl_comp.rows[0].cells
        c00.text = "🛠️ Base CIP Concept"
        c01.text = "⭐ Explicit Enterprise Addition (Ours)"
        for c, bg in [(c00, "E2E8F0"), (c01, "DBEAFE")]:
            set_cell_background(c, bg)
            set_cell_margins(c, 60, 60, 100, 100)
            p = c.paragraphs[0]
            p.runs[0].font.bold = True
            p.runs[0].font.name = "Segoe UI"
            p.runs[0].font.size = Pt(8.5)
            
        c10, c11 = tbl_comp.rows[1].cells
        c10.text = cmd_info['base']
        c11.text = cmd_info['ours']
        for c in [c10, c11]:
            set_cell_background(c, "FFFFFF")
            set_cell_margins(c, 60, 60, 100, 100)
            p = c.paragraphs[0]
            p.runs[0].font.name = "Segoe UI"
            p.runs[0].font.size = Pt(8)
            
        # Example Output Code Box
        p_ex = doc.add_paragraph()
        p_ex.paragraph_format.space_before = Pt(4)
        p_ex.paragraph_format.space_after = Pt(2)
        r_ex = p_ex.add_run("Example Output:")
        r_ex.font.bold = True
        r_ex.font.name = "Segoe UI"
        r_ex.font.size = Pt(8.5)
        r_ex.font.color.rgb = COLOR_DARK
        
        add_code_block(doc, cmd_info['example'])
        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 5. Core Architectural Mechanisms Summary
    h4 = doc.add_heading(level=1)
    r_h4 = h4.add_run("4. Core Enterprise Mechanisms Explained")
    r_h4.font.name = "Segoe UI"
    r_h4.font.size = Pt(14)
    r_h4.font.bold = True
    r_h4.font.color.rgb = COLOR_PRIMARY
    
    mechanisms = [
        ("1. 7-Tier Heuristic Classifier", "Scans directory trees, recognizes agents (.agent.md), skills (SKILL.md), plugins, and MCP servers. Automatically ignores 10+ normal workspace configuration files (package.json, tsconfig.json, .gitignore) to prevent polluting the marketplace."),
        ("2. Canonical Multi-File Placement", "Places agents in .github/agents/<name>/, skills in skills/<name>/, plugins in plugins/<name>/, and MCP configs in .mcp/<name>/. Preserves relative paths (rules/, instructions/, examples/) seamlessly."),
        ("3. Manifest & Orphan Reconciliation", "Writes .cip/installed/<artifact>.json tracking every placed file and content hash. During upgrades (engineering-commons update), it automatically purges orphaned files removed in the new version."),
        ("4. Zero-Trust GitHub PAT Isolation", "Developers never enter or store GitHub Personal Access Tokens. The ASP.NET Core backend acts as the sole authenticated gateway to private GitHub marketplace repositories."),
        ("5. Review State Machine & Line Comments", "Enforces governance lifecycle: Draft -> Submitted -> UnderReview -> ChangesRequested -> Resubmitted -> Approved -> Published. Reviewers can anchor comments to exact diff lines with threaded producer replies.")
    ]
    
    for title, desc in mechanisms:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(4)
        rb = p.add_run(f"{title}: ")
        rb.font.bold = True
        rb.font.name = "Segoe UI"
        rb.font.size = Pt(9)
        rb.font.color.rgb = COLOR_PRIMARY
        rn = p.add_run(desc)
        rn.font.name = "Segoe UI"
        rn.font.size = Pt(9)
        
    doc.save(filename)
    print(f"Successfully generated Word Document: {filename}")

if __name__ == "__main__":
    build_docx()
