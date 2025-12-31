---
sidebar_position: 1
---

# Homepage Vehicle Hub and Reviews Section Implementation

## Overview

This document provides complete internal technical documentation for the Homepage Vehicle Hub and Reviews Section implementation in the Partify Shopify theme. The feature enables dynamic homepage content that adapts based on whether a vehicle is selected in the garage, presenting different product recommendations and category tiles.

**Last Updated:** December 31, 2025  
**Theme Repo Branch:** `feat/homepage-vehicle-hub`  
**Primary Commit:** `3f18952` - "Homepage hub: fix tile routing, fallback behavior, reviews section cleanup"

---

## Architecture Overview

The homepage vehicle hub system consists of three primary components:

1. **Homepage Vehicle Hub Section** (`sections/homepage-vehicle-hub.liquid`)
2. **Homepage Trust Strip / Reviews Section** (`sections/homepage-trust-strip.liquid`)
3. **Hub JavaScript Engine** (`assets/homepage-a-hub.js`)
4. **Supporting Snippets** (`snippets/garage-script.liquid`, `snippets/collection-list-item.liquid`)
5. **Styling** (`assets/homepage-a.css`)

---

## Component Details

### 1. Homepage Vehicle Hub Section

**File:** `sections/homepage-vehicle-hub.liquid`  
**Commit:** `3f18952`

#### Purpose
Renders a dynamic homepage section that displays different content based on vehicle selection state. When no vehicle is selected, shows "Popular picks right now" with a CTA to add a vehicle. When a vehicle is selected, displays vehicle-specific product recommendations and category tiles with filtered links.

#### Key DOM Selectors and Attributes

| Selector/Attribute | Purpose | Scope |
|---|---|---|
| `[data-hp-hub]` | Root container for entire hub module | Section wrapper |
| `[data-hp-fallback-title]` | Title displayed when no vehicle selected | Data attribute on root |
| `[data-hp-fallback-subtitle]` | Subtitle for no-vehicle state | Data attribute on root |
| `[data-hp-fallback-top-title]` | Heading for top sellers section | Data attribute on root |
| `[data-hp-fallback-collection]` | Collection handle for fallback products | Data attribute on root |
| `[data-hp-missing]` | Container for no-vehicle state | Wrapper div |
| `[data-hp-selected]` | Container for vehicle-selected state | Wrapper div |
| `[data-hp-selected-title]` | YMM title element (dynamically updated) | h2 element |
| `[data-hp-selected-subtitle]` | Subtitle for vehicle state | p element |
| `[data-hp-vehicle-top]` | Wrapper for vehicle product grid section | Container with inline style |
| `[data-hp-vehicle-prodgrid]` | Product grid for vehicle-specific products | Empty div, populated by JS |
| `[data-hp-top-title]` | "Top Parts for [YMM]" heading | h3 element |
| `[data-hp-view-all]` | "View all parts" link | a element |
| `.js-open-garage` | Button class for opening vehicle modal | Multiple buttons |
| `[data-category-filter]` | Category tile trigger (fallback selector) | Fallback tiles |
| `[data-category-type]` | Category tile type (for logging) | Collection-based tiles |
| `[data-collection-handle]` | Collection handle metadata | Collection-based tiles |
| `.hp-a-*` | CSS class prefix for all hub styling | Throughout |

#### Settings IDs (Schema Configuration)

| Setting ID | Type | Default | Purpose |
|---|---|---|---|
| `primary_cta_label` | text | "Select or add a vehicle" | Main CTA button label |
| `missing_title` | text | "Popular picks right now" | Title when no vehicle |
| `missing_subtitle` | text | "Add a vehicle for exact fitment..." | Subtitle when no vehicle |
| `cta_card_title` | text | "Get exact-fit results" | Call-to-action card title |
| `cta_card_desc` | text | "Add your vehicle to see parts..." | CTA card description |
| `cta_card_button_label` | text | "Add a vehicle" | CTA card button text |
| `top_sellers_title` | text | "Top sellers" | Top sellers section heading |
| `global_top_sellers_collection` | collection | (empty) | Collection for global top sellers |
| `show_best_seller_badge` | checkbox | true | Show "Best seller" badge |
| `best_seller_badge_text` | text | "Best seller" | Badge text content |
| `selected_heading` | text | `"{ymm}"` | Template for selected vehicle heading (replaced at runtime) |
| `selected_subtitle` | text | "Choose a category to start shopping..." | Subtitle when vehicle selected |
| `change_vehicle_label` | text | "Change vehicle" | Change vehicle button label |
| `view_all_label` | text | "View all parts" | View all link text |
| `view_all_fallback_url` | url | "/collections" | Fallback URL for view all link |

