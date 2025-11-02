# Accessibility Quick Reference Guide

**For Cars-G Development Team**  
**Updated**: October 31, 2025

---

## 🎯 Quick Checklist

Use this checklist when creating or modifying UI components:

### ✅ Every Interactive Element Must Have:

- [ ] **Minimum Touch Target**: `min-h-[44px] min-w-[44px]`
- [ ] **Focus Indicator**: `focus:outline-none focus:ring-2 focus:ring-[color] focus:ring-offset-2`
- [ ] **ARIA Label** (for icon-only buttons): `aria-label="Descriptive action"`
- [ ] **Keyboard Support**: `onKeyDown` handler for Enter/Space keys
- [ ] **Proper Role**: `role="button"`, `role="dialog"`, etc.

---

## 📋 Common Patterns

### Button (Icon Only)
```tsx
<button
  onClick={handleClick}
  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
  aria-label="Descriptive action (e.g., Open menu)"
>
  <Icon className="h-5 w-5" aria-hidden="true" />
</button>
```

### Button (With Text)
```tsx
<button
  onClick={handleClick}
  className="px-4 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
>
  <Icon className="h-5 w-5 mr-2" aria-hidden="true" />
  Button Text
</button>
```

### Clickable Card
```tsx
<div
  onClick={() => navigate('/somewhere')}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate('/somewhere');
    }
  }}
  role="button"
  tabIndex={0}
  aria-label="View details about [item]"
  className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
>
  {/* Card content */}
</div>
```

### Toggle Button (e.g., Password Visibility)
```tsx
<button
  type="button"
  onClick={() => setVisible(!visible)}
  className="p-1 min-h-[32px] min-w-[32px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500"
  aria-label={visible ? 'Hide password' : 'Show password'}
>
  {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
</button>
```

### Modal Dialog
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  className="fixed inset-0 z-modal"
>
  <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
  <div className="flex items-center justify-center min-h-full p-4">
    <div className="bg-white rounded-lg shadow-xl">
      <h2 id="modal-title">Modal Title</h2>
      <p id="modal-description">Modal description</p>
      <button
        onClick={onClose}
        aria-label="Close dialog"
        className="min-h-[44px] min-w-[44px]"
      >
        <X aria-hidden="true" />
      </button>
    </div>
  </div>
</div>
```

### Navigation Menu
```tsx
<nav role="navigation" aria-label="Main navigation">
  <button
    onClick={() => setOpen(!open)}
    aria-label={open ? 'Close menu' : 'Open menu'}
    aria-expanded={open}
    className="min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2"
  >
    <Menu aria-hidden="true" />
  </button>
</nav>
```

### Collapsible Section
```tsx
<button
  onClick={() => setExpanded(!expanded)}
  aria-expanded={expanded}
  aria-controls="section-content"
  className="min-h-[44px] focus:outline-none focus:ring-2"
>
  Toggle Section
</button>
<div id="section-content" hidden={!expanded}>
  {/* Content */}
</div>
```

---

## 🎨 Color Contrast

### Text Colors (WCAG AA Compliant)

**On White/Light Backgrounds**:
- ✅ Use: `text-gray-600`, `text-gray-700`, `text-gray-800`, `text-gray-900`
- ❌ Avoid: `text-gray-400`, `text-gray-500` (insufficient contrast)

**For Icons**:
- ✅ Use: `text-gray-600` or darker
- ❌ Avoid: `text-gray-400`, `text-gray-500`

**Hover States**:
- Darken on hover: `hover:text-gray-900` (from `text-gray-600`)
- Ensure contrast ratio > 4.5:1 for normal text
- Ensure contrast ratio > 3:1 for large text (18px+ or 14px+ bold)

---

## 🎭 Z-Index Scale

Use named z-index values from Tailwind config:

| Class | Value | Usage |
|-------|-------|-------|
| `z-dropdown` | 100 | Dropdowns, tooltips |
| `z-sticky` | 900 | Sticky headers |
| `z-modal` | 1000 | Modal dialogs |
| `z-overlay` | 1999 | Modal backdrops |
| `z-sidebar` | 2000 | Navigation sidebar |
| `z-menuButton` | 2001 | Mobile menu toggle |
| `z-popup` | 3000 | Popups, menus |
| `z-chat` | 3000 | Chat window |
| `z-toast` | 4000 | Notifications |
| `z-imageViewer` | 5000 | Full-screen viewers |

---

## 🔄 Animations & Motion

### Using Reduced Motion Hook

```tsx
import { useReducedMotion } from '../hooks/useReducedMotion';

