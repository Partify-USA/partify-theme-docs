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

- **Single Source of Truth**: Conditional logic lives in one place, not duplicated across files
- **Maintainability**: Changes to regional logic only need to be made once
- **Clean Codebase**: No unnecessary file duplication
- **Performance**: All code loads for all users (consider code splitting if this becomes a concern)

### Allowlisted Files

Site-specific code should only be added to designated allowlisted files. This ensures:

- Code remains organized and discoverable
- Security and compliance are maintained
- The codebase doesn't become cluttered with scattered implementations

Contact your team to determine which files are allowlisted for site-specific code in your project.

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
