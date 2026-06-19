---
sidebar_position: 1
---

# Code Organization & Management

This guide explains how to maintain a structured and clean theme codebase, including best practices for organizing code and handling site-specific implementations.

## Overview

A well-organized theme codebase is essential for maintainability, scalability, and team collaboration. This documentation covers:

- Structuring your theme code
- Managing site-specific code
- Keeping the codebase clean and organized

## Site-Specific Code Management

When you need to implement functionality that differs by country, you should use **allowlisted files** with conditional logic rather than duplicating code across the codebase.

### Using window.shopCurrency for Regional Logic

The `window.shopCurrency` variable is defined in `theme.liquid` and provides the currency code for the current shop. You can use this to conditionally execute site-specific code.

#### Implementation Pattern

Wrap your site-specific code in an if/else block that checks `window.shopCurrency`:

```javascript
if (window.shopCurrency === "CAD") {
	// Canadian-specific code here
	console.log("Running Canadian implementation");
	// Example: CA-specific tax calculations, regional promotions, etc.
} else if (window.shopCurrency === "USD") {
	// US-specific code here
	console.log("Running US implementation");
	// Example: US-specific tax calculations, regional promotions, etc.
}
```

#### Example: Regional Pricing Display

```javascript
function formatPrice(price) {
	if (window.shopCurrency === "CAD") {
		return `CAD $${price.toFixed(2)}`;
	} else if (window.shopCurrency === "USD") {
		return `$${price.toFixed(2)}`;
	}
}
```

### Benefits of This Approach

- **One condition to reason about**: Reading the region from a single global (`window.shopCurrency`) keeps the _check_ consistent everywhere
- **Maintainability**: Regional behavior for a feature lives next to that feature, not scattered into separate per-country files
- **Performance**: All code loads for all users (consider code splitting if this becomes a concern)

### Keeping Regional Logic Contained

There is **no automated allowlist or enforcement** in the theme — a
`window.shopCurrency` check can technically be added anywhere, and today these
checks are spread across many assets, sections, and snippets. By convention, keep
regional branching in the file that already owns the feature you're changing
rather than introducing new one-off checks elsewhere.

Note that some sections re-read `{{ shop.currency }}` into a local variable
instead of using the global. Prefer `window.shopCurrency` for consistency.

## Best Practices

1. **Use descriptive comments** to explain why regional logic is needed
2. **Keep conditional blocks simple** - if logic becomes complex, consider refactoring
3. **Test both code paths** - ensure CAD and USD implementations work correctly
4. **Document regional differences** - explain what differs and why
5. **Avoid nested conditionals** - keep logic flat and readable

## Related Resources

- Theme.liquid configuration
- Regional requirements documentation
- Code review guidelines
