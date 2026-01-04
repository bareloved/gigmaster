# 🎯 Performance Action Plan - Authenticated Pages

**Created:** December 27, 2025  
**Status:** 🔴 URGENT - Critical performance issues identified  
**Goal:** Bring all pages to 85+ performance score

---

## 📊 Current State

| Page | Score | Critical Issues |
|------|-------|-----------------|
| **Gigs List** | 70 🔴 | LCP 5.1s (CRITICAL), 4.6 MB page weight |
| **Dashboard** | 73 🟡 | CLS 0.24 (layout shifts) |
| **Individual Gig** | 87 🟢 | Minor TBT issues |
| **Sign-in** | 100 ✅ | Perfect baseline |

---

## 🚨 Phase 1: Emergency Fixes (TODAY)

### 1. Fix Gigs Page Images (HIGHEST PRIORITY)
**Impact:** Score 70 → 85+ | **Time:** 1-2 hours

**Problem:** LCP is 5.1s due to unoptimized hero images (2,735 KiB wasted)

**Solution:**

```typescript
// In: components/dashboard/gig-item-grid.tsx
// BEFORE:
<img src={gig.heroImageUrl} alt={gig.title} />

// AFTER:
import Image from 'next/image';

<Image
  src={gig.heroImageUrl || '/gig-fallbacks/default.jpeg'}
  alt={gig.title}
  width={400}
  height={300}
  loading="lazy"
  quality={75}
  className="object-cover"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Generate blur hash
/>
```

**Files to Update:**
- `components/dashboard/gig-item-grid.tsx`
- `components/dashboard/gig-item.tsx`
- `app/(app)/gigs/page.tsx`

**Expected Result:**
- LCP: 5.1s → 1.5-2s
- Page weight: 4.6 MB → 1-1.5 MB
- Score: 70 → 85-90

---

### 2. Fix Dashboard Layout Shifts
**Impact:** Score 73 → 82+ | **Time:** 1 hour

**Problem:** CLS 0.24 (content jumping after load)

**Solution:**

```css
/* In: app/globals.css or component styles */

/* Reserve space for cards to prevent shifts */
.dashboard-card {
  min-height: 200px;
  contain: layout; /* Prevent layout shifts */
}

.gig-item-skeleton {
  height: 120px; /* Match actual content height */
}

.kpi-card {
  min-height: 140px;
}
```

```typescript
// In: app/(app)/dashboard/page.tsx
// Add explicit dimensions to containers

<Card className="min-h-[200px]">
  {isLoading ? (
    <Skeleton className="h-[200px]" /> // Match actual height
  ) : (
    <CardContent>...</CardContent>
  )}
</Card>
```

**Files to Update:**
- `app/(app)/dashboard/page.tsx`
- `components/dashboard/kpi-cards.tsx`
- `components/dashboard/gig-item.tsx`
- `app/globals.css`

**Expected Result:**
- CLS: 0.24 → 0
- Score: 73 → 82-85

---

## 🔧 Phase 2: Code Splitting (THIS WEEK)

### 3. Split GigEditorPanel Component
**Impact:** All pages +5-10 points | **Time:** 2-3 hours

**Problem:** 1 MB unused JavaScript on every page

**Current State:**
```typescript
// Heavy import on every page load
const GigEditorPanel = dynamic(
  () => import("@/components/gigpack/editor/gig-editor-panel").then((mod) => mod.GigEditorPanel),
  { ssr: false }
);
```

**Solution: Split into Tab Components**

```typescript
// Create: components/gigpack/editor/tabs/details-tab.tsx
export function DetailsTab({ gigPack, onChange }: TabProps) {
  // Details form only
}

// Create: components/gigpack/editor/tabs/setlist-tab.tsx
export function SetlistTab({ gigPack, onChange }: TabProps) {
  // Setlist editor only
}

// Create: components/gigpack/editor/tabs/roles-tab.tsx
export function RolesTab({ gigPack, onChange }: TabProps) {
  // Roles management only
}

// Update: gig-editor-panel.tsx
const DetailsTab = dynamic(() => import('./tabs/details-tab'));
const SetlistTab = dynamic(() => import('./tabs/setlist-tab'));
const RolesTab = dynamic(() => import('./tabs/roles-tab'));

// Load only active tab
{activeTab === 'details' && <DetailsTab />}
{activeTab === 'setlist' && <SetlistTab />}
{activeTab === 'roles' && <RolesTab />}
```

**Expected Result:**
- Initial bundle: -60% JavaScript
- Only load ~300 KB per tab (vs 1.8 MB all at once)
- All pages: +5-10 points

---

### 4. Lazy Load Dashboard Widgets
**Impact:** Dashboard +5 points | **Time:** 1 hour

```typescript
// In: app/(app)/dashboard/page.tsx

const PracticeFocusWidget = dynamic(
  () => import('@/components/dashboard/practice-widget').then(m => m.PracticeFocusWidget),
  { loading: () => <Skeleton className="h-[300px]" /> }
);

const GigActivityWidget = dynamic(
  () => import('@/components/dashboard/activity-widget').then(m => m.GigActivityWidget),
  { loading: () => <Skeleton className="h-[300px]" /> }
);

// Only render in viewport
{!focusMode && <PracticeFocusWidget />}
```

---

## 🎨 Phase 3: Image Optimization (NEXT WEEK)

