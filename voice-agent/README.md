# Boca Banker phone agent

Answers inbound calls to the Boca Banker LiveKit phone number with xAI's
`grok-voice-think-fast-2.0` speech-to-speech model. It can:

- answer mortgage, refinance, and cost segregation questions (with web search for current rates),
- work out payments with `calculate_mortgage`,
- save the caller as a lead (`source = phone-call`) on the dashboard Leads page,
- hang up when the caller is done.

Calls are not recorded (`record=False`). Florida requires every party's consent to record a call.

## Website voice chat

The same agent takes voice calls from the website's **Talk** buttons. The web app's
`/api/voice/session` route creates a room per visitor and dispatches this agent into it by
`AGENT_NAME`. Website calls:

- open with "Hi, I'm Boca Banker's AI assistant…" and ask for a phone number (no caller ID),
- save leads with `source = web-voice`,
- end after 10 minutes (`WEB_CALL_LIMIT_S`), with a one-minute warning.

To turn it on, add this project's `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`
to the web app's environment (Vercel) and redeploy it. The Talk buttons only appear when all
three are set at build time. `lk project list` shows the URL; create an API key pair in the
LiveKit Cloud dashboard under Settings → Keys.

## One-time setup

1. Create a LiveKit Cloud project named `bocabanker` at https://cloud.livekit.io.
2. Link it to the CLI: `lk cloud auth`, then `lk project set-default bocabanker`.
3. Buy the number (every plan includes one free US local number):
   ```sh
   lk number search --country-code US --area-code 561 --limit 10
   lk number purchase --numbers +1561XXXXXXX
   ```
4. Route calls to the agent:
   ```sh
   lk sip dispatch create dispatch-rule.json          # prints the dispatch rule ID
   lk number list                                      # shows the phone number ID
   lk number update --id <PHONE_NUMBER_ID> --sip-dispatch-rule-id <DISPATCH_RULE_ID>
   ```
5. Deploy from this folder, passing secrets from the web app's `.env.local`:
   ```sh
   lk agent create --secrets-file .env.production
   ```
   `.env.production` needs `XAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`
   (see `.env.example`). Never commit it.

Redeploy after code changes with `lk agent deploy`.

## Local development

```sh
python3.11 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env.local   # fill in values
python agent.py download-files
python agent.py dev          # registers with LiveKit; call the number to test
pytest
```

The voice, model, and agent name are constants at the top of `agent.py`. The phone
script is in `prompt.py`.
