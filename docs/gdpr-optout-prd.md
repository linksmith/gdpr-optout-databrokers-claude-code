# GDPR Data Broker Opt-Out Automation Tool

## Product Requirements Document

**Version:** 2.0 (Claude Code Edition)
**Author:** Jeremy
**Last Updated:** 2025-01-28
**Purpose:** Interactive conversational tool for removing personal data from data brokers using Claude Code's --chrome extension

---

## 1. Executive Summary

An interactive tool powered by Claude Code that automates the tedious process of submitting GDPR/opt-out requests to data brokers. Designed for investigative journalists who need to reduce their public data footprint before building compartmentalized research identities.

Using Claude Code's `--chrome` extension, you engage in conversational sessions where Claude navigates to data broker sites, analyzes opt-out forms, fills them with your information, and guides you through the submission process.

### Design Principles

- **Semi-supervised**: Human reviews and approves each submission, intervenes for CAPTCHAs
- **Evidence-first**: Screenshot and log everything for GDPR enforcement
- **Privacy-preserving**: Local storage only, no cloud dependencies
- **Resumable**: Can stop and continue across sessions with persistent state tracking
- **Conversational**: Natural language interaction with Claude Code guiding each step

---

## 2. Technical Architecture

### 2.1 Stack

```
Claude Code with --chrome extension
├── Browser Control: Direct Chrome automation via extension
├── Vision + Reasoning: Claude analyzes forms and page structure
├── SQLite3: Local database for state tracking
└── Configuration: YAML files + .env for personal data
```

**No code to write** - Claude Code handles all the automation through conversational interaction.

### 2.2 How It Works

1. **Launch Session**: Run `claude --chrome` in this repository
2. **Claude Loads Context**: Reads `.env` (personal data), `config/brokers.yaml` (broker list), queries `data/submissions.db` (progress)
3. **Conversational Control**: You say "Let's process Tier 1 brokers" and Claude guides you through each one
4. **Browser Automation**: Claude navigates Chrome, analyzes forms using vision, fills fields, handles submissions
5. **State Persistence**: Progress saved to SQLite after each broker, resumable across sessions

### 2.3 Directory Structure

```
gdpr-optout-databrokers/
├── README.md
├── .env                          # Your personal data (gitignored!)
├── .env.template                 # Template for setup
├── .gitignore                    # Ensures .env stays private
├── config/
│   └── brokers.yaml              # 40+ broker definitions
├── data/
│   ├── submissions.db            # SQLite tracking database
│   └── screenshots/              # Evidence screenshots
├── docs/
│   ├── gdpr-optout-prd.md        # This document
│   └── usage-guide.md            # How to use with Claude Code
└── templates/
    └── gdpr_request.txt          # GDPR Article 17 email template
```

**Key Differences from Traditional Automation:**
- **No Python code** - No `src/` directory with handler classes
- **No encryption code** - User responsible for `.env` file security (add to `.gitignore`)
- **No CLI commands** - Conversational interaction replaces command-line flags
- **No broker-specific handlers** - Claude reasons about each form generically using vision + HTML analysis

---

## 3. Configuration Files

### 3.1 .env (your personal data)

**CRITICAL: Add `.env` to `.gitignore` immediately! This file contains sensitive personal information.**

```bash
# .env - Your personal information for opt-out requests
# NEVER commit this file to version control!

# === IDENTITY ===
FIRST_NAME=Jeremy
LAST_NAME=[REDACTED]
MIDDLE_NAME=
NAME_VARIATIONS=J. [REDACTED],Jeremy [MAIDEN/OLD]

# === CURRENT ADDRESS ===
CURRENT_STREET=[REDACTED]
CURRENT_CITY=Amsterdam
CURRENT_POSTAL=[REDACTED]
CURRENT_COUNTRY=Netherlands

# === PREVIOUS ADDRESSES ===
# Format: street|city|postal|country|years
PREVIOUS_ADDRESS_1=[REDACTED]|[REDACTED]|[REDACTED]|Netherlands|2018-2022
PREVIOUS_ADDRESS_2=
PREVIOUS_ADDRESS_3=

# === CONTACT ===
EMAIL_REAL=real@example.com
EMAIL_OPTOUT_DOMAIN=optout.yourdomain.com
PHONE=+31...

# === VERIFICATION ===
DATE_OF_BIRTH=YYYY-MM-DD
```

**Setup Instructions:**
1. Copy `.env.template` to `.env`
2. Fill in your real information
3. Verify `.env` is in `.gitignore`
4. Never share or commit this file

**Security Note:** Unlike the original PRD's encrypted YAML approach, this uses plain text `.env` file. You are responsible for keeping this file secure. Benefits: simpler setup, no password to remember, easier for Claude Code to read.

### 3.2 brokers.yaml

**This file can be version controlled and shared** - it contains no personal data.

