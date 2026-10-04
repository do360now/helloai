"""Exact rational expression evaluator. See PACKET.md."""
import sys
from fractions import Fraction


class ExprError(Exception):
    """Raised for syntax / zero_div / domain / limit errors; `kind` holds the category."""

    def __init__(self, kind, message=""):
        Exception.__init__(self, "%s: %s" % (kind, message))
        self.kind = kind


MAX_LEN = 1000
MAX_POW_COST = 200000
MAX_SIZE = 400000

_DIGITS = frozenset("0123456789")
_SPACE = frozenset(" \t")

# Binding power; unary signs sit between the multiplicative operators and '**'.
_PREC = {"+": 1, "-": 1, "*": 2, "/": 2, "//": 2, "%": 2, "u+": 3, "u-": 3, "**": 4}
_RIGHT_ASSOC = frozenset(["**"])


def _size(x):
    return max(abs(x.numerator).bit_length(), x.denominator.bit_length())


# ---------------------------------------------------------------- lexing

def _tokens(s):
    """Yield ('num', Fraction) or ('op', text); raise syntax for anything else."""
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c in _SPACE:
            i += 1
        elif c in _DIGITS:
            j = i
            while j < n and s[j] in _DIGITS:
                j += 1
            if j < n and s[j] == ".":
                k = j + 1
                while k < n and s[k] in _DIGITS:
                    k += 1
                if k == j + 1:
                    raise ExprError("syntax", "digits required after '.'")
                frac = s[j + 1:k]
                yield ("num", Fraction(int(s[i:j] + frac), 10 ** len(frac)))
                i = k
            else:
                yield ("num", Fraction(int(s[i:j])))
                i = j
        elif s.startswith("**", i) or s.startswith("//", i):
            yield ("op", s[i:i + 2])
            i += 2
        elif c in "+-*/%()":
            yield ("op", c)
            i += 1
        else:
            raise ExprError("syntax", "unexpected character %r" % c)


# ---------------------------------------------------------------- parsing

def _to_rpn(s):
    """Shunting-yard without recursion; validates the whole grammar before any evaluation."""
    out, stack = [], []
    expect_operand = True
    for kind, val in _tokens(s):
        if expect_operand:
            if kind == "num":
                out.append(val)
                expect_operand = False
            elif val == "(":
                stack.append("(")
            elif val in ("+", "-"):
                stack.append("u" + val)
            else:
                raise ExprError("syntax", "operand expected, got %r" % (val,))
        else:
            if kind == "num" or val == "(":
                raise ExprError("syntax", "operator expected")
            if val == ")":
                while stack and stack[-1] != "(":
                    out.append(stack.pop())
                if not stack:
                    raise ExprError("syntax", "unbalanced ')'")
                stack.pop()
            else:
                p = _PREC[val]
                while stack and stack[-1] != "(":
                    q = _PREC[stack[-1]]
                    if q > p or (q == p and val not in _RIGHT_ASSOC):
                        out.append(stack.pop())
                    else:
                        break
                stack.append(val)
                expect_operand = True
    if expect_operand:
        raise ExprError("syntax", "unexpected end of input")
    while stack:
        op = stack.pop()
        if op == "(":
            raise ExprError("syntax", "unbalanced '('")
        out.append(op)
    return out


# ---------------------------------------------------------------- evaluation

def _power(a, b):
    if b.denominator != 1:
        raise ExprError("domain", "non-integer exponent")
    e = b.numerator
    if a == 0 and e < 0:
        raise ExprError("zero_div", "0 to a negative power")
    if abs(e) * _size(a) > MAX_POW_COST:
        raise ExprError("limit", "power too large")
    return a ** e


def _binary(op, a, b):
    if op == "+":
        r = a + b
    elif op == "-":
        r = a - b
    elif op == "*":
        r = a * b
    elif op == "**":
        r = _power(a, b)
    else:
        if b == 0:
            raise ExprError("zero_div", "division by zero")
        if op == "/":
            r = a / b
        elif op == "//":
            r = Fraction(a // b)
        else:
            r = a % b
    if _size(r) > MAX_SIZE:
        raise ExprError("limit", "result too large")
    return r


def _run(rpn):
    vals = []
    for item in rpn:
        if isinstance(item, Fraction):
            vals.append(item)
        elif item == "u-":
            vals.append(-vals.pop())
        elif item == "u+":
            pass
        else:
            b = vals.pop()
            a = vals.pop()
            vals.append(_binary(item, a, b))
    return vals[0]


def _canonical(x):
    old = sys.get_int_max_str_digits() if hasattr(sys, "get_int_max_str_digits") else None
    if old is not None:
        sys.set_int_max_str_digits(0)
    try:
        if x.denominator == 1:
            return str(x.numerator)
        return "%d/%d" % (x.numerator, x.denominator)
    finally:
        if old is not None:
            sys.set_int_max_str_digits(old)


def evaluate(expr):
    if not isinstance(expr, str):
        raise TypeError("expr must be a str")
    if len(expr) > MAX_LEN:
        raise ExprError("limit", "expression longer than %d characters" % MAX_LEN)
    return _canonical(_run(_to_rpn(expr)))
