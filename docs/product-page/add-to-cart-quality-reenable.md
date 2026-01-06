---
id: add-to-cart-quality-reenable
title: Add to Cart Re-enable on Quality Change
sidebar_position: 4
---

# Add to Cart Re-enable on Quality Change

## Overview

This document describes the fix for a bug where the Add to Cart button remained disabled after a user selected an in-stock quality option (e.g., CAPA, OEM) when the initially loaded base product was out of stock.

### Bug Summary

When a product page loaded with an out-of-stock base variant:

- The Add to Cart button was correctly disabled with `disabled=true` and the `disabled-oos` CSS class
- When the user selected an in-stock quality option, the hidden variant ID input (`[name="id"]`) updated correctly
- However, the button remained disabled because the `disabled-oos` state was never re-evaluated
- This blocked legitimate purchases of in-stock variants

### Fix Summary

Modified the `enableAddToCartButton()` function in `product-page-component-library.js` to check the availability of the currently selected quality option before enabling the button, rather than relying solely on the base product's availability state (`window.blockAddToCart`).

---

## Root Cause

### Initial Page Load Behavior

When a product page loads with an out-of-stock base product:

1. Shopify sets `window.blockAddToCart = true` (based on `product.available`)
2. The Add to Cart button is disabled: `button.disabled = true`
3. The `disabled-oos` CSS class is added to the button

### Quality Selection Behavior (Before Fix)

When a user selected a different quality option (e.g., switching from out-of-stock Aftermarket to in-stock CAPA):

1. ✅ The hidden variant ID input updated correctly
2. ✅ The price display updated correctly
3. ✅ Quality-specific UI elements updated correctly
4. ❌ The `enableAddToCartButton()` function checked `window.blockAddToCart` (still `true` for the base product)
5. ❌ The function returned early without enabling the button
6. ❌ The `disabled-oos` class remained on the button

**Result:** Button stayed disabled even though the selected variant was in stock.

### Why Variant ID Updates Were Insufficient

The hidden input `[name="id"]` correctly reflected the selected in-stock variant, but the form submission was blocked client-side because:

- The button had `disabled=true` (preventing clicks)
- Browser form submission ignores inputs from disabled buttons
- No re-evaluation logic existed to sync button state with the selected variant's availability

---

## Implementation Details

### File Modified

**`assets/product-page-component-library.js`**

### Function Modified

**`enableAddToCartButton()`** (lines ~1204-1213)

### Changes Made

**Before:**

```javascript
function enableAddToCartButton() {
	// Never allow enabling when product is globally blocked (OOS)
	if (window.blockAddToCart) {
		disableAddToCartButton();
		return;
	}

	if (currentAddToCartBtnLibrary) currentAddToCartBtnLibrary.disabled = false;
	if (addToCartStickyLibrary) addToCartStickyLibrary.disabled = false;
}
```

**After:**

```javascript
function enableAddToCartButton() {
	// Check if a quality is selected and if it's available
	const selectedQuality = document.querySelector(
		'input[name="quality_type"]:checked'
	);
	const isQualityAvailable = selectedQuality
		? selectedQuality.getAttribute("data-available") === "true"
		: true;

	// Block if selected quality is out of stock OR if base product is blocked AND no quality selected
	if (!isQualityAvailable || (window.blockAddToCart && !selectedQuality)) {
		disableAddToCartButton();
		return;
	}

	if (currentAddToCartBtnLibrary) {
		currentAddToCartBtnLibrary.disabled = false;
		currentAddToCartBtnLibrary.classList.remove("disabled-oos");
	}
	if (addToCartStickyLibrary) {
		addToCartStickyLibrary.disabled = false;
		addToCartStickyLibrary.classList.remove("disabled-oos");
	}
}
```

### Key Logic Changes

1. **Quality Availability Check**

   - Queries the DOM for the currently selected quality radio button: `input[name="quality_type"]:checked`
   - Reads the `data-available` attribute (set by Liquid template based on product availability)
   - If no quality is selected, defaults to `true` (allows enabling for products without quality options)

2. **Conditional Blocking**

   - Blocks if selected quality is unavailable (`!isQualityAvailable`)
   - Blocks if base product is OOS AND no quality has been selected
   - Otherwise, proceeds to enable the button

3. **Class Management**
   - Explicitly removes `disabled-oos` class when enabling
   - Ensures button can be styled correctly for available states

### Data Attribute Source

Quality radio buttons are rendered with `data-available` in `snippets/quality-options-radio-btns.liquid`:

```liquid
<input
  type="radio"
  name="quality_type"
  value="aftermarket"
  {% if aftermarket_product.available %}
    data-available="true"
  {% else %}
    data-available="false"
    disabled
  {% endif %}
>
```

This attribute reflects the Shopify product availability for that specific quality variant.

---

## Behavior Changes

### Before vs After

| Scenario                                    | User Action                                                                                 | Before Fix                   | After Fix                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------- |
| **OOS Base → In-Stock Quality**             | 1. Land on OOS Aftermarket product<br/>2. Select CAPA (in stock)<br/>3. Select paint option | Button stays disabled ❌     | Button enables after paint selection ✅  |
| **Direct In-Stock Quality Landing**         | 1. Navigate to `/products/...?variant=CAPA_ID`<br/>2. Select paint option                   | Button enables correctly ✅  | Button enables correctly ✅ (no change)  |
| **In-Stock Base → OOS Quality**             | 1. Land on in-stock product<br/>2. Select OOS quality                                       | Button disables correctly ✅ | Button disables correctly ✅ (no change) |
| **Quality Switch Between In-Stock Options** | 1. Select CAPA (in stock)<br/>2. Switch to OEM (in stock)                                   | Button stays enabled ✅      | Button stays enabled ✅ (no change)      |

