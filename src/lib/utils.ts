/**
 * Utility function to merge class names with Tailwind CSS
 * Similar to clsx but optimized for Tailwind
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

