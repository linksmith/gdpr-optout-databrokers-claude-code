# Technical Form Analysis Guide

## Overview

This guide explains how to capture technical details about each data broker's opt-out form during manual processing. This information will be stored in the `form_analysis` database table and used in future phases for full automation.

## Why Capture Technical Details?

- **Full Automation**: Build a complete automation system in Phase 2+
- **Form Change Detection**: Identify when brokers update their forms
- **Reliability**: Document working selectors and workflows
- **Knowledge Base**: Share learnings across sessions

## What to Capture

### 1. Page Structure

```sql
page_url              -- The exact opt-out form URL
form_selector         -- CSS selector for the main form element
multi_step            -- Boolean: Is this a multi-step form?
steps_count           -- Number of steps if multi_step is true
```

**Example observations:**
- "Form is at https://www.spokeo.com/optout, single page"
- "BeenVerified has 3 steps: search, select record, submit opt-out"
- "Main form selector: `form#optout-form`"

### 2. Form Fields

Store as JSON in `field_mappings`:

```json
{
  "first_name": {
    "selector": "input[name='firstName']",
    "type": "text",
    "required": true,
    "placeholder": "First Name",
    "env_var": "FIRST_NAME"
  },
  "email": {
    "selector": "#email",
    "type": "email",
    "required": true,
    "env_var": "EMAIL_REAL"
  },
  "state": {
    "selector": "select[name='state']",
    "type": "select",
    "required": false,
    "options": "US_STATES",
    "env_var": null
  }
}
```

**For each field, capture:**
- **selector**: CSS selector or XPath
- **type**: text, email, tel, select, checkbox, radio, textarea, date
- **required**: Is it required?
- **placeholder**: Placeholder text (helps with validation)
- **env_var**: Which .env variable to use (FIRST_NAME, LAST_NAME, etc.)

### 3. CAPTCHA Details

```sql
captcha_type          -- recaptcha_v2, recaptcha_v3, hcaptcha, cloudflare, none
captcha_selector      -- CSS selector for CAPTCHA element
```

**Example:**
- Type: `recaptcha_v2`
- Selector: `.g-recaptcha`
- Notes: "Appears after filling form, before submit"

### 4. Submit Button

```sql
submit_button_selector  -- CSS selector for submit button
```

**Examples:**
- `button[type='submit']`
- `#submit-btn`
- `input.btn-primary[value='Submit Request']`

**Also note:**
- Button text (helps with verification)
- Whether it's enabled/disabled initially
- Any JavaScript events attached

### 5. Search-First Workflows

For brokers requiring "search for yourself first":

```json
{
  "search_form": {
    "url": "https://broker.com/search",
    "fields": {
      "first_name": {"selector": "#fname", "required": true},
      "last_name": {"selector": "#lname", "required": true},
      "city": {"selector": "#city", "required": false},
      "state": {"selector": "#state", "required": true}
    },
    "submit": "button.search-btn"
  },
  "results_page": {
    "record_selector": ".person-record",
    "select_checkbox": "input[type='checkbox'].select-record",
    "proceed_button": "#continue-to-optout"
  }
}
```

### 6. Anti-Bot Measures & Delays

```json
{
  "after_page_load": 2000,
  "between_fields": 500,
  "before_submit": 1000,
  "after_captcha_solve": 500
}
```

**Observe:**
- Does the form validate after delays?
- Are there rate limits? (e.g., "Too many requests, try again in 5 minutes")
- Does filling fields too quickly trigger detection?

### 7. Form Submission Behavior

```sql
uses_ajax             -- Boolean: Does form submit via AJAX?
redirect_after_submit -- Boolean: Does it redirect to new page?
redirect_url_pattern  -- Pattern for redirect URL (if applicable)
```

**Examples:**
- "Form submits via AJAX, shows confirmation div without page reload"
- "Redirects to /confirmation/{id} after submit"
- "Stays on same page, displays success message in `.alert-success`"

### 8. Confirmation Detection

```sql
confirmation_selector      -- CSS selector for success message
confirmation_text_pattern  -- Text pattern to match (regex-friendly)
```

**Examples:**
- Selector: `.confirmation-message`
- Text pattern: "Your opt-out request has been (received|submitted)"
- Alternative: Check for redirect to `/success` page

### 9. Raw Technical Notes

Use this field for observations that don't fit other categories:

```sql
raw_technical_notes  -- Free-form text
```

