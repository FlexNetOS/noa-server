import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Minus,
  Square,
  X,
  Bot,
  BarChart3,
  FileText,
  Network,
  Info,
  MoreVertical,
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { TooltipProvider, TooltipSimple } from '@/components/ui/tooltip-modern';

interface CustomTitlebarProps {
  onSettingsClick?: () => void;
  onAgentsClick?: () => void;
  onUsageClick?: () => void;
  onClaudeClick?: () => void;
  onMCPClick?: () => void;
  onInfoClick?: () => void;
}

export const CustomTitlebar: React.FC<CustomTitlebarProps> = ({
  onSettingsClick,
  onAgentsClick,
  onUsageClick,
  onClaudeClick,
  onMCPClick,
  onInfoClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMinimize = async () => {
    try {
      const window = getCurrentWindow();
      await window.minimize();
      console.log('Window minimized successfully');
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      const window = getCurrentWindow();
      const isMaximized = await window.isMaximized();
      if (isMaximized) {
        await window.unmaximize();
        console.log('Window unmaximized successfully');
      } else {
        await window.maximize();
        console.log('Window maximized successfully');
      }
    } catch (error) {
      console.error('Failed to maximize/unmaximize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      const window = getCurrentWindow();
      await window.close();
      console.log('Window closed successfully');
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <TooltipProvider>
      <div
        className="bg-background/95 border-border/50 tauri-drag relative z-[200] flex h-11 items-center justify-between border-b backdrop-blur-sm select-none"
        data-tauri-drag-region
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Left side - macOS Traffic Light buttons */}
        <div className="flex items-center space-x-2 pl-5">
          <div className="flex items-center space-x-2">
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="group tauri-no-drag relative flex h-3 w-3 items-center justify-center rounded-full bg-red-500 transition-all duration-200 hover:bg-red-600"
              title="Close"
            >
              {isHovered && (
                <X size={8} className="text-red-900 opacity-60 group-hover:opacity-100" />
              )}
            </button>

            {/* Minimize button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMinimize();
              }}
              className="group tauri-no-drag relative flex h-3 w-3 items-center justify-center rounded-full bg-yellow-500 transition-all duration-200 hover:bg-yellow-600"
              title="Minimize"
            >
              {isHovered && (
                <Minus size={8} className="text-yellow-900 opacity-60 group-hover:opacity-100" />
              )}
            </button>

            {/* Maximize button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMaximize();
              }}
              className="group tauri-no-drag relative flex h-3 w-3 items-center justify-center rounded-full bg-green-500 transition-all duration-200 hover:bg-green-600"
              title="Maximize"
            >
              {isHovered && (
                <Square size={6} className="text-green-900 opacity-60 group-hover:opacity-100" />
              )}
            </button>
          </div>
        </div>

        {/* Center - Title (hidden) */}
        {/* <div 
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        data-tauri-drag-region
      >
        <span className="text-sm font-medium text-foreground/80">{title}</span>
      </div> */}

        {/* Right side - Navigation icons with improved spacing */}
        <div className="tauri-no-drag flex items-center gap-3 pr-5">
          {/* Primary actions group */}
          <div className="flex items-center gap-1">
            {onAgentsClick && (
              <TooltipSimple content="Agents" side="bottom">
                <motion.button
                  onClick={onAgentsClick}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="hover:bg-accent hover:text-accent-foreground tauri-no-drag rounded-md p-2 transition-colors"
                >
                  <Bot size={16} />
                </motion.button>
              </TooltipSimple>
            )}

            {onUsageClick && (
              <TooltipSimple content="Usage Dashboard" side="bottom">
                <motion.button
                  onClick={onUsageClick}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="hover:bg-accent hover:text-accent-foreground tauri-no-drag rounded-md p-2 transition-colors"
                >
                  <BarChart3 size={16} />
                </motion.button>
              </TooltipSimple>
            )}
          </div>

          {/* Visual separator */}
          <div className="bg-border/50 h-5 w-px" />

          {/* Secondary actions group */}
          <div className="flex items-center gap-1">
            {onSettingsClick && (
              <TooltipSimple content="Settings" side="bottom">
                <motion.button
                  onClick={onSettingsClick}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="hover:bg-accent hover:text-accent-foreground tauri-no-drag rounded-md p-2 transition-colors"
                >
                  <Settings size={16} />
                </motion.button>
              </TooltipSimple>
            )}

            {/* Dropdown menu for additional options */}
            <div className="relative" ref={dropdownRef}>
              <TooltipSimple content="More options" side="bottom">
                <motion.button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="hover:bg-accent hover:text-accent-foreground flex items-center gap-1 rounded-md p-2 transition-colors"
                >
                  <MoreVertical size={16} />
                </motion.button>
              </TooltipSimple>

              {isDropdownOpen && (
                <div className="bg-popover border-border absolute right-0 z-[250] mt-2 w-48 rounded-lg border shadow-lg">
                  <div className="py-1">
                    {onClaudeClick && (
                      <button
                        onClick={() => {
                          onClaudeClick();
                          setIsDropdownOpen(false);
                        }}
                        className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                      >
                        <FileText size={14} />
                        <span>CLAUDE.md</span>
                      </button>
                    )}

                    {onMCPClick && (
                      <button
                        onClick={() => {
                          onMCPClick();
                          setIsDropdownOpen(false);
                        }}
                        className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                      >
                        <Network size={14} />
                        <span>MCP Servers</span>
                      </button>
                    )}

                    {onInfoClick && (
                      <button
                        onClick={() => {
                          onInfoClick();
                          setIsDropdownOpen(false);
                        }}
                        className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                      >
                        <Info size={14} />
                        <span>About</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