### User Flow Example (Primary Fix)

**Scenario:** Customer wants to purchase an in-stock CAPA variant when Aftermarket is out of stock.

1. **Page Load**

   - Base product: Aftermarket (Out of Stock)
   - Button state: Disabled, `disabled-oos` class present
   - `window.blockAddToCart = true`

2. **Select CAPA Quality**

   - Quality radio button: `data-available="true"`
   - Variant ID updates to CAPA variant
   - Button remains disabled (waiting for paint option)

3. **Select Paint Option (e.g., "Unpainted")**

   - `enableAddToCartButton()` is called
   - Function checks `data-available="true"` on CAPA radio
   - **Fix:** Function bypasses `window.blockAddToCart` check because quality is available
   - Button enables, `disabled-oos` class removed

4. **Add to Cart**
   - Form submits with CAPA variant ID
   - Purchase completes successfully

---

## What This Fix Does NOT Change

This fix is narrowly scoped to the quality selection availability logic. It does **not** modify:

### Unchanged Gating Mechanisms

- **Fitment Validation:** Fitment questions and compatibility checks remain unchanged
- **VIN Verification:** OEM products still require VIN input if configured
- **Paint Disclaimer:** Precision match or paint disclaimers still gate the button
- **Assembly Options:** Assembly selection requirements are unaffected
- **Inventory Source:** No changes to how Shopify or external systems report availability

### Unchanged Button States

The button can still be disabled by:

- Missing fitment verification (if required)
- Missing VIN for OEM products
- Unchecked paint disclaimers
- Invalid form state (e.g., no paint option selected)

**Important:** This fix only controls the `disabled-oos` state based on selected quality availability. All other disabling mechanisms remain independent and functional.

---

## Technical Notes

### Why `data-available` Attribute?

The `data-available` attribute is the most reliable source for quality variant availability because:

1. Set server-side by Liquid template based on Shopify product data
2. Reflects real inventory status at page render time
3. Already used throughout the quality selection UI
4. Avoids additional API calls or state synchronization

### Why Not Use `window.productVariants`?

While `window.productVariants` contains availability data, it is:

- Structured differently for different product types (painted vs unpainted)
- Sometimes nested under quality groups (aftermarket, capa, oem)
- Not guaranteed to be populated before quality selection
- More complex to query reliably

The `data-available` attribute provides a simpler, more direct source of truth.

### Button References

The function updates both button references:

- `currentAddToCartBtnLibrary`: Main Add to Cart button on desktop
- `addToCartStickyLibrary`: Sticky Add to Cart button (appears on scroll)

Both must be updated to ensure consistent behavior across viewports.

---

## Testing Recommendations

### Manual Testing Checklist

**Test Case 1: OOS Base to In-Stock Quality**

1. Navigate to a product with OOS Aftermarket but in-stock CAPA
2. Verify button is disabled on load
3. Select CAPA quality
4. Select "Unpainted" paint option
5. ✅ Button should enable and allow Add to Cart

**Test Case 2: In-Stock Base to OOS Quality**

1. Navigate to a product with in-stock Aftermarket but OOS CAPA
2. Select CAPA quality
3. ✅ Button should disable (cannot purchase OOS variant)

**Test Case 3: Direct In-Stock Variant Landing**

1. Navigate directly to an in-stock CAPA variant URL
2. Select paint option
3. ✅ Button should enable (no regression)

**Test Case 4: Multiple Quality Switches**

1. Select CAPA (in stock) → button enables
2. Select OEM (OOS) → button disables
3. Select CAPA (in stock) again → button re-enables
4. ✅ Button state should track quality availability

**Test Case 5: Fitment Interaction**

1. Select in-stock quality, select paint option
2. ✅ If fitment is invalid, button should remain disabled
3. Correct fitment
4. ✅ Button should enable (OOS fix + fitment logic work together)

### Edge Cases

- Products with only one quality option (no radio buttons)
- Products with no quality options (single variant products)
- Products where all quality options are OOS
- Mobile vs desktop viewports (sticky button behavior)

---

## Deployment Notes

### Files Changed

- `assets/product-page-component-library.js` (1 function modified)

### No Database Changes Required

This fix is entirely client-side logic. No Shopify metafields, product templates, or backend changes are needed.

### Rollback Procedure

If issues arise, revert the `enableAddToCartButton()` function to its previous implementation:

```javascript
function enableAddToCartButton() {
	if (window.blockAddToCart) {
		disableAddToCartButton();
		return;
	}
	if (currentAddToCartBtnLibrary) currentAddToCartBtnLibrary.disabled = false;
	if (addToCartStickyLibrary) addToCartStickyLibrary.disabled = false;
}
```

No other cleanup required.

---

## Related Documentation

- VIN Decoder Implementation: `/docs/product-page/vin-decoder`
- Quality Options UI: (TBD)
- Product Page Customization: (TBD)

---

**Last Updated:** January 3, 2025  
**Status:** Active  
**Applies to:** Partify Theme v3.x+
