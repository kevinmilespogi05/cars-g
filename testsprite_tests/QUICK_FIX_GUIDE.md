# Quick Fix Guide - Critical UI Issues

## Priority 1: Accessibility (1-2 days)

### Fix 1: Add ARIA Labels to Icon Buttons

**File**: `src/App.tsx` (Line 203)
```tsx
// BEFORE
<button
  onClick={() => {
    const event = new CustomEvent('toggleSidebar');
    window.dispatchEvent(event);
  }}
  className="fixed top-4 left-4 z-[2001] lg:hidden p-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200 hover:bg-white transition-colors"
>
  <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
</button>

// AFTER
<button
  onClick={() => {
    const event = new CustomEvent('toggleSidebar');
    window.dispatchEvent(event);
  }}
  className="fixed top-4 left-4 z-[2001] lg:hidden p-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200 hover:bg-white transition-colors"
  aria-label="Open navigation menu"
  aria-expanded="false"
>
  <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
</button>
```

### Fix 2: Keyboard Navigation for Report Cards

**File**: `src/components/ReportsList.tsx` (Around line 320)
```tsx
// BEFORE
<div 
  key={report.id} 
  className="snap-start w-[85vw] max-w-[380px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer" 
  onClick={() => navigate(`/reports/${report.id}`)}
>

// AFTER
<div 
  key={report.id} 
  className="snap-start w-[85vw] max-w-[380px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer" 
  role="button"
  tabIndex={0}
  onClick={() => navigate(`/reports/${report.id}`)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/reports/${report.id}`);
    }
  }}
  aria-label={`View report: ${report.title}`}
>
```

### Fix 3: Respect Reduced Motion Preferences

**Create**: `src/hooks/useReducedMotion.ts`
```typescript
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}
```

**Usage in components with Framer Motion**:
```tsx
import { useReducedMotion } from '../hooks/useReducedMotion';

export function MyComponent() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      {/* content */}
    </motion.div>
  );
}
```

## Priority 2: Color Contrast (1 day)

### Automated Fix Script
```bash
# Run this in your project root
npm run fix:contrast
```

**Add to `package.json`**:
```json
{
  "scripts": {
    "fix:contrast": "node scripts/fix-contrast.js"
  }
}
```

**Create**: `scripts/fix-contrast.js`
```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const replacements = [
  { from: /text-gray-400/g, to: 'text-gray-600' },
  { from: /text-gray-500(?!\/)/g, to: 'text-gray-700' },
  // Add more as needed
];

glob('src/**/*.tsx', (err, files) => {
  if (err) throw err;
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    replacements.forEach(({ from, to }) => {
      if (content.match(from)) {
        content = content.replace(from, to);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`✓ Fixed ${file}`);
    }
  });
});
```

## Priority 3: Mobile Responsiveness (2 days)

### Fix 1: Safe Area Insets

**File**: `src/App.tsx` (Line 218)
```tsx
// BEFORE
<main className={isLandingPage ? 'pt-0' : 'pl-0 lg:pl-72 relative min-h-screen'}>

// AFTER
<main className={isLandingPage ? 'pt-0' : 'pl-0 lg:pl-72 relative min-h-screen safe-area-top safe-area-bottom'}>
```

### Fix 2: Prevent Pull-to-Refresh Conflicts

**File**: `src/index.css` (Add to top)
```css
/* Prevent browser pull-to-refresh conflicts with custom implementation */
body {
  overscroll-behavior-y: contain;
}

/* Fix mobile 100vh issues */
.min-h-screen {
  min-height: 100vh;
  min-height: -webkit-fill-available;
}
```

### Fix 3: Touch Target Sizes

**Global Fix in**: `src/index.css`
```css
/* Ensure minimum touch target sizes */
@media (max-width: 768px) {
  button, 
  a[role="button"],
  input[type="button"],
  input[type="submit"] {
    min-height: 44px;
    min-width: 44px;
  }
  
  /* For icon-only buttons */
  button:not(:has(span)):not(:has(div)) {
    padding: 12px;
  }
}
```

## Priority 4: Form Improvements (1-2 days)

### Fix 1: Password Show/Hide Toggle

**Create**: `src/components/PasswordInput.tsx`
```tsx
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function PasswordInput({ error, className = '', ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={showPassword ? 'text' : 'password'}
        className={`pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

### Fix 2: Standardized Error Display

**Create**: `src/components/FormError.tsx`
```tsx
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FormErrorProps {
  error: string | null;
}

export function FormError({ error }: FormErrorProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

## Priority 5: Image Handling (1 day)

### Create Unified Image Component

**Create**: `src/components/ImageWithFallback.tsx`
```tsx
import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  showIcon?: boolean;
}

export function ImageWithFallback({ 
  src, 
  alt, 
  fallback, 
  showIcon = true,
  className = '',
  ...props 
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const defaultFallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        {showIcon && <ImageOff className="h-8 w-8 text-gray-400" />}
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className={`absolute inset-0 bg-gray-100 animate-pulse ${className}`} />
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => {
          console.error(`Failed to load image: ${src}`);
          setError(true);
          setLoading(false);
        }}
        onLoad={() => setLoading(false)}
        {...props}
      />
    </>
  );
}
```

## Testing Your Fixes

### 1. Accessibility Testing
```bash
# Install axe-core
npm install --save-dev @axe-core/react

# Add to App.tsx (dev only)
if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

### 2. Keyboard Navigation Testing Checklist
- [ ] Tab through all interactive elements
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals
- [ ] Arrow keys navigate carousels
- [ ] Focus is always visible

### 3. Mobile Testing
```bash
# Use Chrome DevTools
# 1. Open DevTools (F12)
# 2. Toggle device toolbar (Ctrl+Shift+M)
# 3. Test on:
#    - iPhone SE (375x667)
#    - iPhone 12 Pro (390x844)
#    - iPad (768x1024)
#    - Android (360x640)
```

### 4. Color Contrast Testing
- Use Chrome DevTools Lighthouse
- Or https://webaim.org/resources/contrastchecker/

## Quick Win Scripts

### Check All Files for Missing ARIA Labels
```bash
# Create scripts/check-aria.js
const fs = require('fs');
const glob = require('glob');

glob('src/**/*.tsx', (err, files) => {
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Find buttons without aria-label
    const buttonMatches = content.match(/<button[^>]*>/g) || [];
    buttonMatches.forEach(match => {
      if (!match.includes('aria-label') && !match.includes('aria-labelledby')) {
        console.log(`⚠️  ${file}: Button missing ARIA label`);
      }
    });
  });
});
```

## Next Steps

1. **Day 1**: Apply Priority 1 fixes (Accessibility)
2. **Day 2**: Run contrast fix script + manual review
3. **Day 3-4**: Mobile responsiveness fixes
4. **Day 5**: Form improvements
5. **Day 6**: Image handling + testing

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [React Accessibility](https://reactjs.org/docs/accessibility.html)
- [Tailwind Accessibility](https://tailwindcss.com/docs/screen-readers)