```yaml
# Data broker definitions - 40+ brokers organized by tier/priority
# Claude Code reads this to know which brokers to process
brokers:

  # === TIER 1: Major people search sites (priority) ===
  
  - id: spokeo
    name: "Spokeo"
    region: [US, EU]
    opt_out_url: "https://www.spokeo.com/optout"
    method: web_form
    difficulty: easy
    requires_email_verification: true
    requires_captcha: false
    notes: "Search for yourself first, then opt out specific listing"
    fields:
      - type: search_self_first
      - type: listing_url
      - type: email
    estimated_time: "3-5 days"
    
  - id: beenverified
    name: "BeenVerified"
    region: [US]
    opt_out_url: "https://www.beenverified.com/app/optout/search"
    method: web_form
    difficulty: medium
    requires_email_verification: true
    requires_captcha: sometimes
    fields:
      - type: search_self_first
      - type: first_name
      - type: last_name
      - type: state
      - type: email
    estimated_time: "24 hours"
    
  - id: whitepages
    name: "Whitepages"
    region: [US]
    opt_out_url: "https://www.whitepages.com/suppression-requests"
    method: web_form
    difficulty: medium
    requires_email_verification: true
    requires_captcha: true
    requires_phone_verification: true
    notes: "Requires phone call verification"
    fields:
      - type: search_self_first
      - type: listing_url
      - type: phone_verification
    estimated_time: "24-48 hours"

  - id: truepeoplesearch
    name: "TruePeopleSearch"
    region: [US]
    opt_out_url: "https://www.truepeoplesearch.com/removal"
    method: web_form
    difficulty: easy
    requires_email_verification: false
    requires_captcha: true
    fields:
      - type: search_self_first
      - type: record_selection
    estimated_time: "immediate"

  - id: fastpeoplesearch
    name: "FastPeopleSearch"
    region: [US]
    opt_out_url: "https://www.fastpeoplesearch.com/removal"
    method: web_form
    difficulty: easy
    requires_email_verification: false
    requires_captcha: true
    estimated_time: "immediate"

  - id: intelius
    name: "Intelius"
    region: [US]
    opt_out_url: "https://www.intelius.com/opt-out"
    method: web_form
    difficulty: medium
    requires_email_verification: true
    also_covers: ["instantcheckmate", "ussearch", "peoplefinder"]
    notes: "One opt-out covers multiple Intelius properties"
    estimated_time: "7 days"

  - id: radaris
    name: "Radaris"
    region: [US, EU]
    opt_out_url: "https://radaris.com/control/privacy"
    method: web_form
    difficulty: hard
    requires_account: true
    notes: "Must create account to opt out - use throwaway"
    estimated_time: "24-48 hours"

  - id: mylife
    name: "MyLife"
    region: [US]
    opt_out_url: "https://www.mylife.com/privacy-policy#cali-access"
    method: email
    email_address: "privacy@mylife.com"
    difficulty: medium
    notes: "Send GDPR Article 17 request via email"
    estimated_time: "30 days"

  - id: familytreenow
    name: "FamilyTreeNow"
    region: [US]
    opt_out_url: "https://www.familytreenow.com/optout"
    method: web_form
    difficulty: easy
    requires_captcha: true
    estimated_time: "immediate"

  - id: thatsthem
    name: "ThatsThem"
    region: [US]
    opt_out_url: "https://thatsthem.com/optout"
    method: web_form
    difficulty: easy
    requires_email_verification: true
    estimated_time: "24-48 hours"

  # === TIER 2: European data brokers ===

  - id: 192_com
    name: "192.com"
    region: [UK]
    opt_out_url: "https://www.192.com/optout/"
    method: web_form
    difficulty: easy
    estimated_time: "7 days"

  - id: infobel
    name: "Infobel"
    region: [EU]
    opt_out_url: "https://www.infobel.com/en/privacy"
    method: email
    email_address: "privacy@infobel.com"
    difficulty: medium
    notes: "GDPR request via email, covers multiple EU countries"
    estimated_time: "30 days"

  - id: yasni
    name: "Yasni"
    region: [EU, DE]
    opt_out_url: "https://www.yasni.com/privacy"
    method: web_form
    difficulty: medium
    estimated_time: "7 days"

  # === TIER 3: Professional/business databases ===

  - id: zoominfo
    name: "ZoomInfo"
    region: [US, EU]
    opt_out_url: "https://www.zoominfo.com/about-zoominfo/privacy-manage-profile"
    method: web_form
    difficulty: easy
    notes: "Professional/business data focus"
    estimated_time: "30 days"

  - id: apollo
    name: "Apollo.io"
    region: [US, EU]
    opt_out_url: "https://www.apollo.io/privacy-policy/remove/"
    method: web_form
    difficulty: easy
    estimated_time: "30 days"

  - id: lusha
    name: "Lusha"
    region: [US, EU]
    opt_out_url: "https://www.lusha.com/opt-out/"
    method: web_form
    difficulty: easy
    estimated_time: "30 days"

  - id: rocketreach
    name: "RocketReach"
    region: [US, EU]
    opt_out_url: "https://rocketreach.co/person/request_removal"
    method: web_form
    difficulty: easy
    estimated_time: "7 days"

  # === TIER 4: Background check services ===

  - id: checkr
    name: "Checkr"
    region: [US]
    opt_out_url: "https://candidate.checkr.com/privacy/delete"
    method: web_form
    difficulty: medium
    notes: "Employment background checks"
    estimated_time: "45 days"

  - id: lexisnexis
    name: "LexisNexis"
    region: [US, EU]
    opt_out_url: "https://optout.lexisnexis.com/"
    method: web_form
    difficulty: hard
    requires_id_upload: true
    notes: "Skip if uncomfortable uploading ID - flag for manual email instead"
    alternative_method: "Send GDPR request to privacy@lexisnexis.com"
    estimated_time: "30 days"

  # === TIER 5: Aggregators and lesser-known ===

  - id: peekyou
    name: "PeekYou"
    region: [US]
    opt_out_url: "https://www.peekyou.com/about/contact/optout"
    method: web_form
    difficulty: medium
    estimated_time: "7 days"

  - id: cyberbackgroundchecks
    name: "CyberBackgroundChecks"
    region: [US]
    opt_out_url: "https://www.cyberbackgroundchecks.com/removal"
    method: web_form
    difficulty: easy
    estimated_time: "immediate"

  - id: publicrecordsnow
    name: "PublicRecordsNow"
    region: [US]
    opt_out_url: "https://www.publicrecordsnow.com/static/view/optout"
    method: web_form
    difficulty: easy
    estimated_time: "immediate"

  - id: peoplelooker
    name: "PeopleLooker"
    region: [US]
    opt_out_url: "https://www.peoplelooker.com/f/optout/search"
    method: web_form
    difficulty: medium
    requires_email_verification: true
    estimated_time: "24-48 hours"
    
  - id: voterrecords
    name: "VoterRecords.com"
    region: [US]
    opt_out_url: "https://voterrecords.com/optout"
    method: web_form
    difficulty: easy
    estimated_time: "24-48 hours"
```

