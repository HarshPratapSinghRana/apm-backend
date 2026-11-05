/**
 * AgentFeedbackPanel
 *
 * A full-width, collapsible feedback widget that sits between the agent title
 * block and the main content grid. In its collapsed state it shows a slim bar
 * ("Was this helpful?") so it never steals attention. Clicking the bar or one
 * of the thumb icons expands it to reveal the full Like / Dislike toggle, an
 * optional comment textarea, and a Submit button.
 *
 * Authentication flow is identical to UploadSolutionModal: the SharePoint-only
 * MSAL instance acquires tokens silently (or via popup) and the tokens are
 * forwarded to the backend via X-Graph-Token / X-SharePoint-Token headers.
 */

import React, { useState, useRef, useEffect } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, ChevronDown, ChevronUp, Send, Loader2, Check, X } from "lucide-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { useAuth } from "@/hooks/useAuth";
import {
  graphUploadRequest,
  sharepointUploadRequest,
  getSharepointMsalInstance,
} from "@/auth/authConfig";
import { submitAgentFeedback } from "@/api/api";
import { useToast } from "@/hooks/use-toast";

interface AgentFeedbackPanelProps {
  agentName: string;
  staticMode?: boolean;
  buttonMode?: boolean;
}

const MAX_COMMENT_LENGTH = 500;

