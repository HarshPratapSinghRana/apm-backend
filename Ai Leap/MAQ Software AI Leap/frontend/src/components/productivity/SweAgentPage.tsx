import { FC } from "react";
import { Check, ExternalLink, ShieldCheck, Bot, ArrowRight } from "lucide-react";

const SectionHeading: FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div>
    <h3 className="text-2xl font-bold text-foreground">{title}</h3>
    {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
  </div>
);

const Card: FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className,
}) => (
  <div className={`rounded-2xl border border-border bg-card p-6 ${className ?? ""}`}>
    <p className="text-sm font-semibold text-foreground mb-3">{title}</p>
    {children}
  </div>
);

const Bullet: FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
    <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
      <Check className="w-4 h-4 text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed mt-1">{description}</p>
    </div>
  </div>
);

export const SweAgentPage: FC = () => {
  return (
    <div className="min-h-full bg-background animate-leap-fade-in-up">
      <div className="max-w-7xl mx-auto px-6 py-6 pb-12 space-y-10">
        {/* Hero */}
        <div id="overview" className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-primary to-primary/70 opacity-10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-gradient-to-tr from-primary to-primary/70 opacity-[0.07] blur-3xl pointer-events-none" />

          <div className="relative z-10 px-8 py-10 md:px-12 md:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-7">
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-5">
                  <Bot className="w-3.5 h-3.5" />
                  Azure DevOps workflows
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight mb-4">
                  SWE Agent
                </h2>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8 max-w-3xl">
                  A customizable VS Code AI agent that streamlines end-to-end software engineering workflows in Azure DevOps —
                  from approach documents and test plans to PRs, notebooks, semantic models, and deployment tasks.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="#get-started"
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-md"
                  >
                    Adopt & test
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-6">
                  <div className="text-sm font-semibold text-foreground mb-3">Why teams adopt it</div>
                  <ul className="space-y-3">
                    {[
                      "Standardized developer experience for data engineering work (notebooks + semantic models).",
                      "Handles complex, context-heavy projects using BRDs, user stories, and meeting recordings.",
                      "Human-in-the-loop approvals for critical operations.",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <section id="how-it-works" className="space-y-6">
          <SectionHeading
            title="How it works"
            subtitle="A guided workflow from user story to implementation"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Bullet
              title="Provide a User Story ID"
              description="The agent retrieves the work item, summarizes key details, and gathers context from linked stories."
            />
            <Bullet
              title="Choose an action"
              description="Select from actions like approach doc creation, test suite/cases, SQL ops, PR creation, Fabric notebook work, and more."
            />
            <Bullet
              title="Human-in-the-loop confirmations"
              description="Critical operations require explicit approval before execution."
            />
            <Bullet
              title="Best-practice grounded outputs"
              description="Looks up official Microsoft docs to ground DAX/SQL/Fabric guidance and formats ADO content properly."
            />
          </div>
        </section>

        {/* Customization guide */}
        <section id="configuration" className="space-y-6">
          <SectionHeading
            title="Customization guide"
            subtitle="Update these values once to point the agent to your Azure DevOps org + project"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="1) Main agent file: WWL SWE Agent.agent.md">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4 font-medium">Configuration item</th>
                      <th className="py-2 pr-4 font-medium">Line(s)</th>
                      <th className="py-2 font-medium">What to change</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ["Organization", "176, 180", "Your Azure DevOps organization name"],
                      ["Organization URL", "177", "https://dev.azure.com/[YOUR_ORG]"],
                      ["Project", "178, 180", "Your default Azure DevOps project name"],
                      ["Area Paths (table)", "188–189", "Your team’s Area Paths (or remove filter)"],
                      ["Area Paths (WIQL)", "196–197", "Area Paths in WIQL format"],
                      ["Skill file location", "244", "Your VS Code prompts folder path"],
                    ].map(([a, b, c]) => (
                      <tr key={a} className="border-b border-border/60">
                        <td className="py-2 pr-4 text-foreground">{a}</td>
                        <td className="py-2 pr-4">{b}</td>
                        <td className="py-2">{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="space-y-6">
              <Card title="2) Test suite URLs: wwl-swe-test-suite-cases.prompt.md">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="py-2 pr-4 font-medium">Item</th>
                        <th className="py-2 pr-4 font-medium">Line(s)</th>
                        <th className="py-2 font-medium">What to change</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      {[
                        ["Test suite URL pattern", "15", "Replace with your org/project"],
                        ["Test suite link template", "66, 84", "Replace with your org/project"],
                        ["Default organization", "194", "Your Azure DevOps org name"],
                      ].map(([a, b, c]) => (
                        <tr key={a} className="border-b border-border/60">
                          <td className="py-2 pr-4 text-foreground">{a}</td>
                          <td className="py-2 pr-4">{b}</td>
                          <td className="py-2">{c}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="3) WIQL queries: wwl-swe-azure-devops-queries.prompt.md">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="py-2 pr-4 font-medium">Item</th>
                        <th className="py-2 pr-4 font-medium">Line(s)</th>
                        <th className="py-2 font-medium">What to change</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      {[
                        ["Iteration path example", "23", "Match your project’s iteration path"],
                        ["Iteration path examples", "35–39", "Match your iteration path formats"],
                      ].map(([a, b, c]) => (
                        <tr key={a} className="border-b border-border/60">
                          <td className="py-2 pr-4 text-foreground">{a}</td>
                          <td className="py-2 pr-4">{b}</td>
                          <td className="py-2">{c}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="4) Optional: rename agent + skill files">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    You can rename files to match your team. If you rename skill files, update the Skills Catalog table in the main agent file.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b border-border">
                          <th className="py-2 pr-4 font-medium">Current</th>
                          <th className="py-2 font-medium">Suggested pattern</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/60">
                          <td className="py-2 pr-4 text-foreground">WWL SWE Agent.agent.md</td>
                          <td className="py-2">[YourTeam] SWE Agent.agent.md</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-foreground">wwl-swe-*.prompt.md</td>
                          <td className="py-2">[yourteam]-swe-*.prompt.md</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="space-y-6">
          <SectionHeading title="Key capabilities" subtitle="What SWE Agent can automate" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              ["Approach document creation", "Generates approach docs with objectives, requirements summary, technical approach, dependencies, risks, and effort estimation."],
              ["Test suite & test case management", "Creates test suites and test cases in Azure DevOps mapped to acceptance criteria."],
              ["Power BI semantic model development", "Creates measures, columns, relationships, RLS, and supports deployment using modeling tools."],
              ["SQL Server database operations", "Connects to SQL Server, explores schema, executes and validates data changes."],
              ["Fabric notebook development", "Assists with Python/PySpark/SQL development patterns for Fabric notebooks."],
              ["Git operations & pull requests", "Creates branches, commits, PRs, links work items, and adds reviewers with guided confirmations."],
              ["Playwright report testing", "Generates tests for load times and visual regressions in Power BI reports."],
              ["MarkItDown file analysis", "Converts and analyzes .docx/.xlsx/.pdf/.pptx attachments from user stories."],
            ].map(([title, description]) => (
              <Bullet key={title} title={title} description={description} />
            ))}
          </div>
        </section>

        {/* Files & configuration */}
        <section id="files" className="space-y-6">
          <SectionHeading
            title="Files & configuration"
            subtitle="Prompt files that define the agent’s workflows"
          />

          <div className="rounded-2xl border border-border bg-card p-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-medium">File</th>
                  <th className="py-2 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  ["WWL SWE Agent.agent.md", "Main agent definition with all tool configurations"],
                  ["wwl-swe-approach-document.prompt.md", "Approach Document workflow and templates"],
                  ["wwl-swe-test-suite-cases.prompt.md", "Test suite + test case creation rules"],
                  ["wwl-swe-power-bi.prompt.md", "Power BI semantic model operations"],
                  ["wwl-swe-mssql.prompt.md", "SQL Server database operations"],
                  ["wwl-swe-git-operations.prompt.md", "Branch creation, commits, PR workflows"],
                  ["wwl-swe-playwright.prompt.md", "Power BI report testing automation"],
                  ["wwl-swe-fabric-notebooks.prompt.md", "Fabric notebook development assistance"],
                  ["wwl-swe-microsoft-docs.prompt.md", "Documentation lookup + best practices"],
                  ["wwl-swe-markitdown.prompt.md", "File conversion + attachment analysis rules"],
                  ["wwl-swe-error-handling.prompt.md", "Error handling for common scenarios"],
                  ["wwl-swe-script-lifecycle.prompt.md", "Universal script creation + cleanup"],
                  ["wwl-swe-azure-devops-queries.prompt.md", "Work item query rules + iteration handling"],
                  ["wwl-swe-task-discussions.prompt.md", "Task creation + discussion templates"],
                ].map(([file, purpose]) => (
                  <tr key={file} className="border-b border-border/60 last:border-b-0">
                    <td className="py-2 pr-4 text-foreground whitespace-nowrap">{file}</td>
                    <td className="py-2">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary-subtle to-primary-subtle/50 p-6">
            <p className="text-sm font-semibold text-foreground">Demo</p>
            <p className="text-sm text-muted-foreground mt-2">
              SWE Agent Skills Demo (.mp4) — add the demo file/link here when available.
            </p>
          </div>
        </section>

        {/* MCP tools */}
        <section id="mcp-tools" className="space-y-6">
          <SectionHeading title="Integrated MCP tools" subtitle="Servers the agent can leverage" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              ["Azure DevOps MCP", "Work items, repos, pipelines, test plans, wiki, iterations, and queries."],
              ["Power BI Modeling MCP", "Tables, measures, columns, relationships, partitions, security roles."],
              ["MSSQL extension", "Database connections, queries, schema exploration, validations."],
              ["Playwright MCP", "Browser automation, screenshots, and performance testing."],
              ["Microsoft Docs MCP", "Searches official docs for best practices and grounded patterns."],
              ["MarkItDown MCP", "File-to-Markdown conversion for analysis of attachments."],
              ["Fabric data engineering", "Notebook development support and patterns."],
            ].map(([title, description]) => (
              <Bullet key={title} title={title} description={description} />
            ))}
          </div>
        </section>

        {/* Safety */}
        <section id="safety" className="space-y-6">
          <SectionHeading title="Safety features" subtitle="Guardrails for database and version-control operations" />
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Mandatory confirmations</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    SELECT queries: ask once per session
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    INSERT/UPDATE: confirm each statement
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    DELETE/DROP: critical operations require double/triple confirmation
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    Git operations: 10-step human-in-the-loop workflow with confirmation at every step
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Get started */}
        <section id="get-started" className="space-y-6">
          <SectionHeading title="Getting started" subtitle="Configure it for your Azure DevOps org + project" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Step-by-step">
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Copy the agent files to your VS Code prompts folder</li>
                <li>Update the configuration values (see Customization guide)</li>
                <li>Install the agent in VS Code</li>
                <li>Invoke the agent and provide a User Story ID</li>
                <li>Follow the interactive prompts to complete the workflow</li>
              </ol>
            </Card>

            <Card title="Quick configuration checklist">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  "Organization name in WWL SWE Agent.agent.md",
                  "Project name in WWL SWE Agent.agent.md",
                  "Area Paths (or remove filter)",
                  "Skill file location path",
                  "Test suite URL patterns in wwl-swe-test-suite-cases.prompt.md",
                  "(Optional) rename agent + skill files to match your team",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </Card>

            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary-subtle to-primary-subtle/50 p-6">
              <p className="text-sm font-semibold text-foreground">Next steps</p>
              <ul className="space-y-2 text-sm text-muted-foreground mt-3">
                {[
                  "Further improve prompts for better context awareness of newly created artifacts.",
                  "Integrate with Spec Kit to strengthen initial planning and lock requirements early.",
                  "Adopt, test on your scenarios, and share learnings and feedback with the team.",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>

              <a
                href="#overview"
                className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-md"
              >
                Back to overview
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

