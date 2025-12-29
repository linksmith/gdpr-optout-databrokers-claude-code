# CAPTCHA UX Flow - Hybrid Mode

This document explains how CAPTCHA solving integrates into the Claude Code conversational workflow for both automated (API) and manual (user-assisted) modes.

---

## Overview: Three CAPTCHA Modes

### Mode 1: Fully Automated (API Only)
- **When**: `CAPTCHA_ENABLED=true` and API key is valid
- **Flow**: API solves all CAPTCHAs automatically
- **User involvement**: None (unless API fails)
- **Best for**: Unattended batch processing (Phase 2B)

### Mode 2: Hybrid (API + Manual Fallback) ✅ **Recommended**
- **When**: `CAPTCHA_ENABLED=true` with manual fallback
- **Flow**: API tries first, user solves if API fails
- **User involvement**: Only when API fails (~5% of cases)
- **Best for**: Phase 2A (current implementation)

### Mode 3: Manual Only (Phase 1)
- **When**: `CAPTCHA_ENABLED=false`
- **Flow**: User solves all CAPTCHAs manually
- **User involvement**: Every CAPTCHA
- **Best for**: Testing, no API costs, full control

---

## Detailed UX Flow: Hybrid Mode

### Scenario A: Successful API Solve (95% of cases)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Claude Code navigates to broker                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
User: "Process TruePeopleSearch"

Claude: "Navigating to TruePeopleSearch opt-out page...
         ✓ Page loaded

         This broker requires searching for yourself first.
         I'll fill the search form with your data..."

[Claude fills search form: First Name, Last Name, City]

Claude: "Searching for your records..."

[Results page loads]

Claude: "Found 2 matching records:
         1. Jeremy [Last] - Amsterdam, Netherlands - Age 35
         2. Jeremy [Last] - Rotterdam, Netherlands - Age 32

         I'll select both for opt-out."

[Claude selects records, clicks "Continue to Opt-Out"]

┌─────────────────────────────────────────────────────────────┐
│ Step 2: CAPTCHA Detection                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
Claude: "🔍 CAPTCHA detected: reCAPTCHA v2
         Sitekey: 6LeXXXXXXXXXXX

         🤖 Sending to 2Captcha API for automated solving..."

[15-30 seconds pass - API is solving in background]

┌─────────────────────────────────────────────────────────────┐
│ Step 3: API Solves Successfully                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
Claude: "✅ CAPTCHA solved in 18.4s
         Cost: $0.001

         Injecting solution and continuing..."

[Claude injects token, CAPTCHA clears]

┌─────────────────────────────────────────────────────────────┐
│ Step 4: Submit Form                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
Claude: "Taking pre-submission screenshot...
         ✓ Saved to data/screenshots/truepeoplesearch_pre_20250129.png

         Ready to submit opt-out request?"

User: "Yes, submit"

Claude: "✓ Form submitted
         ✓ Confirmation received
         ✓ Screenshot saved
         ✓ Database updated

         TruePeopleSearch opt-out complete! 🎉

         Moving to next broker..."
```

**Total user interaction**: 1 confirmation ("Yes, submit")
**CAPTCHA involvement**: Zero - fully automated

---

### Scenario B: API Fails, Manual Fallback (5% of cases)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1-2: Same as above (navigate, detect CAPTCHA)         │
└─────────────────────────────────────────────────────────────┘
                          ↓
Claude: "🔍 CAPTCHA detected: reCAPTCHA v2
         Sitekey: 6LeXXXXXXXXXXX

         🤖 Sending to 2Captcha API for automated solving..."

[30 seconds pass]

┌─────────────────────────────────────────────────────────────┐
│ Step 3: API Fails                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
Claude: "⚠️  API solving failed: Unusual CAPTCHA challenge detected

         No problem! Falling back to manual solving..."

┌─────────────────────────────────────────────────────────────┐
│ Step 4: User Manual Solve                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
Claude: "⏸️  **Manual CAPTCHA Required**

         Please solve the CAPTCHA in the browser window.

         [Browser window highlights/focuses automatically]

         Instructions:
         1. Look at the browser window (it should be visible)
         2. Complete the CAPTCHA challenge
         3. Type 'done' here when finished

         (Or type 'skip' to skip this broker for now)"

[User switches to browser window]
[User sees reCAPTCHA: "Select all images with traffic lights"]
[User clicks images, clicks Verify]
[CAPTCHA clears with green checkmark]

User: "done"

┌─────────────────────────────────────────────────────────────┐
│ Step 5: Verify and Continue                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
Claude: "✓ CAPTCHA verified!
         Solve method: manual

         Continuing with form submission..."

[Rest of flow same as Scenario A]

Claude: "Taking pre-submission screenshot...
         Ready to submit?"

User: "Yes, submit"

Claude: "✓ Complete! Database updated with CAPTCHA stats:
         - Method: manual
         - Solve time: ~45s (from detection to completion)

         Moving to next broker..."
```