**Note:** The broker definitions remain the same as originally specified. Claude Code will read these to understand:
- Which brokers to process
- Tier/priority ordering
- Expected difficulty level
- Whether email verification, CAPTCHAs, or other steps are needed
- Estimated processing time

**No Python handler classes needed** - The original PRD referenced custom handler files like `spokeo.py`, `beenverified.py`, etc. With Claude Code, there's no need for custom code per broker. Claude analyzes each form generically using vision and reasoning.

---

## 4. Database Schema

```sql
-- submissions.db

CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broker_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    -- Status values: pending, submitted, awaiting_verification, 
    --                verified, completed, failed, skipped
    
    submitted_at TIMESTAMP,
    verified_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    email_alias TEXT,
    screenshot_path TEXT,
    confirmation_screenshot_path TEXT,
    
    notes TEXT,
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verification_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broker_id TEXT NOT NULL,
    submission_id INTEGER REFERENCES submissions(id),
    
    received_at TIMESTAMP,
    subject TEXT,
    verification_link TEXT,
    clicked_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    broker_id TEXT,
    details TEXT,  -- JSON
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Core Workflows

### 5.1 Main Opt-Out Flow (Conversational)

```
┌─────────────────────────────────────────────────────────────────┐
│                    START CLAUDE CODE SESSION                    │
│                    $ claude --chrome                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Claude Code Initializes Context                            │
│     - Reads .env file (personal data)                          │
│     - Reads config/brokers.yaml (broker list)                  │
│     - Queries data/submissions.db (check progress)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. User Initiates Processing                                  │
│     User: "Let's process Tier 1 brokers"                       │
│     OR: "Continue where we left off"                           │
│     OR: "Process Spokeo"                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Claude Presents Status & Plan                              │
│     - Shows completed brokers from database                    │
│     - Lists remaining brokers to process                       │
│     - Recommends order (easy first, then harder)               │
│     - Asks for confirmation to proceed                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. For Each Broker (Conversational Loop):                     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────────────┐
    │  a. Claude navigates to broker's opt-out URL     │
    │     (Uses --chrome extension to control browser) │
    └──────────────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────────────┐
    │  b. Claude analyzes page structure               │
    │     - Uses vision to see the form                │
    │     - Reads page HTML/DOM                        │
    │     - Identifies form fields and requirements    │
    └──────────────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────────────┐
    │  c. If "search self first" required:             │
    │     - Claude fills search form with your data    │
    │     - Shows you matching records found           │
    │     - Asks which records to opt out from         │
    │     - You select: "Records 1 and 2"              │
    └──────────────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────────────┐
    │  d. Claude fills opt-out form                    │
    │     - Uses data from .env file                   │
    │     - May generate/track email alias             │
    │     - Narrates what it's doing                   │
    └──────────────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────────────┐
    │  e. CAPTCHA handling (if present)                │
    │     Claude: "There's a CAPTCHA - please solve it"│
    │     [User solves CAPTCHA in browser]             │
    │     User: "Done"                                 │
    └──────────────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────────────┐
    │  f. Pre-submission screenshot & confirmation     │
    │     - Claude takes screenshot                    │
    │     - Shows summary of what will be submitted    │
    │     - Asks: "Ready to submit?"                   │
    │     - User: "Yes, submit"                        │
    └──────────────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────────────┐
    │  g. Submit & capture confirmation                │
    │     - Claude clicks submit button                │
    │     - Waits for confirmation page                │
    │     - Takes screenshot of confirmation           │
    │     - Extracts confirmation number (if any)      │
    └──────────────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────────────┐
    │  h. Update database                              │
    │     - INSERT/UPDATE submissions table            │
    │     - Set status (submitted/awaiting_verify)     │
    │     - Store screenshot paths                     │
    │     - Log to audit_log table                     │
    └──────────────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────────────┐
    │  i. Report completion                            │
    │     Claude: "Spokeo opt-out submitted!           │
    │              Status: Awaiting email verification │
    │              Moving to next broker..."           │
    └──────────────────────────────────────────────────┘
         │
         ▼
    [Loop continues to next broker or session ends]
```

### 5.2 Email Verification Flow (Manual)

**This implementation uses manual email verification** - you handle clicking verification links yourself.

```
┌─────────────────────────────────────────────────────────────────┐
│  USER MANUALLY CHECKS EMAIL                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. User receives verification email from broker               │
│     - Sent to alias (e.g., spokeo-xyz@optout.yourdomain.com)  │
│     - Contains verification link                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. User clicks verification link                              │
│     - Opens in browser                                         │
│     - Completes any additional steps                           │
│     - Sees confirmation message                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. User updates Claude Code (optional)                        │
│     User: "I verified Spokeo"                                  │
│     Claude: Updates database status → verified/completed       │
│             Takes screenshot if browser still open             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ALTERNATIVE: Query status later                               │
│     User: "What's pending verification?"                       │
│     Claude: Queries database, lists awaiting_verification      │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits of Manual Approach:**
- Simpler setup (no email IMAP configuration)
- No email credentials needed
- You maintain full control
- Works with any email provider