#### Block Settings (Category Tiles)

Each category block allows customization of:
- `collection` (collection picker) - Required collection to display
- `label` (text) - Optional override label (defaults to collection title)
- `tile_image` (image picker) - Optional override image (falls back to collection image, then first product image)

**Max blocks:** 12

---

### 2. Homepage Trust Strip / Reviews Section

**File:** `sections/homepage-trust-strip.liquid`  
**Commit:** `3f18952`

#### Purpose
Displays a reviews heading with brand trust logos (Google, Yotpo, Trustpilot). This section provides context and branding for the Yotpo reviews carousel widget placed in index.json.

#### Key Features
- Single heading: "Real reviews from real customers"
- Three trust logos with links
- Hides duplicate Yotpo carousel internal titles via CSS
- Responsive mobile styling

#### Important CSS Selectors (Yotpo Title Hiding)

```css
/* Hide duplicate Yotpo carousel internal title */
.yotpo-reviews-carousel-widget-clear h2,
.yotpo-reviews-carousel-widget-clear .yotpo-carousel-title,
.yotpo-reviews-carousel-widget h2,
.yotpo-widget-instance h2 {
  display: none !important;
}
```

These selectors target:
- `.yotpo-reviews-carousel-widget-clear h2` - Primary selector for Yotpo h2 titles
- `.yotpo-reviews-carousel-widget-clear .yotpo-carousel-title` - Alternative class used by Yotpo
- `.yotpo-reviews-carousel-widget h2` - Fallback for standard Yotpo widget
- `.yotpo-widget-instance h2` - Broader fallback for any Yotpo widget instance

---

### 3. Homepage Hub JavaScript Engine

**File:** `assets/homepage-a-hub.js`  
**Commit:** `3f18952`

#### Purpose
Manages all dynamic state transitions, vehicle polling, collection URL generation, and user interactions for the vehicle hub.

#### Core Functions and Flow

##### **Vehicle Detection**
```javascript
function getActiveVehicle()
```
- Tries `window.getGarageSearchTerms()` first (preferred)
- Falls back to `localStorage.getItem("searchTerms")`
- Returns first vehicle from array or null

##### **Collection URL Generation**
```javascript
function computeVehicleCollectionHandle(vehicle)
```
Determines the collection handle for a vehicle in this priority order:
1. `vehicle.lastCollection` (path format: "/collections/HANDLE")
2. `vehicle.collectionHandle`
3. `window.generateCollectionHandle(ymmStr)` if available
4. Fallback: slugified YMM string

Returns slugified handle (lowercase, hyphens instead of spaces)

##### **Product Fetching**
```javascript
function fetchVehicleProducts(vehicle)
```
Fetches top 4 products with fallback chain:
1. Try primary vehicle collection: `/collections/{handle}/products.json?limit=4`
2. If empty, try fallback collection (typically "top-sellers")
3. If still empty, try "/collections/all"
4. Catches errors gracefully and hides product grid

**Key URLs Generated:**
- Primary: `/collections/VEHICLE-HANDLE/products.json?limit=4`
- Fallback 1: `/collections/top-sellers/products.json?limit=4`
- Fallback 2: `/collections/all/products.json?limit=4`

##### **Modal Triggering**
```javascript
function openVehicleModal()
```
Tries selectors in order:
1. `[data-open-garage]`
2. `[data-ymm-open]`
3. `.js-open-garage`
4. `a[href*="vehicle"]`
5. Falls back to `window.toggleGaragePopup()`

##### **Category Tile Link Routing**
```javascript
function updateCategoryTileLinks()
```

**No Vehicle State:**
```javascript
tile.onclick = function(e) {
  e.preventDefault();
  openVehicleModal();
}
```
- Tiles show modal on click
- Prevents navigation

