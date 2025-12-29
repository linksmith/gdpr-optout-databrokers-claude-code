# Phase 1 vs Phase 2: Complete Workflow Guide

This document explains the **two distinct workflows** for GDPR opt-out automation.

---

## 🎯 Overview

### Phase 1: Data Collection (Claude Code - Conversational)
**Purpose**: Manually process brokers while collecting technical form metadata for future automation

**Tool**: Claude Code (conversational AI assistant)

**Mode**: Semi-automated, conversational

**Output**: Technical form analysis data stored in database

---

### Phase 2: Automated Processing (Standalone Application)
**Purpose**: Fully/semi-automated batch processing using collected metadata

**Tool**: Standalone Node.js application (NO Claude Code dependency)

**Mode**: Fully automated or hybrid (with manual CAPTCHA fallback)

**Output**: Completed opt-out submissions across 40+ brokers

---

## 📊 Comparison Table

| Feature | Phase 1 (Claude Code) | Phase 2 (Standalone Bot) |
|---------|----------------------|--------------------------|
| **Requires Claude Code** | ✅ Yes | ❌ No |
| **Interaction Style** | Conversational | Command-line/automated |
| **CAPTCHA Handling** | API + manual fallback | API + manual fallback (or fully automated) |
| **Form Analysis** | Real-time (vision + DOM) | Pre-collected metadata |
| **Data Collection** | **Captures form metadata** | Uses collected metadata |
| **Batch Processing** | One broker at a time | Process all 40+ brokers in one run |
| **User Presence** | Required (for guidance) | Optional (can run unattended) |
| **Best For** | Initial runs, testing, form discovery | Repeat runs, scaling, full automation |

---

## Phase 1: Claude Code Workflow (Data Collection)

### Purpose

Use Claude Code to:
1. **Manually process each broker** with AI guidance
2. **Capture technical form details** (selectors, CAPTCHA types, field mappings)
3. **Store metadata** in `form_analysis` database table
4. **Build knowledge base** for Phase 2 automation

### When to Use Phase 1

- ✅ **First time processing** a broker (need to discover form structure)
- ✅ **Broker form changed** (need to re-analyze and update metadata)
- ✅ **Complex edge cases** (need AI reasoning to handle unusual forms)
- ✅ **Learning/testing** the process before full automation

### How to Start Phase 1

#### Step 1: Set Up Environment

```bash
# Create .env file with your personal data
cp .env.template .env
chmod 600 .env
# Edit .env and fill in your information

# Optional: Set up CAPTCHA API for automated solving
# (or leave CAPTCHA_ENABLED=false for manual solving)
```

#### Step 2: Launch Claude Code

```bash
cd /path/to/gdpr-optout-databrokers-claude-code
claude --chrome
```

#### Step 3: Start Processing

Talk to Claude Code naturally:

```
You: "Let's process TruePeopleSearch"

Claude: "I'll navigate to TruePeopleSearch and guide you through
         the opt-out process.

         Navigating to https://www.truepeoplesearch.com/removal...

         I can see this is a 'search first' broker. I'll fill the
         search form with your data from .env...

         [Analyzes form, fills fields]

         CAPTCHA detected: reCAPTCHA v2
         Sending to 2Captcha API...
         ✅ Solved in 18s

         Ready to submit?"

You: "Yes"

Claude: "Submitted! Would you like me to capture the technical
         form details for future automation?"

You: "Yes, capture form analysis"

Claude: "Saved form analysis to database:
         - Form selector: form#optout-form
         - CAPTCHA type: recaptcha_v2
         - Field mappings: first_name, last_name, city
         - Submit button: button[type='submit']

         This data will be used for Phase 2 automation."
```

#### Step 4: Review Collected Data

```bash
# Query form analysis table
sqlite3 data/submissions.db "SELECT * FROM form_analysis WHERE broker_id = 'truepeoplesearch'"
```

### What Gets Captured in Phase 1

**In `form_analysis` table**:
- Page URL
- Form selector (CSS)
- Field mappings (selector → .env variable)
- CAPTCHA type and sitekey
- Submit button selector
- Required delays/timing
- Multi-step workflow details

**In `submissions` table**:
- Submission status
- CAPTCHA solve method & time
- Screenshots (before/after)
- Confirmation details

**In `captcha_stats` table**:
- CAPTCHA type
- Solve method (API vs manual)
- Solve time
- API cost
- Success/failure rate

---

## Phase 2: Standalone Bot Workflow (Automated Processing)

### Purpose

Use the **standalone automation bot** to:
1. **Batch process all brokers** in one run
2. **Use pre-collected form metadata** from Phase 1
3. **Run fully automated** (or semi-automated with manual CAPTCHA fallback)
4. **Process 40+ brokers** without constant supervision

### When to Use Phase 2

- ✅ **After Phase 1 data collection** (form metadata exists)
- ✅ **Periodic re-runs** (every 6-12 months)
- ✅ **Scaling** to multiple users/accounts
- ✅ **Unattended processing** (run overnight, on server)

