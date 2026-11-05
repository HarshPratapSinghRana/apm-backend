import { FC } from "react";
import {
  ExternalLink,
  Check,
  ArrowRight,
} from "lucide-react";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import { productsDetail, ProductDetail } from "@/data/products-detail";

/* ─── Helper: resolve a Lucide icon by name ─── */
const resolveIcon = (name: string): LucideIcon | null =>
  (Icons as Record<string, unknown>)[name] as LucideIcon | null;

/* ─── Main Product Detail Page ─── */
export const ProductDetailPage: FC<{ productId: string }> = ({ productId }) => {
  const product = productsDetail[productId];
  if (!product) return null;

  return (
    <div className="space-y-16 animate-leap-fade-in-up pb-12">
      <HeroSection product={product} />
      <BenefitsSection product={product} />
      <FeaturesSection product={product} />
      <StepsSection product={product} />
      {product.pricing && product.pricing.length > 0 && (
        <PricingSection product={product} />
      )}
      <CtaSection product={product} />
    </div>
  );
};

/* ─── Hero Section ─── */
const HeroSection: FC<{ product: ProductDetail }> = ({ product }) => (
  <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
    {/* Decorative gradient blob */}
    <div
      className={`absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br ${product.gradient} opacity-10 blur-3xl pointer-events-none`}
    />
    <div
      className={`absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-gradient-to-tr ${product.gradient} opacity-[0.07] blur-3xl pointer-events-none`}
    />

    <div className="relative z-10 px-8 py-12 md:px-12 md:py-16">
      <div className="max-w-3xl">
        {/* Badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-gradient-to-r ${product.gradient} text-white mb-5`}
        >
          {product.tagline}
        </span>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight mb-4">
          {product.name}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8 max-w-2xl">
          {product.heroDescription}
        </p>

        {/* CTA */}
        <a
          href={product.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-gradient-to-r ${product.gradient} text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl group`}
        >
          {product.ctaLabel}
          <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </div>
  </div>
);

/* ─── Benefits Section ─── */
const BenefitsSection: FC<{ product: ProductDetail }> = ({ product }) => (
  <section>
    <SectionHeading title="Key Benefits" subtitle="Why teams choose" highlight={product.name} />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {product.benefits.map((benefit, i) => {
        const Icon = resolveIcon(benefit.icon);
        return (
          <div
            key={benefit.title}
            className="group relative rounded-xl border border-border bg-card p-6 hover:shadow-lg transition-all duration-300"
            style={{
              animationDelay: `${i * 80}ms`,
              animation: "fadeInUp 0.5s ease-out both",
            }}
          >
            {/* Hover gradient */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
              {/* Icon */}
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${product.gradient} bg-opacity-10 mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                {Icon && <Icon className="w-6 h-6 text-white" />}
              </div>

              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {benefit.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>

            {/* Bottom border animation */}
            <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/50 group-hover:w-full transition-all duration-500 rounded-b-xl" />
          </div>
        );
      })}
    </div>
  </section>
);

/* ─── Features Section ─── */
const FeaturesSection: FC<{ product: ProductDetail }> = ({ product }) => (
  <section>
    <SectionHeading title="Features" subtitle="What's inside" highlight={product.name} />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
      {product.features.map((feat, i) => (
        <div
          key={feat.title}
          className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 hover:shadow-md transition-all duration-300"
          style={{
            animationDelay: `${i * 60}ms`,
            animation: "fadeInUp 0.5s ease-out both",
          }}
        >
          {/* Checkmark */}
          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Check className="w-4 h-4 text-primary" />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
              {feat.title}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {feat.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

/* ─── Steps / How It Works Section ─── */
const StepsSection: FC<{ product: ProductDetail }> = ({ product }) => (
  <section>
    <SectionHeading title="How It Works" subtitle="Get started in just a few steps" />

    <div className="relative mt-8">
      {/* Connector line */}
      <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5 bg-border" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {product.steps.map((step, i) => (
          <div
            key={step.step}
            className="relative group"
            style={{
              animationDelay: `${i * 100}ms`,
              animation: "fadeInUp 0.5s ease-out both",
            }}
          >
            <div className="rounded-xl border border-border bg-card p-6 hover:shadow-lg transition-all duration-300 h-full">
              {/* Step number */}
              <div
                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${product.gradient} text-white text-sm font-bold mb-4 shadow-md group-hover:scale-110 transition-transform`}
              >
                {step.step}
              </div>

              <h4 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {step.title}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── Pricing Section ─── */
const PricingSection: FC<{ product: ProductDetail }> = ({ product }) => {
  if (!product.pricing) return null;

  return (
    <section>
      <SectionHeading title="Pricing" subtitle="Flexible plans that scale with your needs" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {product.pricing.map((tier, i) => (
          <div
            key={tier.name}
            className="group relative rounded-xl border border-border bg-card p-6 hover:shadow-lg transition-all duration-300 flex flex-col"
            style={{
              animationDelay: `${i * 100}ms`,
              animation: "fadeInUp 0.5s ease-out both",
            }}
          >
            {/* Hover gradient */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex flex-col flex-1">
              <h4 className="text-lg font-bold text-foreground mb-1">{tier.name}</h4>
              <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>

              <div className="mb-6">
                <span
                  className={`text-2xl font-extrabold bg-gradient-to-r ${product.gradient} bg-clip-text text-transparent`}
                >
                  {tier.price}
                </span>
              </div>

              <ul className="space-y-3 flex-1">
                {tier.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ─── CTA Banner ─── */
const CtaSection: FC<{ product: ProductDetail }> = ({ product }) => (
  <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
    <div
      className={`absolute inset-0 bg-gradient-to-r ${product.gradient} opacity-[0.06]`}
    />

    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-10 md:px-12">
      <div>
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          Ready to get started with {product.name}?
        </h3>
        <p className="text-muted-foreground text-sm max-w-lg">
          Visit the official product page to learn more, request a demo, or start your free trial today.
        </p>
      </div>

      <a
        href={product.ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-gradient-to-r ${product.gradient} text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex-shrink-0 group`}
      >
        {product.ctaLabel}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </a>
    </div>
  </section>
);

/* ─── Reusable Section Heading ─── */
const SectionHeading: FC<{
  title: string;
  subtitle: string;
  highlight?: string;
}> = ({ title, subtitle, highlight }) => (
  <div>
    <h3 className="text-2xl font-bold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground mt-1">
      {subtitle}
      {highlight && <span className="font-semibold text-primary ml-1">{highlight}</span>}
    </p>
  </div>
);

export default ProductDetailPage;
