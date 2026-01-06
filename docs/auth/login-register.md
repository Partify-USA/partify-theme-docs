---
sidebar_position: 1
---

# Auth Pages UI and Behavior Changes (Login + Register)

## Summary

- **Centered single-column layout**: Both login and register pages now display in a 560px max-width centered card, eliminating split-screen or scattered layouts.
- **Logo above masthead**: The Partify logo is centered at the top of each card with 18px spacing below, establishing visual hierarchy.
- **Unified card styling**: White background (1px #e6e8ee border, 14px radius, 32px 28px padding, subtle shadow) wraps all authentication content.
- **Consistent input styling**: All form inputs use 10px radius, #d8dde8 border, 22px 14px 10px 14px padding, and a blue focus ring (rgba(43,111,247,0.12)).
- **Full-width primary button**: Blue button (#2563eb, hover #1d4ed8) with 10px radius, 14px 16px padding, spans the full width of the card.
- **Password confirmation enforcement**: Register page password and confirm fields must match exactly (case, spaces, punctuation); the Create button remains disabled until both fields are non-empty and values match.
- **Live validation feedback**: Inline error message under the confirm password field updates as users type, paste, or blur.
- **Preserved link clickability**: No overlays block interactions; absolute-positioned floating labels use `pointer-events: none` only on the label itself.
- **Responsive design**: Desktop title 40px, mobile 28px; card padding adjusted at 600px breakpoint; grid/flex fields stack to single column on mobile.
- **Recovery toggle refinement**: Password reset form button row uses a grid layout (1fr auto on desktop, 1fr on mobile) to balance submit and cancel button proportions.

## Files Changed

| File                                   | Change Type | Purpose                                                                                                                         |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| partify-theme/sections/login.liquid    | Modified    | Centered layout, logo placement, card styling, recovery button grid, CSS consolidation, button secondary styling                |
| partify-theme/sections/register.liquid | Modified    | Card wrapper, logo block, centered masthead, 5-field stack, password confirmation with validation script, button disabled state |

---

## Login Page (customers/login)

### Goals

- Implement a centered, single-column layout that guides user focus to authentication inputs.
- Place the Partify logo at the top of a prominent white card to reinforce brand identity.
- Provide a seamless "forgot password" recovery flow with a toggle that switches between login and password reset forms within the same card.
- Ensure all interactive elements (links, buttons, form toggles) remain accessible and clickable.
- Maintain responsive behavior with adjusted typography and padding on mobile devices.

### Template Structure

The login template (`login.liquid`) uses Shopify's native form handlers and conditional logic:

```liquid
<section class="account-page account-page-login" data-template-account data-template-account-login>
  <div class="login-logo">
    <img src="{{ 'partifylogo_6c2c0d05-aa6b-404a-8c8f-3041d69ea653.png' | file_url }}" alt="Partify" class="login-logo-image" width="180" height="57">
  </div>

  <header class="account-page-masthead account-page-masthead--centered">
    <h1 class="account-page-title">Welcome back</h1>
    <p class="account-page-subtitle">Log into your account for a personalized experience.</p>
  </header>

  <article class="account-page-content">
    <!-- Main login form inside .account-login card -->
    <!-- Recovery form inside .account-recovery card -->
    <!-- Guest login inside .account-register--guest card -->
  </article>
</section>
```

### Key Markup Elements

| Element                            | Class/ID                   | Purpose                                                     |
| ---------------------------------- | -------------------------- | ----------------------------------------------------------- |
| `.login-logo`                      | Top-level logo container   | Centered brand image above masthead                         |
| `.login-logo-image`                | Logo image element         | 180×57 px asset, responsive max-width                       |
| `.account-page-masthead--centered` | Heading wrapper            | Centered title and subtitle                                 |
| `.account-page-title`              | `<h1>` heading             | "Welcome back" text, 40px desktop / 28px mobile             |
| `.account-page-subtitle`           | `<p>` subheading           | Muted gray guidance text                                    |
| `.account-page-content`            | Article container          | Max-width 560px, centers all nested cards                   |
| `.account-login`                   | Main form card             | `{% form 'customer_login' %}` wrapper, white card style     |
| `.account-recovery`                | Recovery card              | `{% form 'recover_customer_password' %}`, initially hidden  |
| `.form-field`                      | Input wrapper              | Position relative for floating labels                       |
| `.form-field-input`                | Input element              | Email, password inputs with focus ring                      |
| `.form-field-title`                | Label element              | Floating label, absolute positioned, `pointer-events: none` |
| `.button-primary`                  | Submit button              | Full width, blue, disabled state on recovery                |
| `.button-secondary`                | Cancel button on recovery  | Gray background, outline style                              |
| `.account-legal`                   | Terms/policy text          | Centered, muted, clickable links                            |
| `.account-forgot-link`             | "Forgot password?" link    | Toggles to recovery form via `data-login-toggle`            |
| `.account-register-prompt`         | "Don't have account?" link | Links to register page via Shopify filter                   |

### CSS and Styling

The login page uses a consolidated `<style>` block scoped to `.account-page.account-page-login`:

**Scoping selectors:**

```css
.account-page.account-page-login {
	...;
}
.account-page.account-page-login .login-logo {
	...;
}
.account-page.account-page-login .account-login {
	...;
}
/* etc. */
```

**Key CSS rules:**

| Property                | Value                           | Notes                                              |
| ----------------------- | ------------------------------- | -------------------------------------------------- |
| Section padding         | 72px 24px                       | Outer page spacing, adjusts to 48px 20px on mobile |
| Content max-width       | 560px                           | Constrains centered card width                     |
| Card background         | #ffffff                         | White background for login/recovery/guest forms    |
| Card border             | 1px solid #e6e8ee               | Soft gray divider                                  |
| Card border-radius      | 14px                            | Rounded corners                                    |
| Card padding            | 32px 28px                       | Internal spacing, adjusts to 28px 24px on mobile   |
| Card box-shadow         | 0 12px 30px rgba(16,24,40,0.08) | Subtle depth                                       |
| Input border-radius     | 10px                            | Consistent with buttons                            |
| Input border            | 1px solid #d8dde8               | Lighter gray for inputs                            |
| Input padding           | 22px 14px 10px 14px             | Top padding for floating labels                    |
| Input focus border      | #2b6ff7                         | Medium blue                                        |
| Input focus box-shadow  | 0 0 0 4px rgba(43,111,247,0.12) | Subtle glow on focus                               |
| Label `pointer-events`  | none                            | Prevents label from blocking input interaction     |
| Button background       | #2563eb                         | Primary blue                                       |
| Button hover background | #1d4ed8                         | Darker blue on hover                               |
| Button border-radius    | 10px                            | Matches input styling                              |
| Button padding          | 14px 16px                       | Comfortable vertical/horizontal spacing            |

**Recovery toggle button row:**

```css
.account-page.account-page-login .form-action-row--recovery {
	display: grid;
	grid-template-columns: 1fr auto; /* Submit grows, Cancel stays compact */
	gap: 12px;
	align-items: center;
}
/* Mobile: stacks to 1fr (full width both buttons) */
@media (max-width: 600px) {
	.form-action-row--recovery {
		grid-template-columns: 1fr;
	}
}
```

**Secondary button (Cancel on recovery):**

```css
.account-page.account-page-login .button-secondary {
	background: #f3f4f6;
	color: #374151;
	border: 1px solid #d8dde8;
	padding: 14px 16px;
	border-radius: 10px;
	font-weight: 600;
	transition: background 0.2s;
}

.account-page.account-page-login .button-secondary:hover {
	background: #e5e7eb;
}
```

**Accessibility and Link Protection:**

- No overlays or positioned elements cover `.account-legal`, `.account-forgot-link`, or `.account-register-prompt`.
- Links use underline on hover for visual feedback.
- `pointer-events: none` applied only to `.form-field-title` labels, never to containers.

### Login Page: Before vs After

| Aspect                | Before                          | After                                                            |
| --------------------- | ------------------------------- | ---------------------------------------------------------------- |
| **Layout**            | Mixed alignment, variable width | Centered single-column, 560px max-width                          |
| **Logo**              | Not visible or scattered        | Centered above masthead, 18px gap, 200px max-width               |
| **Card styling**      | Inconsistent or missing         | White, 1px #e6e8ee border, 14px radius, shadow                   |
| **Input styling**     | Variable borders/padding        | Uniform 10px radius, #d8dde8 border, 22px 14px 10px 14px padding |
| **Input focus**       | No visible focus ring           | Blue focus with rgba(43,111,247,0.12) ring                       |
| **Button styling**    | Variable sizing/colors          | Full width, #2563eb blue, #1d4ed8 hover, 14px 16px padding       |
| **Recovery toggle**   | Flex or stacked alignment       | Grid 1fr auto on desktop, 1fr on mobile                          |
| **Links clickable**   | Potentially blocked             | Protected: no overlays, pointer-events: none only on labels      |
| **Mobile responsive** | Limited or broken               | Title 28px, padding 48px 20px, card padding 28px 24px            |

---

## Register Page (customers/register)

### Goals

- Mirror the login page's centered single-column layout and card styling for visual consistency.
- Display 5 form inputs stacked vertically: first name, last name, email, password, confirm password.
- Enforce strict password confirmation matching (case, spaces, punctuation) with real-time validation.
- Disable the Create button until both password fields are non-empty and match exactly.
- Provide inline error messaging under the confirm password field that updates live as users type.
- Ensure accessibility with `aria-invalid`, `aria-describedby`, and `aria-live` attributes.
- Prevent form submission if passwords do not match; focus the confirm field on error.
- Keep all interactive elements (links, inputs, buttons) clickable and responsive.

### Template Structure

The register template (`register.liquid`) wraps the Shopify `create_customer` form inside a card container:

```liquid
<section class="account-page account-page-register" data-template-account>
  <article class="account-page-content">
    <div class="account-register-card">
      {% form 'create_customer' %}
        <div class="login-logo">...</div>
        <header class="account-page-masthead account-page-masthead--centered">...</header>
        <!-- Error/Success message block -->
        <!-- 5 form fields in .account-register-grid -->
        <!-- Create button with disabled state -->
        <!-- "Returning customer? Sign in" link -->
      {% endform %}
    </div>
  </article>
</section>
```

### Key Markup Elements

| Element                            | Class/ID                   | Purpose                                                                |
| ---------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| `.account-page-register`           | Section root               | Scopes all register styles                                             |
| `.account-page-content`            | Article wrapper            | Max-width 560px, centers card                                          |
| `.account-register-card`           | Card container             | White background, border, shadow, padding                              |
| `.login-logo`                      | Logo wrapper               | Centered Partify image                                                 |
| `.login-logo-image`                | Logo image                 | 180×57 px, responsive to 140px on mobile                               |
| `.account-page-masthead--centered` | Title block                | "Create account" heading, centered                                     |
| `.account-page-title`              | `<h1>`                     | 40px desktop / 28px mobile                                             |
| `.account-page-subtitle`           | `<p>`                      | Guidance text, muted gray                                              |
| `.account-message`                 | Error/success container    | Colored background blocks for form feedback                            |
| `.account-register-grid`           | Fields wrapper             | Flex column layout, 16px gap between fields                            |
| `.form-field`                      | Input wrapper (×5)         | Position relative, houses input + label + help text                    |
| `.form-field-input`                | Input element              | Text (first/last name, email) or password (password, confirm)          |
| `.form-field-title`                | Label                      | Floating label, absolute, `pointer-events: none`                       |
| `.form-field-help--error`          | Help text (confirm only)   | Inline error message, id `password-confirm-help`, `aria-live="polite"` |
| `.button-primary[disabled]`        | Create button              | Full width, starts disabled, aria-disabled state                       |
| `.form-action-row`                 | Button row                 | Margin-top 24px                                                        |
| `.form-action-row--helper`         | "Returning customer?" link | Centered, clickable sign-in link                                       |

**Confirm password field detail:**

```liquid
<div class="form-field">
  <input
    type="password"
    class="form-field-input form-field-text"
    id="customer_password_confirmation"
    name="customer[password_confirmation]"
  >
  <label
    class="form-field-title"
    for="customer_password_confirmation"
  >
    Confirm password
  </label>
  <p class="form-field-help form-field-help--error" id="password-confirm-help" aria-live="polite"></p>
</div>
```

**Create button with disabled state:**

```liquid
<button class="button-primary form-action--submit" type="submit" disabled aria-disabled="true">
  {{ 'customers.register.submit' | t }}
</button>
```

### CSS and Styling

The register page uses a consolidated `<style>` block scoped to `.account-page.account-page-register`:

**Shared design tokens with login page:**

| Property           | Value                           | Notes                                 |
| ------------------ | ------------------------------- | ------------------------------------- |
| Card background    | #ffffff                         | White                                 |
| Card border        | 1px solid #e6e8ee               | Soft gray                             |
| Card border-radius | 14px                            | Rounded corners                       |
| Card padding       | 32px 28px                       | Internal spacing, 24px 20px on mobile |
| Card shadow        | 0 4px 16px rgba(16,24,40,0.08)  | Subtle depth                          |
| Input radius       | 10px                            | Consistent with buttons               |
| Input border       | 1px solid #d8dde8               | Light gray                            |
| Input padding      | 22px 14px 10px 14px             | Top for floating labels               |
| Input focus border | #2563eb                         | Medium blue                           |
| Input focus shadow | 0 0 0 3px rgba(43,111,247,0.12) | Subtle glow                           |
| Input error border | #ef4444                         | Red on validation error               |
| Button background  | #2563eb                         | Primary blue                          |
| Button hover       | #1d4ed8                         | Darker blue                           |
| Button radius      | 10px                            | Matches inputs                        |
| Button padding     | 14px 16px                       | Comfortable spacing                   |

**Inline error message styling:**

```css
.account-page.account-page-register .form-field-help--error {
	margin-top: 6px;
	font-size: 13px;
	color: #b91c1c; /* Dark red */
	min-height: 18px; /* Reserve space, prevent layout shift */
}
```

**Disabled button styling:**

```css
.account-page.account-page-register .button-primary[disabled] {
	opacity: 0.6;
	cursor: not-allowed;
}
```

**Field layout:**

```css
.account-page.account-page-register .account-register-grid {
	display: flex;
	flex-direction: column;
	gap: 16px; /* Consistent spacing between 5 fields */
}

.account-page.account-page-register .form-field {
	position: relative; /* For absolute floating labels */
}
```

**Floating label (protected from interaction):**

```css
.account-page.account-page-register .form-field-title {
	position: absolute;
	top: 8px;
	left: 14px;
	font-size: 12px;
	color: #6b7280;
	pointer-events: none; /* Only on label, not container */
}
```

### Password Confirmation Validation Script

An inline `<script>` block at the bottom of the register template enforces real-time password validation:

```javascript
document.addEventListener("DOMContentLoaded", function () {
	// 1. Select elements
	var registerForm = document.querySelector(".account-register-card form");
	var passwordInput = document.getElementById("customer_password");
	var confirmInput = document.getElementById("customer_password_confirmation");
	var helpText = document.getElementById("password-confirm-help");
	var submitButton = registerForm.querySelector(
		'button.button-primary[type="submit"]'
	);

	// 2. Event listeners: input, change, blur, keyup, paste
	function evaluatePasswords() {
		var password = passwordInput.value;
		var confirmation = confirmInput.value;
		var bothFilled = password.length > 0 && confirmation.length > 0;
		var matches = bothFilled && password === confirmation; // Strict equality

		if (matches) {
			// Enable button, clear error
			setButtonState(true);
			showMismatchMessage(false);
		} else {
			// Disable button
			setButtonState(false);
			// Show error only if confirm is non-empty
			if (confirmation.length === 0) {
				showMismatchMessage(false);
			} else {
				showMismatchMessage(true);
			}
		}
	}

	// 3. Update button disabled state and aria-disabled
	function setButtonState(enabled) {
		submitButton.disabled = !enabled;
		submitButton.setAttribute("aria-disabled", enabled ? "false" : "true");
	}

	// 4. Update error message and accessibility attributes
	function showMismatchMessage(show) {
		if (show) {
			confirmInput.setAttribute("aria-invalid", "true");
			confirmInput.setAttribute("aria-describedby", "password-confirm-help");
			helpText.textContent = "Passwords must match.";
		} else {
			confirmInput.removeAttribute("aria-invalid");
			confirmInput.removeAttribute("aria-describedby");
			helpText.textContent = "";
		}
	}

	// 5. Attach listeners to both fields
	["input", "change", "blur", "keyup", "paste"].forEach(function (evt) {
		passwordInput.addEventListener(evt, evaluatePasswords);
		confirmInput.addEventListener(evt, evaluatePasswords);
	});

	// 6. On form submit: prevent if mismatch, focus confirm field
	registerForm.addEventListener("submit", function (event) {
		if (passwordInput.value !== confirmInput.value) {
			event.preventDefault();
			showMismatchMessage(true);
			setButtonState(false);
			confirmInput.focus();
		}
	});

	// 7. Initial evaluation on page load
	evaluatePasswords();
});
```

**Validation behavior:**

- **Strict equality**: `password === confirmation` (respects case, spaces, punctuation).
- **Button enable**: Only when both fields non-empty AND values match.
- **Button disable**: Starts disabled; re-enabled when match confirmed.
- **Error message visibility**:
  - Empty confirm field: no message.
  - Non-empty, non-matching: "Passwords must match."
  - Matching: message cleared.
- **Accessibility**:
  - `aria-invalid="true"` set on confirm field during mismatch.
  - `aria-describedby="password-confirm-help"` links confirm field to help text.
  - `aria-live="polite"` on help text so screen readers announce updates.
- **Submit prevention**:
  - If submit button clicked and mismatch exists, `event.preventDefault()` stops submission.
  - Focus is moved to confirm field for user correction.

### Register Page: Before vs After

| Aspect                    | Before                    | After                                                    |
| ------------------------- | ------------------------- | -------------------------------------------------------- |
| **Logo placement**        | Not contained in card     | Centered inside white card, 18px gap                     |
| **Masthead alignment**    | Variable or left-aligned  | Centered within card                                     |
| **Card styling**          | None or inconsistent      | White, 1px #e6e8ee border, 14px radius, shadow           |
| **Field layout**          | Multi-column or scattered | 5 fields stacked vertically in flex column               |
| **Password confirmation** | No inline validation      | Real-time strict-equality matching                       |
| **Create button**         | Enabled by default        | Starts disabled, enabled only on password match          |
| **Error messaging**       | None or hidden            | Inline under confirm field, live aria-live updates       |
| **Accessibility**         | Limited                   | aria-invalid, aria-describedby, aria-live, aria-disabled |
| **Submit prevention**     | Form allows mismatch      | preventDefault() blocks submission if mismatch           |
| **Mobile responsive**     | Limited                   | Title 28px, card 24px 20px padding, single-column fields |

---

## QA Checklist

- [ ] **Login page links clickable**: "Forgot your password?" and "Create account" links work and are not obscured by overlays or positioned elements.
- [ ] **Recovery toggle**: Clicking "Forgot your password?" toggles to the password recovery form; cancel button returns to login.
- [ ] **Recovery button balance**: Submit button is wider than cancel button on desktop; both full width on mobile.
- [ ] **Register password confirmation**: Typing mismatched passwords shows "Passwords must match." message; create button remains disabled.
- [ ] **Register password confirmation match**: Typing matching passwords clears the error message and enables the create button.
- [ ] **Register submit prevention**: Clicking Create while passwords do not match prevents form submission and focuses the confirm field.
- [ ] **Mobile layout (600px breakpoint)**:
  - Title is 28px.
  - Card padding is 24px 20px (tighter than desktop 32px 28px).
  - Logo max-width is 140px (smaller than desktop 180px).
  - Recovery button row stacks to single column (both buttons full width).
  - All form fields stack to single column (if any multi-column existed).
- [ ] **No background color on body/page**: Page background inherits site theme; no forced color added to body or `.account-page` section.
- [ ] **No extra scroll**: Page height is natural; no `min-height: 100vh` or forced viewport heights introduce unwanted vertical scrolling.
- [ ] **Form submissions work**: Login, register, and password reset forms submit to Shopify's expected endpoints; confirm password field is included in form data as `customer[password_confirmation]`.
- [ ] **Accessibility**: Floating labels do not interfere with input interaction; focus rings visible on inputs; error messages announced by screen readers.

---

## Screenshots

To verify the visual outcomes, capture and store the following screenshots in `docs/screenshots/auth/`:

| Screenshot Name                  | Location                        | Purpose                                                                                                                 |
| -------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `login-page-desktop.png`         | Desktop browser                 | Centered login card, logo, title, 2 input fields, sign-in button, links below                                           |
| `login-page-mobile.png`          | Mobile 375px viewport           | Responsive padding, title 28px, card constrained width                                                                  |
| `login-recovery-desktop.png`     | Desktop, recovery form shown    | Recovery card with email field, submit and cancel buttons side-by-side                                                  |
| `login-recovery-mobile.png`      | Mobile 375px, recovery form     | Recovery card, buttons stacked full-width                                                                               |
| `register-page-desktop.png`      | Desktop browser                 | Centered register card, logo, title, 5 form fields stacked, create button disabled (grayed), "Returning customer?" link |
| `register-page-mobile.png`       | Mobile 375px viewport           | Responsive padding, title 28px, 5 fields stacked single column                                                          |
| `register-password-mismatch.png` | Desktop, confirm password error | Red "Passwords must match." message visible below confirm field, create button disabled                                 |
| `register-password-match.png`    | Desktop, passwords match        | Error message cleared, create button enabled (full blue)                                                                |

---

## References

- **Shopify Form Handlers**: `customer_login`, `recover_customer_password`, `create_customer`, `guest_login`
- **Theme Asset**: Partify logo file URL filter (`file_url` liquid filter for CDN-hosted asset)
- **Liquid Conditionals**: `form.password_needed`, `form.errors`, `form.posted_successfully?`, `form | default_errors`
- **CSS Scoping**: Body template class `body.template-customers-login`, `body.template-customers-register`
- **Accessibility Standards**: WCAG 2.1 Level AA (aria-invalid, aria-describedby, aria-live, pointer-events on labels only)