export const AgentFeedbackPanel: React.FC<AgentFeedbackPanelProps> = ({ agentName, staticMode = false, buttonMode = false }) => {
  const { accounts } = useAuth();
  const { toast } = useToast();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVote, setSelectedVote] = useState<"Like" | "Dislike" | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click or Escape so it behaves like a proper
  // popover instead of pushing the page content around.
  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExpanded(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  // Pre-select a vote if user clicks a thumb on the collapsed bar
  const handleCollapsedVote = (vote: "Like" | "Dislike", e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVote(vote);
    setIsExpanded(true);
  };

  const handleToggleExpand = () => {
    setIsExpanded((v) => !v);
  };

  const handleVoteSelect = (vote: "Like" | "Dislike") => {
    setSelectedVote((prev) => (prev === vote ? null : vote));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVote) {
      toast({ title: "Please select Like or Dislike before submitting.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const account = accounts?.[0];
      if (!account) throw new Error("You must be signed in to submit feedback.");

      const spInstance = await getSharepointMsalInstance();

      // Ensure the SharePoint app has an account (same pattern as UploadSolutionModal).
      let spAccount =
        spInstance
          .getAllAccounts()
          .find((a) => a.username?.toLowerCase() === account.username?.toLowerCase()) ?? null;

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

      // Use the display name from the SharePoint account if available, fall
      // back to the website sign-in account name.
      const submittedBy = spAccount?.name || account.name || account.username || "";

      await submitAgentFeedback(
        {
          agentName,
          vote: selectedVote,
          comment: comment.trim(),
          submittedBy,
        },
        graphToken,
        sharepointToken
      );

      setSubmitted(true);
      setIsExpanded(false);
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast({
        title: "Submission failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while submitting your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissSuccess = () => {
    setSubmitted(false);
    setSelectedVote(null);
    setComment("");
  };

  // ── Success banner ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="feedback-panel-success flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Thanks for your feedback!
            </p>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
              Your {selectedVote?.toLowerCase()} has been recorded for <span className="font-medium">{agentName}</span>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismissSuccess}
            className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Submit another
          </button>
          <button
            onClick={() => setSubmitted(false)}
            className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-emerald-600 dark:text-emerald-400"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ── Static (always-open) card variant ──
  if (staticMode) {
    return (
      <div className="feedback-panel-static h-full flex flex-col rounded-xl border border-card-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 p-4 pb-3 border-b border-border">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-card-foreground">Was this helpful?</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-3 p-4">
          {/* Vote toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleVoteSelect("Like")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150
                ${selectedVote === "Like"
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                }`}
              aria-pressed={selectedVote === "Like"}
            >
              <ThumbsUp className="w-4 h-4" />
              Like
            </button>
            <button
              type="button"
              onClick={() => handleVoteSelect("Dislike")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150
                ${selectedVote === "Dislike"
                  ? "bg-rose-500 border-rose-500 text-white shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                }`}
              aria-pressed={selectedVote === "Dislike"}
            >
              <ThumbsDown className="w-4 h-4" />
              Dislike
            </button>
          </div>

          {/* Comment textarea */}
          <div className="relative flex-1 min-h-[90px]">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
              placeholder="Add a comment (optional) — what did you think?"
              className="w-full h-full min-h-[90px] px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
            />
            <span className="absolute bottom-2 right-2.5 text-[10px] text-muted-foreground/60 pointer-events-none">
              {comment.length}/{MAX_COMMENT_LENGTH}
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!selectedVote || isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Feedback
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`feedback-panel relative ${buttonMode ? "inline-block" : "w-full"}`}>
      {/* ── Trigger ── */}
      {buttonMode ? (
        <button
          type="button"
          onClick={handleToggleExpand}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors
            ${isExpanded
              ? "bg-primary/5 dark:bg-primary/10 border-primary/30 text-foreground"
              : "bg-card border-border text-foreground/80 hover:bg-muted/40"
            }`}
          aria-expanded={isExpanded}
          aria-controls="feedback-panel-body"
        >
          <MessageSquare className="w-4 h-4 text-primary/70" />
          Share Feedback
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      ) : (
      <button
        type="button"
        onClick={handleToggleExpand}
        className={`w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors text-left
          ${isExpanded
            ? "bg-primary/5 dark:bg-primary/10 border-primary/30 shadow-sm"
            : "bg-card border-border hover:bg-muted/40"
          }`}
        aria-expanded={isExpanded}
        aria-controls="feedback-panel-body"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-primary/70 shrink-0" />
          <span className="text-sm font-medium text-foreground/80">
            {isExpanded ? "Share your feedback" : "Was this agent helpful?"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick thumbs in collapsed state */}
          {!isExpanded && (
            <>
              <button
                type="button"
                onClick={(e) => handleCollapsedVote("Like", e)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all"
                aria-label="Like this agent"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                Like
              </button>
              <button
                type="button"
                onClick={(e) => handleCollapsedVote("Dislike", e)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                aria-label="Dislike this agent"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                Dislike
              </button>
            </>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      )}

      {/* ── Expanded form (floating dropdown — no layout shift) ── */}
      {isExpanded && (
        <form
          id="feedback-panel-body"
          onSubmit={handleSubmit}
          className="absolute right-0 top-full z-40 mt-2 w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-lg px-4 py-4 space-y-4 origin-top-right animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {/* Vote toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
              Your vote
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleVoteSelect("Like")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150
                  ${selectedVote === "Like"
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm scale-[1.03]"
                    : "bg-card border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  }`}
                aria-pressed={selectedVote === "Like"}
              >
                <ThumbsUp className="w-4 h-4" />
                Like
              </button>
              <button
                type="button"
                onClick={() => handleVoteSelect("Dislike")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150
                  ${selectedVote === "Dislike"
                    ? "bg-rose-500 border-rose-500 text-white shadow-sm scale-[1.03]"
                    : "bg-card border-border text-muted-foreground hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  }`}
                aria-pressed={selectedVote === "Dislike"}
              >
                <ThumbsDown className="w-4 h-4" />
                Dislike
              </button>
            </div>
          </div>

          {/* Comment textarea */}
          <div className="relative">
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
              rows={2}
              placeholder="Add a comment (optional) — what did you think?"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
            />
            <span className="absolute bottom-2 right-2.5 text-[10px] text-muted-foreground/60 pointer-events-none">
              {comment.length}/{MAX_COMMENT_LENGTH}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleToggleExpand}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedVote || isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AgentFeedbackPanel;
