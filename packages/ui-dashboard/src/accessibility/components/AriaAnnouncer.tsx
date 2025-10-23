import { useEffect, useState } from 'react';

interface Announcement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
}

/**
 * Global ARIA announcer component
 * Meets WCAG 4.1.3 Status Messages requirement
 */
export function AriaAnnouncer() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    // Listen for custom announcement events
    const handleAnnouncement = (
      e: CustomEvent<{ message: string; priority?: 'polite' | 'assertive' }>
    ) => {
      const { message, priority = 'polite' } = e.detail;
      const announcement: Announcement = {
        id: `announcement-${Date.now()}-${Math.random()}`,
        message,
        priority,
        timestamp: Date.now(),
      };

      setAnnouncements((prev) => [...prev, announcement]);

      // Remove announcement after 5 seconds
      setTimeout(() => {
        setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
      }, 5000);
    };

    window.addEventListener('aria-announce' as any, handleAnnouncement);

    return () => {
      window.removeEventListener('aria-announce' as any, handleAnnouncement);
    };
  }, []);

  // Auto-announce important page changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // Check for error messages
              if (node.getAttribute('role') === 'alert') {
                const message = node.textContent?.trim();
                if (message) {
                  window.dispatchEvent(
                    new CustomEvent('aria-announce', {
                      detail: { message, priority: 'assertive' },
                    })
                  );
                }
              }

              // Check for success messages
              if (node.classList.contains('success-message')) {
                const message = node.textContent?.trim();
                if (message) {
                  window.dispatchEvent(
                    new CustomEvent('aria-announce', {
                      detail: { message, priority: 'polite' },
                    })
                  );
                }
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* Polite announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcements
          .filter((a) => a.priority === 'polite')
          .map((a) => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>

      {/* Assertive announcements */}
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {announcements
          .filter((a) => a.priority === 'assertive')
          .map((a) => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
    </>
  );
}

/**
 * Helper function to trigger announcements from anywhere in the app
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  window.dispatchEvent(
    new CustomEvent('aria-announce', {
      detail: { message, priority },
    })
  );
}
