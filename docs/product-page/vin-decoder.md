---
sidebar_position: 1
---

# VIN Decoder Input Box

## Overview

The VIN decoder input box system handles two distinct user flows for entering Vehicle Identification Numbers (VINs) on product pages. The system uses a single reusable snippet (`vin-decoder-input-box.liquid`) that creates independent instances with unique IDs to support multiple VIN entry points on the same page.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Instance System](#instance-system)
3. [Two Instance Scenarios](#two-instance-scenarios)
4. [Component Structure](#component-structure)
5. [Instance Initialization Flow](#instance-initialization-flow)
6. [Input Event Flow](#input-event-flow)
7. [Submit Event Flow](#submit-event-flow)
8. [Key Functions Reference](#key-functions-reference)
9. [State Management](#state-management)
10. [UI Visibility Rules](#ui-visibility-rules)

---

## Architecture Overview

### High-Level Design

The VIN decoder input box uses an **instance-based architecture** where:

- A single Liquid snippet template (`vin-decoder-input-box.liquid`) is rendered multiple times
- Each render receives a unique `instance` parameter (`'after'` or `'byvin'`)
- The instance parameter creates namespace isolation via unique element IDs
- JavaScript uses an IIFE (Immediately Invoked Function Expression) to encapsulate instance-specific logic

### Why Two Instances?

The product page provides two different entry points for users to enter their VIN:

1. **"After" instance** - Shown AFTER user selects a paint code option (instance: `'after'`)
2. **"ByVin" instance** - Shown when user chooses to find paint code BY VIN (instance: `'byvin'`)

Both instances:

- Use the same validation logic
- Call the same API endpoints
- Share the same global state variables
- Display identical UI components with different IDs

---

## Instance System

### Instance Parameter Flow

```
product-page-paint-options.liquid
    │
    ├─> {% render 'vin-decoder-input-box', instance: 'after' %}
    │   Creates:
    │   - vin-decoder-textbox-for-verification-wrapper-after
    │   - vin-decoder-textbox-for-verification-after
    │   - vin-validation-error-after
    │   - button[data-instance="after"]
    │
    └─> {% render 'vin-decoder-input-box', instance: 'byvin' %}
        Creates:
        - vin-decoder-textbox-for-verification-wrapper-byvin
        - vin-decoder-textbox-for-verification-byvin
        - vin-validation-error-byvin
        - button[data-instance="byvin"]
```

### Liquid Template Processing

```liquid
{% assign instance_suffix = instance | default: 'default' %}
```

- Receives `instance` parameter from parent template
- Defaults to `'default'` if no parameter provided
- Used throughout template to generate unique IDs

**Example ID Generation:**

```liquid
<input id="vin-decoder-textbox-for-verification-{{ instance_suffix }}" ... >
```

For `instance: 'after'` → `id="vin-decoder-textbox-for-verification-after"`
For `instance: 'byvin'` → `id="vin-decoder-textbox-for-verification-byvin"`

---

## Two Instance Scenarios

### Scenario 1: "After" Instance

**Location:** `#vin-decoder-after-selection`

**When Shown:**

- User has already selected a paint code option
- System prompts for VIN to validate/enhance the order
- Optional in most cases (can be required based on product settings)

**Parent Container:**

```html
<div id="vin-decoder-after-selection" style="display: none">
	{% render 'vin-decoder-input-box', instance: 'after' %}
</div>
```

**Use Case:**
User selects "Paint Code XYZ" from dropdown → System shows "after" VIN input → User can optionally provide VIN for order tracking/verification

**Key Behaviors:**

- Often optional (unless `.required` class added)
- Validates VIN matches selected paint code
- May show mismatch warnings if VIN doesn't match
- Enhances order data with vehicle details

---

### Scenario 2: "ByVin" Instance

**Location:** `#paintcode-app-container > #vin-decoder-option`

**When Shown:**

- User selects "Find my paint code using VIN" radio option
- VIN is REQUIRED to determine paint code
- Primary method for VIN-based paint code lookup

**Parent Container:**

```html
<div id="paintcode-app-container">
	<div class="two-tone-message">...</div>
	<div id="vin-decoder-option" style="display: none">
		{% render 'vin-decoder-input-box', instance: 'byvin' %}
	</div>
</div>
```

**Use Case:**
User doesn't know paint code → Selects "Use VIN" option → System shows "byvin" VIN input → User enters VIN → System decodes VIN and auto-selects paint code

**Key Behaviors:**

- Required input (user cannot proceed without valid VIN)
- Performs VIN decode API call
- Populates paint code dropdown based on response
- Shows two-tone paint warning message
- Handles decode failures and retries (max 3 attempts)

---

## Component Structure

### HTML Structure (Per Instance)

```html
<div
	id="vin-decoder-textbox-for-verification-wrapper-{instance}"
	class="vin-decoder-wrapper show"
>
	<!-- Optional label section (shown for 'after' instance) -->
	<div
		id="vin-after-paint-code-selection-{instance}"
		class="vin-after-paint-code-selection show"
	>
		<label class="vin-after-paint-code-guarantee">
			Please provide VIN (optional)
		</label>
		<span class="vin-after-paint-code-optional"></span>
	</div>

	<!-- Stored VIN message (if VIN exists in localStorage) -->
	<div class="stored-vin-message" style="display: none;"></div>

	<!-- Input and submit section -->
	<div class="vin-input-label-and-textbox" style="display: block">
		<label
			id="vin-decoder-textbox-label-{instance}"
			class="vin-decoder-textbox-label"
		>
			VIN
		</label>
		<input
			type="text"
			id="vin-decoder-textbox-for-verification-{instance}"
			placeholder="e.g. 18UYA31581L000000"
			class="vin-decoder-textbox"
			maxlength="17"
			name="properties[VIN]"
		/>
		<button
			type="button"
			class="vin-decoder-submit-btn"
			data-instance="{instance}"
			disabled
		>
			Submit
		</button>
	</div>

	<!-- Error/success messages container -->
	<div class="vin-error-message-container" style="display:none">
		<div
			class="vin-validation-error"
			id="vin-validation-error-{instance}"
		></div>
		<div class="vin-decoder-failed-attempt" style="display: none;">...</div>
		<div class="vin-decoder-remaining-attempts" style="display: none;">...</div>
		<div class="vin-decoder-fetching-vin-data" style="display: none;">...</div>
		<div class="vin-decoder-submission-failed-message" style="display: none;">
			...
		</div>
		<div class="vin-decoder-submission-success-message" style="display: none;">
			...
		</div>
	</div>
</div>
```

### CSS Classes

**Wrapper States:**

- `.vin-decoder-wrapper` - Base wrapper (hidden by default)
- `.vin-decoder-wrapper.show` - Visible state (max-height: fit-content, opacity: 1)

**Input States:**

- `.vin-decoder-textbox` - Normal enabled state
- `.vin-decoder-textbox:disabled` - Disabled state (grayed out)

**Submit Button States:**

- `.vin-decoder-submit-btn` - Enabled blue button
- `.vin-decoder-submit-btn:disabled` - Disabled gray button
- `.vin-decoder-submit-btn--loading` - Loading state with spinner

---

## Instance Initialization Flow

### Step 1: Template Render

```liquid
{% render 'vin-decoder-input-box', instance: 'after' %}
```

### Step 2: Instance Variable Capture (IIFE)

```javascript
<script>
(function() {
  const instance = '{{ instance_suffix }}';  // Captures 'after' or 'byvin'
  const vinInputByInstance = document.getElementById(`vin-decoder-textbox-for-verification-${instance}`);
  const wrapper = document.getElementById(`vin-decoder-textbox-for-verification-wrapper-${instance}`);
  const vinErrorMsgContainer = wrapper.querySelector(".vin-error-message-container");

  // ... rest of instance-specific code
})()
</script>
```

**Key Point:** The IIFE creates a closure that captures the `instance` value at render time, ensuring each instance has its own isolated scope.

### Step 3: DOM Ready Event Listener

```javascript
document.addEventListener("DOMContentLoaded", async function () {
	const garageSearchTerms = getSearchTerms();

	// Attach input event listener specific to this instance
	vinInputByInstance.addEventListener("input", async function (event) {
		// ... validation logic
	});
});
```

### Step 4: Submit Button Listener

```javascript
const vinSubmitBtn = document.querySelector(`[data-instance="${instance}"]`);

if (vinSubmitBtn) {
	vinSubmitBtn.addEventListener("click", async function () {
		// ... submission logic
	});
}
```

**Selector Strategy:** Uses `data-instance` attribute to find the correct submit button for this instance.

---

## Input Event Flow

### Complete Input Processing Pipeline

```
User types in VIN input
    ↓
Input event fires
    ↓
1. Capture original value
    ↓
2. Convert to uppercase
    ↓
3. Call handleVinChange(event, 3, errorMsg)
    ↓
4. Filter invalid characters
    ↓
5. Check fitment restrictions (if applicable)
    ↓
6. Validate character inclusion rules
    ↓
7. Show/hide error messages
    ↓
8. Enable/disable submit button
    ↓
9. Update Add to Cart button state
    ↓
10. Update progress header colors
```

### Detailed Breakdown

#### 1. Initial Processing

```javascript
vinInputByInstance.addEventListener('input', async function (event) {
  const originalValue = event.target.value;
  let vinInput = originalValue.toUpperCase();
  let shouldShowErrorMsg = false;
  let errorMsg = "";
```

#### 2. Retry Check (handleVinChange)

```javascript
const isRetryed = handleVinChange(event, 3, '{{ 'garage.enter_valid_characters' | t }}');
const validationError = document.getElementById(`vin-validation-error-${instance}`);

if (isRetryed) {
  return;  // Stop processing if user is in retry state
}
```

**Purpose:** Prevents users from entering more characters if they've exceeded retry limits.

#### 3. Character Filtering

```javascript
const filteredValue = vinInput.replace(
	/[IOQ\s:;()!@#$%^?'"&*\-_=+.`~<>{}\[\]|,\/\\]/gi,
	""
);
const hadInvalidChars = vinInput !== filteredValue;
event.target.value = filteredValue;
vinInput = filteredValue;
```

**Filtered Characters:**

- Letters: I, O, Q (not valid in VINs)
- Whitespace
- Special characters: `:;()!@#$%^?'"&*-_=+.\`~\<\>{}[]|,/\`

#### 4. Fitment Validation

```javascript
const title = '{{ 'vin_decoder_product_page.vin_question' | t }}';
const fitmentTypeSelect = Array.from(document.querySelectorAll('.option-title-fitment'))
  .find(element => element.textContent === title);

if (fitmentTypeSelect) {
  const { isCharPresent, inclusionChars, inclusionCountry, exclusionChars, exclusionCountry, groupIndex }
    = checkVinFitment(vinInput);
```

**Purpose:** Some products have country-specific fitment requirements (e.g., "VIN must start with 1, 4, or 5 for US vehicles").

#### 5. Inclusion Character Validation

```javascript
if (inclusionChars) {
  if (vinInput.length > 0 && !isCharPresent) {
    shouldShowErrorMsg = true;
    errorMsg = '{{ 'vin_decoder_product_page.err_msg' | t }}' + ' ' + `"${inclusionChars}"`;
  }

  // Check for copy-paste of full 17-character VIN
  if (vinInput.length === 17 && !isCharPresent) {
    toggleCollectionRedirectModal(event, vinInput, groupIndex, inclusionCountry,
                                  exclusionChars, exclusionCountry, true,
                                  compatibilityQuestionModal, '{{ currentLocale }}');
  }
}
```

**Modal Trigger:** If user pastes full VIN that doesn't match inclusion requirements, show compatibility question modal.

#### 6. Error Message Display Logic

```javascript
// Hide error if VIN is complete (17 characters) or empty
if (vinInput.length === 17 || vinInput.length === 0) {
	shouldShowErrorMsg = false;
}

if (shouldShowErrorMsg) {
	if (vinErrorMsgContainer) vinErrorMsgContainer.style.display = "block";

	const failedAttemptsElement = wrapper.querySelector(
		".vin-decoder-failed-attempt"
	);
	const remainingAttemptsElement = wrapper.querySelector(
		".vin-decoder-remaining-attempts"
	);
	if (failedAttemptsElement || remainingAttemptsElement) {
		failedAttemptsElement.style.display = "none";
		remainingAttemptsElement.style.display = "none";
	}

	validationError.textContent = errorMsg;
	validationError.style.display = "block";
} else {
	validationError.style.display = "none";
}
```

#### 7. Submit Button State

```javascript
if (vinSubmitBtn) {
	vinSubmitBtn.disabled = vinInput.length !== 17;
}
```

**Rule:** Submit button only enabled when VIN is exactly 17 characters.

#### 8. Add to Cart Button Logic

```javascript
if (vinInput.length === 0) {
	disableAddToCartButton();
} else if (vinInput.length < 17) {
	disableAddToCartButton();
}

// Special case: Paint code selected
const isSelectPaintCodeSelected = document.getElementById(
	"checkbox-select-paint-option"
)?.checked;

if (isSelectPaintCodeSelected) {
	if (vinInput.length === 17) {
		disableAddToCartButton(); // Disable until VIN submitted
	}

	if (!window.isPaintUnavailable) {
		if (vinInput.length === 0 && !selectedVariantUnavailable) {
			enableAddToCartButton(); // Allow checkout without VIN if paint code selected
		} else if (vinInput.length === 17) {
			enableAddToCartButton(); // Enable after valid VIN entered
		}
	} else {
		if (vinInput.length === 17) {
			enableAddToCartButton();
		}
	}
}
```

**Complex Logic:** Add to Cart availability depends on:

- VIN length
- Paint code selection state
- Paint availability
- Variant availability

#### 9. Progress Header Update

```javascript
updateProgressHeaderColors();
```

Updates visual progress indicator at top of page.

---

## Submit Event Flow

### Complete Submission Pipeline

```
User clicks Submit button
    ↓
1. Check button state (disabled/loading)
    ↓
2. Validate VIN length === 17
    ↓
3. Show loading spinner
    ↓
4. Call handleVinDecode() API
    ↓
5a. SUCCESS PATH               5b. FAILURE PATH
    ↓                              ↓
Auto-select paint code         Push to attemptedDecodedVins[]
    ↓                              ↓
Check stored code              Disable submit button
    ↓                              ↓
Hide VIN input                 Check attempt count
    ↓                              ↓
Hide paint code wrapper        If >= 3: Force manual select
    ↓                              ↓
Enable Add to Cart             Disable Add to Cart
    ↓
6. Remove loading spinner
    ↓
7. Update progress header
```

### Detailed Breakdown

#### 1. Initial Validation

```javascript
vinSubmitBtn.addEventListener('click', async function() {
  // Prevent double-click or disabled click
  if (vinSubmitBtn.disabled || vinSubmitBtn.classList.contains('vin-decoder-submit-btn--loading')) {
    return;
  }

  // Get instance-specific input element
  const vinInputElem = document.getElementById(`vin-decoder-textbox-for-verification-${instance}`);
  const vinInput = vinInputElem.value.trim().toUpperCase();

  // Validate length
  if (vinInput.length !== 17) {
    alert('VIN must be exactly 17 characters.');
    return;
  }
```

#### 2. Loading State

```javascript
vinSubmitBtn._originalText = vinSubmitBtn.textContent;
vinSubmitBtn.textContent = "";
vinSubmitBtn.classList.add("vin-decoder-submit-btn--loading");
```

**Visual Effect:** Button text disappears, spinning loader appears via CSS `::after` pseudo-element.

#### 3. VIN Decode API Call

```javascript
let isBumperdotcom = "{{ is_bumperdotcom_make_found }}" === "true";

const isVinValidWithPaintCode = await handleVinDecode(
	vinInput, // VIN string
	"", // License plate (empty for VIN decode)
	"", // Additional param
	3, // Max attempts
	isBumperdotcom, // API selection flag
	failed3timesmsg, // Error messages...
	noResults,
	searchBtn,
	tailoredSuccessMessage,
	failedAttempt,
	remainingAttempts,
	vinDecoderFirstMsg,
	vinDecoderEndMsg,
	forceSelectMsgStart,
	forceSelectMsgEnd
);
```

**API Selection:**

- `isBumperdotcom = true` → Use Bumper.com API
- `isBumperdotcom = false` → Use ChromeData API

**Return Value:**

- `true` → VIN decoded successfully, paint code found
- `false` → Decode failed (invalid VIN, no match, API error)

#### 4. Success Path

```javascript
if (isVinValidWithPaintCode) {
	// Store paint code in localStorage
	handleInsertLocalStoragePaintOption();

	// Auto-check "Use stored code" option
	const checkboxUseStoredCode = document.getElementById(
		"checkbox-paint-code-local-storage"
	);
	checkboxUseStoredCode.checked = true;

	// Hide prompts
	hideGiveUsYourVinMsg();

	// Mark decoder as exhausted (no more attempts needed)
	isVinDecoderExhausted = true;

	// Hide this VIN input (successful, don't need it anymore)
	hideVinInputIfVinExist();

	// Hide paint code dropdown (auto-selected)
	hidePaintCodeWrapper();

	// Enable checkout if auto-selected variant is available
	if (autoSelectedBanned) {
		enableAddToCartButton();
	}
}
```

**Success Flow:**

1. Paint code stored in localStorage (garage)
2. "Use my stored paint code" radio automatically checked
3. VIN input hidden
4. Paint code dropdown hidden
5. Add to Cart enabled (if variant available)

#### 5. Failure Path

```javascript
  else {
    // Track failed attempt
    attemptedDecodedVins.push(vinInput);

    // Disable submit for this instance
    vinSubmitBtn.disabled = true;

    // Still hide input (failed, can't retry in same instance)
    hideVinInputIfVinExist();
  }
```

#### 6. Max Attempts Handling

```javascript
updateProgressHeaderColors();

if (attemptedDecodedVins.length >= decodeMaxAttempts) {
	isVinDecoderExhausted = true;

	if (successfulVinDecoding === false) {
		// All 3 attempts failed
		vinInputElem.value = "";
		vinInputElem.disabled = true;

		// Force user to manually select paint code
		resortToForceSelectCode();

		// Show instructional message
		formulateForcePaintCodeSelectMsg(
			vinInput,
			"",
			forceSelectMsgStart,
			forceSelectMsgEnd,
			3
		);

		hideGiveUsYourVinMsg();
		hidePaintCodeAppContainer(false);
		disableAddToCartButton();
	} else {
		// At least one attempt succeeded
		enableAddToCartButton();
	}
}
```

**Max Attempts Rules:**

- Variable: `decodeMaxAttempts` (typically 3)
- Array: `attemptedDecodedVins[]` tracks all submitted VINs
- After 3 failures: Force manual paint code selection
- Success within 3 attempts: Allow checkout

#### 7. Cleanup

```javascript
  vinSubmitBtn.classList.remove('vin-decoder-submit-btn--loading');
  vinSubmitBtn.textContent = vinSubmitBtn._originalText || '{{ 'vin_decoder_product_page.submit' | t }}';
  updateProgressHeaderColors();
});
```

---

## Key Functions Reference

### handleVinChange()

**Location:** `global-library.js` (line ~985)

**Purpose:** Rate limiting and retry prevention

**Parameters:**

- `event` - Input event object
- `functionLocation` - Location ID (e.g., 3)
- `errorMsg` - Error message to display

**Returns:**

- `true` - User is retrying (stop further processing)
- `false` - Continue normal processing

**Logic:**
Prevents users from continuously retrying after failed attempts by tracking state.

---

### handleVinDecode()

**Location:** `global-library.js` (line ~2473)

**Purpose:** Core VIN decode API call and response handling

**Parameters:**

```javascript
async function handleVinDecode(
  vinInput,              // String: 17-char VIN
  licensePlate,          // String: License plate (or empty)
  additionalParam,       // String: Extra param
  maxAttempts,           // Number: Max decode attempts (3)
  isBumperdotcom,        // Boolean: API selection
  failed3timesmsg,       // String: Error message translations...
  noResults,
  searchBtn,
  tailoredSuccessMessage,
  failedAttempt,
  remainingAttempts,
  vinDecoderFirstMsg,
  vinDecoderEndMsg,
  forceSelectMsgStart,
  forceSelectMsgEnd
)
```

**Returns:**

- `Promise<boolean>` - True if paint code found and matched

**Process:**

1. Make API request to decode VIN
2. Parse response for paint codes
3. Match paint codes to available product variants
4. Auto-select matching variant
5. Handle mismatch scenarios
6. Show appropriate messages
7. Return success/failure status

---

### handleInsertLocalStoragePaintOption()

**Location:** `global-library.js` (line ~2809)

**Purpose:** Manage stored VIN/paint code from garage (localStorage)

**Returns:**

- `String` - Paint code color name (or empty)

**Process:**

1. Check localStorage for garage data
2. Find first vehicle entry
3. Extract paint code and color
4. Create "Use my stored code" radio option
5. Display stored information to user
6. Return color name

**Storage Format:**

```javascript
garage: [
	{
		vin: "1HGBH41JXMN109186",
		paintCode: "NH731P",
		color: "Silver Metallic",
		// ... other vehicle data
	},
];
```

---

### hideVinInputIfVinExist()

**Location:** `product-page-component-library.js` (line ~796)

**Purpose:** Hide VIN input sections when VIN already provided

**Logic:**

```javascript
function hideVinInputIfVinExist() {
	// Check if VIN exists in garage/storage
	if (hasVinOnFile) {
		// Hide both instances
		document
			.getElementById("vin-decoder-after-selection")
			?.classList.add("hidden");
		document.getElementById("vin-decoder-option")?.classList.add("hidden");

		// Add body class for CSS targeting
		document.body.classList.add("has-vin-on-file");
	}
}
```

**CSS Impact:**

```css
.has-vin-on-file #vin-after-paint-code-selection-byvin {
	display: none !important;
}
.has-vin-on-file #vin-after-paint-code-selection-after {
	display: none !important;
}
```

---

### hidePaintCodeWrapper()

**Location:** `product-page-component-library.js` (line ~411)

**Purpose:** Hide paint code dropdown when auto-selected

**Logic:**

```javascript
function hidePaintCodeWrapper() {
	const paintCodeWrapper = document.querySelector(".paint-code-wrapper");

	if (paintCodeWrapper) {
		paintCodeWrapper.classList.remove("show");
		// Triggers CSS transition to collapse
	}
}
```

**CSS Transition:**

```css
.paint-code-wrapper {
	max-height: 0;
	overflow: hidden;
	opacity: 0;
	transition: max-height 0.5s ease, opacity 0.5s ease, margin-top 0.7s ease;
}

.paint-code-wrapper.show {
	max-height: fit-content;
	opacity: 1;
	margin-top: 3px;
}
```

---

### checkVinFitment()

**Purpose:** Validate VIN against product fitment rules

**Returns:**

```javascript
{
  isCharPresent: boolean,      // Does VIN start with allowed char?
  inclusionChars: string,      // Allowed starting characters (e.g., "1,4,5")
  inclusionCountry: string,    // Country for inclusion (e.g., "USA")
  exclusionChars: string,      // Disallowed starting characters
  exclusionCountry: string,    // Country for exclusion
  groupIndex: string           // Fitment group identifier
}
```

**Example:**

```javascript
// Product only fits US vehicles
checkVinFitment("5YJSA1E14HF250864");
// Returns: { isCharPresent: true, inclusionChars: "1,4,5", inclusionCountry: "USA", ... }

checkVinFitment("JTNKARJE9HJ568890"); // Japanese VIN
// Returns: { isCharPresent: false, inclusionChars: "1,4,5", inclusionCountry: "USA", ... }
```

---

## State Management

### Global Variables (Shared Across Instances)

```javascript
// Attempt tracking
attemptedDecodedVins = []; // Array of VINs already submitted
decodeMaxAttempts = 3; // Maximum decode attempts allowed
isVinDecoderExhausted = false; // True after max attempts reached
successfulVinDecoding = false; // True if any decode succeeded

// Paint code state
window.isPaintUnavailable = false; // True if selected paint unavailable
selectedVariantUnavailable = false; // True if variant out of stock
autoSelectedBanned = false; // True if auto-selected variant is banned/restricted

// UI state
hasVinOnFile = false; // True if VIN in localStorage garage
firstVehicleColor = ""; // Color from garage first vehicle
```

### Instance-Specific Variables (IIFE Scoped)

```javascript
(function () {
	const instance = "after"; // or 'byvin'
	const vinInputByInstance = document.getElementById(
		`vin-decoder-textbox-for-verification-${instance}`
	);
	const wrapper = document.getElementById(
		`vin-decoder-textbox-for-verification-wrapper-${instance}`
	);
	const vinErrorMsgContainer = wrapper.querySelector(
		".vin-error-message-container"
	);
	const vinSubmitBtn = document.querySelector(`[data-instance="${instance}"]`);

	// These variables are unique to each instance's closure
})();
```

---

## UI Visibility Rules

### When "After" Instance is Shown

```javascript
// Checkbox: "Select a paint code"
document.getElementById('checkbox-select-paint-option').checked === true
    ↓
// Show VIN input after paint selection
document.getElementById('vin-decoder-after-selection').style.display = 'block';
```

### When "ByVin" Instance is Shown

```javascript
// Checkbox: "Find paint code using VIN"
document.getElementById('checkbox-get-paint-code-with-vin').checked === true
    ↓
// Show paint code app container
document.getElementById('paintcode-app-container').classList.add('show');
    ↓
// Show VIN input inside container
document.getElementById('vin-decoder-option').style.display = 'block';
```

### When Both are Hidden

```javascript
// VIN already on file in garage
hasVinOnFile === true
    ↓
document.body.classList.add('has-vin-on-file');
    ↓
// CSS hides both instances
.has-vin-on-file #vin-after-paint-code-selection-byvin { display: none !important; }
.has-vin-on-file #vin-after-paint-code-selection-after { display: none !important; }
```

---

## Error Message Hierarchy

### Validation Error (Real-time)

```html
<div class="vin-validation-error" id="vin-validation-error-{instance}">
	VIN must start with "1, 4, or 5"
</div>
```

**Shown During:** Typing (input event)
**Hidden When:** VIN becomes valid or reaches 17 characters

### Failed Attempt (After Submit)

```html
<div class="vin-decoder-failed-attempt">
	VIN decode failed. Please verify and try again.
</div>
```

**Shown After:** Submit button clicked, API returns failure
**Hidden When:** User types in input field again

### Remaining Attempts

```html
<div class="vin-decoder-remaining-attempts">You have 2 attempts remaining.</div>
```

**Shown After:** Failed submit
**Updated On:** Each failed attempt

### Exhausted Attempts (3 Failures)

```html
<div class="vin-decoder-submission-failed-message">
	Unable to decode VIN after 3 attempts. Please select your paint code manually.
</div>
```

**Shown After:** 3rd failed attempt
**Permanent Until:** Page reload

### Success Message

```html
<div class="vin-decoder-submission-success-message">
	VIN decoded successfully! Paint code selected.
</div>
```

**Shown After:** Successful decode
**Auto-hidden After:** 3-5 seconds (varies by implementation)

---

## Complete User Journey Examples

### Journey 1: Success on First Try ("ByVin" Instance)

1. **User lands on product page**

   - Paint options shown
   - No VIN input visible yet

2. **User selects "Find paint code using VIN" radio**

   ```javascript
   checkbox-get-paint-code-with-vin.checked = true
   ```

   - `#paintcode-app-container` transitions to visible
   - `#vin-decoder-option` (byvin instance) displays
   - Two-tone warning message shown

3. **User types VIN: "1HGBH41JXMN109186"**

   - Character validation runs on each keystroke
   - Invalid chars filtered (I, O, Q, special chars)
   - Submit button remains disabled until 17 chars

4. **At 17 characters**

   - Submit button enables
   - No validation errors shown

5. **User clicks Submit**

   - Loading spinner appears
   - API call: `handleVinDecode("1HGBH41JXMN109186", ...)`
   - Response: Paint code "NH731P"

6. **Success Processing**

   - Paint code "NH731P" matched to variant
   - Variant auto-selected in dropdown
   - VIN stored in garage (localStorage)
   - Success message shown briefly
   - VIN input hidden (`hideVinInputIfVinExist()`)
   - Paint dropdown hidden (`hidePaintCodeWrapper()`)
   - "Use my stored code" radio checked
   - Add to Cart button enabled

7. **User can proceed to checkout**

---

### Journey 2: Failure After 3 Attempts ("ByVin" Instance)

1. **User selects "Find paint code using VIN"**

   - ByVin instance shown

2. **Attempt 1: User enters "5YJSA1E14HF250864"**

   - Submit → API call → No matching paint code
   - Error: "Failed attempt. You have 2 remaining attempts."
   - Submit button disabled
   - VIN cleared or disabled

3. **Attempt 2: User enters "2HGFG12848H501234"**

   - Submit → API call → No matching paint code
   - Error: "Failed attempt. You have 1 remaining attempt."

4. **Attempt 3: User enters "19UUA66258A012345"**

   - Submit → API call → No matching paint code
   - Error: "Unable to decode VIN after 3 attempts."
   - `isVinDecoderExhausted = true`
   - `attemptedDecodedVins.length === 3`

5. **System Fallback**

   ```javascript
   resortToForceSelectCode();
   ```

   - VIN input disabled
   - Paint code dropdown shown (force manual selection)
   - Message: "Please select your paint code from the dropdown"
   - Add to Cart remains disabled

6. **User manually selects paint code**
   - Add to Cart enables
   - User can checkout (with caveat they manually selected)

---

### Journey 3: Optional VIN After Paint Selection ("After" Instance)

1. **User selects "Select a paint code" radio**

   - Paint code dropdown shown
   - No VIN input yet

2. **User selects paint code "NH731P - Silver Metallic"**

   - Variant selected
   - Price updates
   - Add to Cart enables
   - "After" instance VIN input appears

3. **Label shows: "Provide VIN to guarantee fit (optional)"**

   - User CAN checkout without VIN
   - Or user CAN provide VIN for verification

4. **User chooses to provide VIN**

   - Types: "1HGBH41JXMN109186"
   - Submit → API validates VIN matches paint code
   - Success: VIN stored, order enhanced
   - Mismatch: Warning shown, user can proceed anyway

5. **User checks out**
   - Order properties include VIN
   - Better fulfillment accuracy

---

## Technical Notes

### Why IIFE (Immediately Invoked Function Expression)?

```javascript
(function () {
	const instance = "{{ instance_suffix }}";
	// ... instance-specific code
})();
```

**Reason:** JavaScript variable scoping

**Without IIFE:**

- Both instances would share the same `instance` variable
- Event listeners would reference the last value (always 'byvin')

**With IIFE:**

- Each instance captures its own `instance` value in closure
- Event listeners correctly reference their own elements

### Instance Isolation Guarantees

| Aspect               | Isolation Method                       |
| -------------------- | -------------------------------------- |
| HTML Elements        | Unique IDs via `{{ instance_suffix }}` |
| JavaScript Variables | IIFE closure scope                     |
| Event Listeners      | Instance-specific selectors            |
| CSS Styles           | Class-based (shared) + ID overrides    |
| API Calls            | Shared functions with instance params  |

### Common Pitfalls

**❌ Incorrect:** Querying without instance

```javascript
const vinInput = document.getElementById(
	"vin-decoder-textbox-for-verification"
);
// Returns only first instance, ignores second
```

**✅ Correct:** Instance-specific query

```javascript
const vinInput = document.getElementById(
	`vin-decoder-textbox-for-verification-${instance}`
);
// Returns correct instance element
```

---

## Debugging Guide

### Check Which Instance is Active

```javascript
// In browser console
document.querySelectorAll(".vin-decoder-wrapper.show").forEach((el) => {
	console.log("Active instance:", el.id);
});

// Output examples:
// Active instance: vin-decoder-textbox-for-verification-wrapper-after
// Active instance: vin-decoder-textbox-for-verification-wrapper-byvin
```

### Verify Instance Event Listeners

```javascript
// Check if input has listeners
getEventListeners(
	document.getElementById("vin-decoder-textbox-for-verification-after")
);

// Should show 'input' event listener
```

### Track VIN Decode State

```javascript
// In console
console.log("Attempted VINs:", attemptedDecodedVins);
console.log("Max attempts:", decodeMaxAttempts);
console.log("Exhausted?", isVinDecoderExhausted);
console.log("Success?", successfulVinDecoding);
```

### Monitor API Calls

```javascript
// Watch network tab for:
// ChromeData API: /apps/vin-decoder-proxy
// Bumper.com API: /apps/bumper-api-proxy

// Check request payload:
{
  vin: "1HGBH41JXMN109186",
  // ... other params
}

// Check response:
{
  paintCode: "NH731P",
  color: "Silver Metallic",
  // ... other vehicle data
}
```

---

## Summary Comparison Table

| Feature              | "After" Instance               | "ByVin" Instance                                 |
| -------------------- | ------------------------------ | ------------------------------------------------ |
| **Instance ID**      | `after`                        | `byvin`                                          |
| **Parent Container** | `#vin-decoder-after-selection` | `#paintcode-app-container > #vin-decoder-option` |
| **When Shown**       | After paint code selected      | When "Use VIN" radio checked                     |
| **Purpose**          | Verify/enhance order           | Decode VIN to find paint code                    |
| **Required?**        | Usually optional               | Required for this flow                           |
| **API Purpose**      | Validate match                 | Decode and auto-select                           |
| **Success Action**   | Store VIN, hide input          | Store VIN, hide input + dropdown                 |
| **Failure Action**   | Allow checkout anyway          | Force manual selection after 3 fails             |
| **Add to Cart**      | Already enabled                | Enables after success                            |

---

## Conclusion

The VIN decoder input box system elegantly handles two distinct user flows using a single reusable component. The instance parameter system ensures complete isolation between the two entry points while sharing validation logic and API calls.

**Key Takeaways:**

1. **Instance Isolation:** IIFE closures prevent variable collision
2. **Unique IDs:** All elements namespaced with instance suffix
3. **Shared Logic:** Core functions (handleVinDecode, validation) are reusable
4. **State Management:** Global variables track attempts across all instances
5. **Progressive Enhancement:** Optional VIN after paint selection, required VIN for decode flow
6. **Error Recovery:** 3-attempt limit with manual fallback option

**Maintenance Tips:**

- Always use instance-specific selectors in JavaScript
- Test both instances separately when making changes
- Verify IIFE closure captures instance correctly
- Check global state variables don't leak between instances
- Ensure API calls handle both bumper.com and ChromeData paths

---

**Document Version:** 1.0  
**Last Updated:** December 24, 2025  
**Related Files:**

- `snippets/vin-decoder-input-box.liquid`
- `snippets/product-page-paint-options.liquid`
- `assets/global-library.js`
- `assets/product-page-component-library.js`
