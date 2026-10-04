"""Semantic Versioning 2.0.0 precedence helpers."""
import re
from functools import cmp_to_key

_RE = re.compile(
    r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)"
    r"(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
    r"(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
)


def _integer(digits):
    """Convert arbitrary-length ASCII digits without changing global limits."""
    value = 0
    for start in range(0, len(digits), 9):
        chunk = digits[start:start + 9]
        value = value * (10 ** len(chunk)) + int(chunk)
    return value


def parse(version):
    """Return (major, minor, patch, prerelease, build)."""
    if not isinstance(version, str):
        raise TypeError("version must be a str")
    m = _RE.fullmatch(version)
    if m is None:
        raise ValueError("invalid semantic version: %r" % (version,))
    major, minor, patch, pre, build = m.groups()
    identifiers = []
    for item in pre.split(".") if pre else ():
        if item.isdigit():
            if len(item) > 1 and item[0] == "0":
                raise ValueError("numeric prerelease identifier has a leading zero")
            identifiers.append(_integer(item))
        else:
            identifiers.append(item)
    pre_t = tuple(identifiers)
    build_t = tuple(build.split(".")) if build else ()
    return _integer(major), _integer(minor), _integer(patch), pre_t, build_t


def _cmp(a, b):
    return (a > b) - (a < b)


def _cmp_pre(pa, pb):
    if not pa and not pb:
        return 0
    if not pa:
        return 1
    if not pb:
        return -1
    for x, y in zip(pa, pb):
        if isinstance(x, int) != isinstance(y, int):
            c = -1 if isinstance(x, int) else 1
        else:
            c = _cmp(x, y)
        if c:
            return c
    return _cmp(len(pa), len(pb))


def compare(a, b):
    """Return -1, 0 or 1 comparing two version strings by precedence."""
    pa, pb = parse(a), parse(b)
    return _compare_parsed(pa, pb)


def _compare_parsed(pa, pb):
    c = _cmp(pa[:3], pb[:3])
    if c:
        return c
    return _cmp_pre(pa[3], pb[3])


def sort_versions(versions):
    """Return the versions in ascending precedence order."""
    # Parse every item, including singleton inputs, before sorting. Decorate
    # into a fresh list so errors and successful calls never mutate the input.
    decorated = [(version, parse(version)) for version in versions]
    decorated.sort(key=cmp_to_key(lambda a, b: _compare_parsed(a[1], b[1])))
    return [version for version, parsed in decorated]