**Vehicle Selected State:**
```javascript
var href = "/collections/" + baseHandle + 
           "?filter.p.m.custom.collection_types=" + 
           encodeURIComponent(categoryFilter) + 
           "#ProductGridContainer";
tile.setAttribute("href", href);
tile.onclick = null;
```
- Generates filtered collection URL with proper anchor
- URL structure: `/collections/VEHICLE-HANDLE?filter.p.m.custom.collection_types=ENCODED-CATEGORY#ANCHOR`
- Removes click handler to allow normal navigation
- Uses grid anchor: `#ProductGridContainer` (or `#product-grid` as fallback)

##### **State Application**
```javascript
function applyState()
```
- Adds class `is-selected` to root (always)
- Updates title/subtitle based on vehicle presence
- Sets "View all" link: 
  - **With vehicle:** `/collections/HANDLE#ANCHOR`
  - **Without vehicle:** `/collections/all`
- Calls `fetchVehicleProducts()`
- Calls `updateCategoryTileLinks()`

##### **Change Detection & Polling**
```javascript
function checkVehicleChange()
```
Serializes current vehicle as JSON and compares with `lastVehicleJson`:
- If changed, calls `applyState()`
- Triggered by:
  - Initial load
  - `storage` event (cross-tab sync)
  - Polling interval (see below)

```javascript
function startPolling()
```
- Fast poll: 400ms for first 5 seconds (12 iterations)
- Slow poll: 1500ms thereafter
- Started when "Add Vehicle" button clicked

#### Redirect Behavior Prevention

The implementation prevents unwanted redirects when a vehicle is selected on the homepage:

**In `updateCategoryTileLinks()`:**
```javascript
if (vehicle && baseHandle) {
  // Vehicle exists: update href for navigation
  tile.setAttribute("href", href);
  tile.onclick = null;  // Remove modal trigger
} else {
  // No vehicle: prevent navigation
  tile.setAttribute("href", "#");
  tile.onclick = function(e) {
    e.preventDefault();
    openVehicleModal();
  };
}
```

**In `snippets/garage-script.liquid` (Browse Catalog button):**
```javascript
const isHomepage = document.body.classList.contains('template-index');
if (isHomepage) {
  if (typeof toggleGaragePopup === 'function') {
    toggleGaragePopup();  // Close modal, stay on homepage
  }
} else {
  window.location.href = `/collections/${collectionHandle}`;
}
```

Key point: Selecting a vehicle on the homepage **closes the modal** rather than navigating away, keeping the user on the page to see updated hub content.

#### Button Event Handlers
```javascript
function attachGarageButtons()
```
- Attaches click listeners to all `.js-open-garage` buttons
- Calls `window.toggleGaragePopup()` if available
- Falls back to text search for "SELECT OR ADD A VEHICLE" button
- Starts polling after modal opens

---

### 4. Garage Script Snippet

**File:** `snippets/garage-script.liquid`  
**Commit:** Various

#### Key Modifications for Vehicle Hub

**Browse Catalog Button Handler:**
```javascript
const isHomepage = document.body.classList.contains('template-index');
if (isHomepage) {
  if (typeof toggleGaragePopup === 'function') {
    toggleGaragePopup();  // Close modal without navigation
  }
} else {
  window.location.href = `/collections/${collectionHandle}`;
}
```

This prevents redirect when browsing catalog from the homepage, allowing the vehicle hub to update dynamically instead.

**Edit Car Button Handler:**
Moves the selected vehicle to front of garage and pre-fills EasySearch dropdowns with the vehicle's year/make/model/submodel/engine values.

---

### 5. Styling

**File:** `assets/homepage-a.css`  
**Size:** ~603 lines added

Key classes:
- `.hp-a-section-bg` - Section background wrapper
- `.hp-a-inner` - Max-width container
- `.hp-a-panel` - Content panel
- `.hp-a-hub` - Hub root
- `.hp-a-h2`, `.hp-a-h3` - Heading styles
- `.hp-a-sub` - Subtitle styles
- `.hp-a-btn` - Button styles (primary & outline variants)
- `.hp-a-prodcard` - Product card styling
- `.hp-a-prodgrid` - Product grid layout
- `.hp-a-catcard` - Category card styling
- `.hp-a-catgrid` - Category grid layout (responsive: 1 col mobile, 2 col tablet, 4 col desktop)
- `.hp-a-catcard--placeholder` - Fallback tile gradient styling
- `.hp-a-reviews` - Reviews section styling
- `.review-brand-row` - Trust logo row styling