**To track verification:**
- Claude Code marks submissions as `awaiting_verification` in database
- You can ask Claude "What's pending?" to see the list
- After verifying, tell Claude to update the status

### 5.3 Claude Code's Generic Form Reasoning

**Key advantage: No broker-specific code needed.** Claude Code analyzes each opt-out form dynamically using vision and DOM inspection.

#### How Claude Code Analyzes Forms:

1. **Visual Analysis**
   - Claude Code sees the browser page using vision
   - Identifies form fields, labels, buttons visually
   - Recognizes common patterns (search boxes, opt-out forms, CAPTCHAs)

2. **DOM Inspection**
   - Reads page HTML structure
   - Finds form elements (`<input>`, `<select>`, `<button>`)
   - Identifies field names and expected values

3. **Semantic Mapping**
   - Maps form fields to personal data from `.env`
   - Example: "First Name" field → `FIRST_NAME` from .env
   - Example: "Street Address" → `CURRENT_STREET` from .env
   - Handles variations: "Email", "E-mail", "Email Address" → `EMAIL_REAL` or alias

4. **Multi-Step Handling**
   - Recognizes when "search for yourself first" is needed
   - Identifies multi-page workflows (search → select → confirm → submit)
   - Tracks state across steps

#### Example Reasoning Process:

```
[Claude Code navigates to TruePeopleSearch opt-out page]

Claude (internal reasoning):
- I see a search form with fields: "First Name", "Last Name", "City", "State"
- This is a "search self first" broker (from brokers.yaml)
- I'll fill these fields with data from .env
- Then show the user matching records to select

Claude (to user):
"I can see TruePeopleSearch's opt-out page. It requires searching for your
record first. I'll search using your name and city from your .env file..."

[Fills form, clicks search]

Claude (to user):
"Found 3 records:
1. Jeremy [Last] - Amsterdam, Netherlands - Age ~35
2. Jeremy [Last] - [Previous City], Netherlands - Age ~32
3. Jeremy [DifferentLast] - Amsterdam, Netherlands - Age ~40

Which records should I select for opt-out? (Likely #1 and #2 based on your
addresses in .env)"

User: "Yes, 1 and 2"

Claude: "Selecting records 1 and 2... Now proceeding to the opt-out form..."
```

#### Handling Edge Cases:

- **CAPTCHAs**: Claude detects them visually, pauses, asks user to solve
- **Dropdowns**: Claude finds options matching your data (e.g., state selector)
- **Date pickers**: Formats DOB from .env appropriately
- **Confirmation checkboxes**: Identifies and checks them
- **Terms of service**: Reads and checks acceptance boxes
- **Unknown fields**: Asks user "What should I enter for [field name]?"

---

## 6. Conversational Interface

**No CLI commands** - Instead, you interact with Claude Code conversationally.

### 6.1 Starting a Session

```bash
# Launch Claude Code with Chrome extension
$ claude --chrome

# Claude Code initializes and presents status
Claude: "I've loaded your GDPR opt-out configuration. Current status:
         - Completed: 5 brokers
         - Pending: 35 brokers
         - Awaiting verification: 2 brokers

         Would you like to continue processing, or check status first?"
```

### 6.2 Common Commands (Conversational)

#### Process Brokers

```
User: "Let's process Tier 1 brokers"
Claude: [Filters to Tier 1, shows list, begins processing]

User: "Continue where we left off"
Claude: [Checks database, resumes from last incomplete broker]

User: "Process just Spokeo"
Claude: [Processes only Spokeo]

User: "Do the easy ones first"
Claude: [Sorts by difficulty: easy, filters pending, starts processing]

User: "Let's do 10 brokers today"
Claude: [Processes next 10 pending brokers]
```

#### Check Status

```
User: "What's our progress?"
Claude: "You've completed 15/40 brokers (37.5%):
         ✓ Tier 1: 8/10 complete
         ✓ Tier 2: 5/8 complete
         ✓ Tier 3: 2/15 complete
         ⏳ Awaiting verification: Spokeo, BeenVerified, Whitepages"

User: "What's pending verification?"
Claude: [Queries database for awaiting_verification status, lists them]

User: "Show me what's left in Tier 1"
Claude: [Lists incomplete Tier 1 brokers]
```

#### Update Status

```
User: "I verified Spokeo"
Claude: [Updates database: Spokeo → completed, shows confirmation]

User: "Mark Radaris as skipped - it requires ID upload"
Claude: [Updates database: Radaris → skipped, adds note]

User: "Reset Whitepages to try again"
Claude: [Updates database: Whitepages → pending]
```

#### Generate Reports

```
User: "Generate a compliance report"
Claude: [Queries database, creates markdown report with:
         - Summary of all submissions
         - Screenshot evidence paths
         - Brokers awaiting verification
         - Brokers requiring manual follow-up
         - Timeline of submissions]

User: "Show me all the screenshots"
Claude: [Lists all screenshot paths from database by broker]
```

### 6.3 Session Management

```
User: "I need to stop for now"
Claude: "No problem! Progress has been saved to database.
         We've completed 3 more brokers today (Spokeo, FamilyTreeNow,
         TruePeopleSearch). Next time, just say 'continue where we left off'."

# Later session...
User: "Continue where we left off"
Claude: [Checks database, resumes from last point]
```

