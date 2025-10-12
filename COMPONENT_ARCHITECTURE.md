# Component Architecture & Data Flow

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AdminDashboard.tsx                          │
│                  (Main Admin Container)                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ activeSection === 'stats'
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              EnhancedAdminStatistics.tsx                        │
│              (Main Statistics Dashboard)                        │
├─────────────────────────────────────────────────────────────────┤
│  State Management:                                              │
│  • statistics: Statistics                                       │
│  • filters: FilterOptions                                       │
│  • widgets: Widget[]                                            │
│  • drillDownData: DrillDownData                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Header &    │    │  Widget Area     │    │ Floating &       │
│   Toolbar     │    │  (Customizable)  │    │ Modals           │
└───────────────┘    └──────────────────┘    └──────────────────┘
        │                     │                        │
        │                     │                        │
   ┌────┴────┬────┬────┬─────┼─────┬────┬────┬───────┴───────┐
   ▼         ▼    ▼    ▼     ▼     ▼    ▼    ▼               ▼
┌──────┐ ┌───┐ ┌───┐ ┌───┐ ┌──┐ ┌──┐ ┌──┐ ┌───┐        ┌─────────┐
│Filter│ │Exp│ │Cus│ │Hlp│ │Tr│ │SLA│ │UE│ │Ano│        │Feedback │
│s     │ │ort│ │tom│ │   │ │nd│ │   │ │  │ │   │        │Widget   │
└──────┘ └───┘ └───┘ └───┘ └──┘ └──┘ └──┘ └───┘        └─────────┘
                               │                              │
                               ▼                              │
                      ┌──────────────────┐                   │
                      │ AdminStatistics  │                   │
                      │ (Original Charts)│                   │
                      └──────────────────┘                   │
                                                              │
                               ┌──────────────────────────────┘
                               ▼
                      ┌──────────────────┐
                      │ DrillDownModal   │
                      │ (Detailed Views) │
                      └──────────────────┘
```

## 📦 Component Breakdown

### 1. Toolbar Components (Top Row)

```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 Filters (3)] [📤 Export & Share] [⚙️ Customize] [❓ Help] │
└─────────────────────────────────────────────────────────────────┘
```

#### AdvancedFilters
```typescript
Props:
  - onFilterChange: (filters: FilterOptions) => void
  - availableCategories: string[]
  - availableLocations: string[]
  - availableStatuses: string[]

State:
  - isOpen: boolean
  - filters: FilterOptions
  - searchTerm: string

Features:
  ✓ Multi-select checkboxes
  ✓ Date range picker
  ✓ Search within filters
  ✓ Active filter badge
  ✓ Clear all / Apply
```

#### EnhancedExport
```typescript
Props:
  - onExportCSV: () => void
  - onExportPDF: () => void
  - onExportImage?: () => void
  - onGenerateLink?: () => Promise<string>
  - onShareEmail?: (email: string) => void

State:
  - isOpen: boolean
  - shareMode: 'export' | 'share'
  - generatedLink: string
  - linkCopied: boolean

Features:
  ✓ CSV, PDF, PNG export
  ✓ Shareable link generation
  ✓ Email sharing
  ✓ Copy to clipboard
```

#### CustomizableWidgets
```typescript
Props:
  - widgets: Widget[]
  - onWidgetsChange: (widgets: Widget[]) => void
  - onSave: () => void

State:
  - isOpen: boolean
  - draggedWidget: string | null

Features:
  ✓ Show/hide toggles
  ✓ Drag-and-drop reorder
  ✓ Category grouping
  ✓ Quick actions
```

#### HelpDocumentation
```typescript
Props:
  - onContactSupport?: () => void

State:
  - isOpen: boolean
  - searchQuery: string
  - selectedType: string

Features:
  ✓ Searchable resources
  ✓ Type filtering
  ✓ External links
  ✓ Quick links
```

### 2. Widget Components (Main Area)

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Comparative Trends                                       │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                           │
│ │↗+12%│ │↘-5% │ │↗+8% │ │↗+15%│                           │
│ └─────┘ └─────┘ └─────┘ └─────┘                           │
├─────────────────────────────────────────────────────────────┤
│ 🎯 SLA Performance & Alerts                                 │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│ │🟢 Within│ │🟡Warning│ │🔴Breached│                       │
│ └─────────┘ └─────────┘ └─────────┘                       │
├─────────────────────────────────────────────────────────────┤
│ 👥 User Engagement                                          │
│ [Activity Heatmap] [Retention Metrics] [Top Users]         │
├─────────────────────────────────────────────────────────────┤
│ 🔔 Anomaly Detection                                        │
│ ⚠️ Alert: Unusual spike detected in report submissions     │
├─────────────────────────────────────────────────────────────┤
│ 📈 Data Visualization (Original Charts)                    │
│ [Status Chart] [Category Chart] [Time Chart] [Location]    │
└─────────────────────────────────────────────────────────────┘
```

