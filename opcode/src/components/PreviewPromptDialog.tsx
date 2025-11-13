import React from 'react';
import { motion } from 'framer-motion';
import { Globe, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PreviewPromptDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * The detected URL to preview
   */
  url: string;
  /**
   * Callback when user confirms opening preview
   */
  onConfirm: () => void;
  /**
   * Callback when user cancels
   */
  onCancel: () => void;
}

/**
 * Dialog component that prompts the user to open a detected URL in the preview pane
 *
 * @example
 * <PreviewPromptDialog
 *   isOpen={showPrompt}
 *   url="http://localhost:3000"
 *   onConfirm={() => openPreview(url)}
 *   onCancel={() => setShowPrompt(false)}
 * />
 */
export const PreviewPromptDialog: React.FC<PreviewPromptDialogProps> = ({
  isOpen,
  url,
  onConfirm,
  onCancel,
}) => {
  // Extract domain for display
  const getDomain = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname;
    } catch {
      return urlString;
    }
  };

  const domain = getDomain(url);
  const isLocalhost = domain.includes('localhost') || domain.includes('127.0.0.1');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="text-primary h-5 w-5" />
            Open Preview?
          </DialogTitle>
          <DialogDescription>
            A URL was detected in the terminal output. Would you like to open it in the preview
            pane?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <ExternalLink
                className={`mt-0.5 h-4 w-4 ${isLocalhost ? 'text-green-500' : 'text-blue-500'}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {isLocalhost ? 'Local Development Server' : 'External URL'}
                </p>
                <p className="text-muted-foreground mt-1 text-xs break-all">{url}</p>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mt-3 text-xs"
          >
            The preview will open in a split view on the right side of the screen.
          </motion.div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Open Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
