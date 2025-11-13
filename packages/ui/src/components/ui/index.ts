/**
 * UI Components Index
 * Export all accessible, WCAG 2.1 AA compliant components
 */

// Button - Enhanced with accessibility
export { Button, button } from './Button';
export type { ButtonProps } from './Button';

// Input - Enhanced with accessibility
export { Input, input } from './Input';
export type { InputProps } from './Input';

// Dialog - New accessible component
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './Dialog';
export type {
  DialogProps,
  DialogTriggerProps,
  DialogPortalProps,
  DialogOverlayProps,
  DialogContentProps,
} from './Dialog';

// Dropdown - New accessible component
export {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
} from './Dropdown';
export type {
  DropdownProps,
  DropdownTriggerProps,
  DropdownContentProps,
  DropdownItemProps,
} from './Dropdown';

// Tabs - New accessible component
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from './Tabs';
export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
} from './Tabs';

// Accordion - New accessible component
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './Accordion';
export type {
  AccordionProps,
  AccordionItemProps,
  AccordionTriggerProps,
  AccordionContentProps,
} from './Accordion';

// Toast - New accessible component
export {
  ToastProvider,
  useToast,
} from './Toast';
export type {
  Toast,
  ToastProviderProps,
} from './Toast';

// Existing components
export { Select, select } from './select';
export type { SelectProps } from './select';

export { Checkbox, checkbox } from './checkbox';
export type { CheckboxProps } from './checkbox';

export { Switch } from './switch';
export type { SwitchProps } from './switch';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
} from './card';

export { Badge, badge } from './badge';
export type { BadgeProps } from './badge';

export { Avatar, AvatarGroup } from './avatar';
export type { AvatarProps, AvatarGroupProps } from './avatar';
