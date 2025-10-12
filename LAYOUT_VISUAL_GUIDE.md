# Visual Layout Guide - Two Column Leaderboard

## 🖥️ Desktop View (≥ 1024px)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           Community Leaderboard Header                         │
│                      Recognizing our top contributors                          │
│                                                                                │
│  [Total Contributors: XX]  |  [Patrol Officers: XX]                          │
└────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────┐
│  🔍 [Search contributors...]                              [All Time ▼]        │
└────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────┐
│                              Top Contributors                                   │
│                                                                                │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐                          │
│  │ [#2]       │    │ [#1] 👑    │    │ [#3]       │                          │
│  │  Avatar    │    │  Avatar    │    │  Avatar    │                          │
│  │ Username   │    │ Username   │    │ Username   │                          │
│  │ XX points  │    │ XX points  │    │ XX points  │                          │
│  └────────────┘    └────────────┘    └────────────┘                          │
└────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│    COMMUNITY RANKINGS              │  │    TOP PATROL OFFICERS              │
│    ──────────────────────────────────│  │    ──────────────────────────────────│
│                                      │  │                                      │
│  Rank  Contributor   Points  Reports│  │  Rank  Officer       Points  Reports│
│  ────  ────────────  ──────  ───────│  │  ────  ────────────  ──────  ───────│
│  🏆 #1 Alice         1,234   45     │  │  🏆 #1 Officer A     987     32     │
│  🥈 #2 Bob           1,100   42     │  │  🥈 #2 Officer B     856     28     │
│  🥉 #3 Charlie       980     38     │  │  🥉 #3 Officer C     745     25     │
│  #4    David         875     35     │  │  #4    Officer D     678     22     │
│  #5    Emma          820     32     │  │  #5    Officer E     634     20     │
│  #6    Frank         765     29     │  │  #6    Officer F     598     18     │
│  #7    Grace         710     27     │  │  #7    Officer G     567     17     │
│  #8    Henry         680     25     │  │  #8    Officer H     534     16     │
│  #9    Ivy           645     23     │  │  #9    Officer I     512     15     │
│  #10   Jack          610     21     │  │  #10   Officer J     489     14     │
│                                      │  │                                      │
│  [← Previous]          [Next →]     │  │                                      │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
         ↑ 50% width ↑                           ↑ 50% width ↑
                              32px gap
```

## 📱 Mobile View (< 1024px)

```
┌───────────────────────────────────────┐
│    Community Leaderboard Header       │
│  Recognizing our top contributors     │
│                                       │
│  [Contributors: XX] [Officers: XX]   │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│  🔍 [Search contributors...]          │
│  [All Time ▼]                         │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│         Top Contributors              │
│                                       │
│  ┌────────────┐                       │
│  │ [#1] 👑    │                       │
│  │  Avatar    │                       │
│  │ Username   │                       │
│  │ XX points  │                       │
│  └────────────┘                       │
│  ┌────────────┐                       │
│  │ [#2]       │                       │
│  │  Avatar    │                       │
│  │ Username   │                       │
│  │ XX points  │                       │
│  └────────────┘                       │
│  ┌────────────┐                       │
│  │ [#3]       │                       │
│  │  Avatar    │                       │
│  │ Username   │                       │
│  │ XX points  │                       │
│  └────────────┘                       │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│    COMMUNITY RANKINGS                 │
│    ────────────────────────────────────│
│                                       │
│  Rank  Contributor   Points          │
│  ────  ────────────  ──────          │
│  🏆 #1 Alice         1,234           │
│  🥈 #2 Bob           1,100           │
│  🥉 #3 Charlie       980             │
│  #4    David         875             │
│  #5    Emma          820             │
│  ...                                 │
│                                       │
│  [← Previous]  [Next →]              │
└───────────────────────────────────────┘
                ↓
              24px gap
                ↓
┌───────────────────────────────────────┐
│    TOP PATROL OFFICERS                │
│    ────────────────────────────────────│
│                                       │
│  Rank  Officer       Points          │
│  ────  ────────────  ──────          │
│  🏆 #1 Officer A     987             │
│  🥈 #2 Officer B     856             │
│  🥉 #3 Officer C     745             │
│  #4    Officer D     678             │
│  #5    Officer E     634             │
│  ...                                 │
└───────────────────────────────────────┘
```

## 🎨 CSS Implementation

### Flexbox Approach (Current Implementation)

```css
/* Parent Container */
.leaderboard-columns {
  display: flex;
  flex-direction: column;      /* Mobile: Stack vertically */
  gap: 1.5rem;                /* 24px gap */
  align-items: flex-start;
}

/* Desktop */
@media (min-width: 1024px) {
  .leaderboard-columns {
    flex-direction: row;       /* Desktop: Side by side */
    gap: 2rem;                /* 32px gap */
  }
}

/* Each Column */
.column {
  width: 100%;                /* Mobile: Full width */
}

@media (min-width: 1024px) {
  .column {
    width: 50%;                /* Desktop: Half width */
  }
}
```

### Tailwind CSS Classes

```jsx
// Parent Container
<div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
  
  // Community Rankings Column
  <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-sm border">
    {/* Content */}
  </div>
  
  // Patrol Officers Column
  <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-sm border">
    {/* Content */}
  </div>
  
</div>
```

## 📐 Spacing Breakdown

### Desktop (≥ 1024px)
- **Container Max Width**: 1280px (max-w-7xl)
- **Column Width**: ~608px each (50% of container)
- **Gap Between Columns**: 32px (2rem)
- **Padding Around Container**: 32px (px-8)

### Mobile (< 1024px)
- **Container Width**: Full viewport width
- **Column Width**: 100% - padding
- **Gap Between Columns**: 24px (1.5rem)
- **Padding Around Container**: 16px (px-4)

## 🎯 Component Hierarchy

```
LeaderboardPage
├── Header
│   ├── Title
│   └── Stats (Contributors & Officers count)
├── Filters Section
│   ├── Search Input
│   └── Time Frame Dropdown
├── Top Contributors Section
│   └── 3 Cards (1st, 2nd, 3rd place)
└── Two-Column Layout ⭐
    ├── Community Rankings Column (Left/Top)
    │   ├── Header
    │   ├── Table
    │   │   ├── Thead (sortable columns)
    │   │   └── Tbody (paginated rows)
    │   └── Pagination
    └── Top Patrol Officers Column (Right/Bottom)
        ├── Header
        └── Table
            ├── Thead
            └── Tbody (top 10)
```

## 🎭 Interactive States

### Hover Effects
```
Row Hover:
  Before: bg-white
  After:  bg-gray-50

Card Hover:
  Before: shadow-sm
  After:  shadow-lg

Button Hover:
  Before: bg-white
  After:  bg-gray-50
```

### Click Actions
- **Table Row Click**: Opens user detail modal
- **Pagination Click**: Changes page
- **Sort Header Click**: Toggles sort order
- **Profile Link Click**: Navigates to profile page

## 🔄 Responsive Transformations

### Breakpoint Transitions

```
     Mobile          Tablet          Desktop
    (< 768px)    (768px - 1024px)   (≥ 1024px)
┌─────────────┐  ┌─────────────┐  ┌────────┬────────┐
│  Column 1   │  │  Column 1   │  │ Col 1  │ Col 2  │
├─────────────┤  ├─────────────┤  │        │        │
│  Column 2   │  │  Column 2   │  │        │        │
└─────────────┘  └─────────────┘  └────────┴────────┘
   Stack            Stack          Side-by-Side
```

## 💡 Best Practices Applied

1. ✅ **Mobile-First Design**: Base styles for mobile, enhanced for desktop
2. ✅ **Consistent Spacing**: Using Tailwind's spacing scale
3. ✅ **Semantic HTML**: Proper table structure and headings
4. ✅ **Accessibility**: Keyboard navigation and screen reader support
5. ✅ **Performance**: Pagination and lazy loading
6. ✅ **Visual Hierarchy**: Clear headers and sections
7. ✅ **Interactive Feedback**: Hover states and transitions
8. ✅ **Error Handling**: Loading and error states

## 🚀 Quick Copy Reference

### Basic Two-Column Flex Layout
```jsx
<div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
  <div className="w-full lg:w-1/2">{/* Column 1 */}</div>
  <div className="w-full lg:w-1/2">{/* Column 2 */}</div>
</div>
```

### With Card Styling
```jsx
<div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
  <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-sm border border-gray-200">
    {/* Column 1 Content */}
  </div>
  <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-sm border border-gray-200">
    {/* Column 2 Content */}
  </div>
</div>
```

### Alternative: CSS Grid
```jsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
  <div>{/* Column 1 */}</div>
  <div>{/* Column 2 */}</div>
</div>
```

## 📊 Visual Comparison

### Before (Single Column)
```
Width: 100%
Layout: Stacked
Scroll: Vertical only
View: Sequential
```

### After (Two Columns)
```
Width: 50% each on desktop
Layout: Side-by-side
Scroll: Independent
View: Simultaneous comparison
```

This visual guide provides a complete reference for understanding and implementing the two-column layout in the leaderboard page! 🎨

