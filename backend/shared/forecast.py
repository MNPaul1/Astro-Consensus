from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone


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
        last_day = monthrange(today.year, today.month)[1]
        return (
            f"{today.strftime('%B %d, %Y')} to "
            f"{date(today.year, today.month, last_day).strftime('%B %d, %Y')}"
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
        last_day = date(today.year, today.month, monthrange(today.year, today.month)[1])
        dates = []
        current = today
        while current <= last_day:
            dates.append(current)
            current += timedelta(days=7)
        if dates[-1] != last_day:
            dates.append(last_day)
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
