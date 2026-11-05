import { FileText, Upload, X } from "lucide-react";
import type { FileUploadProps } from "../../types/types";

const FileUpload = ({ onFileUpload, uploadedFile, onFileRemove }:FileUploadProps) => (
  <div className="mb-4">
    <label className="block w-full">
      <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-300 mb-1">Drop your code file here or click to browse</p>
        <p className="text-slate-500 text-sm">Supports .js, .py, .ts, .jsx, .tsx (max 1MB)</p>
      </div>
      <input
        type="file"
        className="hidden"
        accept=".js,.py,.ts,.jsx,.tsx"
        onChange={onFileUpload}
      />
    </label>
    {uploadedFile && (
      <div className="mt-3 flex items-center justify-between bg-slate-700 rounded-lg p-3">
        <div className="flex items-center">
          <FileText className="w-4 h-4 text-blue-400 mr-2" />
          <span className="text-sm text-white">{uploadedFile.name}</span>
          <span className="text-xs text-slate-400 ml-2">
            ({Math.round(uploadedFile.size / 1024)}KB)
          </span>
        </div>
        <button
          onClick={onFileRemove}
          className="text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )}
  </div>
);
export default FileUpload;