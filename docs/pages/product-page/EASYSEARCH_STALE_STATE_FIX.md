# EasySearch Stale State Fix Documentation

## Problem

On product pages, when a user removes the last vehicle from the garage, the page auto-reloads. However, EasySearch restores stale vehicle state from localStorage/sessionStorage and re-enables compatibility questions even though the garage is empty.

## Solution

A minimal two-layer fix that clears EasySearch storage keys before the app initializes, only when the last vehicle is removed.

## Implementation

### Files Modified

1. `snippets/garage-script.liquid` - Sets flag when last vehicle is removed
2. `layout/theme.liquid` - Clears storage keys on product page load if flag exists

### Changes

#### 1. `snippets/garage-script.liquid`

**Location:** `removeVehicleFromLocalStorage()` function

**What it does:**
- Before removing a vehicle, checks if it's the last one (`searchTerms.length === 1`)
- If yes, sets `sessionStorage.es_force_clear = '1'` to trigger clearing on next page load
- Logs: `[EASYSEARCH-FIX] armed clear on next load`

**Code added:**
```javascript
// Added to GarageUtils module
function getGarageTerms() {
  return getSearchTerms();
}
return { getFitmentObject, getSearchTerms: getGarageTerms };

// Added to removeVehicleFromLocalStorage() function
let searchTerms = GarageUtils.getSearchTerms();
if (searchTerms.length === 1) {
  try {
    sessionStorage.setItem('es_force_clear', '1');
    console.log('[EASYSEARCH-FIX] armed clear on next load');
  } catch (err) {
    console.warn('[EASYSEARCH-FIX] unable to set clear flag', err);
  }
}
```

#### 2. `layout/theme.liquid`

**Location:** In `<head>`, before `{{ content_for_header }}` (runs before app scripts)

**What it does:**
- Only runs on product templates
- Checks for `sessionStorage.es_force_clear === '1'`
- Clears EasySearch-related keys from localStorage and sessionStorage
- Removes the flag after clearing
- Logs cleared keys: `[EASYSEARCH-FIX] cleared keys: [...]`

**Keys cleared:**
- Allowlist: `easysearch-preselect-fitment`, `easysearch-preselect`
- Pattern match: Any key starting with `easysearch-` (case-insensitive)

**Code added:**
```javascript
{% if template contains 'product' %}
  <script>
    (function(){
      var PREFIX='[EASYSEARCH-FIX]';
      try{
        if(sessionStorage.getItem('es_force_clear')==='1'){
          var allow=['easysearch-preselect-fitment','easysearch-preselect'], cleared=[];
          var clear=function(store){if(!store) return;for(var i=store.length-1;i>=0;i--){var k=store.key(i);if(allow.indexOf(k)>-1||/^easysearch-/i.test(k)){cleared.push(k);store.removeItem(k);}}};
          clear(localStorage);clear(sessionStorage);
          sessionStorage.removeItem('es_force_clear');
          console.log(PREFIX+' cleared keys:',cleared);
        }
      }catch(e){console.warn(PREFIX+' clear failed',e);}
    })();
  </script>
{% endif %}
```

## Constraints Met

- ✅ Only 2 files modified
- ✅ No CSS changes
- ✅ No HTML markup additions (only script tag in head)
- ✅ No mutation observers
- ✅ No UI locking or control disabling
- ✅ Under 60 lines of new code total
- ✅ All console logs prefixed with `[EASYSEARCH-FIX]`

## Testing

### Test Plan

1. **Baseline with vehicle:**
   - Load a product page with a vehicle in garage
   - Verify fitment UI behaves normally (questions enabled if applicable)
   - No console errors

2. **Remove last vehicle:**
   - On product page, remove the last vehicle from garage
   - Check console for: `[EASYSEARCH-FIX] armed clear on next load`
   - Page should auto-reload

3. **After reload:**
   - Check console for: `[EASYSEARCH-FIX] cleared keys: [...]`
   - Verify EasySearch does NOT restore prior vehicle state
   - Compatibility questions should remain disabled (if applicable)
   - Garage should show empty state

4. **Add vehicle again:**
   - Add a vehicle to garage
   - Verify fitment UI enables normally
   - No stale state issues

### Manual Testing Steps

1. Open browser DevTools Console
2. Navigate to a product page
3. Add a vehicle to garage (if not already present)
4. Remove the last vehicle
5. Verify console shows: `[EASYSEARCH-FIX] armed clear on next load`
6. After page reloads, verify console shows: `[EASYSEARCH-FIX] cleared keys: [...]`
7. Confirm EasySearch does not restore stale vehicle data

## Rollback

To revert all changes:

1. **`snippets/garage-script.liquid`:**
   - Remove the `getGarageTerms()` function from `GarageUtils`
   - Change `GarageUtils.getSearchTerms()` back to `getSearchTerms()`
   - Remove the flag-setting block (lines checking `searchTerms.length === 1`)

2. **`layout/theme.liquid`:**
   - Remove the entire `{% if template contains 'product' %}` script block

Or use git:
```bash
git checkout HEAD -- snippets/garage-script.liquid layout/theme.liquid
```

## Debug Helper

The fix exposes no global debug helpers (per constraints). All logging uses the `[EASYSEARCH-FIX]` prefix for easy filtering in console.

## Technical Details

### Execution Order

1. User removes last vehicle → `removeVehicleFromLocalStorage()` sets flag
2. Page auto-reloads
3. `theme.liquid` head script runs (before `content_for_header`)
4. Script checks flag and clears storage if present
5. EasySearch app scripts load (no stale data to restore)

### Storage Keys Cleared

- `easysearch-preselect-fitment` (localStorage)
- `easysearch-preselect` (localStorage)
- Any key matching `/^easysearch-/i` pattern (localStorage & sessionStorage)

### Why This Works

- Flag is set synchronously before page reload
- Clearing happens in head before app scripts initialize
- Only runs on product templates (where bug occurs)
- Minimal impact: only clears when explicitly flagged

## Notes

- The fix does NOT modify any existing garage logic
- The fix does NOT add any UI changes or visual modifications
- The fix does NOT interfere with normal garage operations
- The fix only activates when the last vehicle is removed
- All changes are theme code only (no app code touched)

## Version

- **Date:** 2026-01-19
- **Files Changed:** 2
- **Lines Added:** ~25 lines total
- **Risk Level:** Low (minimal, targeted changes)
