import pytest

from leads import build_lead_row, monthly_payment


def test_monthly_payment_matches_standard_amortization():
    assert monthly_payment(400_000, 6.5, 30) == pytest.approx(2528.27, abs=0.01)


def test_monthly_payment_zero_rate():
    assert monthly_payment(360_000, 0, 30) == pytest.approx(1000)


def test_lead_row_fits_leads_table():
    row = build_lead_row(
        owner_id="owner-1",
        name="  Jane Doe ",
        phone="+15615550123",
        email="",
        summary="Wants to refinance a 7% loan.",
        interest="refinance",
    )
    assert row["user_id"] == "owner-1"
    assert row["buyer_name"] == "Jane Doe"
    assert row["buyer_email"] is None
    assert row["source"] == "phone-call"
    assert row["notes"] == "refinance — Wants to refinance a 7% loan."
    # Values must be allowed by the leads table's enums / NOT NULL columns
    assert row["property_type"] == "other"
    assert row["status"] == "new"
    assert row["priority"] in {"low", "medium", "high"}
    assert row["property_address"]
