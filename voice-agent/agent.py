"""Boca Banker inbound phone agent: LiveKit telephony + xAI Grok Voice.

Run locally:   python agent.py dev
Deploy:        lk agent create   (see README.md)
"""

from __future__ import annotations

import logging

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
from prompt import GREETING, INSTRUCTIONS

load_dotenv(".env.local")
logger = logging.getLogger("boca-banker-voice")

AGENT_NAME = "boca-banker-phone"
VOICE_MODEL = "grok-voice-think-fast-2.0"
VOICE = "rex"


class BocaBankerPhoneAgent(Agent):
    def __init__(self, caller_number: str | None) -> None:
        self.caller_number = caller_number
        self.leads = LeadStore()
        super().__init__(
            instructions=INSTRUCTIONS.format(caller_number=caller_number or "unknown"),
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
        self.session.generate_reply(instructions=GREETING)

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
            callback_number: Best number to reach them, if different from caller ID.
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
            logger.exception("failed to save phone lead")
            return "Saving failed. Tell the caller Boca Banker's team will follow up, and keep helping."
        return "Saved. Let the caller know Boca Banker will follow up with them personally."


server = AgentServer()


@server.rtc_session(agent_name=AGENT_NAME)
async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()
    participant = await ctx.wait_for_participant()
    caller_number = None
    if participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP:
        caller_number = participant.attributes.get("sip.phoneNumber")
    logger.info("call started from %s", caller_number or "unknown")

    session = AgentSession(
        llm=xai.realtime.RealtimeModel(model=VOICE_MODEL, voice=VOICE),
    )
    await session.start(
        agent=BocaBankerPhoneAgent(caller_number),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=noise_cancellation.BVCTelephony(),
            ),
        ),
        # Florida requires every party's consent to record a call; don't.
        record=False,
    )


if __name__ == "__main__":
    cli.run_app(server)
