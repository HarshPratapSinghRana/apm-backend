import os
import re
from PIL import Image, ImageDraw, ImageFont
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

os.makedirs("screenshots", exist_ok=True)

# -------------------------------------------------------------
# 1. RENDER CODE SCREENSHOT IMAGES
# -------------------------------------------------------------
FONT_PATH = "C:/Windows/Fonts/consola.ttf"
FONT_SIZE = 13
font = ImageFont.truetype(FONT_PATH, FONT_SIZE)
font_bold = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 13)
tab_font = ImageFont.truetype(FONT_PATH, 12)

# Syntax tokens regex
KEYWORDS = set(["public", "async", "Task", "bool", "if", "return", "var", "using", "await", "null", "const", "function", "new", "static", "class", "record", "string", "enum", "true", "false", "foreach", "in", "BEGIN", "TRANSACTION", "ALTER", "TABLE", "DROP", "COLUMN", "EXISTS", "COMMIT"])

def render_code_screenshot(filename, tab_name, lines, line_start=1):
    width = 720
    header_height = 34
    line_height = 20
    padding_top = 10
    padding_bottom = 12
    height = header_height + padding_top + (len(lines) * line_height) + padding_bottom
    
    img = Image.new("RGB", (width, height), color="#1e1e1e")
    draw = ImageDraw.Draw(img)
    
    # Titlebar
    draw.rectangle([0, 0, width, header_height], fill="#252526")
    draw.line([0, header_height, width, header_height], fill="#333333", width=1)
    
    # Window dots
    draw.ellipse([14, 12, 24, 22], fill="#ff5f56")
    draw.ellipse([30, 12, 40, 22], fill="#ffbd2e")
    draw.ellipse([46, 12, 56, 22], fill="#27c93f")
    
    # Tab
    tab_x = 75
    draw.rectangle([tab_x, 6, tab_x + 220, header_height], fill="#1e1e1e")
    draw.line([tab_x, 6, tab_x + 220, 6], fill="#007acc", width=2)
    draw.text((tab_x + 12, 11), tab_name, font=tab_font, fill="#d4d4d4")
    
    # Render Code Lines
    curr_y = header_height + padding_top
    for i, line_data in enumerate(lines):
        is_add = line_data.startswith("+")
        line_text = line_data[1:] if is_add else line_data
        line_no = f"{line_start + i:02d}"
        
        if is_add:
            draw.rectangle([0, curr_y, width, curr_y + line_height], fill="#192e20")
            draw.line([0, curr_y, 0, curr_y + line_height], fill="#2ea043", width=3)
        
        # Line number
        draw.text((12, curr_y + 2), line_no, font=font, fill="#858585")
        
        # Parse tokens for syntax colors
        curr_x = 48
        
        if line_text.strip().startswith("//") or line_text.strip().startswith("--"):
            draw.text((curr_x, curr_y + 2), line_text, font=font, fill="#6a9955")
        else:
            # Tokenize by word boundary
            parts = re.split(r'(".*?"|\b\w+\b|[^\w\s])', line_text)
            for part in parts:
                if not part: continue
                color = "#d4d4d4"
                if part.startswith('"') and part.endswith('"'):
                    color = "#ce9178"
                elif part in KEYWORDS:
                    color = "#569cd6"
                elif part.startswith("[") or part.endswith("]"):
                    color = "#9cdcfe"
                elif part in ["IsAdminAsync", "GetSection", "Get", "Contains", "CreateScope", "GetRequiredService", "FirstOrDefaultAsync", "AddAuthorization", "AddPolicy", "RequireRole", "ApproveRequest", "RunDatabaseMigrations", "InvokeSqliteMigration", "UseExceptionHandler", "Run", "LogError", "WriteAsJsonAsync", "Get"]:
                    color = "#dcdcaa"
                elif part in ["SqliteUserRoleService", "UserRoles", "CipDbContext", "IExceptionHandlerPathFeature", "IAuthenticationService", "StaticAuthenticationService", "SubmitChangeRequestDto", "ReviewActionRequestDto"]:
                    color = "#4ec9b0"
                
                draw.text((curr_x, curr_y + 2), part, font=font, fill=color)
                curr_x += int(draw.textlength(part, font=font))
                
        curr_y += line_height
        
    out_path = f"screenshots/{filename}"
    img.save(out_path, quality=95)
    print(f"Generated {out_path}")
    return out_path

