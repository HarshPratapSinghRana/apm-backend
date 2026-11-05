import type { CodeInputProps } from "../../types/types";

const CodeInput = ({ codeInput, onCodeChange, onLoadExample }:CodeInputProps) => {
  const exampleCode = `// Example code with security issues
const express = require('express');
const API_KEY = "YOUR_SAMPLE_API_KEY_HERE"; // Hard-coded secret (sample placeholder)
const app = express();

app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  const query = \`SELECT * FROM users WHERE id = \${userId}\`; // SQL injection risk
  
  // Dangerous eval usage
  const userInput = req.query.code;
  eval(userInput); // Never do this!
  
  res.json({ message: 'User data' });
});`;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-slate-300">
          Code
        </label>
        <button
          onClick={() => onLoadExample(exampleCode)}
          className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
        >
          Load Example
        </button>
      </div>
      <textarea
        value={codeInput}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder="Paste your code here..."
        className="w-full h-64 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none
        scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
      />
      <style>{`
        textarea::-webkit-scrollbar {
          width: 8px;
        }
        
        textarea::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 6px;
        }
        
        textarea::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 6px;
          border: 1px solid #1e293b;
        }
        
        textarea::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        
        textarea::-webkit-scrollbar-corner {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
};

export default CodeInput;