import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, HeartPulse, DollarSign, Factory, Scale, Car } from "lucide-react";

interface Domain {
  domain: string;
  id: string;
  description: string;
  icon: string;
  use_cases: any[];
}

interface DomainCardsRowProps {
  domains: Domain[];
}

const iconMap: Record<string, React.ElementType> = {
  ShoppingCart,
  HeartPulse,
  DollarSign,
  Factory,
  Scale,
  Car,
};

const DomainCardsRow: React.FC<DomainCardsRowProps> = ({ domains }) => {
  const navigate = useNavigate();

  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold text-foreground">Solutions by Industry</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore AI agents tailored for specific business domains
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {domains.map((d) => {
            const Icon = iconMap[d.icon] || ShoppingCart;
            const count = d.use_cases.length;
            return (
              <button
                key={d.id}
                onClick={() => count > 0 ? navigate(`/domain/${d.id}`) : undefined}
                className={`group relative flex flex-col items-center rounded-xl border border-border bg-white p-5 text-center transition-all ${
                  count > 0
                    ? "cursor-pointer hover:border-primary/30 hover:shadow-md"
                    : "cursor-default opacity-60"
                }`}
              >
                {/* Count badge */}
                <span className="absolute right-2 top-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${count > 0 ? "bg-primary" : "bg-muted-foreground"}`} />
                  {count}
                </span>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{d.domain}</h3>
                <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                  {d.description.slice(0, 80)}...
                </p>
                {count > 0 && (
                  <span className="mt-2 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                    Explore →
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DomainCardsRow;