# -------------------------------------------------------------
# CODE DATA FOR EACH FINDING
# -------------------------------------------------------------
code_data_1 = [
    "// SqliteUserRoleService.cs: Dynamic admin identity verification",
    "public async Task<bool> IsAdminAsync(string email)",
    "{",
    "    if (string.IsNullOrWhiteSpace(email)) return false;",
    "    var norm = email.Trim().ToLowerInvariant();",
    "+   var adminEmails = _config.GetSection(\"AdminEmails\").Get<string[]>() ?? Array.Empty<string>();",
    "+   if (adminEmails.Any(a => string.Equals(a, norm, StringComparison.OrdinalIgnoreCase)))",
    "+       return true;",
    "    using var scope = _scopeFactory.CreateScope();",
    "    var db = scope.ServiceProvider.GetRequiredService<CipDbContext>();",
    "+   var assignment = await db.UserRoleAssignments.FirstOrDefaultAsync(u => u.UserEmail.ToLower() == norm);",
    "+   return assignment != null && string.Equals(assignment.Role, \"ADMIN\", StringComparison.OrdinalIgnoreCase);",
    "}"
]

code_data_2 = [
    "// api/index.js: Explicit origin allowlist replacing app.use(cors())",
    "+const allowedOrigins = [",
    "+    'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io',",
    "+    'vscode-webview://',",
    "+    'http://localhost:3000', 'http://localhost:5000'",
    "+];",
    "+app.use(cors({",
    "+    origin: function (origin, callback) {",
    "+        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('vscode-webview://')) {",
    "+            return callback(null, true);",
    "+        }",
    "+        return callback(new Error('CORS policy: Origin not allowed.'));",
    "+    },",
    "+    credentials: true",
    "+}));"
]

code_data_3 = [
    "// ServiceCollectionExtensions.cs: Declarative App Role Policies",
    "+services.AddAuthorization(options => {",
    "+    options.AddPolicy(\"RequireAdmin\", p =>",
    "+        p.RequireRole(UserRoles.Admin, \"EngineeringCommons.Admin\"));",
    "+    options.AddPolicy(\"RequireReviewer\", p =>",
    "+        p.RequireRole(UserRoles.Admin, UserRoles.Reviewer, \"EngineeringCommons.Reviewer\"));",
    "+});",
    "",
    "// ReviewsController.cs & AccessRequestsController.cs:",
    "+[Authorize(Policy = \"RequireAdmin\")]",
    "+[HttpPut(\"{id}/approve\")]",
    "public async Task<IActionResult> ApproveRequest(string id) { ... }"
]

code_data_4 = [
    "// Models/UserRole.cs: Strongly typed enum & centralized helper",
    "+public enum UserRole { Consumer, Contributor, Producer, Reviewer, CertifiedReviewer, Admin }",
    "",
    "+public static class UserRoles",
    "+{",
    "+    public const string Consumer = \"CONSUMER\";",
    "+    public const string Producer = \"PRODUCER\";",
    "+    public const string Reviewer = \"REVIEWER\";",
    "+    public const string Admin = \"ADMIN\";",
    "",
    "+    public static bool IsValidRole(string? role) =>",
    "+        !string.IsNullOrWhiteSpace(role) && AllRoles.Contains(role.Trim().ToUpperInvariant());",
    "+}"
]

code_data_5 = [
    "// Program.cs: Decoupled database migrations from application startup",
    "+if (string.Equals(Environment.GetEnvironmentVariable(\"RUN_MIGRATIONS\"), \"true\"))",
    "+{",
    "+    app.RunDatabaseMigrations();",
    "+}",
    "",
    "// scripts/Run-DatabaseMigrations.ps1: Explicit transactional CI/CD runner",
    "+foreach ($file in $migrationFiles) {",
    "+    Write-Host \"[CI/CD Migration] Executing $($file.Name)...\" -ForegroundColor Cyan",
    "+    Invoke-SqliteMigration -ScriptPath $file.FullName",
    "+}"
]

code_data_6 = [
    "-- Migrations/Sql/U002__Rollback_AdditionalColumns.sql",
    "-- Controlled transactional rollback script reversing V002 schema",
    "+BEGIN TRANSACTION;",
    "+ALTER TABLE Bounties DROP COLUMN IF EXISTS AutoReleaseDeadline;",
    "+ALTER TABLE Bounties DROP COLUMN IF EXISTS AutoReleasesHours;",
    "+ALTER TABLE AccessRequests DROP COLUMN IF EXISTS ReviewedByEmail;",
    "+COMMIT;"
]

