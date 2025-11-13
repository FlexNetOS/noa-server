import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Shield, X, Check, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { analytics } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface AnalyticsConsentProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onComplete?: () => void;
}

export const AnalyticsConsent: React.FC<AnalyticsConsentProps> = ({
  open: controlledOpen,
  onOpenChange,
  onComplete,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [hasShownConsent, setHasShownConsent] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  useEffect(() => {
    // Check if we should show the consent dialog
    const checkConsent = async () => {
      await analytics.initialize();
      const settings = analytics.getSettings();

      if (!settings?.hasConsented && !hasShownConsent) {
        if (!isControlled) {
          setInternalOpen(true);
        }
        setHasShownConsent(true);
      }
    };

    checkConsent();
  }, [isControlled, hasShownConsent]);

  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled && onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const handleAccept = async () => {
    await analytics.enable();
    handleOpenChange(false);
    onComplete?.();
  };

  const handleDecline = async () => {
    await analytics.disable();
    handleOpenChange(false);
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/20">
                <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <DialogTitle className="text-2xl">Help Improve opcode</DialogTitle>
            </div>
            <DialogDescription className="mt-2 text-base">
              We'd like to collect anonymous usage data to improve your experience.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-6">
          <div className="space-y-3">
            <Card className="border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
              <div className="flex gap-3">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                <div className="space-y-1">
                  <p className="font-medium text-green-900 dark:text-green-100">What we collect:</p>
                  <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                    <li>• Feature usage (which tools and commands you use)</li>
                    <li>• Performance metrics (app speed and reliability)</li>
                    <li>• Error reports (to fix bugs and improve stability)</li>
                    <li>• General usage patterns (session frequency and duration)</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
              <div className="flex gap-3">
                <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="space-y-1">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Your privacy is protected:
                  </p>
                  <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <li>• No personal information is collected</li>
                    <li>• No file contents, paths, or project names</li>
                    <li>• No API keys or sensitive data</li>
                    <li>• Completely anonymous with random IDs</li>
                    <li>• You can opt-out anytime in Settings</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This data helps us understand which features are most valuable, identify performance
                issues, and prioritize improvements. Your choice won't affect any functionality.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <Button onClick={handleDecline} variant="outline" className="flex-1">
            No Thanks
          </Button>
          <Button
            onClick={handleAccept}
            className="flex-1 bg-purple-600 text-white hover:bg-purple-700"
          >
            Allow Analytics
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AnalyticsConsentBannerProps {
  className?: string;
}

export const AnalyticsConsentBanner: React.FC<AnalyticsConsentBannerProps> = ({ className }) => {
  const [visible, setVisible] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkConsent = async () => {
      if (hasChecked) return;

      await analytics.initialize();
      const settings = analytics.getSettings();

      if (!settings?.hasConsented) {
        setVisible(true);
      }
      setHasChecked(true);
    };

    // Delay banner appearance for better UX
    const timer = setTimeout(checkConsent, 2000);
    return () => clearTimeout(timer);
  }, [hasChecked]);

  const handleAccept = async () => {
    await analytics.enable();
    setVisible(false);
  };

  const handleDecline = async () => {
    await analytics.disable();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn('fixed right-4 bottom-4 z-50 max-w-md', className)}
        >
          <Card className="border-purple-200 p-4 shadow-lg dark:border-purple-800">
            <div className="flex items-start gap-3">
              <BarChart3 className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">Help improve opcode</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  We collect anonymous usage data to improve your experience. No personal data is
                  collected.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={handleDecline} className="text-xs">
                    No Thanks
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAccept}
                    className="bg-purple-600 text-xs text-white hover:bg-purple-700"
                  >
                    Allow
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setVisible(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
