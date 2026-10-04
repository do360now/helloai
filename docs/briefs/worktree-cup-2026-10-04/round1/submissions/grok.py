#!/usr/bin/env python3
"""Worktree Cup pilot: hub_scoreboard. Python 3 standard library only."""

import json
import math
import os
import sys
from fractions import Fraction

PLAYERS = ("astra", "grok", "opus")
PLAYER_SET = frozenset(PLAYERS)
TOP_FIELDS = frozenset(
    {"schema_version", "round_id", "players", "hidden_tests", "counterexamples", "forfeits"}
)
SLOTS = (Fraction(3), Fraction(2), Fraction(1))


class InputError(Exception):
    pass


def reject_nonfinite(token):
    raise InputError("non-finite number")


def no_duplicate_keys(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise InputError("duplicate key")
        obj[key] = value
    return obj


def as_integral(value):
    """Finite JSON number whose mathematical value is a whole number."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise InputError("not an integer")
    if isinstance(value, float):
        if not math.isfinite(value) or value != math.trunc(value):
            raise InputError("not an integer")
        return int(value)
    return value


def load_round(path):
    if not os.path.isfile(path):
        raise InputError("not a file")
    try:
        raw = open(path, "rb").read()
    except OSError as exc:
        raise InputError("unreadable file") from exc
    if raw.startswith(b"\xef\xbb\xbf"):
        raise InputError("bom")
    try:
        text = raw.decode("utf-8")
    except UnicodeError as exc:
        raise InputError("utf-8") from exc
    decoder = json.JSONDecoder(
        object_pairs_hook=no_duplicate_keys,
        parse_constant=reject_nonfinite,
    )
    try:
        value, end = decoder.raw_decode(text)
    except InputError:
        raise
    except json.JSONDecodeError as exc:
        raise InputError("invalid json") from exc
    if text[end:].strip() != "":
        raise InputError("trailing data")
    if not isinstance(value, dict):
        raise InputError("top-level value")
    return value


def parse_round(obj):
    if set(obj) != TOP_FIELDS:
        raise InputError("fields")
    version = obj["schema_version"]
    if type(version) is not int or version != 1:
        raise InputError("schema_version")
    round_id = obj["round_id"]
    if not isinstance(round_id, str) or round_id == "":
        raise InputError("round_id")

    players = obj["players"]
    if (
        not isinstance(players, list)
        or len(players) != 3
        or not all(isinstance(name, str) for name in players)
        or set(players) != PLAYER_SET
    ):
        raise InputError("players")

    hidden = obj["hidden_tests"]
    if not isinstance(hidden, dict) or set(hidden) != PLAYER_SET:
        raise InputError("hidden_tests")
    passed = {}
    totals = []
    for name in PLAYERS:
        entry = hidden[name]
        if not isinstance(entry, dict) or set(entry) != {"passed", "total"}:
            raise InputError("hidden_tests entry")
        got = as_integral(entry["passed"])
        total = as_integral(entry["total"])
        if total <= 0 or got < 0 or got > total:
            raise InputError("passed/total range")
        passed[name] = got
        totals.append(total)
    if len(set(totals)) != 1:
        raise InputError("unequal totals")

    forfeits = obj["forfeits"]
    if (
        not isinstance(forfeits, list)
        or not all(isinstance(name, str) for name in forfeits)
        or len(forfeits) != len(set(forfeits))
        or any(name not in PLAYER_SET for name in forfeits)
    ):
        raise InputError("forfeits")
    forfeit_set = set(forfeits)

    counterexamples = obj["counterexamples"]
    if not isinstance(counterexamples, list):
        raise InputError("counterexamples")
    seen = set()
    breaks = {name: 0 for name in PLAYERS}
    for entry in counterexamples:
        if not isinstance(entry, dict) or set(entry) != {"by", "against", "validated"}:
            raise InputError("counterexample")
        by = entry["by"]
        against = entry["against"]
        validated = entry["validated"]
        if by not in PLAYER_SET or against not in PLAYER_SET or by == against:
            raise InputError("counterexample players")
        if type(validated) is not bool:
            raise InputError("validated")
        pair = (by, against)
        if pair in seen:
            raise InputError("duplicate counterexample")
        seen.add(pair)
        if validated and by not in forfeit_set and against not in forfeit_set:
            breaks[by] += 1
    for name in forfeit_set:
        breaks[name] = 0

    return {
        "round_id": round_id,
        "passed": passed,
        "breaks": breaks,
        "forfeits": forfeit_set,
        "points": award(passed, breaks, forfeit_set),
    }


def award(passed, breaks, forfeits):
    eligible = [name for name in PLAYERS if name not in forfeits]
    eligible.sort(key=lambda name: (-passed[name], -breaks[name], name))
    slots = SLOTS[: len(eligible)]
    points = {name: Fraction(0) for name in PLAYERS}
    index = 0
    while index < len(eligible):
        end = index + 1
        while (
            end < len(eligible)
            and passed[eligible[end]] == passed[eligible[index]]
            and breaks[eligible[end]] == breaks[eligible[index]]
        ):
            end += 1
        average = sum(slots[index:end], Fraction(0)) / (end - index)
        for name in eligible[index:end]:
            points[name] = average
        index = end
    return points


def parse_args(argv):
    results = []
    fmt = "table"
    index = 0
    while index < len(argv):
        arg = argv[index]
        if arg == "--results":
            if index + 1 >= len(argv):
                raise InputError("missing --results")
            results.append(argv[index + 1])
            index += 2
        elif arg == "--format":
            if index + 1 >= len(argv):
                raise InputError("missing --format")
            fmt = argv[index + 1]
            index += 2
        else:
            raise InputError("usage")
    if not results:
        raise InputError("missing --results")
    if fmt not in ("table", "json"):
        raise InputError("format")
    return results, fmt


def json_number(value):
    if value.denominator == 1:
        return value.numerator
    return float(value)


def fmt_points(value):
    if value.denominator == 1:
        return str(value.numerator)
    return f"{float(value):.1f}"


def competition_place(points, player):
    return 1 + sum(1 for other in PLAYERS if points[other] > points[player])


def standings(rounds):
    totals = {name: Fraction(0) for name in PLAYERS}
    break_totals = {name: 0 for name in PLAYERS}
    per_round = {name: {} for name in PLAYERS}
    for rnd in rounds:
        rid = rnd["round_id"]
        for name in PLAYERS:
            per_round[name][rid] = rnd["points"][name]
            totals[name] += rnd["points"][name]
            break_totals[name] += rnd["breaks"][name]
    order = sorted(PLAYERS, key=lambda name: (competition_place(totals, name), name))
    rows = []
    for name in order:
        rows.append(
            {
                "place": competition_place(totals, name),
                "player": name,
                "points": totals[name],
                "breaks": break_totals[name],
                "rounds": per_round[name],
            }
        )
    return rows


def render_table(rows, round_ids):
    columns = ["place", "player", "points", "breaks", *sorted(round_ids)]
    body = []
    for row in rows:
        cells = [
            str(row["place"]),
            row["player"],
            fmt_points(row["points"]),
            str(row["breaks"]),
        ]
        for rid in sorted(round_ids):
            cells.append(fmt_points(row["rounds"][rid]))
        body.append(cells)
    header = list(columns)
    widths = [
        max(len(header[col]), *(len(line[col]) for line in body))
        for col in range(len(columns))
    ]

    def format_line(cells):
        padded = [cells[col].ljust(widths[col]) for col in range(len(cells))]
        return "  ".join(padded).rstrip(" ")

    lines = [format_line(header)]
    lines.extend(format_line(line) for line in body)
    return "\n".join(lines) + "\n"


def render_json(rows):
    payload = {"standings": []}
    for row in rows:
        payload["standings"].append(
            {
                "place": row["place"],
                "player": row["player"],
                "points": json_number(row["points"]),
                "breaks": row["breaks"],
                "rounds": {
                    rid: json_number(row["rounds"][rid])
                    for rid in sorted(row["rounds"])
                },
            }
        )
    return json.dumps(payload, ensure_ascii=False) + "\n"


def main(argv):
    try:
        paths, fmt = parse_args(argv)
        rounds = []
        seen_ids = set()
        for path in paths:
            rnd = parse_round(load_round(path))
            if rnd["round_id"] in seen_ids:
                raise InputError("duplicate round_id")
            seen_ids.add(rnd["round_id"])
            rounds.append(rnd)
        rows = standings(rounds)
        round_ids = [rnd["round_id"] for rnd in rounds]
        text = render_json(rows) if fmt == "json" else render_table(rows, round_ids)
    except InputError as exc:
        sys.stderr.write(f"error: {exc}\n")
        return 2
    sys.stdout.buffer.write(text.encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
