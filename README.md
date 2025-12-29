# GDPR Data Broker Opt-Out Automation Tool

An interactive tool powered by Claude Code that automates the tedious process of submitting GDPR/opt-out requests to data brokers. Designed for investigative journalists and privacy-conscious individuals who need to reduce their public data footprint.

## Overview

Using Claude Code's `--chrome` extension, you engage in conversational sessions where Claude navigates to data broker sites, analyzes opt-out forms, fills them with your information, and guides you through the submission process.

### Design Principles

- **Semi-supervised**: Human reviews and approves each submission, intervenes for CAPTCHAs
- **Evidence-first**: Screenshot and log everything for GDPR enforcement
- **Privacy-preserving**: Local storage only, no cloud dependencies
- **Resumable**: Can stop and continue across sessions with persistent state tracking
- **Conversational**: Natural language interaction with Claude Code guiding each step

## Features

- **40+ Data Brokers**: Pre-configured definitions for major US and EU data brokers
- **Tier-based Processing**: Organized by priority and difficulty
- **Intelligent Form Analysis**: Claude analyzes forms using vision and reasoning
- **State Tracking**: SQLite database tracks progress across sessions
- **Evidence Collection**: Automatic screenshot capture for GDPR compliance
- **Email Alias Support**: Generate unique aliases per broker to track data leaks
- **Technical Form Capture**: Record form structure and selectors for future full automation

## Quick Start

### Prerequisites

- Claude Code installed (`npm install -g @anthropic-ai/claude-code`)
- Chrome browser installed
- Basic familiarity with command line

### Initial Setup (5 minutes)

1. **Clone or download this repository**

2. **Create your personal .env file**
   ```bash
   cp .env.template .env
   chmod 600 .env
   # Edit .env and fill in your real information
   ```

   **CRITICAL**: Never commit the `.env` file! It contains your personal data.

3. **Verify the database exists**
   ```bash
   ls data/submissions.db
   ```
   The database is pre-initialized and ready to use.

4. **Launch Claude Code**
   ```bash
   claude --chrome
   ```

5. **Start processing**
   Say: "Let's process FamilyTreeNow" (easy first test)

## Directory Structure

```
gdpr-optout-databrokers/
├── README.md                              # This file
├── .env                                   # Your personal data (gitignored!)
├── .env.template                          # Template for setup
├── .gitignore                             # Ensures .env stays private
├── config/
│   └── brokers.yaml                       # 40+ broker definitions
├── data/
│   ├── submissions.db                     # SQLite tracking database (4 tables)
│   └── screenshots/                       # Evidence screenshots
├── docs/
│   ├── gdpr-optout-prd.md                 # Full product requirements
│   ├── usage-guide.md                     # Detailed usage instructions
│   └── technical-form-analysis-guide.md   # Guide for capturing form details
├── scripts/
│   └── export_form_analysis.py            # Export form analysis data
└── templates/
    └── gdpr_request.txt                   # GDPR Article 17 email template
```

## Usage Examples

### Check Status
```
User: "What's our progress?"
Claude: [Shows completed, pending, and awaiting verification brokers]
```

### Process Brokers
```
User: "Let's process Tier 1 brokers"
Claude: [Processes major US people search sites]

User: "Do 5 easy ones"
Claude: [Filters by difficulty, processes 5 brokers]

User: "Continue where we left off"
Claude: [Resumes from last incomplete broker]
```

### Update Status
```
User: "I verified Spokeo"
Claude: [Updates database status to completed]

User: "Skip LexisNexis - requires ID upload"
Claude: [Marks as skipped with note]
```

## How It Works

1. **Launch Session**: Run `claude --chrome` in this repository
2. **Claude Loads Context**: Reads `.env`, `config/brokers.yaml`, queries `data/submissions.db`
3. **Conversational Control**: You say "Let's process Tier 1 brokers"
4. **Browser Automation**: Claude navigates Chrome, analyzes forms using vision, fills fields
5. **State Persistence**: Progress saved to SQLite after each broker

## Broker Coverage

### Tier 1: Major People Search Sites (10 brokers)
- Spokeo, BeenVerified, Whitepages, TruePeopleSearch, FastPeopleSearch, Intelius, Radaris, MyLife, FamilyTreeNow, ThatsThem

### Tier 2: European Data Brokers (3 brokers)
- 192.com, Infobel, Yasni

### Tier 3: Professional Databases (4 brokers)
- ZoomInfo, Apollo.io, Lusha, RocketReach