**Total user interaction**:
- Solve CAPTCHA in browser (~30s)
- Type "done" to confirm
- Confirm submission

---

## Browser Window Management

### How Claude Code Shows the Browser

**During Normal Processing**:
- Browser window is **visible** (not headless)
- You can see Claude navigating and filling forms
- Window stays in background while Claude works

**When CAPTCHA Needs Manual Solving**:
1. **Browser window auto-focuses** (comes to foreground)
2. **Terminal/Claude Code shows instructions**
3. User sees CAPTCHA clearly in focused browser
4. User solves, types "done" in terminal
5. Browser returns to background, Claude continues

### Visual Example

```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ Terminal (Claude Code)          │  │ Chrome Browser                  │
│                                 │  │                                 │
│ Claude: "Filling form..."       │  │ [TruePeopleSearch page]         │
│ Claude: "CAPTCHA detected!"     │  │ [Form filled]                   │
│ Claude: "API failed, need       │  │ [reCAPTCHA widget visible]      │
│          manual solve..."       │  │                                 │
│                                 │  │ ┌─────────────────────────┐     │
│ ⏸️ **Manual CAPTCHA Required**  │  │ │ I'm not a robot ☐       │     │
│                                 │  │ └─────────────────────────┘     │
│ Please solve in browser →→→→→→→→→→→→ [Browser auto-focuses]         │
│                                 │  │                                 │
│ Type 'done' when finished:      │  │                                 │
│ > _                             │  │                                 │
└─────────────────────────────────┘  └─────────────────────────────────┘

[User clicks checkbox, solves image challenge]

┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│ Terminal (Claude Code)          │  │ Chrome Browser                  │
│                                 │  │                                 │
│ Type 'done' when finished:      │  │ [reCAPTCHA solved ✓]            │
│ > done                          │  │ ┌─────────────────────────┐     │
│                                 │  │ │ ✓ Verified              │     │
│ Claude: "✓ CAPTCHA verified!"   │  │ └─────────────────────────┘     │
│ Claude: "Continuing..."         │  │                                 │
│                                 │  │ [Form ready to submit]          │
└─────────────────────────────────┘  └─────────────────────────────────┘
```

---

## User Commands During CAPTCHA

### When Asked to Solve Manually

**Option 1: Solve and Continue**
```
User: "done"
```
Claude verifies CAPTCHA is solved, continues with submission.

**Option 2: Skip This Broker**
```
User: "skip"
```
Claude marks broker as skipped, moves to next broker.

**Option 3: Take a Screenshot First**
```
User: "screenshot"
```
Claude takes a screenshot of current state, then waits for you to solve.

**Option 4: Retry with API**
```
User: "retry api"
```
Claude attempts API solving again (useful if first failure was transient).

**Option 5: Abort Session**
```
User: "stop" or "quit"
```
Claude saves progress and exits gracefully.

---

## Timing Expectations

### API Solve Time
| CAPTCHA Type | Typical Time | Range |
|--------------|--------------|-------|
| reCAPTCHA v2 | 20s | 15-40s |
| reCAPTCHA v3 | 25s | 20-45s |
| hCaptcha | 22s | 18-35s |
| Cloudflare Turnstile | 18s | 10-30s |

**User sees**: Progress message, then solved notification

### Manual Solve Time
| CAPTCHA Type | Typical Time |
|--------------|--------------|
| reCAPTCHA v2 (checkbox) | 5-10s |
| reCAPTCHA v2 (images) | 20-40s |
| hCaptcha (images) | 25-45s |

**User sees**: Instructions, solves at own pace

