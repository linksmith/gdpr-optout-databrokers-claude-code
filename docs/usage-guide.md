# GDPR Data Broker Opt-Out - Usage Guide

Complete guide to using Claude Code for automated GDPR opt-out requests.

## Table of Contents

1. [First-Time Setup](#first-time-setup)
2. [Starting a Session](#starting-a-session)
3. [Common Commands](#common-commands)
4. [Workflow Patterns](#workflow-patterns)
5. [Handling Special Cases](#handling-special-cases)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## First-Time Setup

### Step 1: Verify Directory Structure

Ensure all required directories and files exist:

```bash
cd /path/to/gdpr-optout-databrokers
ls -la
```

You should see:
- `config/` directory with `brokers.yaml`
- `data/` directory with `submissions.db` and `screenshots/` subdirectory
- `templates/` directory with `gdpr_request.txt`
- `.env.template` file
- `.gitignore` file

### Step 2: Create Your .env File

```bash
# Copy the template
cp .env.template .env

# Restrict permissions (important!)
chmod 600 .env

# Edit with your favorite editor
nano .env  # or vim, code, etc.
```

Fill in your real information:

```bash
# === IDENTITY ===
FIRST_NAME=Jeremy
LAST_NAME=YourLastName
MIDDLE_NAME=
NAME_VARIATIONS=J. YourLastName,Jeremy OldName

# === CURRENT ADDRESS ===
CURRENT_STREET=123 Main Street
CURRENT_CITY=Amsterdam
CURRENT_POSTAL=1234AB
CURRENT_COUNTRY=Netherlands

# === PREVIOUS ADDRESSES ===
PREVIOUS_ADDRESS_1=456 Old St|Rotterdam|5678CD|Netherlands|2018-2022
PREVIOUS_ADDRESS_2=
PREVIOUS_ADDRESS_3=

# === CONTACT ===
EMAIL_REAL=your.email@example.com
EMAIL_OPTOUT_DOMAIN=optout.yourdomain.com
PHONE=+31612345678

# === VERIFICATION ===
DATE_OF_BIRTH=1990-01-15
```

**CRITICAL**: Never commit this file! Verify it's in `.gitignore`:

```bash
grep ".env" .gitignore
```

### Step 3: Verify Database

```bash
sqlite3 data/submissions.db ".tables"
```

You should see:
```
audit_log            submissions          verification_emails
```

### Step 4: Review Broker List

```bash
cat config/brokers.yaml | grep "name:"
```

This shows all 26+ configured brokers.

---

## Starting a Session

### Launch Claude Code with Chrome

```bash
cd /path/to/gdpr-optout-databrokers
claude --chrome
```

### What Happens on Launch

Claude Code will:
1. Read your `.env` file (personal data)
2. Load `config/brokers.yaml` (broker list)
3. Query `data/submissions.db` (check progress)
4. Present a status summary

Example initialization:

```
Claude: "I've initialized the GDPR opt-out system. I can see:
         - .env file loaded with your personal data
         - config/brokers.yaml has 26 brokers defined
         - data/submissions.db shows 0 completed, 26 pending

         What would you like to do?"
```

---

## Common Commands

All interactions are conversational. Here are common patterns:

### Check Status

```
User: "What's our progress?"
Claude: [Shows completed, pending, awaiting verification counts]

User: "Show me completed brokers"
Claude: [Lists all brokers with status=completed]

User: "What's pending verification?"
Claude: [Lists brokers awaiting email verification]

User: "Show me Tier 1 status"
Claude: [Filters status by tier]
```

### Process Brokers

```
User: "Let's process Tier 1 brokers"
Claude: [Processes all Tier 1 brokers in sequence]

User: "Do 5 easy brokers"
Claude: [Filters by difficulty=easy, processes 5]

User: "Process FamilyTreeNow"
Claude: [Processes single broker]

User: "Continue where we left off"
Claude: [Resumes from last incomplete broker]

User: "Do the easy ones first"
Claude: [Sorts by difficulty, processes easy brokers]
```

### Update Status

```
User: "I verified Spokeo"
Claude: [Updates database: spokeo → completed]

User: "Mark Radaris as skipped - requires account creation"
Claude: [Updates database: radaris → skipped, adds note]

User: "Reset Whitepages to try again"
Claude: [Updates database: whitepages → pending]
```

### Generate Reports

```
User: "Generate a compliance report"
Claude: [Creates markdown report with all submissions]

User: "Show me all screenshot paths"
Claude: [Lists screenshot_path for each broker]

User: "Which brokers require manual follow-up?"
Claude: [Lists brokers with status=failed or notes about issues]
```

---

## Workflow Patterns

### Pattern 1: First-Time User (Test with One Easy Broker)

```
$ claude --chrome

User: "Let's test with FamilyTreeNow"

Claude: "Great choice - FamilyTreeNow is easy (requires CAPTCHA but no email verification).
         Navigating to https://www.familytreenow.com/optout..."

[Browser opens, Claude analyzes form, fills fields]

Claude: "Form filled. I can see there's a reCAPTCHA. Please solve it in the browser."

[User solves CAPTCHA]

User: "Done"

Claude: "Thanks! Here's what I'm about to submit:
         - First Name: Jeremy
         - Last Name: [Your Last Name]
         - City: Amsterdam
         Ready to submit?"

User: "Yes"

Claude: "Submitted! Confirmation received. Screenshot saved. Status: completed"
```

**After first success**: Verify the screenshot was saved and database was updated.

```bash
ls data/screenshots/
sqlite3 data/submissions.db "SELECT broker_id, status FROM submissions;"
```

### Pattern 2: Batch Processing (Process Multiple Brokers)

```
User: "Let's do Tier 1 brokers today"

Claude: "I'll process these 10 Tier 1 brokers:
         1. Spokeo (easy, email verification)
         2. BeenVerified (medium, email verification)
         3. Whitepages (medium, phone verification)
         ...

         Starting with Spokeo..."

[For each broker, Claude will:]
- Navigate to opt-out URL
- Analyze the form
- Fill fields with your data
- Pause for CAPTCHAs if needed
- Ask for confirmation
- Submit and capture screenshot
- Update database

[After 2-3 hours, you may need a break]

User: "I need to stop"

Claude: "No problem! Progress saved. We've completed 7/10 Tier 1 brokers.
         Next time say 'continue where we left off'."
```

### Pattern 3: Resuming a Session

```
$ claude --chrome

User: "Continue where we left off"

Claude: "Welcome back! Current status:
         ✓ Completed: 7 brokers
         ⏳ Awaiting verification: 3 (Spokeo, BeenVerified, Intelius)
         ⏸️  Pending: 16 brokers

         Next up is Whitepages (medium difficulty, phone verification).
         Proceed with Whitepages or skip to easier ones?"

User: "Skip to easier ones"

Claude: "I'll filter for easy brokers. Here are 8 remaining easy ones:
         - TruePeopleSearch
         - FastPeopleSearch
         - FamilyTreeNow
         ...

         Starting with TruePeopleSearch..."
```

### Pattern 4: Targeted Processing (Specific Brokers)

```
User: "Process just the EU brokers"

Claude: "I'll process Tier 2 (European) brokers:
         - 192.com (UK)
         - Infobel (EU)
         - Yasni (EU/DE)

         Starting with 192.com..."

User: "Process ZoomInfo, Apollo, and Lusha"

Claude: "I'll process these 3 professional databases:
         1. ZoomInfo
         2. Apollo.io
         3. Lusha

         All are easy difficulty. Starting..."
```

---

## Handling Special Cases

### CAPTCHAs

**When Claude encounters a CAPTCHA:**

```
Claude: "There's a reCAPTCHA on this page. Please solve it in the browser,
         then let me know when you're done."

[Browser shows the CAPTCHA - you solve it manually]

User: "Done"

Claude: "Thanks! Proceeding with submission..."
```

### "Search Self First" Brokers

Some brokers require searching for your record before opting out:

```
Claude: "Spokeo requires searching for yourself first. I'll search using
         your name and city from .env..."

[Fills search form, submits]

Claude: "Found 3 records:
         1. Jeremy LastName - Amsterdam, Netherlands - Age ~35
         2. Jeremy LastName - Rotterdam, Netherlands - Age ~32
         3. Jeremy DifferentName - Amsterdam, Netherlands - Age ~40

         Which records should I opt out from? (Likely #1 and #2)"

User: "1 and 2"

Claude: "Selecting records 1 and 2. Proceeding to opt-out form..."
```

### Email Verification Required

```
Claude: "Spokeo opt-out submitted! The broker will send a verification email to
         spokeo-a3f8@optout.yourdomain.com. Check your email and click the link.

         Status updated to: awaiting_verification

         Let me know when you've verified, or check pending later."

[Later, after verifying via email]

User: "I verified Spokeo"

Claude: "Great! Updating database... Status: completed ✓"
```

### Phone Verification (Whitepages)

```
Claude: "Whitepages requires phone verification. I'll fill the form with your
         phone number from .env. They'll call you with a verification code."

[Fills form, submits]

Claude: "Form submitted. You should receive a call at +31612345678.
         Once you get the code, enter it in the browser."

[User receives call, enters code]

User: "Verification complete"

Claude: "Excellent! Taking confirmation screenshot... Status: completed ✓"
```

### Account Creation Required (Radaris)

```
Claude: "Radaris requires creating an account to opt out. I recommend using
         a throwaway email address. Would you like to proceed or skip?"

User: "Skip it for now"

Claude: "Marking Radaris as skipped with note: 'Requires account creation'.
         You can process it manually later or tell me to reset it."
```

### ID Upload Required (LexisNexis)

```
Claude: "LexisNexis requires uploading a government-issued ID. This is a security
         risk. I recommend skipping the web form and sending a GDPR email instead.

         Options:
         1. Skip web form, I'll draft GDPR email for you
         2. Skip entirely (mark as skipped)
         3. Proceed with web form (you'll upload ID manually)"

User: "Option 1 - draft the email"

Claude: "I'll use the template from templates/gdpr_request.txt and fill it
         with your data from .env..."

[Claude generates email]

Claude: "Here's the email. Send it to privacy@lexisnexis.com

         [Email content displayed]

         Marking LexisNexis as 'submitted via email' in database."
```

---

## Troubleshooting

### Problem: "Claude can't read .env file"

**Solution:**
```bash
# Verify file exists
ls -la .env

# Check you're in the right directory
pwd

# Verify file isn't empty
cat .env
```

### Problem: "Database not found"

**Solution:**
```bash
# Verify database exists
ls -la data/submissions.db

# If missing, recreate it
sqlite3 data/submissions.db < schema.sql
```

### Problem: "Screenshots aren't saving"

**Solution:**
```bash
# Verify directory exists
ls -la data/screenshots/

# If missing, create it
mkdir -p data/screenshots

# Check permissions
chmod 755 data/screenshots
```

### Problem: "Broker form looks different than expected"

Broker websites change frequently.

**Solution:**
```
User: "This form looks different, re-analyze it"

Claude: [Uses vision to re-examine form, adapts]
```

Or update `config/brokers.yaml` with new URL:

```yaml
- id: spokeo
  opt_out_url: "https://www.spokeo.com/new-optout-url"  # Updated
```

### Problem: "Database shows wrong status"

**Solution:**
```
User: "Show me database status for Spokeo"

Claude: [Queries database, shows current status]

User: "Update Spokeo status to pending"

Claude: [Updates database directly]
```

Or manually:
```bash
sqlite3 data/submissions.db
> UPDATE submissions SET status='pending' WHERE broker_id='spokeo';
> SELECT broker_id, status FROM submissions WHERE broker_id='spokeo';
```

---

## Best Practices

### 1. Start Small

Don't try to process all 26 brokers in one session. Start with:
- **Day 1**: Test with 1-2 easy brokers (FamilyTreeNow, TruePeopleSearch)
- **Day 2**: Process 5-10 Tier 1 brokers
- **Week 1**: Complete Tier 1 and Tier 2
- **Week 2**: Tackle Tier 3-5

### 2. Process in Order of Difficulty

```
User: "Do the easy ones first"
```

This builds confidence and maximizes completion rate.

### 3. Handle Email Verification Proactively

Check your email every few hours during processing. Some brokers verify quickly.

### 4. Review Before Submitting

Always review what Claude is about to submit:

```
Claude: "Here's what I'm about to submit... Ready?"
```

Take a moment to verify the data is correct.

### 5. Keep Screenshots

Screenshots in `data/screenshots/` are evidence for GDPR enforcement. Back them up periodically.

```bash
# Backup screenshots
tar -czf screenshots-backup-$(date +%Y%m%d).tar.gz data/screenshots/
```

### 6. Track Verification Emails

If using email aliases (`EMAIL_OPTOUT_DOMAIN`), set up email forwarding rules to track which brokers send spam after you've opted out.

### 7. Re-run Every 6-12 Months

Data brokers may re-add your data. Schedule periodic re-runs:

```
User: "Reset all completed brokers to pending for re-processing"

Claude: [Updates database, ready to re-run]
```

### 8. Document Failures

If a broker refuses to comply:

```
User: "Note that Broker X refused opt-out on 2025-01-28"

Claude: [Adds note to database]
```

Use this info for GDPR complaints.

### 9. Capture Technical Form Details (Phase 2 Prep)

As you process brokers, capture technical form information for future full automation:

```
User: "Before submitting to Spokeo, analyze and store the technical form details"

Claude: [Inspects page structure, captures form selectors, field mappings, CAPTCHA details]
        [Stores in form_analysis database table]
```

**What gets captured:**
- Form selectors (CSS/XPath)
- Field mappings to .env variables
- CAPTCHA type and selectors
- Submit button selectors
- Required timing delays
- Multi-step workflow details

**Why capture this:**
- Enables full automation in Phase 2+
- Creates a knowledge base of working selectors
- Helps detect when brokers change their forms
- Allows sharing findings with others

See `docs/technical-form-analysis-guide.md` for complete details on what to capture and how.

---

## Advanced Usage

### Custom Email Aliases

If you want specific aliases per broker:

```
User: "Use email alias 'spokeo-custom@optout.example.com' for Spokeo"

Claude: [Uses custom alias instead of auto-generated]
```

### Batch Status Updates

```
User: "Mark all 'awaiting_verification' as 'completed' - I verified them all"

Claude: [Bulk updates database]
```

### Export Reports

```
User: "Export a CSV of all submissions"

Claude: [Generates CSV from database]
```

### Query Database Directly

```bash
# See all pending brokers
sqlite3 data/submissions.db "SELECT broker_id, status, notes FROM submissions WHERE status='pending';"

# See brokers requiring follow-up
sqlite3 data/submissions.db "SELECT broker_id, error_message FROM submissions WHERE status='failed';"

# Count by status
sqlite3 data/submissions.db "SELECT status, COUNT(*) FROM submissions GROUP BY status;"
```

### Export Form Analysis Data

Export captured technical form details for automation:

```bash
# View statistics about captured forms
python scripts/export_form_analysis.py --format stats

# Export all form analysis as JSON
python scripts/export_form_analysis.py --format json > form_analysis_export.json

# Export automation-ready config (only known-working forms)
python scripts/export_form_analysis.py --format automation > automation_config.json

# Export specific broker
python scripts/export_form_analysis.py --broker spokeo --format json

# Export as markdown table for documentation
python scripts/export_form_analysis.py --format markdown > docs/form-status.md

# Export to file
python scripts/export_form_analysis.py --format json --output exports/forms.json
```

**Example output (stats):**
```
Form Analysis Statistics
==================================================
Total brokers analyzed: 15
Known working: 12 (80.0%)
With CAPTCHA: 8
Multi-step forms: 3

CAPTCHA Types:
  - recaptcha_v2: 5
  - recaptcha_v3: 2
  - hcaptcha: 1
```

See `docs/technical-form-analysis-guide.md` for complete documentation.

---

## Example Full Session

Here's a complete session from start to finish:

```
$ claude --chrome

Claude: "I've loaded your GDPR opt-out configuration. Current status:
         - Completed: 0 brokers
         - Pending: 26 brokers
         This looks like your first run."

User: "Let's start with 3 easy brokers"

Claude: "I'll process these 3 easy brokers:
         1. FamilyTreeNow
         2. TruePeopleSearch
         3. FastPeopleSearch
         Starting with FamilyTreeNow..."

[10 minutes later, after processing all 3]

Claude: "Batch complete! Summary:
         ✓ FamilyTreeNow: completed
         ✓ TruePeopleSearch: completed
         ✓ FastPeopleSearch: completed

         Total completed: 3/26 (11.5%)
         Screenshots: 6 saved to data/screenshots/"

User: "What's our progress?"

Claude: "You've completed 3/26 brokers (11.5%):
         ✓ Tier 1: 0/10
         ✓ Tier 5: 3/7
         ⏳ Remaining: 23 brokers"

User: "Let's do Tier 1 next"

Claude: "I'll process Tier 1 brokers. These are the major people search sites.
         Starting with Spokeo..."

[2 hours later]

User: "I need to take a break"

Claude: "No problem! Progress saved. We've completed 8/10 Tier 1 brokers today.
         Next time say 'continue where we left off'."

[Next day]

$ claude --chrome

User: "Continue where we left off"

Claude: "Welcome back! Current status:
         ✓ Completed: 11 brokers
         ⏳ Awaiting verification: 5 brokers
         ⏸️  Pending: 10 brokers

         Ready to continue?"

User: "Yes, do the remaining pending brokers"

Claude: "I'll process the 10 remaining brokers..."

[End of week]

User: "What's our final status?"

Claude: "You've completed 24/26 brokers (92.3%):
         ✓ Completed: 19
         ⏳ Awaiting verification: 5
         ⏸️  Skipped: 2 (LexisNexis - ID upload, Radaris - account required)

         Great work! You've significantly reduced your data broker footprint."
```

---

## Next Steps

After completing your first round of opt-outs:

1. **Monitor verification emails** - Click verification links as they arrive
2. **Update database** - Tell Claude when you've verified brokers
3. **Check for compliance** - Wait 30 days, then search for yourself on each broker
4. **File GDPR complaints** - If brokers don't comply, use screenshots as evidence
5. **Schedule re-run** - Set a reminder for 6-12 months to re-process

---

For more information, see:
- `README.md` - Project overview
- `docs/gdpr-optout-prd.md` - Complete technical documentation
- `templates/gdpr_request.txt` - GDPR email template

Good luck reclaiming your privacy!