---

## Behavior Tables

### No Vehicle Selected

| Aspect | Behavior | Links/URLs |
|--------|----------|-----------|
| **State** | `[data-hp-missing]` visible, `[data-hp-selected]` hidden | — |
| **Heading** | Shows setting `missing_title` | — |
| **Subtitle** | Shows setting `missing_subtitle` | — |
| **CTA Block** | Full call-to-action card visible | `js-open-garage` button → modal |
| **Top Sellers** | Shows global top sellers collection | Links to `/products/HANDLE` (non-filtered) |
| **Category Tiles** | Click → Opens vehicle modal | Modal trigger: `openVehicleModal()` |
| **View All Link** | Points to `/collections/all` | `/collections/all` |
| **Product Grid** | Hidden (display: none) | — |

### Vehicle Selected (e.g., "2024 Subaru Forester")

| Aspect | Behavior | Links/URLs |
|--------|----------|-----------|
| **State** | `[data-hp-selected]` visible, `[data-hp-missing]` hidden | — |
| **Heading** | Template `selected_heading` with YMM: "2024 Subaru Forester" | — |
| **Subtitle** | Shows setting `selected_subtitle` | — |
| **Change Vehicle** | Button visible | `js-open-garage` button → modal |
| **Vehicle Products** | Grid shows top 4 products for vehicle collection | `/collections/2024-subaru-forester/products.json?limit=4` |
| **Top Parts Heading** | "Top Parts for 2024 Subaru Forester" | — |
| **Category Tiles** | Click → Filters category AND vehicle | `/collections/VEHICLE-HANDLE?filter.p.m.custom.collection_types=CATEGORY#ANCHOR` |
| **View All Link** | Points to vehicle collection with anchor | `/collections/VEHICLE-HANDLE#ANCHOR` |
| **Browse Catalog** | From garage modal → closes modal, stays on homepage | Modal closes; hub updates dynamically |

---

## Collection URL Structure

### Standard Collection (No Vehicle)
```
/collections/COLLECTION-HANDLE
```

### Vehicle-Filtered Collection
```
/collections/VEHICLE-COLLECTION-HANDLE?filter.p.m.custom.collection_types=ENCODED-CATEGORY#ANCHOR
```

**Example:**
```
/collections/2024-subaru-forester?filter.p.m.custom.collection_types=Front%20Bumpers%20%26%20Components#ProductGridContainer
```

**Components:**
- `VEHICLE-COLLECTION-HANDLE` - Slugified YMM (e.g., "2024-subaru-forester")
- `filter.p.m.custom.collection_types` - Metafield filter for category
- `ENCODED-CATEGORY` - URL-encoded category name (e.g., "Front Bumpers & Components")
- `#ANCHOR` - Smooth scroll anchor (ProductGridContainer or product-grid)

---

## QA Checklist

### Test Case 1: No Vehicle Selected

**Setup:** Clear garage / no vehicle in localStorage

**Expected Results:**

| Test | URL | Expected Behavior |
|------|-----|-------------------|
| Visit homepage | `/` | Hub shows "Popular picks right now" title |
| Click category tile | N/A | Modal opens to add vehicle |
| Click "View all" | → `/collections/all` | Navigates to all products collection |
| Click "Primary CTA" | N/A | Modal opens to add vehicle |
| Browse top sellers | N/A | Product links go to `/products/HANDLE` (non-filtered) |

### Test Case 2: Vehicle Selected (e.g., 2024 Subaru Forester)

**Setup:** Select vehicle in garage via modal

**Expected Results:**

| Test | URL | Expected Behavior |
|------|-----|-------------------|
| Homepage loads | `/` | Hub shows "2024 Subaru Forester" in title |
| Vehicle products section | N/A | Displays 4 top-selling parts for vehicle collection |
| Click "Front Bumpers" tile | → `/collections/2024-subaru-forester?filter.p.m.custom.collection_types=FrontBumpers#ProductGridContainer` | Filtered products shown, scrolls to grid |
| Click "View all" | → `/collections/2024-subaru-forester#ProductGridContainer` | All vehicle products shown with scroll anchor |
| Click "Change vehicle" | N/A | Modal opens, can select different vehicle |
| Close modal without changes | N/A | User stays on homepage, hub updates if vehicle was changed |