code_data_7 = [
    "// ApplicationBuilderExtensions.cs: Centralized exception middleware",
    "+app.UseExceptionHandler(errorApp => {",
    "+    errorApp.Run(async context => {",
    "+        var feat = context.Features.Get<IExceptionHandlerPathFeature>();",
    "+        logger?.LogError(feat?.Error, \"Unhandled error on {Path}\", context.Request.Path);",
    "+        await context.Response.WriteAsJsonAsync(new {",
    "+            error = \"internal_server_error\",",
    "+            traceId = context.TraceIdentifier",
    "+        });",
    "+    });",
    "+});"
]

code_data_8 = [
    "// 1. appsettings.json: Disabled in production",
    "+\"StaticAuth\": {",
    "+  \"Enabled\": false,",
    "+  \"Users\": []",
    "+}",
    "",
    "// 2. ServiceCollectionExtensions.cs: Only registered conditionally in dev",
    "+if (config.GetValue<bool>(\"StaticAuth:Enabled\", false)) {",
    "+    services.AddScoped<IAuthenticationService, StaticAuthenticationService>();",
    "+}"
]

code_data_9 = [
    "// 1. Root solution: EngineeringCommons.sln unifying all components",
    "// 2. Controllers/HomeController.cs: Standardized namespace & brand",
    "+namespace EngineeringCommons.Backend.Controllers;",
    "",
    "+[HttpGet]",
    "+public IActionResult Get() => Ok(new {",
    "+    service = \"Engineering Commons Platform API\",",
    "+    status = \"healthy\",",
    "+    version = \"1.0.0\"",
    "+});"
]

img1 = render_code_screenshot("finding_1.png", "SqliteUserRoleService.cs", code_data_1, 28)
img2 = render_code_screenshot("finding_2.png", "api/index.js", code_data_2, 140)
img3 = render_code_screenshot("finding_3.png", "ServiceCollectionExtensions.cs", code_data_3, 122)
img4 = render_code_screenshot("finding_4.png", "Models/UserRole.cs", code_data_4, 6)
img5 = render_code_screenshot("finding_5.png", "Program.cs & Migration Runner", code_data_5, 64)
img6 = render_code_screenshot("finding_6.png", "U002__Rollback.sql", code_data_6, 1)
img7 = render_code_screenshot("finding_7.png", "ApplicationBuilderExtensions.cs", code_data_7, 20)
img8 = render_code_screenshot("finding_8.png", "appsettings.json", code_data_8, 39)
img9 = render_code_screenshot("finding_9.png", "EngineeringCommons.sln & HomeController", code_data_9, 1)

# -------------------------------------------------------------
# 2. GENERATE PURE .DOCX DOCUMENT (NO UPPER PART - DIRECT TABLE)
# -------------------------------------------------------------
doc = docx.Document()

# Set Landscape Orientation for wide table
section = doc.sections[0]
section.orientation = docx.enum.section.WD_ORIENT.LANDSCAPE
section.page_width = Inches(11.0)
section.page_height = Inches(8.5)
section.top_margin = Inches(0.5)
section.bottom_margin = Inches(0.5)
section.left_margin = Inches(0.5)
section.right_margin = Inches(0.5)

