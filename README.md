# Athletes of Life

**Hub + Audit + Email Workflows**

One repo to power athletesoflife.online:
- **Hub** — Main landing page (Zima-style, bilingual EN/ES)
- **Audit** — Business Readiness Assessment (5-dimension scoring + Claude-generated audit)
- **Email** — Resend-powered flows (`hello@athletesoflife.online`)

## Structure

```
├── index.html                 # Hub — main landing page
├── audit/index.html           # Business Readiness Audit
├── netlify/functions/
│   ├── send-audit.js          # Audit email flow (Claude + Resend)
│   └── send-contact.js        # Hub contact form (Resend)
├── netlify.toml               # Netlify config
├── package.json               # Dependencies
└── README.md
```

## Netlify Env Vars Required

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Sends welcome + notification emails from `hello@athletesoflife.online` |
| `ANTHROPIC_API_KEY` | Generates personalized audit text via Claude |
| `NOTIFY_EMAIL` | Where lead notifications go (default: a.lever.p7@gmail.com) |

## Domains

- `athletesoflife.online` → Hub (Netlify)
- `audit.athletesoflife.online` → Audit (CNAME to Netlify)
- Email: `hello@athletesoflife.online` (verified in Resend)

Built by [Elev8ed Innovations](https://elev8edinnovations.com)