### Test Case 3: Vehicle Selection Flow

**Setup:** Homepage without vehicle

**Flow:**
1. Click "Add a vehicle" or category tile
2. Modal opens (verify `openVehicleModal()` finds trigger)
3. Select year, make, model, submodel, engine in EasySearch
4. Modal closes (via "Browse Catalog" button or direct selection)
5. Verify hub updates:
   - Heading changes to selected YMM ✓
   - Product grid populates with top 4 items ✓
   - Category tiles now filter by vehicle ✓
   - Sticky state persists on page refresh ✓

### Test Case 4: Reviews Section

**Test:** Ensure reviews section displays correctly

| Aspect | Expected |
|--------|----------|
| Heading visible | "Real reviews from real customers" appears |
| Trust logos | Google, Yotpo, Trustpilot logos all render |
| Yotpo carousel | Renders below trust logo row |
| No duplicate heading | Yotpo's internal h2 hidden (CSS selectors working) |
| Mobile layout | Logos wrap, "Trusted by customers on" spans full width |

### Test Case 5: Cross-Tab Sync

**Setup:** Two browser tabs, both on homepage

**Flow:**
1. Tab A: Select vehicle via modal
2. Tab B: Verify hub updates automatically within ~5 seconds
3. Tab A: Change vehicle in garage
4. Tab B: Verify hub reflects new vehicle

**Verification:** Vehicle change detected via `storage` event listener on `searchTerms` key

---

## Technical Implementation Details

### Vehicle Data Structure

Stored in `localStorage.getItem("searchTerms")` as JSON array:

```javascript
[
  {
    ymm: "2024 Subaru Forester",
    year: "2024",
    make: "Subaru",
    model: "Forester",
    submodel: "Premium",
    engine: "2.5L",
    vin: "JFJE1AB2XC..." (optional),
    paintCode: "XT3" (optional),
    collectionHandle: "2024-subaru-forester" (optional),
    lastCollection: "/collections/2024-subaru-forester" (optional)
  },
  // ... more vehicles
]
```

### Fallback Collection Chain

When product grid is fetched:

```
1. Try: /collections/VEHICLE-HANDLE/products.json?limit=4
   └─ If empty:
2. Try: /collections/FALLBACK-HANDLE/products.json?limit=4
   └─ If still empty:
3. Try: /collections/all/products.json?limit=4
   └─ If fails:
4. Hide product grid, log warning
```

**Configurable:** `data-hp-fallback-collection` attribute (defaults to "top-sellers")

### Polling Strategy

- **Initial:** Load at page init, apply state immediately
- **After modal open:** 400ms poll for 5 seconds (catch quick selections)
- **Fallback:** 1500ms slow poll (ensure cross-tab detection)
- **Cleanup:** Clear interval on page visibility change or redirect

### CSS Classes (State Management)

Added to root `[data-hp-hub]` element:
- `.is-selected` - Vehicle is selected (always applied post-applyState)

Note: Both `[data-hp-missing]` and `[data-hp-selected]` containers exist in DOM; JS controls visibility via inline `style.display`.

---

## File Changes Summary

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `sections/homepage-vehicle-hub.liquid` | 373 | Vehicle hub section with dual-state rendering |
| `sections/homepage-trust-strip.liquid` | 156 | Reviews section heading + brand logos |
| `assets/homepage-a-hub.js` | 507 | Core hub logic and state management |
| `assets/homepage-a.css` | 603 | Hub and reviews styling |
| `snippets/homepage-a-why-card.liquid` | 77 | Why Partify card snippet (related) |

### Modified Files

| File | Changes | Purpose |
|------|---------|---------|
| `assets/global-library.js` | +38 lines | Added helper functions (likely collection handle generation) |
| `sections/homepage-why-partify.liquid` | +386 lines | Why Partify section (related feature) |
| `snippets/garage-script.liquid` | +11 lines | Added homepage redirect prevention for "Browse Catalog" |
| `snippets/collection-list-item.liquid` | +5 lines | Minor updates for collection rendering |
| `templates/index.json` | ±817 lines | Added new sections to homepage template |