#### ComparativeTrends
```typescript
Props:
  - trends: TrendData[]
  - periodLabel?: string

TrendData:
  - current: number
  - previous: number
  - label: string
  - format?: 'number' | 'percentage' | 'time'

Features:
  ✓ Auto percentage calculation
  ✓ Trend indicators (↗↘→)
  ✓ Color-coded cards
  ✓ Summary statistics
```

#### SLAAlerts
```typescript
Props:
  - slaData: SLAData
  - onViewDetails?: (severity) => void

SLAData:
  - withinTarget: number
  - warning: number
  - breached: number
  - targetHours: number
  - criticalIssues: Issue[]

Features:
  ✓ Three-tier display
  ✓ Critical issues list
  ✓ Clickable drill-down
  ✓ Overall health status
```

#### UserEngagement
```typescript
Props:
  - data: UserEngagementData
  - onUserClick?: (userId) => void

UserEngagementData:
  - totalUsers: number
  - activeUsers: number
  - activityHeatmap: HeatmapData[]
  - topUsers: User[]
  - retentionRate: number

Features:
  ✓ Activity heatmap (24x7)
  ✓ Retention/churn rates
  ✓ Top users leaderboard
  ✓ Metric cards
```

#### AnomalyDetection
```typescript
Props:
  - anomalies: Anomaly[]
  - onAnomalyClick?: (anomaly) => void
  - onDismiss?: (id) => void

Anomaly:
  - type: 'spike' | 'drop' | 'pattern' | 'breach'
  - severity: 'high' | 'medium' | 'low'
  - metric: string
  - current: number
  - expected: number
  - recommendation?: string

Features:
  ✓ Severity color coding
  ✓ Metrics comparison
  ✓ Recommendations
  ✓ Investigate/Dismiss
```

### 3. Floating Components

#### FeedbackWidget
```typescript
Props:
  - onSubmit: (feedback) => void

State:
  - isOpen: boolean
  - feedbackType: FeedbackType
  - rating: number
  - message: string

Features:
  ✓ Floating button
  ✓ Feedback types (bug/feature/etc)
  ✓ Star rating
  ✓ Quick suggestions
```

### 4. Modal Components

#### DrillDownModal
```typescript
Props:
  - data: DrillDownData | null
  - isOpen: boolean
  - onClose: () => void
  - onExport?: () => void

DrillDownData:
  - title: string
  - items: any[]
  - columns: Column[]
  - onItemClick?: (item) => void

Features:
  ✓ Searchable table
  ✓ Pagination
  ✓ Sortable columns
  ✓ Export functionality
```

## 🔄 Data Flow

### Initial Load
```
1. User navigates to Stats section
   ↓
2. EnhancedAdminStatistics mounts
   ↓
3. Fetch statistics from Supabase
   │
   ├─→ reports table
   ├─→ profiles table
   └─→ duty_schedules table
   ↓
4. Process data into Statistics object
   ↓
5. Distribute to child components
   │
   ├─→ ComparativeTrends (trends data)
   ├─→ SLAAlerts (SLA data)
   ├─→ UserEngagement (user data)
   ├─→ AnomalyDetection (anomalies)
   └─→ AdminStatistics (charts)
```

### Filter Flow
```
1. User clicks Filters button
   ↓
2. AdvancedFilters modal opens
   ↓
3. User selects criteria
   ↓
4. Clicks "Apply Filters"
   ↓
5. onFilterChange callback
   ↓
6. Update filters state in parent
   ↓
7. Trigger data refetch with filters
   ↓
8. All widgets update with filtered data
```

### Drill-Down Flow
```
1. User clicks chart segment
   ↓
2. Parent component:
   │
   ├─→ Fetch detailed data
   ├─→ Format for DrillDownModal
   └─→ Set drillDownData state
   ↓
3. DrillDownModal opens
   ↓
4. User interacts:
   │
   ├─→ Search
   ├─→ Paginate
   └─→ Click row for details
   ↓
5. Close modal or export data
```