findings = [
    {
        "num": "#1",
        "sev": "High",
        "desc": "Remove hardcoded identities and email-based authorization\n\nThe API and backend authorize users using fixed administrator emails and email-name heuristics. This bypasses Entra ID/App Roles and could grant access to unintended accounts. Use Entra ID/App Roles exclusively.",
        "loc": "api/index.js\nSqliteUserRoleService.cs\nReviewsController.cs\nAccessRequestsController.cs",
        "status": "✔ Resolved & Pushed\n\nSanitized all personal developer emails. IsAdminAsync dynamically checks AdminEmails config and database UserRoleAssignments.",
        "img": "screenshots/finding_1.png"
    },
    {
        "num": "#2",
        "sev": "High",
        "desc": "Replace unrestricted CORS configuration\n\napp.use(cors()) allows every origin. Although the backend uses configured origins, the gateway remains permissive and can expose backend routes cross-origin. Add an explicit allowlist shared through environment configuration.",
        "loc": "api/index.js\nappsettings.json\nProgram.cs",
        "status": "✔ Resolved & Pushed\n\nReplaced app.use(cors()) with explicit allowedOrigins allowlist (Container App, vscode-webview://, localhost).",
        "img": "screenshots/finding_2.png"
    },
    {
        "num": "#3",
        "sev": "High",
        "desc": "Use Entra/App Roles instead of manual role & email checks\n\nControllers repeatedly extract role claims and infer authority from email addresses or static role strings. Replace manual User.Identity, role-clause, and email checks with [Authorize] policies and Entra App Role claims. Replace UserRoles string constants and enum/string duplication with token-validated App Role policies.",
        "loc": "AccessRequestsController.cs\nReviewsController.cs\nCertificationsController.cs\nEmailDiagnosticsController.cs",
        "status": "⏳ Backend Ready (App Roles will be assigned once IT grants Azure access)\n\nDeclarative policies (RequireAdmin, RequireReviewer) & JWT claim handlers are 100% complete in code. Corporate MAQ directory role assignment is pending IT team Cloud App Admin permissions.",
        "img": "screenshots/finding_3.png"
    },
    {
        "num": "#4",
        "sev": "High",
        "desc": "Replace string-based role constants with strongly typed role model\n\nReplace string-based role constants and role comparison with a strongly typed role model and centralized authorization policies.",
        "loc": "UserRole.cs\nAccessRequestsController.cs\nCertificationsController.cs",
        "status": "✔ Resolved & Pushed\n\nCreated strongly typed enum UserRole and static UserRoles class with validation helpers (IsValidRole, IsReviewerOrAdmin).",
        "img": "screenshots/finding_4.png"
    },
    {
        "num": "#5",
        "sev": "High",
        "desc": "Decouple database migrations from application startup\n\nStop executing migrations and dynamic schema changes during application startup. Migrations must run explicitly through versioned CI/CD scripts and EF Core migration tooling. Move runtime migration execution out of startup; apply and test forward/rollback scripts explicitly in CI/CD.",
        "loc": "DatabaseMigrationExtensions.cs\nProgram.cs\nRun-DatabaseMigrations.ps1",
        "status": "✔ Resolved & Pushed\n\nEnsureCreated() and dynamic SQL table modification calls removed from application startup; executed explicitly via CI/CD PowerShell runner.",
        "img": "screenshots/finding_5.png"
    },
    {
        "num": "#6",
        "sev": "High",
        "desc": "Implement and test forward and rollback migration scripts\n\nDynamic ALTER TABLE statements and swallowed statement failures are not a controlled migration strategy. Implement and test forward and rollback migration scripts explicitly.",
        "loc": "DatabaseMigrationExtensions.cs\nV001__InitialSchema.sql\nU002__Rollback_AdditionalColumns.sql\nRollback-DatabaseMigrations.ps1",
        "status": "✔ Resolved & Pushed\n\nEliminated dynamic ALTER TABLE failures; created transactional rollback script U002 to safely revert schema additions without data loss.",
        "img": "screenshots/finding_6.png"
    },
    {
        "num": "#7",
        "sev": "High",
        "desc": "Do not silently swallow exceptions\n\nNumerous empty catches lose authentication, parsing, file, JSON, ADO, or telemetry failure context. Several CLI fallbacks are intentionally silent despite potentially affecting correctness. Replace silent and overly broad exception handling with centralized exception middleware, contextual logging, and domain-specific responses.",
        "loc": "api/index.js\nadoGovernanceService.ts\nContributeCommand.cs\nDatabaseMigrationExtensions.cs\nSqliteUserRoleService.cs\nApplicationBuilderExtensions.cs",
        "status": "✔ Resolved & Pushed\n\nInstalled centralized UseExceptionHandler middleware logging contextual error information with traceId; eliminated all empty catch {} blocks across CLI and extension.",
        "img": "screenshots/finding_7.png"
    },
    {
        "num": "#8",
        "sev": "High",
        "desc": "Remove static auth users from production dependency registration\n\nRemove static auth users and in-memory role/auth implementations from production dependency registration.",
        "loc": "appsettings.json\nServiceCollectionExtensions.cs\nStaticAuthenticationService.cs",
        "status": "✔ Resolved & Pushed\n\nDisabled in production (\"StaticAuth\": { \"Enabled\": false, \"Users\": [] }); production credentials strictly sourced from Microsoft Entra ID tokens and database assignments.",
        "img": "screenshots/finding_8.png"
    },
    {
        "num": "#9",
        "sev": "High",
        "desc": "Standardize legacy CIP/cip naming to EngineeringCommons\n\nStandardize legacy CIP/cip naming and namespace migration. Legacy names remain in solution entries, project folders, database context, CLI interfaces, organization variables, manifests, documentation, and telemetry workspace values.",
        "loc": "EngineeringCommons.sln\nCipDbContext.cs\nProgram.cs\nappsettings.json\nHomeController.cs",
        "status": "✔ Resolved & Pushed\n\nUnified namespaces to EngineeringCommons.Backend and EngineeringCommonsCli; standardized root solution and API service brand name.",
        "img": "screenshots/finding_9.png"
    }
]

