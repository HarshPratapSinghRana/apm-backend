import { Shield } from "lucide-react";

const Header = () => (
//   <div className="text-center mb-8">
//     <div className="flex items-center justify-center mb-4">
//       <Shield className="w-12 h-12 text-blue-400 mr-3" />
//       <h1 className="text-4xl font-bold text-white">AI Security Code Scanner</h1>
//     </div>
//     <p className="text-slate-300 text-lg max-w-2xl mx-auto">
//       Detect security vulnerabilities in your code with AI-powered analysis. 
//     </p>
//   </div>
<header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 mb-8">
    <div className="container mx-6 px-0 py-4">
      <div className="flex items-center justify-between">
        {/* Left Side - Logo and Title */}
        <div className="flex items-center">
          <div className="flex items-center mr-6">
            <Shield className="w-8 h-8 text-blue-400 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-white">Security Smell Detector Agent</h1>
              {/* <p className="text-xs text-slate-400">Powered by AI</p> */}
            </div>
          </div>
        </div>

        {/* Right Side - Navigation/Actions */}
        {/* <div className="flex items-center space-x-4">
          
          <div className="flex items-center space-x-2">
            <button
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-600 transition-colors"
              type="button"
            >
              Docs
            </button>
            <button
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
              type="button"
            >
              API
            </button>
          </div>
        </div> */}
      </div>
    </div>
  </header>
);

export default Header;