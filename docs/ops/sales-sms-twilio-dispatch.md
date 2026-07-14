# Sales SMS dispatch (operator-approved)

SalesTeam never auto-sends SMS. Live send happens only from
`POST /api/admin/approvals/[id]` with `action: "DISPATCH"` when the draft is SMS.

## Recommended right now: Textbelt (no Twilio number / selfie ID)

Twilio phone purchase often requires identity photo verification. **Textbelt** needs only an API key.

1. Create a key: https://textbelt.com/
2. Add to `.env.local`:

```bash
SMS_PROVIDER=textbelt
TEXTBELT_API_KEY=your_key_here
TEXTBELT_SENDER=Ironframe
```

3. Restart Ironframe (`:3000`).
4. DISPATCH an SMS draft — contact must have a valid phone.

Smoke test only: `TEXTBELT_API_KEY=textbelt` (1 free SMS/day).

## Alternate: Twilio (when ID verification succeeds)

```bash
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_SMS_FROM_NUMBER=+1XXXXXXXXXX
```

## Operator flow

1. SalesTeam queues SMS draft → Approvals UI.
2. Operator DISPATCH → Textbelt or Twilio → `contact.phone`.
3. Summary records Message SID / Textbelt textId.