### Export Flow
```
1. User clicks Export & Share
   ↓
2. Choose format (CSV/PDF/Link)
   ↓
3. For CSV/PDF:
   │
   ├─→ Generate file
   ├─→ Trigger download
   └─→ Show success notification
   
4. For Link:
   │
   ├─→ Call onGenerateLink()
   ├─→ Display shareable URL
   └─→ Copy to clipboard option
   
5. For Email:
   │
   ├─→ Enter recipient
   ├─→ Call onShareEmail()
   └─→ Show success notification
```

## 🎯 State Management

### Parent State (EnhancedAdminStatistics)
```typescript
const [statistics, setStatistics] = useState<Statistics>({
  totalReports: 0,
  pendingReports: 0,
  resolvedReports: 0,
  // ... more metrics
  previousStats: { ... }
});

const [filters, setFilters] = useState<FilterOptions>({
  categories: [],
  locations: [],
  statuses: [],
  dateRange: { start: '', end: '' },
  // ... more filters
});

const [widgets, setWidgets] = useState<Widget[]>([
  { id: 'trends', visible: true, order: 0 },
  // ... more widgets
]);

const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
```

### Props Flow
```
EnhancedAdminStatistics
├─→ AdvancedFilters
│   ├─ onFilterChange={handleFilterChange}
│   └─ availableCategories={statistics.reportsByCategory}
│
├─→ ComparativeTrends
│   └─ trends={calculatedTrends}
│
├─→ SLAAlerts
│   ├─ slaData={slaMetrics}
│   └─ onViewDetails={handleDrillDown}
│
├─→ UserEngagement
│   ├─ data={userMetrics}
│   └─ onUserClick={handleUserClick}
│
├─→ AnomalyDetection
│   ├─ anomalies={detectedAnomalies}
│   ├─ onAnomalyClick={handleInvestigate}
│   └─ onDismiss={handleDismiss}
│
├─→ FeedbackWidget
│   └─ onSubmit={handleFeedback}
│
├─→ CustomizableWidgets
│   ├─ widgets={widgets}
│   ├─ onWidgetsChange={setWidgets}
│   └─ onSave={handleSave}
│
├─→ EnhancedExport
│   ├─ onExportCSV={exportCSV}
│   ├─ onExportPDF={exportPDF}
│   ├─ onGenerateLink={generateLink}
│   └─ onShareEmail={shareEmail}
│
└─→ DrillDownModal
    ├─ data={drillDownData}
    ├─ isOpen={isDrillDownOpen}
    └─ onClose={() => setIsDrillDownOpen(false)}
```

## 🔌 Integration Points

### With Supabase
```typescript
// Fetch reports
const { data: reports } = await supabase
  .from('reports')
  .select('*')
  .filter(/* applied filters */);

// Fetch users
const { data: users } = await supabase
  .from('profiles')
  .select('*');
```

### With Auth Store
```typescript
const { user: currentUser } = useAuthStore();

// Check admin access
if (currentUser?.role !== 'admin') {
  return <AccessDenied />;
}
```

### With Existing AdminStatistics
```typescript
// Reuse original charts
import { AdminStatistics } from './AdminStatistics';

// Render as a widget
{widgets.find(w => w.id === 'charts')?.visible && (
  <AdminStatistics />
)}
```

## 📱 Responsive Behavior

### Desktop (≥1024px)
- 4-column grid layouts
- Side-by-side panels
- Full-width modals
- Hover interactions

### Tablet (768px - 1023px)
- 2-3 column grids
- Stacked sections
- Slide-out panels
- Touch & hover

### Mobile (<768px)
- Single column
- Full-width cards
- Bottom sheets
- Touch only

## 🎨 Styling System

### Tailwind Classes Used
```css
/* Colors */
bg-blue-{50,100,600,700}
text-gray-{500,600,700,900}
border-{gray,blue,green,yellow,red}-{200,300}

/* Layout */
grid grid-cols-{1,2,3,4}
flex flex-col items-center justify-between
gap-{2,3,4,6}

/* Typography */
text-{xs,sm,base,lg,xl,2xl}
font-{medium,semibold,bold}

/* Interactive */
hover:bg-{color}-{shade}
focus:ring-{color}-500
transition-{colors,all}
cursor-pointer

/* Responsive */
sm:grid-cols-2
md:flex-row
lg:grid-cols-4
```

---

**This architecture ensures**:
- ✅ Modularity (reusable components)
- ✅ Maintainability (clear separation)
- ✅ Scalability (easy to extend)
- ✅ Performance (optimized rendering)
- ✅ Type Safety (TypeScript throughout)

