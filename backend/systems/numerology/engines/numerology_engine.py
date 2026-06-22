from datetime import date


LETTER_VALUES = {
    letter: (index % 9) + 1
    for index, letter in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
}
VOWELS = set("AEIOU")
MASTER_NUMBERS = {11, 22, 33}


def reduce_number(value, preserve_master=True):
    value = abs(int(value))
    while value > 9 and not (preserve_master and value in MASTER_NUMBERS):
        value = sum(int(digit) for digit in str(value))
    return value


def name_value(name, include):
    return sum(
        LETTER_VALUES[letter]
        for letter in name.upper()
        if letter in LETTER_VALUES and include(letter)
    )


def calculate_cycles(month, day, target_date):
    personal_year = reduce_number(
        reduce_number(month) + reduce_number(day) + reduce_number(target_date.year)
    )
    personal_month = reduce_number(personal_year + target_date.month)
    return {
        "personal_year": personal_year,
        "personal_month": personal_month,
        "personal_day": reduce_number(personal_month + target_date.day),
    }


def calculate_numerology(name, year, month, day, target_dates=None):
    target_dates = target_dates or [date.today()]
    life_path = reduce_number(
        reduce_number(year) + reduce_number(month) + reduce_number(day)
    )
    expression = reduce_number(name_value(name, lambda _letter: True))
    soul_urge = reduce_number(name_value(name, lambda letter: letter in VOWELS))
    personality = reduce_number(name_value(name, lambda letter: letter not in VOWELS))
    cycle_snapshots = [
        {
            "date": target_date.isoformat(),
            **calculate_cycles(month, day, target_date),
        }
        for target_date in target_dates
    ]

    return {
        "method": "Pythagorean numerology",
        "calculation_date": cycle_snapshots[0]["date"],
        "core_numbers": {
            "life_path": life_path,
            "birthday": reduce_number(day),
            "expression": expression,
            "soul_urge": soul_urge,
            "personality": personality,
        },
        "cycles": {
            name: value
            for name, value in cycle_snapshots[0].items()
            if name != "date"
        },
        "cycle_snapshots": cycle_snapshots,
    }