### 6.4 Handling Issues

```
User: "This form looks different than expected"
Claude: "Let me analyze it again... [uses vision to re-examine form]
         I see it's a new layout. Here's what I found..."

User: "Skip this broker for now"
Claude: [Marks as skipped in database, moves to next]

User: "The screenshot didn't save"
Claude: [Takes new screenshot, updates database path]
```

---

## 7. GDPR Request Template

```
templates/gdpr_request.txt
---

Subject: GDPR Article 17 - Right to Erasure Request

To Whom It May Concern,

I am writing to request erasure of my personal data pursuant to Article 17 
of the General Data Protection Regulation (GDPR).

I am an EU resident (Netherlands) and request that you:

1. Confirm what personal data you hold about me
2. Delete all personal data you hold about me
3. Confirm deletion within 30 days as required by GDPR

My identifying information:
- Name: {first_name} {last_name}
- Email: {email}
- Address: {address}
{additional_identifiers}

If you require additional information to verify my identity, please contact 
me at the email address above. However, please note that under GDPR Article 
12(6), you may only request additional information where you have reasonable 
doubts concerning identity.

If you do not comply within 30 days, I reserve the right to lodge a complaint 
with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens).

Regards,
{first_name} {last_name}
```

---

## 8. Security Requirements

### 8.1 Data Protection

