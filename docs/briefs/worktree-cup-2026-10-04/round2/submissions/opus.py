"""Semantic Versioning 2.0.0 precedence helpers."""
import re

_NUM = r"(?:0|[1-9][0-9]*)"
_ID = r"[0-9A-Za-z-]+"

# Explicit ASCII classes and fullmatch: no Unicode digits, no trailing-newline match.
_RE = re.compile(
    r"(" + _NUM + r")\.(" + _NUM + r")\.(" + _NUM + r")"
    r"(?:-(" + _ID + r"(?:\." + _ID + r")*))?"
    r"(?:\+(" + _ID + r"(?:\." + _ID + r")*))?"
)

_CHUNK = 1000


def _to_int(digits):
    """int() of an ASCII digit string of any length (sidesteps the str->int digit limit)."""
    if len(digits) <= _CHUNK:
        return int(digits)
    value = 0
    for i in range(0, len(digits), _CHUNK):
        chunk = digits[i:i + _CHUNK]
        value = value * 10 ** len(chunk) + int(chunk)
    return value


def parse(version):
    """Return (major, minor, patch, prerelease, build)."""
    if not isinstance(version, str):
        raise TypeError("version must be a str")
    m = _RE.fullmatch(version)
    if m is None:
        raise ValueError("invalid semantic version: %r" % (version,))
    major, minor, patch, pre, build = m.groups()
    pre_t = ()
    if pre is not None:
        ids = pre.split(".")
        for p in ids:
            if len(p) > 1 and p[0] == "0" and p.isdigit():
                raise ValueError("numeric prerelease identifier with leading zero: %r" % (version,))
        pre_t = tuple(_to_int(p) if p.isdigit() else p for p in ids)
    build_t = tuple(build.split(".")) if build is not None else ()
    return _to_int(major), _to_int(minor), _to_int(patch), pre_t, build_t


def _key(version):
    """Total-order key for precedence; build metadata is not part of it."""
    major, minor, patch, pre, _build = parse(version)
    if not pre:
        return (major, minor, patch, 1, ())
    # Numeric identifiers sort below alphanumeric ones; str comparison is code point (ASCII) order.
    return (major, minor, patch, 0, tuple((0, p, "") if isinstance(p, int) else (1, 0, p) for p in pre))


def compare(a, b):
    """Return -1, 0 or 1 comparing two version strings by precedence."""
    ka = _key(a)
    kb = _key(b)
    return (ka > kb) - (ka < kb)


def sort_versions(versions):
    """Return a new list of the versions in ascending precedence order (stable)."""
    items = list(versions)
    keys = [_key(v) for v in items]  # validates everything before any ordering
    order = sorted(range(len(items)), key=keys.__getitem__)
    return [items[i] for i in order]

