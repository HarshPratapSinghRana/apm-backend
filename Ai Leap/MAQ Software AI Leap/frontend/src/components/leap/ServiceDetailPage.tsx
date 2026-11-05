import { FC } from "react";
import {
  ExternalLink,
  Check,
  ArrowRight,
  BookOpen,
  Lightbulb,
  Package,
} from "lucide-react";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import { servicesDetail, ServiceDetail } from "@/data/services-detail";

/* ─── Helper: resolve a Lucide icon by name ─── */
const resolveIcon = (name: string): LucideIcon | null =>
  (Icons as Record<string, unknown>)[name] as LucideIcon | null;

/* ─── Main Service Detail Page ─── */
export const ServiceDetailPage: FC<{ serviceId: string }> = ({ serviceId }) => {
  const service = servicesDetail[serviceId];
  if (!service) return null;

  return (
    <div className="space-y-16 animate-leap-fade-in-up pb-12">
      <HeroSection service={service} />
      <CapabilitiesSection service={service} />
      <OutcomesSection service={service} />
      {service.relatedProducts.length > 0 && (
        <RelatedProductsSection service={service} />
      )}
      <CaseStudiesSection service={service} />
      <InsightsSection service={service} />
      <CtaSection service={service} />
    </div>
  );
};

/* ─── Hero Section ─── */
const HeroSection: FC<{ service: ServiceDetail }> = ({ service }) => (
  <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
    {/* Decorative gradient blob */}
    <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-primary to-primary/70 opacity-10 blur-3xl pointer-events-none" />
    <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-gradient-to-tr from-primary to-primary/70 opacity-[0.07] blur-3xl pointer-events-none" />

    <div className="relative z-10 px-8 py-12 md:px-12 md:py-16">
      <div className="max-w-3xl">
        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-gradient-to-r from-primary to-primary/70 text-white mb-5">
          {service.tagline}
        </span>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight mb-4">
          {service.name}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8 max-w-2xl">
          {service.heroDescription}
        </p>

        {/* CTA */}
        <a
          href={service.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-gradient-to-r from-primary to-primary/70 text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl group"
        >
          {service.ctaLabel}
          <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </div>
  </div>
);

/* ─── Capabilities Section ─── */
const CapabilitiesSection: FC<{ service: ServiceDetail }> = ({ service }) => (
  <section>
    <SectionHeading title="Our Capabilities" subtitle="What we offer under" highlight={service.name} />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
      {service.capabilities.map((cap, i) => (
        <div
          key={cap.title}
          className="group flex items-start gap-4 rounded-xl border border-border bg-card p-6 hover:shadow-md transition-all duration-300"
          style={{
            animationDelay: `${i * 80}ms`,
            animation: "fadeInUp 0.5s ease-out both",
          }}
        >
          {/* Checkmark */}
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Check className="w-5 h-5 text-primary" />
          </div>

          <div>
            <h4 className="text-base font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
              {cap.title}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cap.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

/* ─── Business Outcomes Section ─── */
const OutcomesSection: FC<{ service: ServiceDetail }> = ({ service }) => (
  <section>
    <SectionHeading title="Your Business Outcomes" subtitle="Results you can expect" />

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      {service.outcomes.map((outcome, i) => {
        const Icon = resolveIcon(outcome.icon);
        return (
          <div
            key={outcome.title}
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
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 mb-4 group-hover:scale-110 transition-transform duration-300">
                {Icon && <Icon className="w-6 h-6 text-white" />}
              </div>

              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {outcome.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {outcome.description}
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

/* ─── Related Products Section ─── */
const RelatedProductsSection: FC<{ service: ServiceDetail }> = ({ service }) => (
  <section>
    <SectionHeading title="Related Products" subtitle="Solutions designed to complement this service" />

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
      {service.relatedProducts.map((product, i) => (
        <a
          key={product.name}
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 hover:shadow-md hover:border-primary/30 transition-all duration-300"
          style={{
            animationDelay: `${i * 60}ms`,
            animation: "fadeInUp 0.5s ease-out both",
          }}
        >
          <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      ))}
    </div>
  </section>
);

/* ─── Case Studies Section ─── */
const CaseStudiesSection: FC<{ service: ServiceDetail }> = ({ service }) => {
  if (service.caseStudies.length === 0) return null;

  return (
    <section>
      <SectionHeading title="Related Case Studies" subtitle="Real-world results from our clients" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {service.caseStudies.map((cs, i) => (
          <a
            key={cs.title}
            href={cs.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all duration-300"
            style={{
              animationDelay: `${i * 60}ms`,
              animation: "fadeInUp 0.5s ease-out both",
            }}
          >
            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors mt-0.5">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                {cs.title}
              </p>
              <span className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                Read more <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

/* ─── Insights Section ─── */
const InsightsSection: FC<{ service: ServiceDetail }> = ({ service }) => {
  if (service.insights.length === 0) return null;

  return (
    <section>
      <SectionHeading title="Insights & Research" subtitle="Thought leadership from our team" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {service.insights.map((insight, i) => (
          <a
            key={insight.title}
            href={insight.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all duration-300"
            style={{
              animationDelay: `${i * 60}ms`,
              animation: "fadeInUp 0.5s ease-out both",
            }}
          >
            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors mt-0.5">
              <Lightbulb className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                {insight.title}
              </p>
              <span className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                Read more <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

/* ─── CTA Banner ─── */
const CtaSection: FC<{ service: ServiceDetail }> = ({ service }) => (
  <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/70 opacity-[0.06]" />

    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-8 py-10 md:px-12">
      <div>
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          Ready to explore {service.name}?
        </h3>
        <p className="text-muted-foreground text-sm max-w-lg">
          Visit the official service page to learn more, view case studies, or get in touch with our team.
        </p>
      </div>

      <a
        href={service.ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-gradient-to-r from-primary to-primary/70 text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex-shrink-0 group"
      >
        {service.ctaLabel}
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

export default ServiceDetailPage;