### How to Start Phase 2

#### Step 1: Install Dependencies

```bash
npm install
```

#### Step 2: Verify Database

```bash
# Ensure database has form_analysis data from Phase 1
sqlite3 data/submissions.db "SELECT COUNT(*) FROM form_analysis"

# Should return > 0 if Phase 1 was completed
```

#### Step 3: Run the Bot

**Dry Run (Test Mode)**:
```bash
# Test without actually submitting forms
npm run bot:dry-run
```

**Hybrid Mode** (Recommended):
```bash
# API solves CAPTCHAs, falls back to manual if needed
npm run bot:hybrid
```

**Fully Automated Mode**:
```bash
# Requires CAPTCHA_ENABLED=true, fails if API can't solve
npm run bot:auto
```

**Process Specific Brokers**:
```bash
node src/automation/gdpr-optout-bot.js --brokers=spokeo,truepeoplesearch
```

**Process by Tier**:
```bash
node src/automation/gdpr-optout-bot.js --tier=1
```

### Example Output (Phase 2 Bot)

```
🚀 Initializing GDPR Opt-Out Bot...

📋 Loaded 40 brokers, will process 40
✅ CAPTCHA API: Configured (balance: $5.23)
🌐 Launching browser...
   ✅ Browser launched
✅ Initialization complete

═══════════════════════════════════════════════════════
  Starting GDPR Opt-Out Batch Processing
  Mode: HYBRID
  Brokers: 40
  Dry run: NO
═══════════════════════════════════════════════════════

[1/40] Processing: Spokeo
────────────────────────────────────────────────────────
   🔗 Navigating to https://www.spokeo.com/optout...
   📸 Screenshot: /data/screenshots/spokeo_pre_2025-01-29.png
   📝 Filling form...
      ✅ Form filled
   📤 Submitting form...
      ✅ Form submitted
✅ Spokeo completed

[2/40] Processing: TruePeopleSearch
────────────────────────────────────────────────────────
   🔗 Navigating to https://www.truepeoplesearch.com/removal...
   📸 Screenshot: /data/screenshots/truepeoplesearch_pre_2025-01-29.png
   📝 Filling form...
      ✅ Form filled
   🔍 CAPTCHA detected: recaptcha_v2
      🤖 Attempting API solve...
      ✅ Solved via API in 21.3s (cost: $0.0010)
   📤 Submitting form...
      ✅ Form submitted
✅ TruePeopleSearch completed

[3/40] Processing: FastPeopleSearch
────────────────────────────────────────────────────────
   🔗 Navigating to https://www.fastpeoplesearch.com/removal...
   📸 Screenshot: /data/screenshots/fastpeoplesearch_pre_2025-01-29.png
   📝 Filling form...
      ✅ Form filled
   🔍 CAPTCHA detected: recaptcha_v2
      🤖 Attempting API solve...
      ⚠️ API failed, requesting manual solve...

⏸️  ═══════════════════════════════════════════════════════
   MANUAL CAPTCHA REQUIRED
   ═══════════════════════════════════════════════════════
   1. Look at the browser window
   2. Solve the CAPTCHA
   3. Press Enter when done (or type "skip" to skip)
   ═══════════════════════════════════════════════════════

> [User solves CAPTCHA and presses Enter]

   ✅ Continuing...

      ✅ Solved manually in 42.1s
   📤 Submitting form...
      ✅ Form submitted
✅ FastPeopleSearch completed

...

[40/40] Processing: VoterRecords
────────────────────────────────────────────────────────
✅ VoterRecords completed

╔═══════════════════════════════════════════════════════╗
║              BATCH PROCESSING COMPLETE               ║
╚═══════════════════════════════════════════════════════╝

Total brokers:       40
✅ Completed:         38
❌ Failed:            1
⏭️  Skipped:           1

CAPTCHAs solved:
  🤖 API:             23
  👤 Manual:          2

Total cost:          $0.0230

Database summary:
  Total submissions:  38
  Completed:          38
  With CAPTCHA:       25

Screenshots saved to: data/screenshots/
Database updated:     data/submissions.db
```

### Advanced Options

```bash
# Process only specific brokers
node src/automation/gdpr-optout-bot.js --brokers=spokeo,beenverified

# Process tier 1 brokers only
node src/automation/gdpr-optout-bot.js --tier=1

# Run in headless mode (no browser window)
node src/automation/gdpr-optout-bot.js --headless

# Force reprocessing of already-completed brokers
node src/automation/gdpr-optout-bot.js --force

# Dry run (test without submitting)
node src/automation/gdpr-optout-bot.js --dry-run

# Quiet mode (minimal output)
node src/automation/gdpr-optout-bot.js --quiet
```

---

## 🔄 Complete Workflow: Phase 1 → Phase 2

### Recommended Approach

**First Time (Initial Setup)**:

1. **Phase 1**: Use Claude Code to process 5-10 easy brokers
   - Capture form metadata
   - Test CAPTCHA API
   - Build confidence in the system

2. **Verify Data Collection**:
   ```bash
   sqlite3 data/submissions.db "SELECT broker_id, known_working FROM form_analysis"
   ```

3. **Phase 2**: Use standalone bot to process remaining brokers
   - Fast batch processing
   - Uses collected metadata
   - Run overnight if desired

**Subsequent Runs (6-12 months later)**:

1. **Update Check** (Phase 1): Test 1-2 brokers with Claude Code
   - Verify forms haven't changed
   - Update form_analysis if needed

2. **Batch Re-processing** (Phase 2): Run standalone bot
   - Process all 40 brokers in one go
   - Fully automated

---

## 📚 Example Use Cases

### Use Case 1: Journalist - First Time

**Goal**: Remove data from 40 brokers, learn the process

**Workflow**:
1. **Week 1**: Use Claude Code (Phase 1) to process 10 Tier 1 brokers
   - Learn how opt-out forms work
   - Collect technical metadata
   - Test CAPTCHA API

2. **Week 2**: Use standalone bot (Phase 2) to process remaining 30 brokers
   - Batch process in 2-3 hours
   - Minimal supervision

**Time**: ~10 hours Phase 1 + 3 hours Phase 2 = 13 hours total

---

### Use Case 2: Privacy Advocate - Periodic Maintenance

**Goal**: Re-run opt-outs every 6 months (data brokers re-add data)

**Workflow**:
1. **Month 1**: Initial run with Claude Code (Phase 1) - collect all metadata
2. **Month 7**: Re-run with standalone bot (Phase 2) - 2 hours, fully automated
3. **Month 13**: Re-run with standalone bot (Phase 2) - 2 hours, fully automated

**Time**: 15 hours Year 1, then 2 hours per 6-month cycle

---

### Use Case 3: Organization - Multiple People

**Goal**: Process opt-outs for 10 employees

**Workflow**:
1. **Setup** (once): Use Claude Code (Phase 1) to collect form metadata for all brokers
2. **Per Employee**: Run standalone bot (Phase 2) with their .env file
   - Customize .env with employee's data
   - Run: `npm run bot:auto`
   - 2-3 hours per employee (unattended)

**Time**: 15 hours setup + 2 hours per employee = 35 hours for 10 people

---

## 🧪 Testing

### Test Mock 2Captcha API Server

```bash
# Start mock server
npm run test:mock-server

# In another terminal, run tests
npm test
```

### Test CAPTCHA Solver

```bash
npm run test:captcha
```

### Test Automation Bot

```bash
npm run test:bot
```

### Run All Tests

```bash
npm test
```

---

## 🎓 Key Differences Summary

### Phase 1 (Claude Code)
- **Conversational**: You guide Claude through each broker
- **Learning**: Claude analyzes forms in real-time
- **Data Collection**: Captures selectors, CAPTCHA types, workflows
- **One-at-a-time**: Process brokers sequentially with full visibility
- **Best for**: Discovery, testing, complex cases

### Phase 2 (Standalone Bot)
- **Automated**: Bot runs independently
- **Pre-programmed**: Uses collected form metadata
- **Batch Processing**: Processes all brokers in one run
- **Unattended**: Can run overnight/on server
- **Best for**: Scale, repeat runs, production use

---

## 📋 Checklist: When to Use Which

**Use Phase 1 (Claude Code) if**:
- [ ] First time processing a broker
- [ ] Broker form structure unknown
- [ ] Need to capture technical metadata
- [ ] Prefer conversational guidance
- [ ] Want to learn the process
- [ ] Handling complex edge cases

**Use Phase 2 (Standalone Bot) if**:
- [ ] Form metadata already collected (Phase 1 done)
- [ ] Need to process many brokers quickly
- [ ] Want unattended processing
- [ ] Doing periodic re-runs (6-12 month cycles)
- [ ] Processing for multiple users/accounts
- [ ] Prefer command-line automation

**Use Both if**:
- [ ] Initial setup: Phase 1 for discovery, Phase 2 for scale
- [ ] Maintenance: Phase 1 for form updates, Phase 2 for batch processing
- [ ] Production: Phase 1 for new brokers, Phase 2 for known brokers

---

## 🚀 Next Steps

1. **Start with Phase 1** to build your knowledge base
2. **Transition to Phase 2** for efficient batch processing
3. **Maintain with Phase 2** for periodic re-runs

See detailed guides:
- `docs/usage-guide.md` - Phase 1 (Claude Code) setup
- `docs/captcha-ux-flow.md` - CAPTCHA handling in both phases
- `README.md` - Quick start for both workflows

---

## Sources

- [2Captcha API Documentation](https://2captcha.com/2captcha-api)
- [2Captcha reCAPTCHA v2 Guide](https://2captcha.com/api-docs/recaptcha-v2)