**Example notes:**
```
- Form uses React, DOM updates dynamically
- Email field triggers validation on blur
- Phone field auto-formats as (XXX) XXX-XXXX
- Dropdown for state is lazy-loaded after country selection
- Form token expires after 30 minutes
- reCAPTCHA v3 runs in background (score-based)
- Must click "I agree to terms" checkbox before submit enabled
```

## How to Capture During Sessions

### Using Claude Code During Processing

When processing a broker with Claude Code:

1. **Before filling form:**
   ```
   User: "Before we start, please analyze the form structure and capture technical details"

   Claude: [Inspects page, identifies form selector, fields, CAPTCHA, etc.]
   ```

2. **After successful submission:**
   ```
   User: "Store the technical form analysis for [broker_id] in the database"

   Claude: [Inserts into form_analysis table with all captured details]
   ```

3. **Update if form changes:**
   ```
   User: "The form for Spokeo looks different. Re-analyze and update the technical notes"

   Claude: [Updates form_analysis table with new selectors/structure]
   ```

### Manual Database Entry

You can also insert technical notes manually:

```sql
INSERT INTO form_analysis (
    broker_id,
    page_url,
    form_selector,
    field_mappings,
    captcha_type,
    captcha_selector,
    submit_button_selector,
    requires_search_first,
    confirmation_text_pattern,
    required_delays,
    raw_technical_notes,
    analyzed_by,
    known_working
) VALUES (
    'spokeo',
    'https://www.spokeo.com/optout',
    'form#suppression-form',
    '{"listing_url": {"selector": "#listing-url", "type": "url", "required": true, "env_var": null}, "email": {"selector": "#email", "type": "email", "required": true, "env_var": "EMAIL_REAL"}}',
    'none',
    null,
    'button.submit-suppression',
    1,
    'Your opt-out request has been received',
    '{"after_page_load": 2000, "before_submit": 1000}',
    'Search form comes first at spokeo.com/search. Need to find your listing, copy URL, then paste into opt-out form.',
    'manual',
    1
);
```

## Form Analysis Checklist

For each broker, try to capture:

- [ ] **Basic Info**
  - [ ] Page URL
  - [ ] Form selector
  - [ ] Is it multi-step? How many steps?

- [ ] **Form Fields**
  - [ ] List all fields with selectors
  - [ ] Mark required vs. optional
  - [ ] Map to .env variables
  - [ ] Note any special validation

- [ ] **CAPTCHA**
  - [ ] Type (reCAPTCHA v2/v3, hCaptcha, etc.)
  - [ ] Selector
  - [ ] When does it appear?

- [ ] **Submit Process**
  - [ ] Submit button selector
  - [ ] AJAX vs. page reload?
  - [ ] Redirect URL pattern

- [ ] **Confirmation**
  - [ ] Success message selector
  - [ ] Text pattern to verify success

- [ ] **Timing**
  - [ ] Any required delays?
  - [ ] Rate limiting observed?

- [ ] **Special Notes**
  - [ ] Search-first workflow?
  - [ ] JavaScript frameworks used?
  - [ ] Any gotchas?

## Browser DevTools Tips

### Finding Selectors

**Chrome DevTools:**

1. Right-click element → Inspect
2. In Elements panel, right-click element → Copy → Copy selector
3. Test in Console: `document.querySelector('your-selector')`

**Finding forms:**
```javascript
// List all forms on page
document.querySelectorAll('form')

// Find form by ID
document.querySelector('#optout-form')

// Find form containing specific text
[...document.querySelectorAll('form')].find(f => f.textContent.includes('opt-out'))
```

**Finding inputs:**
```javascript
// All inputs in a form
document.querySelectorAll('form#optout-form input')

// Find input by name
document.querySelector('input[name="firstName"]')

// Find input by placeholder
document.querySelector('input[placeholder*="First Name"]')
```

### Detecting AJAX Submissions

**Monitor network requests:**

1. Open DevTools → Network tab
2. Fill and submit form
3. Look for XHR/Fetch requests
4. Check if page reloads or stays

**In Console:**
```javascript
// Check if form uses onsubmit handler
document.querySelector('form').onsubmit
```

### Testing Form Behavior

```javascript
// Test auto-fill
document.querySelector('#firstName').value = 'John';
document.querySelector('#firstName').dispatchEvent(new Event('input', {bubbles: true}));

// Trigger validation
document.querySelector('#email').blur();

// Check if submit button is enabled
document.querySelector('button[type="submit"]').disabled
```

