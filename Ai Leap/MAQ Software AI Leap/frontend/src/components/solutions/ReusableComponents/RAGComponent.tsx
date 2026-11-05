import React, { useState, useCallback, useRef } from 'react';
import { documentIntelligence, generateBackendZip } from '../../../api/api';
import { FileSearch, Download, Send, Loader2, Key, Globe, Server, Sparkles, FileText, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const aiModels = [
  { label: 'Azure OpenAI', value: 'azure-openai' },
  { label: 'Claude', value: 'claude' },
  { label: 'Gemini', value: 'gemini' },
];

type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error';

interface ProgressStep {
  id: string;
  label: string;
  status: StepStatus;
}

const INITIAL_STEPS: ProgressStep[] = [
  { id: 'validate', label: 'Validating configuration', status: 'pending' },
  { id: 'generate', label: 'Generating the code', status: 'pending' },
  { id: 'configure', label: 'Applying configurations', status: 'pending' },
  { id: 'finalize', label: 'Finalizing the code', status: 'pending' },
  { id: 'package', label: 'Preparing downloadable package', status: 'pending' },
];

const StepIcon: React.FC<{ status: StepStatus }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />;
    case 'in-progress':
      return <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />;
    default:
      return <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />;
  }
};

const RAGComponent: React.FC = () => {
  const [url, setUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [deploymentName, setDeploymentName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [documentKey, setDocumentKey] = useState('');
  const [fieldsToExtract, setFieldsToExtract] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const { toast } = useToast();
  const progressRef = useRef<HTMLDivElement>(null);

  const updateStep = useCallback((stepId: string, status: StepStatus) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status } : s));
  }, []);

  const simulateStep = useCallback((stepId: string, durationMs: number): Promise<void> => {
    return new Promise(resolve => {
      updateStep(stepId, 'in-progress');
      setTimeout(() => {
        updateStep(stepId, 'completed');
        resolve();
      }, durationMs);
    });
  }, [updateStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldsToExtract) {
      toast({
        title: "Validation Error",
        description: "Please provide the required field: Fields to extract.",
        variant: "destructive",
      });
      return;
    }

    // Reset state
    setSteps(INITIAL_STEPS);
    setPipelineComplete(false);
    setShowProgress(true);
    setIsSubmitting(true);

    // Scroll to progress section
    setTimeout(() => {
      progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    try {
      // Step 1: Validate
      await simulateStep('validate', 800);

      // Step 2: Generate code
      updateStep('generate', 'in-progress');
      // const resp = await documentIntelligence(url, fieldsToExtract);
      // console.log('Document intelligence response', resp);
      updateStep('generate', 'completed');

      // Step 3: Apply configurations
      await simulateStep('configure', 1000);

      // Step 4: Finalize code
      await simulateStep('finalize', 800);

      // Step 5: Prepare package
      await simulateStep('package', 600);

      setPipelineComplete(true);
      toast({
        title: "Pipeline Complete",
        description: "Your code is ready. Click \"Download Backend ZIP\" to get it.",
      });
    } catch (err: any) {
      console.error('Pipeline error', err);
      // Mark the current in-progress step as error
      setSteps(prev => prev.map(s => s.status === 'in-progress' ? { ...s, status: 'error' } : s));
      toast({
        title: "Error",
        description: 'Pipeline failed: ' + (err?.message ?? err),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadBackend = async () => {
    const payload = {
      doc_endpoint: url,
      doc_key: documentKey,
      llm_provider: selectedModel,
      llm_key: apiKey,
      llm_model_name: deploymentName,
      api_endpoint: modelUrl,
      pdf_url: url,
      user_query: fieldsToExtract,
    };

    setIsDownloading(true);

    try {
      await generateBackendZip(payload);
      toast({
        title: "Download Complete",
        description: "Backend ZIP file has been downloaded successfully!",
      });
    } catch (err: any) {
      console.error('Download backend zip failed', err);
      toast({
        title: "Download Failed",
        description: 'Download failed: ' + (err?.message ?? err),
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 backdrop-blur-sm">
            <FileSearch className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">AI Document Intelligence Generator</h2>
            <p className="text-sm text-muted-foreground">Configure your document extraction pipeline</p>
          </div>
        </div>

        {/* Document Intelligence Section */}
        <div className="space-y-4 p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Document Intelligence</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Globe className="w-4 h-4 text-muted-foreground" />
                Endpoint URL
                <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/mydoc"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Key className="w-4 h-4 text-muted-foreground" />
                Document Intelligence Key
              </label>
              <input
                type="password"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                value={documentKey}
                onChange={(e) => setDocumentKey(e.target.value)}
                placeholder="Enter document intelligence key"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* LLM Provider Section */}
        <div className="space-y-4 p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">LLM Provider</h3>
            <span className="text-xs text-muted-foreground">(optional)</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              Choose Provider
            </label>
            <select
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select model</option>
              {aiModels.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {selectedModel && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Server className="w-4 h-4 text-muted-foreground" />
                  Model Endpoint URL
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  value={modelUrl}
                  onChange={(e) => setModelUrl(e.target.value)}
                  placeholder="https://your-model-endpoint.example.com"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  Deployment Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  value={deploymentName}
                  onChange={(e) => setDeploymentName(e.target.value)}
                  placeholder="e.g. my-deployment"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  API Key
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}
        </div>

        {/* Fields to Extract Section */}
        <div className="space-y-4 p-5 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-card-foreground">Extraction Configuration</h3>
            <span className="text-xs text-destructive font-medium">* Required</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              Fields to Extract
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all min-h-[140px] resize-y"
              placeholder="e.g. name, date, total, invoice_number"
              required
              value={fieldsToExtract}
              onChange={(e) => setFieldsToExtract(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Enter the field names you want to extract, separated by commas
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit
              </>
            )}
          </button>
        </div>

        {/* ── Progress Tracker ── */}
        {showProgress && (
          <div ref={progressRef} className="p-5 rounded-xl border border-border bg-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-card-foreground">Pipeline Progress</h3>
            </div>

            <div className="space-y-0">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-3">
                  {/* Vertical line + icon column */}
                  <div className="flex flex-col items-center">
                    <StepIcon status={step.status} />
                    {idx < steps.length - 1 && (
                      <div
                        className={`w-px h-8 transition-colors duration-500 ${
                          step.status === 'completed' ? 'bg-green-400' : 'bg-border'
                        }`}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="pt-0.5 pb-3">
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        step.status === 'completed'
                          ? 'text-green-700'
                          : step.status === 'in-progress'
                            ? 'text-primary font-semibold'
                            : step.status === 'error'
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.status === 'in-progress' && (
                      <span className="ml-2 text-xs text-muted-foreground animate-pulse">In progress…</span>
                    )}
                    {step.status === 'error' && (
                      <span className="ml-2 text-xs text-destructive">Failed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Download button — only enabled after pipeline completes */}
            <div className={`mt-6 pt-4 border-t border-border transition-opacity duration-500 ${pipelineComplete ? 'opacity-100' : 'opacity-50'}`}>
              <button
                type="button"
                onClick={handleDownloadBackend}
                disabled={!pipelineComplete || isDownloading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download Backend ZIP
                  </>
                )}
              </button>
              {!pipelineComplete && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Complete the pipeline above to enable download
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div className="pb-8" />
      </form>
    </div>
  );
};

export default RAGComponent;
