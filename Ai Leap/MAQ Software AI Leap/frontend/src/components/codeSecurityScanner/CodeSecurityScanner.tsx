import { useCallback, useState, useEffect, useRef } from "react";
import Header from "./Header";
import InputPanel from "./InputPanel";
import { ResultsPanel } from "./ResultsPanel";
import type { CopyToClipboardFunction, LanguageType, PerformSecurityScanFunction, ScanResults, SecurityIssue, TabType } from "../../types/types";
import { HeroSection } from "./HeroSection";
import { X } from "lucide-react";
import {analyzeCode} from "../../api/api"

const CodeSecurityScanner = () => {
  const [codeInput, setCodeInput] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageType>('javascript');
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('code');
  const [showResults, setShowResults] = useState<boolean>(true);
  const [showHero, setShowHero] = useState<boolean>(true);
  
  // Ref for the main component container
  const componentRef = useRef<HTMLDivElement>(null);

  // Scroll to top when input panel re-renders (when showHero becomes false)
  useEffect(() => {
    if (!showHero && componentRef.current) {
      componentRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, [showHero]);

  // Also scroll to top when switching tabs or uploading files
  useEffect(() => {
    if (!showHero && componentRef.current) {
      componentRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, [activeTab, uploadedFile, showHero]);

  const performSecurityScan: PerformSecurityScanFunction = async (code: string, language: LanguageType): Promise<ScanResults> => {
    // Simulate API delay
    const result=await analyzeCode(code, language);
    console.log("API Result:", result);
    const totalIssues = result.length;
    const criticalIssues = result.filter((issue: SecurityIssue) => issue.type === "critical").length;
    const warningIssues = result.filter((issue: SecurityIssue) => issue.type === "warning").length;
    const scanResults: ScanResults = {
      totalIssues,
      criticalIssues,
      warningIssues,
      language: language,
      issues: result
    };

    return scanResults;
  };

   const handleGetStarted = (): void => {
    setShowHero(false);
  };
  
  const handleBackToHome = (): void => {
    setShowHero(true);
    setScanResults(null);
    setCodeInput('');
    setUploadedFile(null);
    setActiveTab('code');
    // Scroll to top when going back to hero
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScan = async (): Promise<void> => {
    if (!codeInput.trim()) return;
    
    setIsScanning(true);
    try {
      const results: ScanResults = await performSecurityScan(codeInput, selectedLanguage);
      setScanResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file: File | undefined = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 1MB for MVP)
    if (file.size > 1024 * 1024) {
      alert('File size too large. Please upload files smaller than 1MB.');
      return;
    }

    // Check file type
    const allowedExtensions: string[] = ['.js', '.py', '.ts', '.jsx', '.tsx'];
    const nameParts: string[] = file.name.split('.');
    const lastPart: string | undefined = nameParts.pop();
    const fileExtension: string = lastPart ? '.' + lastPart.toLowerCase() : '';
    
    if (!allowedExtensions.includes(fileExtension)) {
      alert('Unsupported file type. Please upload JavaScript or Python files.');
      return;
    }

    setUploadedFile(file);
    
    try {
      const content: string = await file.text();
      setCodeInput(content);
      
      // Auto-detect language
      if (fileExtension === '.py') {
        setSelectedLanguage('python');
      } else {
        setSelectedLanguage('javascript');
      }
      
      setActiveTab('code');
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file. Please try again.');
    }
  }, []);

  const copyToClipboard: CopyToClipboardFunction = (text: string): void => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch((err: Error) => {
        console.error('Failed to copy to clipboard:', err);
      });
    } else {
      // Fallback for older browsers
      const textArea: HTMLTextAreaElement = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const clearResults = (): void => {
    setScanResults(null);
    setShowResults(true);
  };

  const handleFileRemove = (): void => {
    setUploadedFile(null);
  };

  const handleLanguageChange = (language: LanguageType): void => {
    setSelectedLanguage(language);
  };

  const handleTabChange = (tab: TabType): void => {
    setActiveTab(tab);
  };

  const handleToggleResults = (): void => {
    setShowResults(!showResults);
  };

  return (
//  <div ref={componentRef} className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
 <div ref={componentRef} className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-900 to-slate-950 border rounded-xl p-2"> 
      <Header />
      
      <div className="container mx-auto px-2 py-4">
        {showHero ? (
          <HeroSection onGetStarted={handleGetStarted} />
        ) : (
          <>
            {/* Back to Home Button */}
            <div className="mb-4">
              <button
                onClick={handleBackToHome}
                className="flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                type="button"
              >
                <X className="w-4 h-4 mr-2" />
                Back to Home
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
              <InputPanel
                codeInput={codeInput}
                onCodeChange={setCodeInput}
                selectedLanguage={selectedLanguage}
                onLanguageChange={handleLanguageChange}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                uploadedFile={uploadedFile}
                onFileUpload={handleFileUpload}
                onFileRemove={handleFileRemove}
                onScan={handleScan}
                isScanning={isScanning}
              />

              <div className="space-y-6">
                <ResultsPanel
                  scanResults={scanResults}
                  showResults={showResults}
                  onToggleResults={handleToggleResults}
                  onClearResults={clearResults}
                  onCopyCode={copyToClipboard}
                />
              </div>
            </div>
          </>
        )}

        {/* <Footer /> */}
      </div>
    </div>
  );
};

export default CodeSecurityScanner;