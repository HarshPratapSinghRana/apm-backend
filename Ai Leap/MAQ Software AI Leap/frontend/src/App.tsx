import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import DomainDetails from "./pages/DomainDetails";
// AI Advisor commented out
// import Advisor from "./pages/Advisor";
// Knowledge Hub commented out
// import Knowledge from "./pages/Knowledge";
import AgentDetail from "./pages/AgentDetail";
import NotFound from "./pages/NotFound";
import MaqAura from "./components/MaqAura";
import { useState } from 'react';
import AuthGate from "./auth/AuthGate";
import Banner from "./components/Banner";

const queryClient = new QueryClient();

const LandingPage = () => {
  const [, setView] = useState<"classic" | "modern">("classic");

  // Kept for backward compatibility with the existing view-toggle in Index/ModernIndex.
  const _toggle = (v: "classic" | "modern") => {
    localStorage.setItem("leap-view", v);
    setView(v);
  };
  void _toggle;

  return <Index />;
};

const UploadSolutionPage = () => {
  return <Navigate to="/?branch=solutions&child=solutions-by-industry&upload-solution=true" replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthGate>
            <Banner />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/upload-solution" element={<UploadSolutionPage />} />
              <Route path="/domain/:domainId" element={<DomainDetails />} />
              {/* AI Advisor commented out */}
              {/* <Route path="/advisor" element={<Advisor />} /> */}
              {/* Knowledge Hub commented out */}
              {/* <Route path="/knowledge" element={<Knowledge />} /> */}
              <Route path="/agents" element={<Index />} />
              <Route path="/agents/:agentSlug" element={<AgentDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MaqAura />
          </AuthGate>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
