import { FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Layers, Zap, Check, X, ArrowRight } from "lucide-react";
import { getMediaUrls } from "../api/api";

interface ArchitectureTechStackProps {
    useCase: { id: string; title: string };
    only?: "architecture" | "tech";
    fill?: boolean;
}

const technicalFeatures = [
    "React 18 with TypeScript for type-safe development",
    "Tailwind CSS for responsive, modern UI design",
    "Component-based architecture for maintainability",
    "Built-in state management using React hooks",
    "Comprehensive error handling and validation",
];

/**
 * System Architecture + Technical Stack cards.
 * - System Architecture is a compact "View" card that opens the diagram in an
 *   overlay (or shows "not available" when there's no diagram).
 * - Technical Stack is a static, always-open list.
 */
const ArchitectureTechStack: FC<ArchitectureTechStackProps> = ({ useCase, only, fill }) => {
    const [architectureImage, setArchitectureImage] = useState<string>("");
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Fetch the architecture image for this use case.
    useEffect(() => {
        let cancelled = false;
        getMediaUrls(useCase.id)
            .then((data) => {
                if (!cancelled) setArchitectureImage(data.architecture_image || "");
            })
            .catch(() => {
                if (!cancelled) setArchitectureImage("");
            });
        return () => {
            cancelled = true;
        };
    }, [useCase.id]);

    // Close lightbox on Escape.
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightboxOpen(false);
        };
        if (lightboxOpen) document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [lightboxOpen]);

    const cardClass = `bg-card rounded-xl border border-card-border overflow-hidden ${fill ? "h-full" : ""}`;

    // ── System Architecture — compact card that opens the diagram overlay ──
    const archCard = (
        <div className={cardClass}>
            <button
                type="button"
                onClick={() => architectureImage && setLightboxOpen(true)}
                disabled={!architectureImage}
                className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted/20 disabled:cursor-default disabled:hover:bg-transparent group"
            >
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Layers className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="block text-lg font-semibold text-card-foreground">
                        View System Architecture
                    </span>
                    {!architectureImage && (
                        <span className="block text-xs italic text-muted-foreground">
                            Diagram not available
                        </span>
                    )}
                </div>
                <ArrowRight className="w-5 h-5 shrink-0 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
            </button>
        </div>
    );

    // ── Technical Stack — static, always open ──
    const techCard = (
        <div className={cardClass}>
            <div className="flex items-center gap-3 p-4 pb-2">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Zap className="w-4.5 h-4.5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-card-foreground">
                    Technical Stack
                </h2>
            </div>
            <div className="px-4 pb-4">
                <div className="grid gap-0.5">
                    {technicalFeatures.map((feature, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-3 px-2 py-1 rounded-lg hover:bg-muted/30 transition-colors"
                        >
                            <div className="mt-0.5">
                                <Check className="feature-icon" />
                            </div>
                            <span className="min-w-0 break-words text-card-foreground text-sm">
                                {feature}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // ── Architecture diagram overlay ──
    const lightbox =
        lightboxOpen &&
        architectureImage &&
        createPortal(
            <>
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
                    onClick={() => setLightboxOpen(false)}
                    aria-hidden="true"
                />
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 pointer-events-none">
                    <div
                        className="relative pointer-events-auto"
                        style={{ animation: "lightboxFadeIn 0.2s ease" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors z-10 shadow-lg"
                            onClick={() => setLightboxOpen(false)}
                            aria-label="Close image viewer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <img
                            src={architectureImage}
                            alt={`${useCase.title} architecture diagram`}
                            className="max-w-[88vw] max-h-[85vh] object-contain rounded-xl shadow-2xl block"
                        />
                        <p className="text-center text-white/60 text-sm mt-3">
                            {useCase.title} &mdash; System Architecture
                        </p>
                    </div>
                </div>
            </>,
            document.body,
        );

    if (only === "architecture") {
        return (
            <>
                {archCard}
                {lightbox}
            </>
        );
    }
    if (only === "tech") return techCard;

    return (
        <div className="grid lg:grid-cols-2 gap-5 items-start">
            {archCard}
            {techCard}
            {lightbox}
        </div>
    );
};

export default ArchitectureTechStack;
