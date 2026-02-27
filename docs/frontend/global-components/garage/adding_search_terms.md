---
title: Adding Search Terms (localStorage)
description: Steps to add new key/value pairs to searchTerms.
---

# Adding New Fields to searchTerms

After the refactoring that introduced `VEHICLE_SCHEMA` and object parameter patterns, adding new fields to the vehicle data structure in localStorage is straightforward.

## Step-by-Step Instructions

### 1. **Required Edit - Add to VEHICLE_SCHEMA** (1 location)

Edit `assets/global-library.js` (lines 7-20) and add your new field to the `VEHICLE_SCHEMA` object:

```javascript
const VEHICLE_SCHEMA = {
	ymm: null,
	vin: null,
	paintCode: null,
	year: null,
	make: null,
	model: null,
	submodel: null,
	engine: null,
	state: null,
	plate: null,
	decodedByBumper: null,
	lastCollectionImage: null,
	troublesome_format: null,
	your_new_field: null, // ← Add your new field here
};
```

:::tip
That's it! The spread operator in `normalizeSearchTerm` automatically handles the rest. All vehicles will now have this field.
:::

### 2. **Optional - Provide the Data** (depends on source)

Wherever you're collecting/receiving the new field's value, pass it in the object parameter.

#### Example: Homepage VIN Decode

In `assets/global-library.js`, when calling `updateSearchTerms`:

```javascript
updateSearchTerms({
	year: yearVal,
	make: makeVal,
	model: modelVal,
	submodel: engineVal,
	vin: vinVal,
	paintCode: paintCodeVal,
	troublesome_format: originalColorCode,
	your_new_field: yourNewValue, // ← Pass it here
});
```

#### Example: Manual Garage Entry

In `assets/garage-modal-v2.js`, add to the object:

```javascript
updateSearchTerms({
	year,
	make,
	model,
	submodel,
	engine,
	your_new_field: yourNewValue, // ← Pass it here
});
```

#### Example: Product Page Component

In `assets/product-page-component-library.js`:

```javascript
updateGarageAndNavigate({
	year,
	make,
	model,
	submodel,
	engine,
	vin,
	paintCode,
	your_new_field: yourNewValue, // ← Pass it here
});
```

### 3. **Accessing the Field**

The new field will automatically be:

- ✅ Stored in `localStorage.searchTerms`
- ✅ Available in the garage array
- ✅ Normalized by `normalizeSearchTerm`
- ✅ Passed through all vehicle data flows

Access it like this:

```javascript
const garage = JSON.parse(localStorage.getItem("searchTerms") || "[]");
const firstVehicle = garage[0];
console.log(firstVehicle.your_new_field);
```

## Summary

**Minimum Changes:** 1 edit to `VEHICLE_SCHEMA`  
**Additional Changes:** Only at data collection points where you want to set the value

The architecture ensures all vehicle objects have the same structure, and adding fields requires minimal changes!

## Technical Background

This ensures:

1. Every vehicle has all fields defined (no missing properties)
2. Fields not provided default to `null`
3. Provided values override the defaults
4. Adding a new field to the schema automatically includes it in all vehicles
