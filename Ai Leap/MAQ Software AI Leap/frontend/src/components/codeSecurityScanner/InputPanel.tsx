import { Code, Shield } from "lucide-react";
import CodeInput from "./CodeInput";
import LanguageSelector from "./LanguageSelector";
import FileUpload from "./FileUpload";
import type { InputPanelProps } from "../types/types";

const InputPanel = ({ 
  codeInput, 
  onCodeChange, 
  selectedLanguage, 
  onLanguageChange, 
  activeTab, 
  onTabChange, 
  uploadedFile, 
  onFileUpload, 
  onFileRemove, 
  onScan, 
  isScanning 
}:InputPanelProps) => (
  <div className="space-y-6">
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <Code className="w-5 h-5 mr-2" />
          Code Input
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => onTabChange('code')}
            className={`px-3 py-1 rounded-md text-sm font-medium cursor-pointer ${
              activeTab === 'code' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            Paste Code
          </button>
          <button
            onClick={() => onTabChange('upload')}
            className={`px-3 py-1 rounded-md text-sm font-medium cursor-pointer ${
              activeTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            Upload File
          </button>
        </div>
      </div>

      {activeTab === 'upload' && (
        <FileUpload 
          onFileUpload={onFileUpload}
          uploadedFile={uploadedFile}
          onFileRemove={onFileRemove}
        />
      )}

      <LanguageSelector 
        selectedLanguage={selectedLanguage}
        onLanguageChange={onLanguageChange}
      />

      <CodeInput 
        codeInput={codeInput}
        onCodeChange={onCodeChange}
        onLoadExample={onCodeChange}
      />

      <button
        onClick={onScan}
        disabled={!codeInput.trim() || isScanning}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center cursor-pointer"
      >
        {isScanning ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Scanning...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Scan Code
          </>
        )}
      </button>
    </div>
  </div>
);

export default InputPanel;