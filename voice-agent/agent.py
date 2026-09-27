"""Boca Banker voice agent: LiveKit + xAI Grok Voice.

Answers the phone line (SIP) and the website's voice chat (browser visitors
the web app dispatches here, see src/app/api/voice/session/route.ts).

Run locally:   python agent.py dev
Deploy:        lk agent create   (see README.md)
"""

from __future__ import annotations

import asyncio
import logging
import os

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    RunContext,
    cli,
    function_tool,
    room_io,
)
from livekit.agents.beta.tools import EndCallTool
from livekit.plugins import noise_cancellation, xai

from leads import LeadStore, monthly_payment
from prompt import GREETING, WEB_GOODBYE, WEB_GREETING, WEB_WRAP_UP, build_instructions

load_dotenv(".env.local")
logger = logging.getLogger("boca-banker-voice")

# The web app dispatches website calls by this name too; keep them in sync.
AGENT_NAME = "boca-banker-phone"
VOICE_MODEL = "grok-voice-think-fast-2.0"
# Change without a redeploy: lk agent update-secrets --secrets AGENT_VOICE=<name>
VOICE = os.environ.get("AGENT_VOICE", "perseus").lower()
# Website calls are anonymous and billed by the minute, so they're capped.
# The browser hangs up a minute after this as a backstop.
WEB_CALL_LIMIT_S = 10 * 60


class BocaBankerVoiceAgent(Agent):
    def __init__(self, channel: str, caller_number: str | None) -> None:
        self.channel = channel
        self.caller_number = caller_number
        self.leads = LeadStore(channel=channel)
        super().__init__(
            instructions=build_instructions(channel, caller_number),
            tools=[
                xai.realtime.WebSearch(),
                EndCallTool(
                    extra_description="Only after the caller says goodbye or has nothing else to ask.",
                    end_instructions="Thank the caller and say goodbye in one short sentence.",
                    ignore_on_enter=True,
                ),
            ],
        )

    async def on_enter(self) -> None:
        self.session.generate_reply(instructions=WEB_GREETING if self.channel == "web" else GREETING)

    @function_tool()
    async def calculate_mortgage(
        self, context: RunContext, loan_amount: float, annual_rate_percent: float, term_years: int
    ) -> str:
        """Monthly principal and interest for a fixed-rate mortgage.

        Args:
            loan_amount: Loan amount in dollars, e.g. 400000.
            annual_rate_percent: Interest rate as a percent, e.g. 6.5.
            term_years: Loan term in years, usually 30 or 15.
        """
        payment = monthly_payment(loan_amount, annual_rate_percent, term_years)
        total_interest = payment * term_years * 12 - loan_amount
        return (
            f"Monthly principal and interest: ${payment:,.0f}. "
            f"Total interest over the loan: ${total_interest:,.0f}. "
            "Taxes, insurance, and any mortgage insurance are extra."
        )

    @function_tool()
    async def capture_lead(
        self,
        context: RunContext,
        name: str,
        summary: str,
        callback_number: str | None = None,
        email: str | None = None,
        interest: str | None = None,
    ) -> str:
        """Save the caller as a lead so Boca Banker can call them back.

        Args:
            name: The caller's name.
            summary: One sentence on their situation and what they want help with.
            callback_number: Best number to reach them. On the phone line, only if different from
                caller ID; on the website voice chat, always (there is no caller ID).
            email: Email address, only if they gave one.
            interest: One of: purchase, refinance, investment, cost segregation, other.
        """
        try:
            await self.leads.save(
                name=name,
                phone=callback_number or self.caller_number,
                email=email,
                summary=summary,
                interest=interest,
            )
        except Exception:
            logger.exception("failed to save %s lead", self.channel)
            return "Saving failed. Tell the caller Boca Banker's team will follow up, and keep helping."
        return "Saved. Let the caller know Boca Banker will follow up with them personally."


async def end_web_call_at_limit(ctx: JobContext, session: AgentSession) -> None:
    """Warn a minute before WEB_CALL_LIMIT_S, then say goodbye and hang up."""
    await asyncio.sleep(WEB_CALL_LIMIT_S - 60)
    session.generate_reply(instructions=WEB_WRAP_UP)
    await asyncio.sleep(60)
    await session.generate_reply(instructions=WEB_GOODBYE)
    await ctx.delete_room()


server = AgentServer()


@server.rtc_session(agent_name=AGENT_NAME)
async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()
    participant = await ctx.wait_for_participant()
    if participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP:
        channel = "phone"
        caller_number = participant.attributes.get("sip.phoneNumber")
        noise_filter = noise_cancellation.BVCTelephony()
    else:
        channel = "web"
        caller_number = None
        noise_filter = noise_cancellation.BVC()
    logger.info("%s call started from %s", channel, caller_number or participant.identity)

    session = AgentSession(
        llm=xai.realtime.RealtimeModel(model=VOICE_MODEL, voice=VOICE),
    )
    await session.start(
        agent=BocaBankerVoiceAgent(channel, caller_number),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(noise_cancellation=noise_filter),
        ),
        # Florida requires every party's consent to record a call; don't.
        record=False,
    )

    if channel == "web":
        limit = asyncio.create_task(end_web_call_at_limit(ctx, session))

        async def cancel_limit() -> None:
            limit.cancel()

        ctx.add_shutdown_callback(cancel_limit)


if __name__ == "__main__":
    cli.run_app(server)