---

## Error Handling

### What Happens When...

#### API Key Invalid or Missing
```
Claude: "⚠️  CAPTCHA API not configured

         I detected a CAPTCHA, but CAPTCHA_ENABLED=false or
         CAPTCHA_API_KEY is not set in .env

         Falling back to manual solving...

         💡 Tip: Set up CAPTCHA API to automate this!
             See docs/usage-guide.md for setup instructions."
```

#### API Balance Too Low
```
Claude: "⚠️  2Captcha balance low: $0.23

         This is enough for ~230 CAPTCHAs, but I recommend
         adding funds soon.

         Attempting to solve with API anyway..."

[If balance hits $0]

Claude: "⚠️  2Captcha balance depleted: $0.00

         Cannot use API solving. Falling back to manual mode
         for this and remaining brokers.

         Please add funds at https://2captcha.com"
```

#### User Doesn't Respond
```
Claude: "⏸️  Manual CAPTCHA required...
         Type 'done' when finished:"

[5 minutes of no response]

Claude: "⏸️  Still waiting for CAPTCHA solve...

         (Browser should be showing the CAPTCHA.
          If not visible, type 'show' to bring it to front,
          or 'skip' to skip this broker)"

User: "show"

Claude: "✓ Browser window focused. Please solve and type 'done'"
```

#### CAPTCHA Changes After User Thinks They Solved It
```
User: "done"

Claude: "Verifying CAPTCHA solution..."

[Checks page - CAPTCHA still present]

Claude: "⚠️  CAPTCHA verification failed - challenge still present.

         This can happen if:
         - The CAPTCHA expired (they timeout after 2 minutes)
         - The solution was incorrect
         - The page refreshed

         Please solve again and type 'done'"

User: [solves again] "done"

Claude: "✓ Verified! Continuing..."
```

---

## Database Tracking

### What Gets Recorded

**For API Solves**:
```sql
INSERT INTO submissions (
  broker_id,
  captcha_encountered,
  captcha_type,
  captcha_solve_method,
  captcha_solve_time_seconds,
  captcha_api_cost,
  captcha_api_provider,
  ...
) VALUES (
  'truepeoplesearch',
  1,                    -- TRUE
  'recaptcha_v2',
  'api',
  18.4,                 -- seconds
  0.001,                -- $0.001
  '2captcha',
  ...
);

INSERT INTO captcha_stats (
  broker_id,
  captcha_type,
  solve_method,
  api_provider,
  success,
  solve_time_seconds,
  api_cost
) VALUES (
  'truepeoplesearch',
  'recaptcha_v2',
  'api',
  '2captcha',
  1,                    -- TRUE
  18.4,
  0.001
);
```

**For Manual Solves**:
```sql
-- Same as above, but:
captcha_solve_method = 'manual'
captcha_api_cost = NULL
captcha_api_provider = NULL
solve_time_seconds = [time from detection to user typing "done"]
```

### Querying Stats

**During a session**:
```
User: "Show CAPTCHA stats"

Claude: "CAPTCHA Statistics (this session):

         Total CAPTCHAs encountered: 12
         ├─ API solved: 11 (92%)
         │  ├─ Average time: 22.3s
         │  └─ Total cost: $0.011
         └─ Manual solved: 1 (8%)
            └─ Time: 47s

         Total time saved vs manual: ~4.5 minutes
         Total cost: $0.011"
```

**Cumulative stats**:
```
User: "Show all-time CAPTCHA stats"

Claude: [Queries captcha_stats table]

         "CAPTCHA Statistics (all-time):

          Total CAPTCHAs: 47
          ├─ API: 45 (96%)
          │  ├─ Success rate: 95.8%
          │  ├─ Average time: 21.7s
          │  └─ Total cost: $0.045
          └─ Manual: 2 (4%)
             └─ Average time: 51s

          Most common type: reCAPTCHA v2 (89%)
          Most reliable provider: 2captcha (95.8% success)

          Time saved: ~18 minutes
          Money spent: $0.045"
```

---

## Configuration Recommendations

### For Different Use Cases

#### Privacy-Conscious User (No Third-Party API)
```bash
# .env
CAPTCHA_ENABLED=false
```
**UX**: Manual solve all CAPTCHAs
**Cost**: $0
**Time**: ~20 min per 40-broker run