const MyComponent = () => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      Content
    </motion.div>
  );
};
```

### Guidelines
- Always check `shouldReduceMotion` before adding animations
- Disable or minimize animations when `true`
- Set `duration: 0` for instant transitions

---

## 📱 Mobile & Touch

### Safe Area Insets (iOS)

```css
/* Already handled globally in index.css */
/* Use these classes when needed: */
.safe-area-top { padding-top: max(1rem, env(safe-area-inset-top)); }
.safe-area-bottom { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
.safe-area-left { padding-left: max(1rem, env(safe-area-inset-left)); }
.safe-area-right { padding-right: max(1rem, env(safe-area-inset-right)); }
```

### Touch Targets
- **Minimum Size**: 44x44px (iOS), 48x48px (Android Material)
- **Spacing**: At least 8px between interactive elements
- **Implementation**: `min-h-[44px] min-w-[44px]`

---

## 🖼️ Images

### Using ImageWithFallback Component

```tsx
import { ImageWithFallback } from './components/ImageWithFallback';

<ImageWithFallback
  src={imageUrl}
  alt="Descriptive alt text"
  fallback="/images/placeholder.png"
  className="w-full h-48 object-cover"
/>
```

**Benefits**:
- Automatic error handling
- Graceful fallback
- Proper accessibility
- Lazy loading

---

## ⌨️ Keyboard Navigation

### Required Patterns

**For Clickable Non-Button Elements**:
```tsx
<div
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  role="button"
  tabIndex={0}
>
```

**Arrow Key Navigation** (for carousels, etc.):
```tsx
onKeyDown={(e) => {
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    goToPrevious();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    goToNext();
  }
}}
```

**Escape Key for Modals**:
```tsx
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);
```

---

## 🧪 Testing Checklist

Before deploying changes:

### Keyboard Testing
- [ ] Tab through all interactive elements
- [ ] Verify focus indicators are visible
- [ ] Test Enter/Space activation
- [ ] Test Escape to close modals/menus

### Screen Reader Testing (VoiceOver/NVDA)
- [ ] All buttons have descriptive labels
- [ ] Form inputs have associated labels
- [ ] Status messages are announced
- [ ] Modal dialogs are properly announced

### Mobile Testing
- [ ] All buttons are at least 44x44px
- [ ] Content not hidden by notch/home indicator (iOS)
- [ ] No horizontal scrolling (unless intended)
- [ ] Pull-to-refresh doesn't conflict

### Visual Testing
- [ ] Sufficient color contrast (use browser DevTools)
- [ ] Focus indicators visible
- [ ] Text readable at 200% zoom

### Motion Testing
- [ ] Enable "Reduce Motion" in OS settings
- [ ] Verify animations are minimal/disabled

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T
```tsx
// Missing aria-label on icon button
<button onClick={handleClick}>
  <Icon />
</button>

// Using text-gray-400 on white background
<p className="text-gray-400">Low contrast text</p>

// No keyboard support
<div onClick={handleClick}>Clickable</div>

// Fixed width breaking on mobile
<div className="w-96">Content</div>

// Icon without aria-hidden
<Icon /> inside descriptive button
```

### ✅ DO
```tsx
// Proper aria-label
<button onClick={handleClick} aria-label="Delete item">
  <Icon aria-hidden="true" />
</button>

// Good contrast
<p className="text-gray-700">High contrast text</p>

// Full keyboard support
<div
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabIndex={0}
>
  Clickable
</div>

// Responsive width
<div className="w-full max-w-md">Content</div>

// Decorative icon properly hidden
<button>
  <Icon aria-hidden="true" />
  Delete
</button>
```

---

## 📚 Resources

### Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools Accessibility Inspector
- [axe DevTools](https://www.deque.com/axe/devtools/) browser extension
- [WAVE](https://wave.webaim.org/) Web Accessibility Evaluation Tool

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN ARIA Best Practices](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Accessibility](https://material.io/design/usability/accessibility.html)

---

## 🤝 Questions?

If you're unsure about accessibility implementation:
1. Refer to this guide
2. Check existing components for patterns
3. Use browser DevTools accessibility inspector
4. Ask the team for review

**Remember**: Accessibility is not optional—it's essential for all users! 🌟

---

**Last Updated**: October 31, 2025  
**Maintained By**: Cars-G Development Team

