import { AlertTriangle, CheckCircle, Code, Eye, Shield, ArrowRight, Zap } from "lucide-react";
import type { HeroSectionProps } from "../types/types";

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => (
  <div className="relative text-center mb-20 overflow-hidden">
   
    
    {/* Main Content */}
    <div className="relative z-10">
      {/* Badge - Updated colors */}
      <div className="inline-flex items-center gap-2 bg-slate-900/60 backdrop-blur-sm border border-cyan-800/40 rounded-full px-4 py-2 mb-6 group hover:border-cyan-400/60 transition-all duration-300">
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        <span className="text-slate-200 text-sm font-medium">AI-Powered Security Analysis</span>
        <Zap className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
      </div>

      {/* Main Headline - Updated gradient */}
      <h1 className="text-6xl md:text-4xl font-bold text-white mb-6 leading-tight">
        Secure Your Code with{" "}
        <span className="relative">
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-200 bg-clip-text text-transparent animate-pulse">
            AI Power
          </span>
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/25 via-blue-400/25 to-cyan-300/25 rounded-lg blur-lg"></div>
        </span>
      </h1>

      {/* Subtitle with enhanced styling - Updated colors */}
      <p className="text-slate-200 text-sm md:text-xl max-w-4xl mx-auto leading-relaxed mb-12 font-light">
        Detect security vulnerabilities in your code with{" "}
        <span className="text-cyan-300 font-semibold">AI-powered analysis</span>.
        Identify hard-coded secrets, SQL injection risks, and unsafe functions{" "}
        <span className="text-blue-300 font-semibold">before they become threats</span>.
      </p>

   
      {/* Enhanced Feature Grid - Updated for new background */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
        <div className="group bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-slate-600/40 rounded-2xl p-8 hover:border-green-400/60 hover:shadow-2xl hover:shadow-green-400/15 transition-all duration-500 hover:-translate-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500/25 to-green-600/25 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
            <Shield className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-white font-bold text-xl mb-4 group-hover:text-green-300 transition-colors">
            SQL Injection Detection
          </h3>
          <p className="text-slate-300 text-base leading-relaxed mb-4">
            Automatically identifies unsafe database queries and injection vulnerabilities with AI-powered pattern recognition
          </p>
          <div className="text-green-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Real-time scanning →
          </div>
        </div>
       
        <div className="group bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-slate-600/40 rounded-2xl p-8 hover:border-yellow-400/60 hover:shadow-2xl hover:shadow-yellow-400/15 transition-all duration-500 hover:-translate-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/25 to-yellow-600/25 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
            <Eye className="w-8 h-8 text-yellow-400" />
          </div>
          <h3 className="text-white font-bold text-xl mb-4 group-hover:text-yellow-300 transition-colors">
            Secret Scanning
          </h3>
          <p className="text-slate-300 text-base leading-relaxed mb-4">
            Finds hard-coded API keys, passwords, and sensitive credentials before they're committed to your repository
          </p>
          <div className="text-yellow-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Instant alerts →
          </div>
        </div>
       
        <div className="group bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-slate-600/40 rounded-2xl p-8 hover:border-red-400/60 hover:shadow-2xl hover:shadow-red-400/15 transition-all duration-500 hover:-translate-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500/25 to-red-600/25 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-white font-bold text-xl mb-4 group-hover:text-red-300 transition-colors">
            Unsafe Functions
          </h3>
          <p className="text-slate-300 text-base leading-relaxed mb-4">
            Detects dangerous functions like eval() and other risky code patterns that could compromise security
          </p>
          <div className="text-red-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Auto-fix available →
          </div>
        </div>
      </div>
   
      {/* Enhanced CTA Section - Updated gradient */}
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={onGetStarted}
            className="group relative bg-gradient-to-r from-cyan-600 via-cyan-700 to-blue-700 hover:from-cyan-500 hover:via-cyan-600 hover:to-blue-600 text-white font-bold text-lg px-10 py-5 rounded-2xl shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-400/50 transform hover:scale-105 transition-all duration-300 flex items-center overflow-hidden cursor-pointer"
            type="button"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <span className="relative z-10">Get Started Free</span>
            <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform relative z-10" />
          </button>
          
          <button className="group text-slate-200 hover:text-white font-semibold text-lg px-8 py-5 rounded-2xl border border-slate-500/60 hover:border-cyan-400/60 backdrop-blur-sm transition-all duration-300 flex items-center">
            <Code className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
            View Demo
          </button>
        </div>
       
        {/* Enhanced Feature List - Updated colors */}
        <div className="flex flex-wrap items-center justify-center gap-8 text-slate-300">
          <span className="flex items-center group hover:text-cyan-200 transition-colors duration-200">
            <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-cyan-500/30 transition-colors">
              <CheckCircle className="w-4 h-4 text-cyan-400" />
            </div>
            Real-time Analysis
          </span>
          <span className="flex items-center group hover:text-cyan-200 transition-colors duration-200">
            <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-cyan-500/30 transition-colors">
              <CheckCircle className="w-4 h-4 text-cyan-400" />
            </div>
            Multi-language Support
          </span>
          <span className="flex items-center group hover:text-cyan-200 transition-colors duration-200">
            <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-cyan-500/30 transition-colors">
              <CheckCircle className="w-4 h-4 text-cyan-400" />
            </div>
            Instant Auto-fixes
          </span>
        </div>
      </div>
    </div>
  </div>
);