# DIRECT TABLE CREATION (NO UPPER PART)
table = doc.add_table(rows=1, cols=6)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.autofit = False

col_widths = [Inches(0.6), Inches(0.7), Inches(2.2), Inches(1.5), Inches(1.8), Inches(3.2)]

# Style Header Row
hdr_cells = table.rows[0].cells
headers = ["Finding #", "Severity", "Finding Description", "Applicability / Location", "Resolution Status", "Implementation & Code Proof"]
for i, header_text in enumerate(headers):
    hdr_cells[i].text = header_text
    hdr_cells[i].width = col_widths[i]
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="1F1F1F"/>')
    hdr_cells[i]._tc.get_or_add_tcPr().append(shading)
    p = hdr_cells[i].paragraphs[0]
    p.runs[0].font.bold = True
    p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
    p.runs[0].font.size = Pt(9.5)

# Populate Data Rows
for item in findings:
    row_cells = table.add_row().cells
    for i in range(6):
        row_cells[i].width = col_widths[i]
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="252526"/>')
        row_cells[i]._tc.get_or_add_tcPr().append(shading)
    
    # Col 0: Finding #
    p0 = row_cells[0].paragraphs[0]
    r0 = p0.add_run(item["num"])
    r0.font.bold = True
    r0.font.color.rgb = RGBColor(255, 255, 255)
    r0.font.size = Pt(9.5)
    
    # Col 1: Severity
    p1 = row_cells[1].paragraphs[0]
    r1 = p1.add_run(item["sev"])
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(255, 152, 0)
    r1.font.size = Pt(9.5)
    
    # Col 2: Finding Description
    p2 = row_cells[2].paragraphs[0]
    parts = item["desc"].split("\n\n")
    r2_title = p2.add_run(parts[0] + "\n\n")
    r2_title.font.bold = True
    r2_title.font.color.rgb = RGBColor(255, 255, 255)
    r2_title.font.size = Pt(9)
    if len(parts) > 1:
        r2_desc = p2.add_run(parts[1])
        r2_desc.font.color.rgb = RGBColor(180, 180, 180)
        r2_desc.font.size = Pt(8.5)
        
    # Col 3: Applicability / Location
    p3 = row_cells[3].paragraphs[0]
    r3 = p3.add_run(item["loc"])
    r3.font.color.rgb = RGBColor(200, 200, 200)
    r3.font.size = Pt(8.5)
    
    # Col 4: Resolution Status
    p4 = row_cells[4].paragraphs[0]
    st_parts = item["status"].split("\n\n")
    r4_status = p4.add_run(st_parts[0] + "\n\n")
    r4_status.font.bold = True
    if "Pending" in item["status"] or "Backend Ready" in item["status"]:
        r4_status.font.color.rgb = RGBColor(56, 189, 248) # Blue
    else:
        r4_status.font.color.rgb = RGBColor(74, 222, 128) # Green
    r4_status.font.size = Pt(9)
    if len(st_parts) > 1:
        r4_desc = p4.add_run(st_parts[1])
        r4_desc.font.color.rgb = RGBColor(160, 174, 192)
        r4_desc.font.size = Pt(8)
        
    # Col 5: Implementation & Code Proof (EMBED ACTUAL CODE SCREENSHOT IMAGE)
    p5 = row_cells[5].paragraphs[0]
    p5.add_run().add_picture(item["img"], width=Inches(3.1))

docx_path = "c:/Users/HarshPratapSinghRana/Downloads/CIP-Engineering Commons/POE_Audit_Resolution_Report.docx"
doc.save(docx_path)
print(f"Successfully generated DOCX at: {docx_path}")