### Tier 4: Background Check Services (2 brokers)
- Checkr, LexisNexis

### Tier 5: Aggregators & Lesser-Known (7 brokers)
- PeekYou, CyberBackgroundChecks, PublicRecordsNow, PeopleLooker, VoterRecords.com

## Security

### Critical Security Requirements

1. **Never commit `.env` file** - Contains your personal data
2. **Restrict `.env` permissions**: `chmod 600 .env`
3. **Screenshots contain personal info** - All stored locally in `data/screenshots/`
4. **Database contains submission records** - Stored locally in `data/submissions.db`
5. **No cloud uploads** - Everything stays on your machine

### What's Safe to Share

- `.env.template` (no personal data)
- `config/brokers.yaml` (broker definitions only)
- `docs/` (documentation)
- `templates/` (GDPR email template)

## Typical Session Flow

1. **Start**: `claude --chrome`
2. **Check status**: "What's our progress?"
3. **Process brokers**: "Let's do Tier 1 brokers"
4. **Handle CAPTCHAs**: Solve them when Claude pauses
5. **Confirm submissions**: Review and approve each one
6. **End session**: "I need to stop" (progress auto-saved)
7. **Resume later**: "Continue where we left off"

## Technical Form Analysis (Phase 2 Preparation)

While processing brokers, you can capture technical details about each form for future full automation:

### Capturing Form Details

During a session, ask Claude to analyze and store form structure:

```
User: "Before submitting to Spokeo, please analyze and store the technical form details"
Claude: [Inspects page, captures form selectors, field mappings, CAPTCHA type, etc.]
        [Stores in form_analysis database table]
```

### What Gets Captured

- **Form structure**: Selectors for form, fields, submit button
- **Field mappings**: Which .env variables map to which form fields
- **CAPTCHA details**: Type (reCAPTCHA v2/v3, hCaptcha) and selectors
- **Workflow**: Multi-step forms, search-first requirements
- **Timing**: Required delays to avoid anti-bot detection
- **Confirmation**: How to detect successful submission

### Exporting Form Analysis

Export captured technical details for automation:

```bash
# Export all form analysis as JSON
python scripts/export_form_analysis.py --format json

# Export specific broker
python scripts/export_form_analysis.py --broker spokeo --format automation

# View statistics
python scripts/export_form_analysis.py --format stats

# Export as markdown table
python scripts/export_form_analysis.py --format markdown > docs/form-status.md
```

### Documentation

See `docs/technical-form-analysis-guide.md` for:
- Complete field reference
- How to capture technical details
- Browser DevTools tips
- Example form analysis records
- Database schema

This data will enable fully automated form filling in Phase 2+.

## Maintenance

### Re-running After 6-12 Months

Data brokers may re-add your data over time. To re-run:

```
User: "Reset all completed brokers to pending"
Claude: [Updates database, ready to process again]
```

### Adding New Brokers

Edit `config/brokers.yaml` and add new broker definitions. No code changes needed.

## Documentation

- **Full PRD**: See `docs/gdpr-optout-prd.md` for complete product requirements
- **Usage Guide**: See `docs/usage-guide.md` for detailed usage instructions
- **Technical Form Analysis**: See `docs/technical-form-analysis-guide.md` for capturing form details
- **GDPR Template**: See `templates/gdpr_request.txt` for email-based requests

## GDPR Enforcement

If a broker doesn't comply within 30 days, you can file a complaint:

- **Netherlands**: [Autoriteit Persoonsgegevens](https://autoriteitpersoonsgegevens.nl/en/contact-dutch-dpa/contact-us)
- **EU Cross-border**: Report via your national DPA
- **US (CCPA)**: [California AG](https://oag.ca.gov/privacy/privacy-complaint)

Your screenshots from `data/screenshots/` serve as evidence.

## Success Criteria

- ✓ Successfully submit opt-out requests to 80%+ of listed brokers
- ✓ Screenshot documentation for every submission
- ✓ Clear status tracking of pending/completed brokers
- ✓ Resumable across sessions
- ✓ Add new brokers via YAML config, not code

## License

This tool is for personal privacy protection. Use responsibly and in accordance with applicable laws.

## Support

For issues or questions, refer to:
- `docs/gdpr-optout-prd.md` - Complete technical documentation
- `docs/usage-guide.md` - Detailed usage instructions

---

**Remember**: Always review what Claude is about to submit before confirming. This is a semi-supervised tool - you're in control.
