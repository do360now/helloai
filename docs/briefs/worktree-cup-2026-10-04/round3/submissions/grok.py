"""Exact rational expression evaluator. See PACKET.md."""

import sys
from fractions import Fraction

_DIGITS = frozenset("0123456789")
_SKIP = frozenset(" \t")
_TERM_OPS = frozenset(("*", "/", "//", "%"))


class ExprError(Exception):
    """Raised for syntax / zero_div / domain / limit errors; `kind` holds the category."""

    def __init__(self, kind, message=""):
        Exception.__init__(self, "%s: %s" % (kind, message))
        self.kind = kind


def evaluate(expr):
    if not isinstance(expr, str):
        raise TypeError("expr must be a str")
    if len(expr) > 1000:
        raise ExprError("limit", "expression length")
    # Results can exceed the default 4300-digit conversion limit.
    sys.set_int_max_str_digits(0)
    # 499 parentheses, a 999-long unary chain, or both, exceed the default
    # recursion limit. Parsing and evaluation are separate, so this covers
    # the deeper of the two, not their sum.
    sys.setrecursionlimit(20000)
    node = _parse(_tokenize(expr))
    return _canon(_eval(node))


def _size(value):
    """max(bit_length(|n|), bit_length(d)) of the reduced fraction."""
    return max(abs(value.numerator).bit_length(), value.denominator.bit_length())


def _check_size(value):
    if _size(value) > 400000:
        raise ExprError("limit", "result size")
    return value


def _canon(value):
    if value.denominator == 1:
        return str(value.numerator)
    return "%d/%d" % (value.numerator, value.denominator)


def _number(text):
    if "." not in text:
        return Fraction(int(text))
    whole, frac = text.split(".", 1)
    return Fraction(int(whole + frac), 10 ** len(frac))


def _tokenize(expr):
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c in _SKIP:
            i += 1
            continue
        if c in _DIGITS:
            j = i + 1
            while j < n and expr[j] in _DIGITS:
                j += 1
            if j < n and expr[j] == ".":
                k = j + 1
                if k >= n or expr[k] not in _DIGITS:
                    raise ExprError("syntax", "bad decimal")
                k += 1
                while k < n and expr[k] in _DIGITS:
                    k += 1
                tokens.append(("num", expr[i:k]))
                i = k
                continue
            tokens.append(("num", expr[i:j]))
            i = j
            continue
        if c == "*" and i + 1 < n and expr[i + 1] == "*":
            tokens.append(("op", "**"))
            i += 2
            continue
        if c == "/" and i + 1 < n and expr[i + 1] == "/":
            tokens.append(("op", "//"))
            i += 2
            continue
        if c in "+-*/%()":
            tokens.append(("op", c))
            i += 1
            continue
        raise ExprError("syntax", "bad character")
    return tokens


class _Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.i = 0

    def peek(self):
        if self.i >= len(self.tokens):
            return None
        return self.tokens[self.i]

    def eat(self):
        tok = self.peek()
        if tok is None:
            raise ExprError("syntax", "truncated")
        self.i += 1
        return tok

    def parse(self):
        if not self.tokens:
            raise ExprError("syntax", "empty")
        node = self.expr()
        if self.peek() is not None:
            raise ExprError("syntax", "trailing")
        return node

    def expr(self):
        node = self.term()
        while True:
            tok = self.peek()
            if tok is None or tok[1] not in "+-":
                return node
            op = self.eat()[1]
            node = ("bin", op, node, self.term())

    def term(self):
        node = self.unary()
        while True:
            tok = self.peek()
            if tok is None or tok[1] not in _TERM_OPS:
                return node
            op = self.eat()[1]
            node = ("bin", op, node, self.unary())

    def unary(self):
        tok = self.peek()
        if tok is not None and tok[1] in "+-":
            op = self.eat()[1]
            return ("unary", op, self.unary())
        return self.power()

    def power(self):
        node = self.atom()
        tok = self.peek()
        if tok is not None and tok[1] == "**":
            self.eat()
            return ("bin", "**", node, self.unary())
        return node

    def atom(self):
        tok = self.peek()
        if tok is None:
            raise ExprError("syntax", "missing atom")
        if tok[0] == "num":
            self.eat()
            return ("num", tok[1])
        if tok[1] == "(":
            self.eat()
            node = self.expr()
            if self.peek() is None or self.peek()[1] != ")":
                raise ExprError("syntax", "unclosed")
            self.eat()
            return node
        raise ExprError("syntax", "bad atom")


def _parse(tokens):
    return _Parser(tokens).parse()


def _eval(node):
    kind = node[0]
    if kind == "num":
        return _number(node[1])
    if kind == "unary":
        value = _eval(node[2])
        if node[1] == "-":
            return -value
        return value
    op = node[1]
    left = _eval(node[2])
    right = _eval(node[3])
    if op == "+":
        result = left + right
    elif op == "-":
        result = left - right
    elif op == "*":
        result = left * right
    elif op == "/":
        if right == 0:
            raise ExprError("zero_div", "division")
        result = left / right
    elif op == "//":
        if right == 0:
            raise ExprError("zero_div", "floor division")
        result = Fraction(left // right)
    elif op == "%":
        if right == 0:
            raise ExprError("zero_div", "modulo")
        result = left % right
        if not isinstance(result, Fraction):
            result = Fraction(result)
    elif op == "**":
        return _power(left, right)
    else:
        raise ExprError("syntax", "operator")
    return _check_size(result)


def _power(base, exp):
    if exp.denominator != 1:
        raise ExprError("domain", "non-integer exponent")
    exponent = exp.numerator
    if base == 0 and exponent < 0:
        raise ExprError("zero_div", "zero to a negative power")
    if abs(exponent) * _size(base) > 200000:
        raise ExprError("limit", "power")
    if exponent == 0:
        result = Fraction(1)
    elif exponent > 0:
        result = base ** exponent
    else:
        result = Fraction(1) / (base ** -exponent)
    return _check_size(result)