**Total Changes:** 2,561 insertions, 409 deletions

---

## Commit History

### Primary Commits for This Feature

1. **`3f18952`** - "Homepage hub: fix tile routing, fallback behavior, reviews section cleanup"
   - Fixed category tile routing (separate click vs href handling)
   - Improved fallback collection chain
   - Cleaned up reviews section duplicate heading hiding

2. **`1e21c5b`** - "Update"
   - Various fixes and refinements

3. **`8b8821a`** - "update"
   - Continuation of feature development

4. **`e4bb9f7`** - "update"
   - Additional refinements

**To view all changes:**
```bash
git diff main...feat/homepage-vehicle-hub -- \
  sections/homepage-vehicle-hub.liquid \
  sections/homepage-trust-strip.liquid \
  assets/homepage-a-hub.js
```

---

## Rollback Instructions

### Rollback to Previous State

**Option 1: Revert entire branch (cleanest)**
```bash
git revert 3f18952^..3f18952  # Revert all commits in range
# or
git reset --hard main  # Reset to main branch
```

**Option 2: Revert individual commits**
```bash
git revert 3f18952  # Revert most recent
git revert 1e21c5b
git revert 8b8821a
git revert e4bb9f7
```

**Option 3: Manual deletion (if immediate removal needed)**
```bash
# Remove new files
git rm sections/homepage-vehicle-hub.liquid
git rm sections/homepage-trust-strip.liquid
git rm assets/homepage-a-hub.js
git rm assets/homepage-a.css
git rm snippets/homepage-a-why-card.liquid

# Remove from template
# (Manually edit templates/index.json to remove new sections)

# Restore modified files from main
git checkout main -- assets/global-library.js
git checkout main -- snippets/garage-script.liquid
git checkout main -- snippets/collection-list-item.liquid

git commit -m "Rollback: remove homepage vehicle hub feature"
```

**Verification after rollback:**
```bash
git status  # Should be clean
git log --oneline -5  # Should show revert commits
# Test homepage - should revert to previous state
```

---

## Screenshots and Visual References

### Placeholder: No Vehicle State
- **File needed:** `/static/images/homepage-no-vehicle.png`
- **Description:** Homepage showing "Popular picks right now" with large CTA card

### Placeholder: Vehicle Selected State
- **File needed:** `/static/images/homepage-vehicle-selected.png`
- **Description:** Homepage showing "2024 Subaru Forester" with 4 product cards and 4 category tiles

### Placeholder: Mobile Responsive Layout
- **File needed:** `/static/images/homepage-mobile.png`
- **Description:** Mobile view with stacked category tiles (1 column) and responsive typography

### Placeholder: Category Tile Filtering
- **File needed:** `/static/images/category-filter-example.png`
- **Description:** Collection page after clicking "Front Bumpers" from hub (showing filtered results)

### Placeholder: Vehicle Modal Integration
- **File needed:** `/static/images/vehicle-modal.png`
- **Description:** Garage popup modal showing vehicle selection and "Browse Catalog" button

---

## Known Limitations and Edge Cases

### Known Issues

1. **Fallback Tiles** (Front Bumpers, Rear Bumpers, Fenders, Tailgates)
   - Used only when no custom blocks are configured
   - Redirect to `/collections` with `data-category-filter` attribute
   - Fallback behavior differs from custom tiles (no vehicle filtering applied)
   - **Recommendation:** Always configure category blocks for consistent behavior

2. **Product Grid Loading**
   - Shows loading state while fetching (`<div class="hp-a-loading">Loading...</div>`)
   - Network delays may cause brief flicker
   - No error state UI (silently hides on fetch fail)

3. **EasySearch Integration**
   - YMM slugification relies on `window.generateCollectionHandle()` availability
   - Collection handle mismatch will fall back to top-sellers or all
   - Custom collection naming not supported (must follow YMM-based handle convention)

4. **Mobile Responsiveness**
   - Tested on 768px breakpoint
   - Category grid: 1 col (mobile) → 2 col (tablet) → 4 col (desktop)
   - Buttons may wrap on very small screens