## Example: Complete Form Analysis

Here's a complete example for FamilyTreeNow:

```sql
INSERT INTO form_analysis (
    broker_id,
    page_url,
    form_selector,
    multi_step,
    field_mappings,
    captcha_type,
    captcha_selector,
    submit_button_selector,
    confirmation_selector,
    confirmation_text_pattern,
    required_delays,
    uses_ajax,
    redirect_after_submit,
    raw_technical_notes,
    analyzed_by,
    known_working,
    analyzed_at
) VALUES (
    'familytreenow',
    'https://www.familytreenow.com/optout',
    'form#optout-form',
    0,
    '{
        "first_name": {
            "selector": "input[name=\"fname\"]",
            "type": "text",
            "required": true,
            "env_var": "FIRST_NAME"
        },
        "middle_name": {
            "selector": "input[name=\"mname\"]",
            "type": "text",
            "required": false,
            "env_var": "MIDDLE_NAME"
        },
        "last_name": {
            "selector": "input[name=\"lname\"]",
            "type": "text",
            "required": true,
            "env_var": "LAST_NAME"
        },
        "city": {
            "selector": "input[name=\"city\"]",
            "type": "text",
            "required": false,
            "env_var": "CURRENT_CITY"
        },
        "state": {
            "selector": "select[name=\"state\"]",
            "type": "select",
            "required": false,
            "env_var": null,
            "note": "US states only, leave blank for international"
        }
    }',
    'recaptcha_v2',
    '.g-recaptcha',
    'button[type=\"submit\"]',
    '.confirmation-message',
    'Your opt-out request has been received and will be processed immediately',
    '{"after_page_load": 1500, "after_captcha_solve": 500, "before_submit": 800}',
    0,
    0,
    'Simple form, no JavaScript validation. reCAPTCHA appears after page load. Confirmation message shows on same page without redirect. No rate limiting observed.',
    'claude_code',
    1,
    CURRENT_TIMESTAMP
);
```

## Querying Form Analysis Data

### View all analyzed forms:
```sql
SELECT broker_id, page_url, captcha_type, known_working, analyzed_at
FROM form_analysis
ORDER BY analyzed_at DESC;
```

### Get technical details for specific broker:
```sql
SELECT * FROM form_analysis WHERE broker_id = 'spokeo';
```

### Find brokers with CAPTCHA:
```sql
SELECT broker_id, captcha_type, captcha_selector
FROM form_analysis
WHERE captcha_type != 'none' AND captcha_type IS NOT NULL;
```

### Export as JSON for automation:
```sql
SELECT broker_id, json_object(
    'page_url', page_url,
    'form_selector', form_selector,
    'field_mappings', json(field_mappings),
    'captcha_type', captcha_type,
    'submit_button_selector', submit_button_selector
) as automation_config
FROM form_analysis
WHERE known_working = 1;
```

## Future Use: Full Automation

Once you've captured technical details for all brokers, you can build:

1. **Automated form filler**: Script that reads form_analysis and fills forms automatically
2. **Change detector**: Monitor brokers and alert when forms change
3. **Reliability scorer**: Track which forms work consistently
4. **Batch processor**: Process multiple brokers without human intervention (except CAPTCHAs)

## Best Practices

1. **Test before marking known_working=1**: Ensure the selectors actually work
2. **Update when forms change**: Brokers update their forms regularly
3. **Include screenshots**: Reference form_screenshot_path for visual confirmation
4. **Be specific with selectors**: Prefer IDs over classes, avoid nth-child when possible
5. **Document edge cases**: Use raw_technical_notes for special behaviors
6. **Validate JSON**: Check field_mappings JSON is valid before inserting
7. **Track dates**: Use analyzed_at and last_successful_submission to track freshness

## Troubleshooting

**Selector doesn't work:**
- Use DevTools to verify element exists
- Check for dynamically loaded content (use delays)
- Try alternative selectors (ID → name → class → XPath)

**Form structure changed:**
- Update form_analysis record with new selectors
- Set last_updated = CURRENT_TIMESTAMP
- Add note in raw_technical_notes about what changed

**Can't find submit button:**
- Look for `input[type="submit"]`
- Check for `button` elements
- Search for `onclick` handlers in links
- Form might submit via JavaScript (capture the function name)

---

For questions or to contribute form analysis data, see the main documentation in `docs/usage-guide.md`.
