import { useEffect, useState } from 'react';

interface SkipLink {
  id: string;
  label: string;
  target: string;
}

const defaultSkipLinks: SkipLink[] = [
  { id: 'skip-main', label: 'Skip to main content', target: '#main-content' },
  { id: 'skip-nav', label: 'Skip to navigation', target: '#navigation' },
  { id: 'skip-search', label: 'Skip to search', target: '#search' },
  { id: 'skip-footer', label: 'Skip to footer', target: '#footer' },
];

interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
}

/**
 * Skip links component for keyboard navigation
 * Meets WCAG 2.4.1 Bypass Blocks requirement
 */
export function SkipLinks({ links = defaultSkipLinks, className = '' }: SkipLinksProps) {
  const [visibleLinks, setVisibleLinks] = useState<SkipLink[]>([]);

  // Filter out links whose targets don't exist
  useEffect(() => {
    const available = links.filter((link) => {
      const target = document.querySelector(link.target);
      return target !== null;
    });
    setVisibleLinks(available);
  }, [links]);

  const handleSkipClick = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    e.preventDefault();
    const element = document.querySelector(target) as HTMLElement;
    if (element) {
      // Set focus
      element.focus();

      // If element is not focusable, set tabindex temporarily
      if (document.activeElement !== element) {
        element.setAttribute('tabindex', '-1');
        element.focus();
        element.addEventListener(
          'blur',
          () => {
            element.removeAttribute('tabindex');
          },
          { once: true }
        );
      }

      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (visibleLinks.length === 0) {
    return null;
  }

  return (
    <nav className={`skip-links ${className}`} aria-label="Skip links">
      {visibleLinks.map((link) => (
        <a
          key={link.id}
          href={link.target}
          className="skip-link"
          onClick={(e) => handleSkipClick(e, link.target)}
        >
          {link.label}
        </a>
      ))}

      <style>{`
        .skip-links {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
        }

        .skip-link {
          position: absolute;
          top: -100px;
          left: 0;
          padding: 0.75rem 1.5rem;
          background: #000;
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          border-radius: 0 0 0.375rem 0;
          transition: top 0.2s ease-in-out;
        }

        .skip-link:focus {
          top: 0;
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .skip-link:hover {
          background: #1f2937;
        }

        /* High contrast mode */
        .high-contrast .skip-link {
          border: 2px solid #fff;
        }

        .high-contrast .skip-link:focus {
          outline: 4px solid #fbbf24;
        }
      `}</style>
    </nav>
  );
}
