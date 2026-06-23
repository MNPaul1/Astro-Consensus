from datetime import date, datetime, time, timedelta, timezone

MONTHLY_FORECAST_DAYS = 30
MONTHLY_SAMPLE_OFFSETS = (0, 5, 10, 15, 20, 25, 29)


def forecast_period(report_type):
    today = date.today()
    if report_type == "daily":
        return today.strftime("%B %d, %Y")
    if report_type == "weekly":
        return (
            f"{today.strftime('%B %d, %Y')} to "
            f"{(today + timedelta(days=6)).strftime('%B %d, %Y')}"
        )
    if report_type == "monthly":
        month_end = today + timedelta(days=MONTHLY_FORECAST_DAYS - 1)
        return (
            f"{today.strftime('%B %d, %Y')} to "
            f"{month_end.strftime('%B %d, %Y')}"
        )
    if report_type == "yearly":
        return f"{today.strftime('%B %d, %Y')} to December 31, {today.year}"
    return "Natal overview"


def forecast_dates(report_type):
    today = date.today()
    if report_type in {"personality", "daily"}:
        dates = [today]
    elif report_type == "weekly":
        dates = [today + timedelta(days=offset) for offset in range(7)]
    elif report_type == "monthly":
        dates = [today + timedelta(days=offset) for offset in MONTHLY_SAMPLE_OFFSETS]
    else:
        dates = [today]
        dates.extend(date(today.year, month, 1) for month in range(today.month + 1, 13))
        year_end = date(today.year, 12, 31)
        if dates[-1] != year_end:
            dates.append(year_end)

    return [
        datetime.combine(value, time(hour=12), tzinfo=timezone.utc)
        for value in dates
    ]