5. **Cross-Tab Sync**
   - Relies on `storage` event and polling
   - Up to 1500ms delay between tabs due to slow poll interval
   - Rapid vehicle changes might not sync fast enough

### Edge Cases Handled

✓ Missing collection handle → falls back to "top-sellers", then "all"  
✓ Empty product grid → hides section gracefully  
✓ No garage modal available → attempts text search fallback  
✓ Vehicle selection with no collection → shows fallback content  
✓ Modal close without selection → hub doesn't update (expected)  
✓ Multiple vehicle selections → uses first (index 0)  
✓ Page visibility hidden → resumes polling on visible  
✓ Product image missing → uses placeholder or generic image URL  

---

## Testing Recommendations

### Manual Testing

1. **State Transitions**
   - [ ] Load homepage, no vehicle → verify "Popular picks" shown
   - [ ] Add vehicle via modal → verify hub updates instantly
   - [ ] Change vehicle → verify new YMM and products shown
   - [ ] Remove all vehicles → verify reverts to "Popular picks"

2. **Product Grid**
   - [ ] Vehicle with collection → products load from `/products.json`
   - [ ] Vehicle without collection → falls back to top-sellers
   - [ ] Empty fallback → hides grid gracefully
   - [ ] Product links work → click product → product page loads

3. **Category Tiles**
   - [ ] No vehicle: tile click → modal opens
   - [ ] Vehicle: tile click → filters collection
   - [ ] Filter URL structure correct → verify query params and anchor
   - [ ] Mobile: tiles stack to 1 column

4. **Reviews Section**
   - [ ] Heading displays: "Real reviews from real customers"
   - [ ] Three logos visible and clickable (Google, Yotpo, Trustpilot)
   - [ ] Yotpo carousel loads below logos
   - [ ] No duplicate headings in rendered HTML

5. **Performance**
   - [ ] Load time: hub JS should load in under 500ms
   - [ ] Product fetch: should complete in under 1 second (with fallback)
   - [ ] State changes: should apply in under 200ms
   - [ ] Polling: should not block other operations

### Automated Testing

- **Unit Tests:** Collection handle generation, vehicle detection
- **Integration Tests:** Hub state transitions, product fetch with fallbacks
- **E2E Tests:** Full user flow (no vehicle → add vehicle → category click → collection page)
- **Visual Regression:** Hub and reviews section rendering on desktop/mobile

---

## Debugging

### Enable Debug Logging

Add `?hubdebug` to URL to see console output:
```javascript
// In homepage-a-hub.js
if (params.has("hubdebug")) {
  console.debug("[Homepage Hub Debug]", {
    vehicle: vehicle,
    ymmStr: ymmStr,
    computedHandle: primaryHandle,
    fetchUrl: fetchUrl,
  });
}
```

**Example URL:** `https://example.com/?hubdebug`

### Inspect localStorage

```javascript
// Check stored vehicle
console.log(JSON.parse(localStorage.getItem("searchTerms")));

// Check fitment preselect
console.log(JSON.parse(localStorage.getItem("easysearch-preselect-fitment")));
```

### Check Collection Availability

```javascript
fetch("/collections/2024-subaru-forester/products.json?limit=4")
  .then(r => r.json())
  .then(d => console.log("Products:", d.products.length))
  .catch(e => console.error("Fetch failed:", e));
```

---

## Related Documentation

- **Garage/Vehicle Selection System:** See `garage-script.liquid` documentation
- **EasySearch Integration:** Contact EasySearch implementation docs
- **Collection Filtering:** Shopify metafield filter syntax (filter.p.m.custom.*)
- **Homepage Template:** See `templates/index.json` for section ordering

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-31 | 1.0 | Initial documentation for homepage vehicle hub and reviews section implementation |

---

## Questions & Support

For issues or questions regarding this implementation:

1. **Feature not working?** Enable debug mode (`?hubdebug`) and check browser console
2. **Collection not showing?** Verify collection handle matches YMM slugified format
3. **Modal not opening?** Check `window.toggleGaragePopup` availability
4. **Styling issues?** Verify `assets/homepage-a.css` is loaded and not overridden

---

**Document Last Updated:** December 31, 2025  
**Author:** Internal Technical Documentation  
**Status:** Final ✓
