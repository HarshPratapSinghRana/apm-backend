import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bot, Menu, X } from "lucide-react";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHome = location.pathname === "/";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-card/95 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-card/95 backdrop-blur-md border-b border-border shadow-sm"
      }`}
    >
      <div className="mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
          >
            {/* <div className="p-2 bg-gradient-primary rounded-lg">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold">AI Agents</h1>
              <p className="text-xs text-muted-foreground leading-none">
                Showcase Platform
              </p>
            </div> */}
            <img src="/MAQ-Software-Logo.svg" alt="AI Agents Showcase" className="h-5 w-auto"/>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/#domains"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isHome ? "text-primary" : "text-foreground"
              }`}
              onClick={e => {
                if (isHome) {
                  e.preventDefault();
                  const section = document.getElementById("domains");
                  if (section) {
                    section.scrollIntoView({ behavior: "smooth" });
                  }
                }
              }}
            >
              Select Domain
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border bg-card/95 backdrop-blur-md">
            <nav className="flex flex-col gap-4">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isHome ? "text-primary" : "text-foreground"
                }`}
              >
                Domains
              </Link>
              <button className="btn-secondary text-sm w-fit">
                Contact Sales
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;