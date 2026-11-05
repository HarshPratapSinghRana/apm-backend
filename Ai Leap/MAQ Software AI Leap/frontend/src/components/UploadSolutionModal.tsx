import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Upload, Loader2, Check, AlertCircle, FileArchive, Trash2, Image } from "lucide-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { useAuth } from "@/hooks/useAuth";
import { graphUploadRequest, sharepointUploadRequest, getSharepointMsalInstance } from "@/auth/authConfig";
import { useUploadDraft, type UploadDraft } from "@/hooks/useUploadDraft";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/api/api";

const CATEGORIES = [
  "Retail",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Legal",
  "Engineering",
  "Feature Showcase",
  "Automotive",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 200;

interface UploadSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadSolutionModal: React.FC<UploadSolutionModalProps> = ({ isOpen, onClose }) => {
  const { accounts } = useAuth();
  const { toast } = useToast();
  const { loadDraft, saveDraft, clearDraft, hasDraft } = useUploadDraft();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diagramInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // User info
  const userName = accounts?.[0]?.name ?? "";
  const userEmail = accounts?.[0]?.username ?? "";

  // Form state
  const [formData, setFormData] = useState({
    projectTitle: "",
    projectDescription: "",
    category: "",
    keyFeatures: "",
    techStack: "",
    demoVideoUrl: "",
    impact: "",
  });

  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    file: File;
  } | null>(null);

  const [architectureDiagramFile, setArchitectureDiagramFile] = useState<{
    name: string;
    size: number;
    file: File;
  } | null>(null);

  const [showDraftRestoreMessage, setShowDraftRestoreMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load draft on mount
  useEffect(() => {
    if (!isOpen) return;

    const draft = loadDraft();
    if (draft) {
      setFormData({
        projectTitle: draft.projectTitle,
        projectDescription: draft.projectDescription,
        category: draft.category,
        keyFeatures: draft.keyFeatures ?? "",
        techStack: draft.techStack ?? "",
        demoVideoUrl: draft.demoVideoUrl ?? "",
        impact: draft.impact ?? "",
      });
      // Note: File object can't be serialized, so we only restore filename
      if (draft.zipFilename || draft.architectureDiagramFilename) {
        setShowDraftRestoreMessage(true);
      }
    }
  }, [isOpen, loadDraft]);

  // Focus trap - keep focus within modal when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trapping
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      saveDraft({
        ...updated,
        zipFilename: uploadedFile?.name ?? null,
        zipFileSize: uploadedFile?.size ?? null,
        architectureDiagramFilename: architectureDiagramFile?.name ?? null,
        architectureDiagramFileSize: architectureDiagramFile?.size ?? null,
      });
      return updated;
    });
  };

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];

      // Validate file type
      if (file.type !== "application/zip" && !file.name.endsWith(".zip")) {
        toast({
          title: "Invalid file type",
          description: "Only ZIP files are supported.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `Maximum file size is 100 MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
          variant: "destructive",
        });
        return;
      }

      setUploadedFile({
        name: file.name,
        size: file.size,
        file,
      });

      // Save draft
      saveDraft({
        ...formData,
        zipFilename: file.name,
        zipFileSize: file.size,
      });
    },
    [formData, saveDraft, toast]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    saveDraft({
      ...formData,
      zipFilename: null,
      zipFileSize: null,
    });
  };

  // --- Architecture diagram file handlers ---

  const handleDiagramFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];

      // Validate file type
      const validImageTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
      if (!validImageTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only image files are supported (.png, .jpg, .jpeg, .gif, .webp).",
          variant: "destructive",
        });
        return;
      }

      // Validate file size
      if (file.size > MAX_IMAGE_SIZE) {
        toast({
          title: "File too large",
          description: `Maximum file size is 10 MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
          variant: "destructive",
        });
        return;
      }

      setArchitectureDiagramFile({
        name: file.name,
        size: file.size,
        file,
      });

      // Save draft
      saveDraft({
        ...formData,
        zipFilename: uploadedFile?.name ?? null,
        zipFileSize: uploadedFile?.size ?? null,
        architectureDiagramFilename: file.name,
        architectureDiagramFileSize: file.size,
      });
    },
    [formData, uploadedFile, saveDraft, toast]
  );

  const handleDiagramDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDiagramDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleDiagramFileSelect(e.dataTransfer.files);
  };

  const handleDiagramBrowseClick = () => {
    diagramInputRef.current?.click();
  };

  const handleRemoveDiagramFile = () => {
    setArchitectureDiagramFile(null);
    if (diagramInputRef.current) {
      diagramInputRef.current.value = "";
    }
    saveDraft({
      ...formData,
      zipFilename: uploadedFile?.name ?? null,
      zipFileSize: uploadedFile?.size ?? null,
      architectureDiagramFilename: null,
      architectureDiagramFileSize: null,
    });
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.projectTitle.trim()) errors.push("Project title is required");
    if (!formData.projectDescription.trim()) errors.push("Description is required");
    if (!formData.category) errors.push("Category is required");
    if (!formData.keyFeatures.trim()) errors.push("Key features are required");
    if (!formData.techStack.trim()) errors.push("Tech stack is required");
    if (!formData.demoVideoUrl.trim()) errors.push("Demo video URL is required");
    if (!formData.impact.trim()) errors.push("Impact summary is required");
    if (!uploadedFile) errors.push("ZIP file is required");
    if (!architectureDiagramFile) errors.push("Architecture diagram is required");

    return errors;
  };

  const isFormValid = (): boolean => {
    return (
      !!formData.projectTitle.trim() &&
      !!formData.projectDescription.trim() &&
      !!formData.category &&
      !!formData.keyFeatures.trim() &&
      !!formData.techStack.trim() &&
      !!formData.demoVideoUrl.trim() &&
      !!formData.impact.trim() &&
      !!uploadedFile &&
      !!architectureDiagramFile
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "Form incomplete",
        description: errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please select a ZIP file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Acquire the SharePoint upload tokens (MSAL). Try silent first, then
      // fall back to a popup if interaction is required.
      const account = accounts?.[0];
      if (!account) {
        throw new Error("You must be signed in to submit a solution.");
      }

      // Solution submission authenticates against a dedicated Entra app that is
      // the only client granted SharePoint access — kept separate from the
      // website sign-in identity used everywhere else in the app.
      const spInstance = await getSharepointMsalInstance();

      // Ensure the SharePoint app has an account to issue tokens for. The first
      // submission establishes one (silently when possible, otherwise via a
      // popup seeded with the signed-in user's UPN); afterwards MSAL caches and
      // reuses it. Establishing it up front lets both token requests below run
      // silently in parallel without colliding on an interactive popup.
      let spAccount =
        spInstance.getAllAccounts().find(
          (a) => a.username?.toLowerCase() === account.username?.toLowerCase()
        ) ?? null;

      if (!spAccount) {
        try {
          const sso = await spInstance.ssoSilent({ loginHint: account.username });
          spAccount = sso.account;
        } catch {
          const login = await spInstance.loginPopup({
            ...sharepointUploadRequest,
            loginHint: account.username,
          });
          spAccount = login.account;
        }
      }
      spInstance.setActiveAccount(spAccount);

      const acquireToken = async (request: { scopes: string[] }) => {
        try {
          const result = await spInstance.acquireTokenSilent({ ...request, account: spAccount! });
          return result.accessToken;
        } catch (err) {
          if (err instanceof InteractionRequiredAuthError) {
            const result = await spInstance.acquireTokenPopup({ ...request, account: spAccount! });
            return result.accessToken;
          }
          throw err;
        }
      };

      const [graphToken, sharepointToken] = await Promise.all([
        acquireToken(graphUploadRequest),
        acquireToken(sharepointUploadRequest),
      ]);

      // Create FormData for multipart upload
      const uploadFormData = new FormData();
      uploadFormData.append("projectTitle", formData.projectTitle);
      uploadFormData.append("projectDescription", formData.projectDescription);
      uploadFormData.append("category", formData.category);
      uploadFormData.append("keyFeatures", formData.keyFeatures);
      uploadFormData.append("techStack", formData.techStack);
      uploadFormData.append("demoVideoUrl", formData.demoVideoUrl);
      uploadFormData.append("impact", formData.impact);
      uploadFormData.append("submittedBy", userName || userEmail);
      uploadFormData.append("zipFile", uploadedFile.file);
      uploadFormData.append("architectureDiagram", architectureDiagramFile.file);

      const response = await fetch(`${BASE_URL}/api/solutions/upload`, {
        method: "POST",
        headers: {
          "X-Graph-Token": graphToken,
          "X-SharePoint-Token": sharepointToken,
        },
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || `Upload failed: ${response.statusText}`
        );
      }

      // Success!
      setSubmitted(true);
      toast({
        title: "Success!",
        description: "Solution uploaded successfully.",
      });

      // Clear draft
      clearDraft();

      // Reset form
      setFormData({
        projectTitle: "",
        projectDescription: "",
        category: "",
        keyFeatures: "",
        techStack: "",
        demoVideoUrl: "",
        impact: "",
      });
      setUploadedFile(null);
      setArchitectureDiagramFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (diagramInputRef.current) {
        diagramInputRef.current.value = "";
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while uploading. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-labelledby="upload-modal-title"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="w-full max-w-2xl bg-card rounded-2xl border border-border shadow-2xl my-8">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-border bg-card rounded-t-2xl">
            <div>
              <h1 id="upload-modal-title" className="text-xl font-bold text-foreground">
                Upload Solution
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Share your code solution with the community
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close upload dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitted ? (
            // Success state
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Solution uploaded successfully!
              </h2>
              <p className="text-sm text-muted-foreground">
                Thank you for contributing to the community. Your solution is now available.
              </p>
            </div>
          ) : (
            // Form
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Draft restore message */}
              {showDraftRestoreMessage && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Draft restored from your previous session
                    </p>
                  </div>
                </div>
              )}

              {/* Project Details Section */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="projectTitle" className="block text-sm font-medium text-foreground mb-2">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="projectTitle"
                    name="projectTitle"
                    type="text"
                    value={formData.projectTitle}
                    onChange={handleInputChange}
                    maxLength={MAX_TITLE_LENGTH}
                    placeholder="e.g., AI-Powered Inventory Management"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.projectTitle.length} / {MAX_TITLE_LENGTH} characters
                  </p>
                </div>

                <div>
                  <label htmlFor="projectDescription" className="block text-sm font-medium text-foreground mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="projectDescription"
                    name="projectDescription"
                    value={formData.projectDescription}
                    onChange={handleInputChange}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    rows={2}
                    placeholder="Brief description of your solution..."
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.projectDescription.length} / {MAX_DESCRIPTION_LENGTH} characters
                  </p>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  >
                    <option value="">Select a category...</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="keyFeatures" className="block text-sm font-medium text-foreground mb-2">
                    Key Features <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="keyFeatures"
                    name="keyFeatures"
                    value={formData.keyFeatures}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="List the main features of your solution..."
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="techStack" className="block text-sm font-medium text-foreground mb-2">
                    Tech Stack <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="techStack"
                    name="techStack"
                    value={formData.techStack}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder={"- React 18 with TypeScript for type-safe development\n- Tailwind CSS for responsive, modern UI design\n- Python, FastAPI\n- Azure SQL"}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    List the technologies and frameworks used in your solution (one per line).
                  </p>
                </div>

                <div>
                  <label htmlFor="demoVideoUrl" className="block text-sm font-medium text-foreground mb-2">
                    Demo Video URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="demoVideoUrl"
                    name="demoVideoUrl"
                    type="url"
                    value={formData.demoVideoUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/demo-video"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="impact" className="block text-sm font-medium text-foreground mb-2">
                    Impact Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="impact"
                    name="impact"
                    value={formData.impact}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Summarize the overall impact of your solution (e.g. Reduces support ticket volume, provides 24/7 assistance, and improves employee self-service capabilities.)"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>

              {/* ZIP Upload Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  Upload ZIP File <span className="text-red-500">*</span>
                </label>

                {uploadedFile ? (
                  // File preview
                  <div className="p-4 border border-border rounded-lg bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileArchive className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                      aria-label="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  // Drag and drop area
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    role="button"
                    tabIndex={0}
                    onClick={handleBrowseClick}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleBrowseClick();
                      }
                    }}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Drag and drop your ZIP file here
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Maximum file size: 100 MB
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  aria-label="Select ZIP file to upload"
                />

                {uploadedFile && (
                  <button
                    type="button"
                    onClick={handleBrowseClick}
                    className="w-full text-sm text-primary hover:underline font-medium py-2"
                  >
                    Replace File
                  </button>
                )}
              </div>

              {/* Architecture Diagram Upload Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">
                  Upload Architecture Diagram <span className="text-red-500">*</span>
                </label>

                {architectureDiagramFile ? (
                  // File preview
                  <div className="p-4 border border-border rounded-lg bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Image className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {architectureDiagramFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(architectureDiagramFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveDiagramFile}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                      aria-label="Remove diagram file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  // Drag and drop area
                  <div
                    onDragOver={handleDiagramDragOver}
                    onDrop={handleDiagramDrop}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    role="button"
                    tabIndex={0}
                    onClick={handleDiagramBrowseClick}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleDiagramBrowseClick();
                      }
                    }}
                  >
                    <Image className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Drag and drop your architecture diagram here
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF, WebP — Maximum 10 MB
                    </p>
                  </div>
                )}

                <input
                  ref={diagramInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(e) => handleDiagramFileSelect(e.target.files)}
                  className="hidden"
                  aria-label="Select architecture diagram image to upload"
                />

                {architectureDiagramFile && (
                  <button
                    type="button"
                    onClick={handleDiagramBrowseClick}
                    className="w-full text-sm text-primary hover:underline font-medium py-2"
                  >
                    Replace File
                  </button>
                )}
              </div>

              {/* Form actions */}
              <div className="flex items-center gap-3 pt-6 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid() || isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Submit Solution
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};
 