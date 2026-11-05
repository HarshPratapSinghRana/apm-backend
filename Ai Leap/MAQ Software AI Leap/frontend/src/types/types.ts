export type LanguageType = 'javascript' | 'python' | 'typescript';
export type TabType = 'code' | 'upload';
export type IssueType = 'critical' | 'warning';
export type RiskLevel = 'High' | 'Medium' | 'Low';
export interface HeroSectionProps {
  onGetStarted: () => void;
}
export interface SecurityIssue {
  id: number;
  type: IssueType;
  category: string;
  line: number;
  code: string;
  message: string;
  explanation: string;
  suggestion: string;
  riskLevel: RiskLevel;
}

export interface ScanResults {
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  language: LanguageType;
  issues: SecurityIssue[];
}

// Component Props Interfaces
export interface HeaderProps {}

export interface FileUploadProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadedFile: File | null;
  onFileRemove: () => void;
}

export interface LanguageSelectorProps {
  selectedLanguage: LanguageType;
  onLanguageChange: (language: LanguageType) => void;
}

export interface CodeInputProps {
  codeInput: string;
  onCodeChange: (code: string) => void;
  onLoadExample: (code: string) => void;
}

export interface InputPanelProps {
  codeInput: string;
  onCodeChange: (code: string) => void;
  selectedLanguage: LanguageType;
  onLanguageChange: (language: LanguageType) => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  uploadedFile: File | null;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onFileRemove: () => void;
  onScan: () => Promise<void>;
  isScanning: boolean;
}

export interface SummaryCardsProps {
  scanResults: ScanResults;
}

export interface IssueCardProps {
  issue: SecurityIssue;
  index: number;
  onCopyCode: (text: string) => void;
}

export interface ResultsPanelProps {
  scanResults: ScanResults | null;
  showResults: boolean;
  onToggleResults: () => void;
  onClearResults: () => void;
  onCopyCode: (text: string) => void;
}

export interface FooterProps {}

// Utility function type
export type CopyToClipboardFunction = (text: string) => void;
export type PerformSecurityScanFunction = (code: string, language: LanguageType) => Promise<ScanResults>;
