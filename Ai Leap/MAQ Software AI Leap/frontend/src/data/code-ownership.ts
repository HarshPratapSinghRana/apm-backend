/* ─── Code Ownership, Contributors & Version Metadata ─── */

export interface Person {
  name: string;
  email: string;
  role: string;
}

export interface Contributor extends Person {
  version: string;
  date: string; // ISO date
}

export interface CodeVersion {
  version: string;
  uploaded_by: Person;
  date: string;
  changelog: string;
  size_kb?: number;
}

export interface UseCaseOwnership {
  owner: Person;
  contributors: Contributor[];
  versions: CodeVersion[];
  current_version: string;
}

/* ─── Default ownership registry (keyed by use_case id) ─── */
const OWNERSHIP_DATA: Record<string, UseCaseOwnership> = {
  // ── Retail ──
  "automated-customer-service": {
    owner: { name: "Dilpreet Singh", email: "dilpreet.singh@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Kella Usha Shree", email: "ushak@maqsoftware.com", role: "Software Engineer 1", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Dilpreet Singh", email: "dilpreet.singh@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "monday-morning-agent": {
    owner: { name: "P V Jayanth", email: "jayanthp@maqsoftware.com", role: "Software Engineer 1" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "P V Jayanth", email: "jayanthp@maqsoftware.com", role: "Software Engineer 1" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "ai-personal-stylist-shopping-agent": {
    owner: { name: "Keval Shah", email: "shah.purveshbhai@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Sarthak Rathor", email: "sarthakr@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Keval Shah", email: "shah.purveshbhai@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "smart-store-supplychain-agent": {
    owner: { name: "Manan Mehta", email: "mananm@maqsoftware.com", role: "Project Lead" },
    contributors: [
      { name: "Sajal Nanda", email: "sajaln@maqsoftware.com", role: "Software Engineer 2", version: "v1.0", date: "2026-01-15T09:00:00Z" },
      { name: "Dilpreet Singh", email: "dilpreet.singh@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" },
      { name: "Noti Hemanth Reddy", email: "noti.reddy@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" },
      { name: "Vineet Sharma", email: "vineets@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" },
      { name: "Pansuriya Dixit Kalubhai", email: "pansuriya.kalubhai@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" },
      { name: "Shashwat Kumar Gupta", email: "shashwatk@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" },
    ],
    versions: [{ version: "v1.0", uploaded_by: { name: "Manan Mehta", email: "mananm@maqsoftware.com", role: "Project Lead" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "wpp-pricing-optimizer-agent": {
    owner: { name: "Manan Mehta", email: "mananm@maqsoftware.com", role: "Project Lead" },
    contributors: [
      { name: "Ekansh Gupta", email: "ekanshg@maqsoftware.com", role: "Software Engineer 2", version: "v1.0", date: "2026-01-15T09:00:00Z" },
      { name: "Aryan Chaudhary", email: "aryan.chaudhary@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" },
      { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" },
      { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" },
      { name: "Aditya Chaudhary", email: "aditya.chaudhary@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" },
      { name: "Aryan Sanjaykumar Makadiya", email: "aryan.makadiya@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" },
    ],
    versions: [{ version: "v1.0", uploaded_by: { name: "Manan Mehta", email: "mananm@maqsoftware.com", role: "Project Lead" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "automated-product-tag-generator": {
    owner: { name: "Dilpreet Singh", email: "dilpreet.singh@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Rishabh Didwania", email: "rishabhd@maqsoftware.com", role: "Software Engineer 1", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Dilpreet Singh", email: "dilpreet.singh@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "fraud-anomaly-detection-agent": {
    owner: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "loyalty-newsletter-enrollment-agent": {
    owner: { name: "Nirav Damor", email: "niravkumard@maqsoftware.com", role: "Software Engineer 2" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Nirav Damor", email: "niravkumard@maqsoftware.com", role: "Software Engineer 2" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "personalization-engine": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "product-discovery-bot": {
    owner: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Vaibhav Pandey", email: "vaibhavp@maqsoftware.com", role: "Software Engineer 1", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "planogram-compliance-agent": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "voice-faq-agent": {
    owner: { name: "Mohan Katravath", email: "mohank@maqsoftware.com", role: "Software Engineer 2" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Mohan Katravath", email: "mohank@maqsoftware.com", role: "Software Engineer 2" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "hiring-support-agent": {
    owner: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Yogita Chaudhari", email: "yogitac@maqsoftware.com", role: "Software Engineer 2", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "enterprise-knowledge-bot": {
    owner: { name: "Mullamuri Teja Swaroop", email: "mullamuris@maqsoftware.com", role: "Software Engineer 1" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Mullamuri Teja Swaroop", email: "mullamuris@maqsoftware.com", role: "Software Engineer 1" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "agent-mart": {
    owner: { name: "Mohan Katravath", email: "mohank@maqsoftware.com", role: "Software Engineer 2" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Mohan Katravath", email: "mohank@maqsoftware.com", role: "Software Engineer 2" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "consumer-intelligence-agent": {
    owner: { name: "Saksham Malge", email: "sakshamm@maqsoftware.com", role: "Software Engineer 2" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Saksham Malge", email: "sakshamm@maqsoftware.com", role: "Software Engineer 2" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  // ────────────────────── Finance ──────────────────────
  "invoice-extraction-agent": {
    owner: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Akshat Bhutra", email: "", role: "", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "vendor-invoice-reconciliation-agent": {
    owner: { name: "Yallapu Vignesh", email: "yallapu.vignesh@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Yallapu Vignesh", email: "yallapu.vignesh@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "invoice-po-matching-agent": {
    owner: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "loan-underwriting-agent": {
    owner: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Hiren Dhadhal", email: "hirend@maqsoftware.com", role: "Software Engineer 2", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "poe-scanner": {
    owner: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Arif H", email: "arifh@maqsoftware.com", role: "Senior Project Lead", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "market-intelligence-pricing-agent": {
    owner: { name: "Chaitrali Vishal Kulkarni", email: "chaitraliv@maqsoftware.com", role: "Software Engineer 1" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Chaitrali Vishal Kulkarni", email: "chaitraliv@maqsoftware.com", role: "Software Engineer 1" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "expense-forecaster": {
    owner: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Amol Wadhone", email: "", role: "", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "executive-copilot-agent": {
    owner: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "code-standards-reviewer-agent": {
    owner: { name: "Dilpreet Singh", email: "dilpreet.singh@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Saksham Malge", email: "sakshamm@maqsoftware.com", role: "Software Engineer 2", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Dilpreet Singh", email: "dilpreet.singh@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "expense-trend-analyzer": {
    owner: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Sarvesh", email: "", role: "", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "security-risk-analyzer-agent": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  // ── Manufacturing ──
  "inventory-overview-agent": {
    owner: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Shikhar Pandey", email: "shikharp@maqsoftware.com", role: "Software Engineer 1", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "vendor-receipt-scanner": {
    owner: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  // ── Legal ──
  "legal-intake-routing": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "ai-biller-timekeeper-agent": {
    owner: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Aditya Gandhi", email: "", role: "", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Anushka Aggarwal", email: "anushka.aggarwal@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "gdpr-compliance-agent": {
    owner: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Yatra Bhimani", email: "bhimani.amitbhai@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  // ── Engineering ──
  "certyfast": {
    owner: { name: "Kirtik Patel", email: "patelp@maqsoftware.com", role: "Senior Project Lead" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Kirtik Patel", email: "patelp@maqsoftware.com", role: "Senior Project Lead" }, date: "2026-07-07T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "migratefast": {
    owner: { name: "Digant Doshi", email: "digantd@maqsoftware.com", role: "Senior Project Lead" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Digant Doshi", email: "digantd@maqsoftware.com", role: "Senior Project Lead" }, date: "2026-07-07T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "embedfast": {
    owner: { name: "Pooja Ghagare", email: "poojagh@maqsoftware.com", role: "Project Lead" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Pooja Ghagare", email: "poojagh@maqsoftware.com", role: "Project Lead" }, date: "2026-07-07T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "loadfast": {
    owner: { name: "Digant Doshi", email: "digantd@maqsoftware.com", role: "Senior Project Lead" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Digant Doshi", email: "digantd@maqsoftware.com", role: "Senior Project Lead" }, date: "2026-07-08T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "rai-agent": {
    owner: { name: "Sivasis Tripathy", email: "sivasist@maqsoftware.com", role: "Software Engineer 2" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Sivasis Tripathy", email: "sivasist@maqsoftware.com", role: "Software Engineer 2" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "pre-sales-agent": {
    owner: { name: "Tanuja Sharma", email: "tanuja.sharma@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Tanuja Sharma", email: "tanuja.sharma@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "new-hire-experience-and-onboarding-orchestration-agent": {
    owner: { name: "Nayan Awasthi", email: "nayan.awasthi@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Nayan Awasthi", email: "nayan.awasthi@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "codeguardian": {
    owner: { name: "Varun Anand Patkar", email: "varuna@maqsoftware.com", role: "Software Engineer 2" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Varun Anand Patkar", email: "varuna@maqsoftware.com", role: "Software Engineer 2" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "cip-active-production-monitoring": {
    owner: { name: "Dilpreet Singh", email: "dilpreet.singh@maqsoftware.com", role: "Associate Software Engineer" },
    contributors: [{ name: "Keval Shah", email: "shah.purveshbhai@maqsoftware.com", role: "Associate Software Engineer", version: "v1.0", date: "2026-01-15T09:00:00Z" }],
    versions: [{ version: "v1.0", uploaded_by: { name: "Dilpreet Singh", email: "dilpreet.singh@maqsoftware.com", role: "Associate Software Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "recruiter-copilot": {
    owner: { name: "Rahul Kumar", email: "rahulk@maqsoftware.com", role: "Technical Project Manager" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Rahul Kumar", email: "rahulk@maqsoftware.com", role: "Technical Project Manager" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "angular-migration-tool": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "launch-fast": {
    owner: { name: "Hansraj Singh", email: "hansrajs@maqsoftware.com", role: "Development Operations Engineer" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "Hansraj Singh", email: "hansrajs@maqsoftware.com", role: "Development Operations Engineer" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "pdf-extraction-utility": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "video-generator-agent": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "develop-fast": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "synthetic-data-generation": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "mcp-chat-application": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  // ── Feature Showcase ──
  "devops-powerbi-semantic-model": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "copilot-accessibility-testing": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "copilot-code-upgrade": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "copilot-mcp-server": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "copilot-ui-testing": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
  "copilot-unit-testing": {
    owner: { name: "", email: "", role: "" },
    contributors: [],
    versions: [{ version: "v1.0", uploaded_by: { name: "", email: "", role: "" }, date: "2026-01-15T09:00:00Z", changelog: "Initial release" }],
    current_version: "v1.0",
  },
};

/* ─── Lookup helpers ─── */

export function getOwnership(useCaseId: string): UseCaseOwnership | null {
  return OWNERSHIP_DATA[useCaseId] ?? null;
}

export function getOwner(useCaseId: string): Person | null {
  return OWNERSHIP_DATA[useCaseId]?.owner ?? null;
}

export function getContributors(useCaseId: string): Contributor[] {
  return OWNERSHIP_DATA[useCaseId]?.contributors ?? [];
}

export function getVersions(useCaseId: string): CodeVersion[] {
  return OWNERSHIP_DATA[useCaseId]?.versions ?? [];
}

export function getCurrentVersion(useCaseId: string): string {
  return OWNERSHIP_DATA[useCaseId]?.current_version ?? "v1.0";
}

export function getNextVersion(useCaseId: string): string {
  const current = getCurrentVersion(useCaseId);
  const match = current.match(/^v(\d+)\.(\d+)$/);
  if (!match) return "v1.1";
  return `v${match[1]}.${parseInt(match[2]) + 1}`;
}

/** Check if a user (by email) is the owner of a use case */
export function isOwner(useCaseId: string, email: string): boolean {
  const owner = getOwner(useCaseId);
  return owner?.email.toLowerCase() === email.toLowerCase();
}
 