---

#### Cost-Conscious User (Hybrid, Minimize API Use)
```bash
# .env
CAPTCHA_ENABLED=true
CAPTCHA_API_KEY=your_key
```

**UX**: API tries first, manual fallback
**Cost**: ~$0.025 per run (API used 95% of time)
**Time**: ~2 minutes manual intervention (for 5% failures)

---

#### Time-Optimized User (Full Automation)
```bash
# .env
CAPTCHA_ENABLED=true
CAPTCHA_API_KEY=your_key
```

**UX**: Same as above, but run in batch mode (Phase 2B)
**Cost**: ~$0.025 per run
**Time**: 0 minutes (fully unattended)

---

## Future: Phase 2B Unattended Mode

### How It Would Work

**Current (Phase 2A - Conversational)**:
```
User: "Process TruePeopleSearch"
Claude: [Processes] "Done!"
User: "Process FastPeopleSearch"
Claude: [Processes] "Done!"
```
*Sequential, conversational*

**Future (Phase 2B - Batch)**:
```
User: "Process all Tier 1 brokers unattended"
Claude: "Starting batch processing of 10 brokers...

         I'll run this in the background.
         You can leave and I'll email you when done.

         Start? [Y/n]"

User: "Y"

Claude: "✓ Batch started. Estimated time: 45 minutes

         You can:
         - Close this terminal (process continues)
         - Check status: claude --status
         - Stop: claude --stop

         I'll email you at your.email@example.com when complete."

[3 hours later, email arrives]

Subject: GDPR Opt-Out Batch Complete
Body:
  ✓ Completed: 8/10 brokers
  ✗ Failed: 2 brokers (need manual retry)

  CAPTCHA Stats:
  - API solved: 6 (100% success)
  - Cost: $0.006

  See full report: http://localhost:3000/reports/batch-20250129
```

**This requires**:
- Background worker process
- Queue-based architecture
- Email notification system
- Web dashboard

**Not part of Phase 2A** - but the CAPTCHA solver module is ready for it!

---

## Summary: Integration Points

### Where CAPTCHA Solving Happens in the Flow

```
Standard Opt-Out Flow:
1. Navigate to broker ✓
2. Fill search form ✓
3. Select records ✓
4. Navigate to opt-out form ✓
5. Fill opt-out fields ✓
6. **→→ CAPTCHA HANDLING ←←**    ⬅️ This is where integration happens
7. Pre-submission review ✓
8. Submit form ✓
9. Capture confirmation ✓
10. Update database ✓
```

### CAPTCHA Module Integration

```javascript
// Pseudocode showing integration

async function processOptOutForm(broker) {
  await navigate(broker.opt_out_url);
  await fillFormFields(userData);

  // INTEGRATION POINT
  const captcha = await detectCaptcha(page);
  if (captcha) {
    await solveCaptcha(page, captcha, {
      onManualFallback: async () => {
        // Claude Code shows message to user
        console.log("⏸️ Manual CAPTCHA required...");
        await waitForUserInput("done");
      }
    });
  }

  await submitForm();
  await captureConfirmation();
}
```

### Claude Code Conversational Hooks

```
# When CAPTCHA detected
Claude calls: detectCaptcha(page)
↓
Claude says: "🔍 CAPTCHA detected: [type]"

# When API enabled
Claude calls: solveCaptcha(page, captcha)
↓
Claude says: "🤖 Sending to API..."
↓
[Wait 15-40s]
↓
Claude says: "✅ Solved in [time]"

# When API fails
Claude receives: onManualFallback callback
↓
Claude says: "⏸️ Manual solve required..."
↓
Claude waits for: User types "done"
↓
Claude verifies: CAPTCHA is solved
↓
Claude says: "✓ Verified! Continuing..."
```

---

## Key Takeaways

1. **Hybrid mode is seamless** - User only involved when API fails (~5%)
2. **Browser is always visible** - User can see what's happening
3. **Simple commands** - Just type "done" when you solve
4. **Full fallback** - Always works, even with no API key
5. **Tracked everywhere** - All CAPTCHA data logged to database
6. **Ready for Phase 2B** - Module supports full automation

**The UX goal**: Make CAPTCHA solving feel like a minor pause, not a context switch.