**CRITICAL: `.env` File Security**
- [ ] `.env` file contains sensitive personal information in plain text
- [ ] **MUST be added to `.gitignore` immediately** (verify it's there)
- [ ] **NEVER commit `.env` to version control**
- [ ] Restrict file permissions: `chmod 600 .env` (owner read/write only)
- [ ] Store `.env` on encrypted disk/partition if possible
- [ ] No personal data in logs (audit_log stores only broker_id, not personal info)
- [ ] `.env.template` (safe to commit) should contain only placeholders

**Why No Encryption?**
- Original PRD used Fernet encryption with master password
- Claude Code approach prioritizes simplicity over encryption-at-rest
- You're responsible for securing the `.env` file (treat like SSH private key)
- Benefits: Easier setup, no password to remember, Claude Code can read directly

### 8.2 Browser Security

- [ ] Use Chrome's incognito/private browsing (optional, for privacy)
- [ ] Disable WebRTC leak (prevents IP address exposure)
- [ ] Use realistic user agent (avoid detection as bot)
- [ ] Claude Code adds natural delays between actions
- [ ] Browser runs in normal (non-headless) mode for CAPTCHA solving

### 8.3 Network Security

- [ ] Optional: Route through VPN/proxy before starting session
- [ ] Only connects to:
  - Target data broker websites
  - No other external services
- [ ] All screenshots stored locally only (`data/screenshots/`)
- [ ] Database stored locally only (`data/submissions.db`)
- [ ] No cloud uploads or external API calls

### 8.4 Operational Security

- [ ] **Never upload ID documents automatically** - Claude Code will flag these for manual handling
- [ ] User confirms every submission before final click (semi-supervised)
- [ ] All actions logged to `audit_log` table for GDPR compliance
- [ ] Screenshots provide evidence for enforcement if brokers don't comply
- [ ] Email aliases help track which broker leaked/sold data (if you get spam)

### 8.5 .gitignore Requirements

**MUST include:**
```gitignore
# Personal data - NEVER commit!
.env

# Database contains submission records
data/submissions.db
data/submissions.db-journal

# Screenshots may contain personal info
data/screenshots/

# OS files
.DS_Store
Thumbs.db
```

**Safe to commit:**
- `.env.template`
- `config/brokers.yaml`
- `docs/`
- `templates/`

---

## 9. Implementation Phases

**No code to write** - These phases are setup and testing with Claude Code.

### Phase 1: Setup & First Broker (MVP)

**Goal:** Get the basic structure working and successfully opt out from 1 easy broker.

- [ ] Create directory structure (`config/`, `data/`, `data/screenshots/`, `templates/`, `docs/`)
- [ ] Create `.gitignore` with `.env`, `data/submissions.db`, `data/screenshots/`
- [ ] Create `.env.template` with all fields documented
- [ ] Create your personal `.env` file (copy template, fill in real data)
- [ ] Verify `.env` permissions: `chmod 600 .env`
- [ ] Create `config/brokers.yaml` with at least Tier 1 brokers (extract from this PRD)
- [ ] Initialize SQLite database: `data/submissions.db` with schema from Section 4
- [ ] Create `templates/gdpr_request.txt` (copy from Section 7)
- [ ] Test with 1 easy broker: TruePeopleSearch or FamilyTreeNow
  - Launch: `claude --chrome`
  - Say: "Process TruePeopleSearch"
  - Verify Claude Code reads .env, brokers.yaml, uses database
  - Verify screenshot capture works
  - Verify database update works

**Success Criteria:**
- ✓ Complete 1 broker opt-out successfully
- ✓ Screenshot saved to `data/screenshots/`
- ✓ Database record created with status
- ✓ Can resume session and check status

### Phase 2: Multi-Broker Automation

**Goal:** Process all Tier 1 brokers (major US people search sites).

- [ ] Add all Tier 1 broker definitions to `brokers.yaml` (10 brokers)
- [ ] Test Claude Code's form analysis on different broker types:
  - "Search self first" (Spokeo, BeenVerified, Whitepages)
  - Direct opt-out (TruePeopleSearch, FastPeopleSearch)
  - Email-based (MyLife)
- [ ] Refine prompting for:
  - CAPTCHA handling
  - Multi-step workflows
  - Record selection
  - Email alias generation/tracking
- [ ] Test batch processing: "Process 5 brokers"
- [ ] Test resumability: Stop mid-session, restart, continue

**Success Criteria:**
- ✓ Complete 8+ Tier 1 brokers (some may require skipping if too hard)
- ✓ Database accurately tracks status for all
- ✓ Screenshots for each submission
- ✓ Can stop and resume without data loss

### Phase 3: European Brokers + Remaining Tiers

**Goal:** Add Tier 2 (EU) brokers and start Tier 3-5.

- [ ] Add Tier 2 brokers to `brokers.yaml` (192.com, Infobel, Yasni)
- [ ] Test GDPR email requests (using templates)
- [ ] Add Tier 3-5 brokers to `brokers.yaml`:
  - Professional databases (ZoomInfo, Apollo, Lusha, RocketReach)
  - Background checks (Checkr, LexisNexis)
  - Aggregators (PeekYou, CyberBackgroundChecks, etc.)
- [ ] Handle edge cases:
  - Account creation required (Radaris)
  - ID upload required (LexisNexis) → mark as manual
  - Phone verification (Whitepages) → guide user through it
- [ ] Test "skip" functionality for problematic brokers

**Success Criteria:**
- ✓ All 40+ brokers defined in `brokers.yaml`
- ✓ Complete 30+ brokers (some will need manual handling)
- ✓ Edge cases properly handled (skipped with notes)

### Phase 4: Reporting & Maintenance

**Goal:** Generate compliance reports and plan for re-running.

- [ ] Create `docs/usage-guide.md` with:
  - Setup instructions
  - Common usage patterns
  - Troubleshooting tips
- [ ] Test report generation:
  - "Generate a compliance report"
  - Claude Code creates markdown summary with evidence
- [ ] Test status queries:
  - "What's our progress?"
  - "What's pending verification?"
  - "Show me all completed brokers"
- [ ] Test re-running after 6 months:
  - Brokers may re-add your data over time
  - Reset completed brokers to pending
  - Re-run opt-out process
- [ ] Document when to re-run (every 6-12 months recommended)

**Success Criteria:**
- ✓ Comprehensive usage guide
- ✓ Report generation works
- ✓ Clear process for re-running
- ✓ All documentation complete

---

## 10. Success Criteria

1. **Functional**: Successfully submit opt-out requests to 80%+ of listed brokers
2. **Evidence**: Screenshot documentation for every submission
3. **Trackable**: Clear status dashboard showing pending/completed
4. **Resumable**: Can stop mid-session and continue later
5. **Maintainable**: Add new brokers via YAML config, not code changes

---

## 11. Out of Scope (for v1)

- Automatic ID document upload (security risk)
- Phone verification automation (requires Twilio/similar)
- Fully unattended operation (semi-supervised by design)
- Mobile app
- Cloud deployment
- Multi-user support

---

## 12. Notes for Operation with Claude Code

### 12.1 For the User (You)

**Starting Your First Session:**
1. Complete Phase 1 setup (directories, .env, database, brokers.yaml)
2. Launch: `claude --chrome` in this repository
3. Start small: "Let's process FamilyTreeNow" (easy broker to test)
4. Verify everything works before batch processing

**Best Practices:**
- **Start with easy brokers** - Build confidence before tackling hard ones
- **Process in batches** - Do 5-10 brokers per session, not all 40 at once
- **Review before submitting** - Always confirm what Claude is about to submit
- **Track verification emails** - Check your optout email domain regularly
- **Re-run periodically** - Brokers may re-add your data every 6-12 months
- **Keep screenshots** - Evidence if brokers don't comply with GDPR

**When Things Go Wrong:**
- If a broker's form changed: Say "This form looks different, re-analyze it"
- If you need to skip a broker: Say "Skip this one for now"
- If screenshot didn't save: Say "Take another screenshot"
- If database seems wrong: Say "Show me the database status for [broker]"

### 12.2 For Claude Code (Operating Notes)

**When a user starts a session in this repo:**

1. **Initialize context** - Before engaging with the user:
   - Read `.env` file to load personal data
   - Read `config/brokers.yaml` to load broker list
   - Query `data/submissions.db` to check progress
   - Present status summary to user

2. **Form analysis approach**:
   - Use vision to see the page (identify CAPTCHAs, form layout)
   - Read page HTML/DOM to find form elements
   - Map form fields semantically to .env data
   - Explain what you're doing to the user
   - Ask for confirmation before submitting

3. **Database operations**:
   - Insert new submission: `INSERT INTO submissions (broker_id, status, submitted_at, email_alias, screenshot_path, notes) VALUES (...)`
   - Update status: `UPDATE submissions SET status='completed', completed_at=CURRENT_TIMESTAMP WHERE broker_id=?`
   - Check progress: `SELECT broker_id, status FROM submissions WHERE status='completed'`
   - Log actions: `INSERT INTO audit_log (action, broker_id, details) VALUES (?, ?, ?)`

4. **Screenshot workflow**:
   - Before submit: Save to `data/screenshots/[broker_id]_pre_[timestamp].png`
   - After submit: Save to `data/screenshots/[broker_id]_post_[timestamp].png`
   - Update database with screenshot paths

5. **CAPTCHA handling**:
   - Detect visually or via page elements
   - Tell user: "There's a CAPTCHA - please solve it in the browser"
   - Wait for user to say "Done" before continuing

6. **Email alias generation** (if needed):
   - Format: `[broker_id]-[random_chars]@[EMAIL_OPTOUT_DOMAIN from .env]`
   - Store in database: `email_alias` column
   - User can track responses per broker

7. **Multi-step workflows**:
   - "Search self first" brokers: Fill search → show results → user selects → proceed to opt-out
   - Confirmation pages: Extract confirmation number if present, screenshot, update database
   - Multi-page forms: Navigate through steps, narrate progress to user

8. **Error handling**:
   - If page doesn't load: Report to user, offer to retry
   - If form structure unexpected: Re-analyze, ask user for guidance
   - If submission fails: Screenshot error, update database with error_message, ask user how to proceed

9. **Session continuity**:
   - All state in database - sessions are inherently resumable
   - When user says "continue where we left off": Query for pending brokers, resume
   - No state held in conversation context - database is source of truth

**Key Principles:**
- **Semi-supervised**: Always get user confirmation before submitting
- **Evidence-first**: Screenshot everything
- **Transparent**: Explain what you're doing at each step
- **Flexible**: Adapt to different form structures without custom code
- **Resumable**: Use database for state, not conversation memory

---

## 13. Getting Started

### 13.1 Prerequisites

- Claude Code installed (`npm install -g @anthropic-ai/claude-code`)
- Chrome browser installed
- Basic familiarity with command line

### 13.2 Initial Setup (One-Time)

**Step 1: Create Directory Structure**
```bash
cd /path/to/gdpr-optout-databrokers

# Create directories
mkdir -p config data/screenshots templates docs
```

**Step 2: Create .gitignore**
```bash
cat > .gitignore << 'EOF'
# Personal data - NEVER commit!
.env

# Database contains submission records
data/submissions.db
data/submissions.db-journal

# Screenshots may contain personal info
data/screenshots/

# OS files
.DS_Store
Thumbs.db
EOF
```

**Step 3: Create .env.template**
```bash
cat > .env.template << 'EOF'
# .env.template - Copy this to .env and fill in your real information
# NEVER commit the .env file to version control!

# === IDENTITY ===
FIRST_NAME=
LAST_NAME=
MIDDLE_NAME=
NAME_VARIATIONS=

# === CURRENT ADDRESS ===
CURRENT_STREET=
CURRENT_CITY=
CURRENT_POSTAL=
CURRENT_COUNTRY=

# === PREVIOUS ADDRESSES ===
# Format: street|city|postal|country|years
PREVIOUS_ADDRESS_1=
PREVIOUS_ADDRESS_2=
PREVIOUS_ADDRESS_3=

# === CONTACT ===
EMAIL_REAL=
EMAIL_OPTOUT_DOMAIN=
PHONE=

# === VERIFICATION ===
DATE_OF_BIRTH=YYYY-MM-DD
EOF
```

**Step 4: Create Your .env File**
```bash
cp .env.template .env
chmod 600 .env  # Restrict permissions
# Now edit .env and fill in your real information
```

**Step 5: Create brokers.yaml**
```bash
# Extract the broker definitions from Section 3.2 of this PRD
# Save to config/brokers.yaml
# Start with just Tier 1 brokers for Phase 1
```

**Step 6: Initialize Database**
```bash
# Create the SQLite database with schema from Section 4
sqlite3 data/submissions.db < schema.sql
# (You'll need to create schema.sql from the SQL in Section 4)
```

Or use this one-liner:
```bash
sqlite3 data/submissions.db << 'EOF'
CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broker_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMP,
    verified_at TIMESTAMP,
    completed_at TIMESTAMP,
    email_alias TEXT,
    screenshot_path TEXT,
    confirmation_screenshot_path TEXT,
    notes TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verification_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broker_id TEXT NOT NULL,
    submission_id INTEGER REFERENCES submissions(id),
    received_at TIMESTAMP,
    subject TEXT,
    verification_link TEXT,
    clicked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    broker_id TEXT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
```

**Step 7: Create GDPR Email Template**
```bash
# Copy the template from Section 7 to templates/gdpr_request.txt
```

### 13.3 First Run

```bash
# Launch Claude Code with Chrome extension
claude --chrome

# You'll be in an interactive session
# Say: "Let's process FamilyTreeNow"
# (FamilyTreeNow is a good first test - it's easy and fast)

# Claude Code will:
# 1. Load your .env file
# 2. Load config/brokers.yaml
# 3. Check data/submissions.db
# 4. Navigate to the broker's opt-out page
# 5. Guide you through the process
```

### 13.4 Typical Session Flow

1. **Start session**: `claude --chrome`
2. **Check status**: "What's our progress?"
3. **Process brokers**: "Let's do Tier 1 brokers" or "Process 5 easy ones"
4. **Handle CAPTCHAs**: Solve them when Claude pauses
5. **Confirm submissions**: Review and approve each one
6. **End session**: "I need to stop" (progress auto-saved)
7. **Resume later**: "Continue where we left off"

### 13.5 Troubleshooting

**"Claude Code can't read my .env file"**
- Verify file exists: `ls -la .env`
- Check you're in the right directory
- Verify file isn't corrupted

**"Database not found"**
- Initialize it following Step 6 above
- Verify path: `ls -la data/submissions.db`

**"Screenshots aren't saving"**
- Verify directory exists: `mkdir -p data/screenshots`
- Check permissions

**"Broker form looks different than expected"**
- Broker websites change frequently
- Say to Claude: "This form looks different, re-analyze it"
- May need to update brokers.yaml with new URL

---

## 14. Example Session Dialogue

### 14.1 Complete First Broker (Detailed)

```
$ claude --chrome

Claude: "I've initialized the GDPR opt-out system. I can see:
         - .env file loaded with your personal data
         - config/brokers.yaml has 40 brokers defined
         - data/submissions.db shows 0 completed, 40 pending

         This looks like your first run. I recommend starting with an easy
         broker to test the workflow. FamilyTreeNow or TruePeopleSearch are
         good choices.

         What would you like to do?"

User: "Let's try FamilyTreeNow"

Claude: "Great choice - FamilyTreeNow is easy (requires CAPTCHA but no email
         verification).

         I'm navigating to https://www.familytreenow.com/optout...
         [Browser opens to the page]

         I can see the opt-out form. It has:
         - First Name field
         - Middle Name field (optional)
         - Last Name field
         - City field
         - State dropdown

         I'll fill this with your data from .env:
         - First Name: Jeremy
         - Last Name: [REDACTED]
         - City: Amsterdam
         - State: (I'll leave this blank since you're in Netherlands)

         Filling the form now..."

         [Fills form fields]

Claude: "Form filled. I can see there's a reCAPTCHA. Please solve it in the
         browser, then let me know when you're done."

User: [Solves CAPTCHA in browser]

User: "Done"

Claude: "Thanks! Taking a pre-submission screenshot...
         Saved to: data/screenshots/familytreenow_pre_20250128_143022.png

         Here's what I'm about to submit:
         - First Name: Jeremy
         - Last Name: [REDACTED]
         - City: Amsterdam
         - State: (blank)

         Ready to submit this opt-out request?"

User: "Yes, submit it"

Claude: "Submitting... [clicks submit button]

         Success! I can see the confirmation page. It says:
         'Your opt-out request has been received and will be processed
         immediately.'

         Taking confirmation screenshot...
         Saved to: data/screenshots/familytreenow_post_20250128_143055.png

         Updating database...

         Done! FamilyTreeNow opt-out completed.
         Status: completed (no verification needed)

         Would you like to process another broker?"

User: "Show me the database status"

Claude: "Querying database...

         Completed brokers: 1
         - familytreenow: completed (2025-01-28 14:30:55)

         Pending brokers: 39
         - spokeo, beenverified, whitepages, truepeoplesearch, [...]

         Awaiting verification: 0

         Great progress! You've completed 1/40 brokers (2.5%)."
```

### 14.2 Batch Processing (Condensed)

```
User: "Let's do 5 easy brokers"

Claude: "I'll process these 5 easy brokers:
         1. TruePeopleSearch (easy, requires CAPTCHA)
         2. FastPeopleSearch (easy, requires CAPTCHA)
         3. CyberBackgroundChecks (easy)
         4. PublicRecordsNow (easy)
         5. VoterRecords.com (easy)

         Starting with TruePeopleSearch..."

         [For each broker:]
         - Navigate to site
         - Analyze form
         - Fill fields
         - Handle CAPTCHA if needed
         - Screenshot
         - User confirms
         - Submit
         - Screenshot confirmation
         - Update database

Claude: "Batch complete! Summary:
         ✓ TruePeopleSearch: completed
         ✓ FastPeopleSearch: completed
         ✓ CyberBackgroundChecks: completed
         ✓ PublicRecordsNow: completed
         ✓ VoterRecords.com: completed

         Total completed: 6/40 (15%)
         Time taken: ~25 minutes
         Screenshots: 10 saved to data/screenshots/

         Would you like to continue or take a break?"

User: "Take a break"

Claude: "No problem! All progress saved to database. Next time just say
         'continue where we left off' and we'll resume."
```

### 14.3 Resuming a Session

```
$ claude --chrome

Claude: "Welcome back! I've loaded your GDPR opt-out data.

         Current status:
         ✓ Completed: 6 brokers
         ⏳ Awaiting verification: 2 (Spokeo, BeenVerified)
         ⏸️  Pending: 32 brokers

         What would you like to do?"

User: "Continue where we left off"

Claude: "I'll continue with the pending brokers. Next up is Whitepages,
         which is medium difficulty and requires phone verification.

         Would you like to process Whitepages, or skip to easier brokers?"

User: "Skip to easier ones"

Claude: "I'll filter for easy brokers only. Here are the remaining easy ones:
         - Intelius (covers 4 sites)
         - ThatsThem
         - PeekYou
         [...]

         Shall I start with Intelius?"
```

---

## Appendix A: Data Broker Opt-Out URLs Quick Reference

| Broker | Difficulty | URL |
|--------|------------|-----|
| Spokeo | Easy | spokeo.com/optout |
| BeenVerified | Medium | beenverified.com/app/optout/search |
| Whitepages | Hard | whitepages.com/suppression-requests |
| TruePeopleSearch | Easy | truepeoplesearch.com/removal |
| FastPeopleSearch | Easy | fastpeoplesearch.com/removal |
| Intelius | Medium | intelius.com/opt-out |
| Radaris | Hard | radaris.com/control/privacy |
| FamilyTreeNow | Easy | familytreenow.com/optout |
| PeekYou | Medium | peekyou.com/about/contact/optout |
| ZoomInfo | Easy | zoominfo.com/about-zoominfo/privacy-manage-profile |

---

## Appendix B: GDPR Enforcement Contacts

If a broker doesn't comply within 30 days:

**Netherlands (primary)**
- Autoriteit Persoonsgegevens
- https://autoriteitpersoonsgegevens.nl/en/contact-dutch-dpa/contact-us

**EU Cross-border**
- Report via your national DPA, which coordinates with others

**US Companies (CCPA angle if applicable)**
- California AG: oag.ca.gov/privacy/privacy-complaint

---

*End of PRD*
