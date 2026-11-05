import { FC, useMemo, useState } from "react";
import {
  BookOpen,
  Bot,
  ExternalLink,
  Rocket,
  Search,
  Sparkles,
} from "lucide-react";
import { productCategories } from "@/data/product-categories";
import type { CardItem } from "@/data/branches";

export type ProductsCategory = "All" | "FAST Suite" | "Generative AI" | "Agentic AI";

const categoryIcons: Record<ProductsCategory, FC<{ className?: string }>> = {
  All: BookOpen,
  "FAST Suite": Rocket,
  "Generative AI": Sparkles,
  "Agentic AI": Bot,
};

const fastSuiteIds = new Set(["embedfast", "datalens", "certyfast", "loadfast", "migratefast"]);
const agenticProductIds = new Set(["retail-pulse", "rai-agent"]);

// Generative AI, AI & ML, and Other are all shown under a single "Generative AI" filter
const categoryIdToUiLabel: Record<string, ProductsCategory> = {
  "generative-ai-gpt": "Generative AI",
  "ai-ml": "Generative AI",
};

const productIdToCategory = (() => {
  const map = new Map<string, { categoryId: string; label: ProductsCategory }>();
  for (const cat of productCategories) {
    const uiLabel = categoryIdToUiLabel[cat.id] ?? "Generative AI";
    for (const p of cat.products) {
      map.set(p.id, { categoryId: cat.id, label: uiLabel });
    }
  }
  return map;
})();

const getCardKey = (card: CardItem) => card.productDetailId ?? card.id;

const getCategoryForCard = (card: CardItem): ProductsCategory => {
  if (card.industryUseCaseId) return "Agentic AI";
  const key = getCardKey(card);
  if (agenticProductIds.has(key)) return "Agentic AI";
  if (fastSuiteIds.has(key)) return "FAST Suite";
  return productIdToCategory.get(key)?.label ?? "Generative AI";
};

const getSearchBlobForCard = (card: CardItem) => {
  const key = getCardKey(card);
  const fromCategory = productIdToCategory.get(key);
  const categoryItem =
    fromCategory &&
    productCategories
      .find((c) => c.id === fromCategory.categoryId)
      ?.products.find((p) => p.id === key);

  const bits = [
    card.label,
    card.description,
    categoryItem?.title,
    categoryItem?.description,
    categoryItem?.impact,
    ...(categoryItem?.key_features ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return bits;
};

export const ProductsContent: FC<{
  cards: CardItem[];
  onSelectUrlCard: (card: CardItem) => void;
  onSelectProductDetailCard: (card: CardItem) => void;
  onSelectComingSoonCard: (card: CardItem) => void;
  onSelectIndustryUseCase?: (card: CardItem) => void;
  activeCategory?: ProductsCategory;
  onActiveCategoryChange?: (cat: ProductsCategory) => void;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
}> = ({
  cards,
  onSelectUrlCard,
  onSelectProductDetailCard,
  onSelectComingSoonCard,
  onSelectIndustryUseCase,
  activeCategory: controlledActiveCategory,
  onActiveCategoryChange,
  searchQuery: controlledSearchQuery,
  onSearchQueryChange,
}) => {
  const [activeCategoryState, setActiveCategoryState] = useState<ProductsCategory>("All");
  const [searchQueryState, setSearchQueryState] = useState("");

  const activeCategory = controlledActiveCategory ?? activeCategoryState;
  const setActiveCategory = (cat: ProductsCategory) => {
    onActiveCategoryChange?.(cat);
    if (!onActiveCategoryChange) setActiveCategoryState(cat);
  };

  const searchQuery = controlledSearchQuery ?? searchQueryState;
  const setSearchQuery = (q: string) => {
    onSearchQueryChange?.(q);
    if (!onSearchQueryChange) setSearchQueryState(q);
  };

  const enriched = useMemo(() => {
    return cards.map((card) => ({
      card,
      category: getCategoryForCard(card),
      searchBlob: getSearchBlobForCard(card),
    }));
  }, [cards]);

  const categories: ProductsCategory[] = useMemo(() => {
    const present = new Set<ProductsCategory>(["All"]);
    for (const e of enriched) present.add(e.category);
    const ordered: ProductsCategory[] = ["All", "FAST Suite", "Generative AI", "Agentic AI"];
    return ordered.filter((c) => present.has(c));
  }, [enriched]);

  const counts = useMemo(() => {
    const map: Record<ProductsCategory, number> = {
      All: enriched.length,
      "FAST Suite": 0,
      "Generative AI": 0,
      "Agentic AI": 0,
    };
    for (const e of enriched) map[e.category] += 1;
    return map;
  }, [enriched]);

  const filtered = useMemo(() => {
    let results = enriched;
    if (activeCategory !== "All") {
      results = results.filter((e) => e.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter((e) => e.searchBlob.includes(q));
    }
    return results;
  }, [enriched, activeCategory, searchQuery]);

  return (
    <div className="space-y-6 animate-leap-fade-in-up">
      {/* ─── Search Bar (Case Studies style) ─── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search products…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        />
      </div>

      {/* ─── Category Filters (Case Studies style) ─── */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const Icon = categoryIcons[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat}
              <span
                className={`ml-1 text-[10px] rounded-full px-1.5 py-0.5 ${
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[cat]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Results Count ─── */}
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
        {filtered.length === 1 ? "product" : "products"}
        {activeCategory !== "All" && (
          <span>
            {" "}in <span className="font-semibold text-primary">{activeCategory}</span>
          </span>
        )}
      </p>

      {/* ─── Cards Grid (Case Studies sizing) ─── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No products found for your search.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setActiveCategory("All");
            }}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="cards-grid-symmetric">
          {filtered.map(({ card, category }, index) => (
            <ProductCard
              key={card.id}
              card={card}
              category={category}
              index={index}
              onClick={() => {
                if (card.industryUseCaseId && card.industryDomainId) {
                  onSelectIndustryUseCase?.(card);
                  return;
                }
                if (card.productDetailId) onSelectProductDetailCard(card);
                else if (card.url) onSelectUrlCard(card);
                else onSelectComingSoonCard(card);
              }}
              showExternal={!!card.url}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProductCard: FC<{
  card: CardItem;
  category: ProductsCategory;
  index: number;
  onClick: () => void;
  showExternal: boolean;
}> = ({ card, category, index, onClick, showExternal }) => {
  const Icon = categoryIcons[category];

  return (
    <button
      type="button"
      onClick={onClick}
      className="block group text-left w-full h-full"
      style={{
        animationDelay: `${index * 40}ms`,
        animation: "fadeInUp 0.5s ease-out both",
      }}
    >
      <div className="relative domain-card p-5 h-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

        <div className="flex flex-col h-full relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <Icon className="w-3 h-3" />
                {category}
              </span>
              {card.architecture && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  card.architecture === "Pro Code"
                    ? "bg-violet-100 text-violet-700"
                    : card.architecture === "Low Code"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                }`}>
                  {card.architecture}
                </span>
              )}
            </div>
            {showExternal && (
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>

          <h3 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors leading-snug">
            {card.label}
          </h3>

          <p
            className="text-xs text-muted-foreground leading-relaxed mt-2 flex-1"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {card.description}
          </p>

          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/50">
            <span className="text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0">
              {showExternal ? "Open" : "View details"}
            </span>
            <ExternalLink className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500" />
      </div>
    </button>
  );
};