### 5. Set Up Image Optimization Pipeline
**Impact:** All pages +3-5 points | **Time:** 4-6 hours

**Steps:**

1. **Install Sharp (Next.js image optimization)**
```bash
npm install sharp
```

2. **Update next.config.ts:**
```typescript
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
    },
  ],
},
```

3. **Generate blur placeholders:**
```typescript
// Use plaiceholder or similar
import { getPlaiceholder } from 'plaiceholder';

const { base64 } = await getPlaiceholder(imageUrl);
```

4. **Implement responsive images:**
```typescript
<Image
  src={imageUrl}
  alt={alt}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  fill
  className="object-cover"
/>
```

---

## 🚀 Phase 4: Performance Monitoring (ONGOING)

### 6. Add Performance Monitoring
**Impact:** Catch regressions early | **Time:** 2 hours

```typescript
// lib/analytics/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals() {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}

// app/layout.tsx
useEffect(() => {
  if (process.env.NODE_ENV === 'production') {
    reportWebVitals();
  }
}, []);
```

---

## 📋 Testing Checklist

After each fix:

- [ ] Run Lighthouse on affected page
- [ ] Check performance score improved
- [ ] Verify Core Web Vitals in green
- [ ] Test on real device (not just desktop)
- [ ] Check Network tab for bundle sizes
- [ ] Verify images are optimized

---

## 🎯 Success Metrics

### Target Scores (Achievable)

| Page | Current | Phase 1 | Phase 2 | Phase 3 | Final Target |
|------|---------|---------|---------|---------|--------------|
| Gigs | 70 | 85 | 88 | 90 | 90+ |
| Dashboard | 73 | 82 | 85 | 87 | 87-90 |
| Individual Gig | 87 | 90 | 92 | 93 | 93-95 |

### Core Web Vitals Targets

| Metric | Current Worst | Target | Priority |
|--------|---------------|--------|----------|
| LCP | 5.1s | < 2.5s | 🔴 CRITICAL |
| CLS | 0.24 | < 0.1 | 🟡 HIGH |
| TBT | 240ms | < 200ms | 🟢 MEDIUM |
| FCP | 0.3s ✅ | < 1.8s | ✅ GOOD |

---

## 💰 Time Investment vs Impact

| Fix | Time | Impact | ROI |
|-----|------|--------|-----|
| **Gigs images** | 1-2h | +15 points | ⭐⭐⭐⭐⭐ |
| **Dashboard CLS** | 1h | +10 points | ⭐⭐⭐⭐⭐ |
| **Code splitting** | 2-3h | +10 points | ⭐⭐⭐⭐ |
| **Lazy loading** | 1h | +5 points | ⭐⭐⭐⭐ |
| **Image pipeline** | 4-6h | +5 points | ⭐⭐⭐ |

**Best ROI: Start with Phase 1 (3-4 hours, +25 points total)**

---

## 🔄 Development Workflow

### For Each Fix:

1. **Create branch:**
```bash
git checkout -b perf/fix-gigs-images
```

2. **Make changes**

3. **Test locally:**
```bash
npm run build
npm run start
# Run Lighthouse on localhost:3000
```

4. **Compare scores:**
```bash
# Save reports to lighthouse-reports/
# Compare before/after
```

5. **Commit and deploy:**
```bash
git commit -m "perf: optimize gigs page images - improves LCP from 5.1s to 1.8s"
```

---

## 📝 Notes

### Why Architecture Optimizations Worked but Scores Aren't 100

**Architecture fixes (✅ Working):**
- Edge-side auth → No client blocking
- Server-first layout → Fast FCP (0.3s)
- Font optimization → No font loading delays
- Parallel fetching → Fast data loads

**These show in:**
- ✅ Consistent 0.3s FCP across ALL pages
- ✅ No auth blocking delays
- ✅ Individual Gig performing well (87)

**Data layer issues (❌ Not addressed yet):**
- Images not using next/image
- No lazy loading strategy
- All JS loaded upfront
- Layout shifts from dynamic content

**Conclusion:**
Architecture is solid. Need to fix data/component layer.

---

## 🎓 Learning: Two Types of Performance

### 1. Architectural Performance ✅ (Fixed)
- Server rendering
- Edge functions
- Code organization
- Auth strategy

**Result:** Fast FCP (0.3s), no blocking

### 2. Data/Component Performance ❌ (Needs Work)
- Image optimization
- Code splitting
- Lazy loading
- Layout stability

**Result:** Slow LCP (5.1s), layout shifts, heavy bundles

**Both are needed for top performance!**

---

## 🚀 Getting Started

### Quick Start (Next 2 Hours):

1. **Fix Gigs images** (Highest impact)
   - Update `components/dashboard/gig-item-grid.tsx`
   - Add next/image imports
   - Set loading="lazy"

2. **Fix Dashboard CLS** (Quick win)
   - Add min-heights to cards
   - Update skeletons to match content

3. **Test with Lighthouse**
   - See immediate improvement
   - Gigs: 70 → 85+
   - Dashboard: 73 → 82+

**Then celebrate and move to Phase 2!** 🎉

---

## 📞 Questions?

- Check: `lighthouse-reports/AUTHENTICATED-ANALYSIS.md` for detailed analysis
- Review: Individual fixes in this document
- Test: Run Lighthouse after each change

Ready to start? **Begin with Phase 1, Fix #1: Gigs Page Images!** 🚀

