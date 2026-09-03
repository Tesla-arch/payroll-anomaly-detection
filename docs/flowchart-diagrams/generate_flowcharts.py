"""Generate School SMS process flowcharts as SVG and PNG."""

from __future__ import annotations

import math
import os
from dataclasses import dataclass
from html import escape
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont

    HAS_PIL = True
except ImportError:
    HAS_PIL = False

OUT = Path(__file__).resolve().parent
BG = "#F7F5F0"
INK = "#1F2937"
MUTED = "#6B7280"
LINE = "#374151"
STROKE = "#C4C0B8"
WHITE = "#FFFFFF"
START = "#0E4D4A"
PROCESS = "#1B365D"
DECISION = "#6B3F1D"
IO = "#3D2D56"
END = "#374151"
FONT = "Segoe UI, Calibri, Arial, sans-serif"


def _font_path(bold: bool = False) -> str | None:
    windir = os.environ.get("WINDIR", r"C:\Windows")
    names = (
        ["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"]
        if bold
        else ["segoeui.ttf", "arial.ttf", "calibri.ttf", "tahoma.ttf"]
    )
    for name in names:
        path = Path(windir) / "Fonts" / name
        if path.exists():
            return str(path)
    return None


def _pil_font(size: int, bold: bool = False):
    path = _font_path(bold)
    if path:
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()


@dataclass
class Node:
    id: str
    kind: str  # start | end | process | decision | io | note
    label: str
    x: float
    y: float
    w: float = 200
    h: float = 56

    @property
    def cx(self):
        return self.x + self.w / 2

    @property
    def cy(self):
        return self.y + self.h / 2

    def port(self, side: str):
        if side == "top":
            return self.cx, self.y
        if side == "bottom":
            return self.cx, self.y + self.h
        if side == "left":
            return self.x, self.cy
        return self.x + self.w, self.cy


@dataclass
class Edge:
    src: str
    dst: str
    label: str = ""
    src_side: str = "bottom"
    dst_side: str = "top"
    via: list[tuple[float, float]] | None = None


class Canvas:
    def __init__(self, width: int, height: int, title: str, subtitle: str):
        self.width = width
        self.height = height
        self.title = title
        self.subtitle = subtitle
        self.svg: list[str] = []
        self.img = None
        self.draw = None
        if HAS_PIL:
            self.img = Image.new("RGB", (width, height), BG)
            self.draw = ImageDraw.Draw(self.img)
            self.f11 = _pil_font(11)
            self.f12 = _pil_font(12)
            self.f13b = _pil_font(13, True)
            self.f14 = _pil_font(14)
            self.f14b = _pil_font(14, True)
            self.f16b = _pil_font(16, True)
            self.f22b = _pil_font(22, True)

    def rect(self, x, y, w, h, fill, stroke=STROKE, sw=1.5, radius=0):
        svg_fill = "none" if fill in (None, "none") else fill
        self.svg.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{radius}" '
            f'fill="{svg_fill}" stroke="{stroke}" stroke-width="{sw}"/>'
        )
        if self.draw:
            pil = None if svg_fill == "none" else fill
            box = [x, y, x + w, y + h]
            if radius:
                self.draw.rounded_rectangle(box, radius=radius, fill=pil, outline=stroke, width=max(1, round(sw)))
            else:
                self.draw.rectangle(box, fill=pil, outline=stroke, width=max(1, round(sw)))

    def polygon(self, pts, fill, stroke=STROKE, sw=1.5):
        points = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        self.svg.append(f'<polygon points="{points}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
        if self.draw:
            self.draw.polygon([(round(x), round(y)) for x, y in pts], fill=fill, outline=stroke)

    def ellipse(self, x, y, w, h, fill, stroke=STROKE, sw=1.5):
        self.svg.append(
            f'<ellipse cx="{x + w / 2:.1f}" cy="{y + h / 2:.1f}" rx="{w / 2:.1f}" ry="{h / 2:.1f}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
        )
        if self.draw:
            self.draw.ellipse([x, y, x + w, y + h], fill=fill, outline=stroke, width=max(1, round(sw)))

    def line(self, pts, color=LINE, sw=1.7):
        d = " ".join(f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}" for i, (x, y) in enumerate(pts))
        self.svg.append(
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="round"/>'
        )
        if self.draw:
            self.draw.line([(round(x), round(y)) for x, y in pts], fill=color, width=max(1, round(sw)))

    def arrowhead(self, x, y, nx, ny, color=LINE, size=9):
        ang = math.atan2(ny, nx)
        pts = [
            (x, y),
            (x - size * math.cos(ang - 0.4), y - size * math.sin(ang - 0.4)),
            (x - size * math.cos(ang + 0.4), y - size * math.sin(ang + 0.4)),
        ]
        self.polygon(pts, color, color, 1)

    def text(self, x, y, s, size=13, color=INK, bold=False, anchor="middle"):
        weight = "600" if bold else "400"
        anc = {"start": "start", "middle": "middle", "end": "end"}[anchor]
        self.svg.append(
            f'<text x="{x:.1f}" y="{y:.1f}" fill="{color}" font-size="{size}" font-family="{FONT}" '
            f'font-weight="{weight}" text-anchor="{anc}" dominant-baseline="central">{escape(s)}</text>'
        )
        if self.draw:
            if size >= 20:
                font = self.f22b
            elif size >= 15:
                font = self.f16b
            elif bold:
                font = self.f14b if size >= 13 else self.f13b
            else:
                font = self.f14 if size >= 14 else (self.f12 if size >= 12 else self.f11)
            ax = {"start": "lm", "middle": "mm", "end": "rm"}[anchor]
            self.draw.text((x, y), s, fill=color, font=font, anchor=ax)

    def multilabel(self, cx, cy, label, color=WHITE, size=13, bold=True):
        lines = [ln.strip() for ln in label.split("|")]
        if len(lines) == 1:
            self.text(cx, cy, lines[0], size=size, color=color, bold=bold)
            return
        gap = 15
        start = cy - (len(lines) - 1) * gap / 2
        for i, ln in enumerate(lines):
            self.text(cx, start + i * gap, ln, size=size, color=color, bold=bold)

    def save(self, stem: str):
        header = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.width}" height="{self.height}" '
            f'viewBox="0 0 {self.width} {self.height}">\n'
            f'<rect width="100%" height="100%" fill="{BG}"/>\n'
        )
        svg = OUT / f"{stem}.svg"
        svg.write_text(header + "\n".join(self.svg) + "\n</svg>\n", encoding="utf-8")
        png = None
        if self.img:
            png = OUT / f"{stem}.png"
            self.img.save(png, "PNG", dpi=(150, 150))
        return svg, png


def draw_title(c: Canvas):
    c.text(28, 28, c.title, size=22, color=INK, bold=True, anchor="start")
    c.text(28, 52, c.subtitle, size=13, color=MUTED, bold=False, anchor="start")
    c.line([(28, 70), (c.width - 28, 70)], "#E5E1D8", 1)


def draw_legend(c: Canvas, x, y):
    c.rect(x, y, 620, 58, WHITE, STROKE, 1, 6)
    c.text(x + 14, y + 16, "Notation", size=11, color=MUTED, bold=True, anchor="start")
    items = [
        (START, "Start / end"),
        (PROCESS, "Process"),
        (DECISION, "Decision"),
        (IO, "Input / output"),
    ]
    ox = x + 14
    for color, label in items:
        c.rect(ox, y + 34, 14, 14, color, color, 0, 3)
        c.text(ox + 22, y + 41, label, size=12, color=INK, anchor="start")
        ox += 145


def draw_node(c: Canvas, n: Node):
    if n.kind in ("start", "end"):
        fill = START if n.kind == "start" else END
        c.ellipse(n.x, n.y, n.w, n.h, fill, fill, 1.5)
        c.multilabel(n.cx, n.cy, n.label, WHITE, 13, True)
    elif n.kind == "decision":
        pts = [
            (n.cx, n.y),
            (n.x + n.w, n.cy),
            (n.cx, n.y + n.h),
            (n.x, n.cy),
        ]
        c.polygon(pts, DECISION, DECISION, 1.5)
        c.multilabel(n.cx, n.cy, n.label, WHITE, 12, True)
    elif n.kind == "io":
        skew = 18
        pts = [
            (n.x + skew, n.y),
            (n.x + n.w, n.y),
            (n.x + n.w - skew, n.y + n.h),
            (n.x, n.y + n.h),
        ]
        c.polygon(pts, IO, IO, 1.5)
        c.multilabel(n.cx, n.cy, n.label, WHITE, 12, True)
    elif n.kind == "note":
        c.rect(n.x, n.y, n.w, n.h, "#FFF8E8", "#D6B656", 1.2, 6)
        c.multilabel(n.cx, n.cy, n.label, INK, 12, False)
    else:
        c.rect(n.x, n.y, n.w, n.h, PROCESS, PROCESS, 1.5, 10)
        c.multilabel(n.cx, n.cy, n.label, WHITE, 13, True)


def draw_edge(c: Canvas, nodes: dict[str, Node], e: Edge):
    a, b = nodes[e.src], nodes[e.dst]
    x1, y1 = a.port(e.src_side)
    x2, y2 = b.port(e.dst_side)
    if e.via:
        pts = [(x1, y1), *e.via, (x2, y2)]
    elif e.src_side == "bottom" and e.dst_side == "top":
        mid = (y1 + y2) / 2
        pts = [(x1, y1), (x1, mid), (x2, mid), (x2, y2)]
    elif e.src_side == "right" and e.dst_side == "left":
        mid = (x1 + x2) / 2
        pts = [(x1, y1), (mid, y1), (mid, y2), (x2, y2)]
    elif e.src_side == "left" and e.dst_side == "right":
        mid = (x1 + x2) / 2
        pts = [(x1, y1), (mid, y1), (mid, y2), (x2, y2)]
    elif e.src_side == "right" and e.dst_side == "top":
        pts = [(x1, y1), (x2, y1), (x2, y2)]
    elif e.src_side == "bottom" and e.dst_side == "left":
        pts = [(x1, y1), (x1, y2), (x2, y2)]
    elif e.src_side == "bottom" and e.dst_side == "right":
        pts = [(x1, y1), (x1, y2), (x2, y2)]
    else:
        pts = [(x1, y1), (x2, y2)]
    c.line(pts, LINE, 1.7)
    dx = pts[-1][0] - pts[-2][0]
    dy = pts[-1][1] - pts[-2][1]
    mag = math.hypot(dx, dy) or 1
    c.arrowhead(pts[-1][0], pts[-1][1], dx / mag, dy / mag, LINE, 9)
    if e.label:
        # place label near mid-segment
        if len(pts) >= 3:
            mx = (pts[1][0] + pts[2][0]) / 2
            my = (pts[1][1] + pts[2][1]) / 2
        else:
            mx = (x1 + x2) / 2
            my = (y1 + y2) / 2
        # offset label off the line
        c.rect(mx - 28, my - 12, 56, 22, WHITE, WHITE, 0, 4)
        c.text(mx, my, e.label, size=11, color=DECISION, bold=True)


def render(stem, width, height, title, subtitle, nodes: list[Node], edges: list[Edge], footnotes=None):
    c = Canvas(width, height, title, subtitle)
    draw_title(c)
    lookup = {n.id: n for n in nodes}
    for e in edges:
        draw_edge(c, lookup, e)
    for n in nodes:
        draw_node(c, n)
    draw_legend(c, 28, height - 78)
    if footnotes:
        for i, note in enumerate(footnotes):
            c.text(28, height - 100 - i * 16, note, size=12, color=MUTED, bold=False, anchor="start")
    c.text(
        width - 28,
        height - 28,
        "School SMS · process flowcharts",
        size=11,
        color=MUTED,
        bold=False,
        anchor="end",
    )
    return c.save(stem)


# ---------------------------------------------------------------------------
# Diagrams
# ---------------------------------------------------------------------------


def flow_overview():
    """High-level system process map."""
    nodes = [
        Node("start", "start", "User opens portal", 480, 90, 200, 50),
        Node("login", "process", "Authenticate|(password or Staff ID)", 460, 170, 240, 56),
        Node("dash", "process", "Open role dashboard", 480, 260, 200, 50),
        Node("route", "decision", "Which desk?", 470, 340, 220, 90),
        Node("hr", "process", "HR / staff / leave", 120, 470, 200, 50),
        Node("pay", "process", "Payroll & anomalies", 360, 470, 200, 50),
        Node("acad", "process", "Classes & assessments", 600, 470, 200, 50),
        Node("msg", "process", "Parent messaging", 840, 470, 200, 50),
        Node("gov", "process", "Reports / audit", 480, 580, 200, 50),
        Node("end", "end", "Session continues|or sign out", 480, 680, 200, 56),
    ]
    edges = [
        Edge("start", "login"),
        Edge("login", "dash"),
        Edge("dash", "route"),
        Edge("route", "hr", "HR / Head", "bottom", "top", via=[(230, 430), (220, 430)]),
        Edge("route", "pay", "HR / Acct", "bottom", "top"),
        Edge("route", "acad", "Teacher", "bottom", "top", via=[(700, 430), (700, 430)]),
        Edge("route", "msg", "Staff / Parent", "right", "top", via=[(940, 385), (940, 450)]),
        Edge("hr", "gov", "", "bottom", "left", via=[(220, 605), (480, 605)]),
        Edge("pay", "gov"),
        Edge("acad", "gov", "", "bottom", "right", via=[(700, 605), (680, 605)]),
        Edge("msg", "gov", "", "bottom", "right", via=[(940, 605), (680, 605)]),
        Edge("gov", "end"),
    ]
    return render(
        "01-system-overview",
        1100,
        820,
        "School SMS — system process overview",
        "High-level flow from login through the main operational desks.",
        nodes,
        edges,
        footnotes=["Detailed steps for each branch are in the diagrams that follow."],
    )


def flow_login():
    nodes = [
        Node("start", "start", "Open Login page", 420, 90, 180, 48),
        Node("choice", "decision", "Login type?", 400, 170, 220, 80),
        Node("email", "io", "Enter email + password", 120, 300, 220, 52),
        Node("staff", "io", "Enter Staff ID + email", 700, 300, 220, 52),
        Node("auth_e", "process", "Validate officer / parent", 130, 400, 200, 50),
        Node("auth_s", "process", "Match staff file + user", 710, 400, 200, 50),
        Node("ok", "decision", "Credentials|valid?", 400, 500, 220, 80),
        Node("token", "process", "Issue Sanctum token|Open dashboard", 410, 620, 200, 56),
        Node("fail", "io", "Show error|/ retry", 700, 510, 180, 50),
        Node("end", "end", "Authenticated session", 420, 720, 180, 48),
        Node("reg", "note", "Officers may Self-register|(captcha + role).", 80, 90, 240, 56),
    ]
    edges = [
        Edge("start", "choice"),
        Edge("choice", "email", "Email", "left", "top", via=[(230, 210), (230, 280)]),
        Edge("choice", "staff", "Staff ID", "right", "top", via=[(810, 210), (810, 280)]),
        Edge("email", "auth_e"),
        Edge("staff", "auth_s"),
        Edge("auth_e", "ok", "", "bottom", "left", via=[(230, 540), (400, 540)]),
        Edge("auth_s", "ok", "", "bottom", "right", via=[(810, 540), (620, 540)]),
        Edge("ok", "token", "Yes"),
        Edge("ok", "fail", "No", "right", "left"),
        Edge("fail", "choice", "", "top", "right", via=[(900, 510), (900, 210), (620, 210)]),
        Edge("token", "end"),
    ]
    return render(
        "02-login-auth",
        1040,
        860,
        "School SMS — login and authentication",
        "Password login for officers/parents; Staff-ID login for teachers and accountants.",
        nodes,
        edges,
        footnotes=["Teachers/accountants are created from the staff register, not the public /register form."],
    )


def flow_leave():
    nodes = [
        Node("start", "start", "Staff needs leave", 440, 90, 180, 48),
        Node("req", "io", "Submit leave request|(Teacher / HR)", 410, 170, 240, 56),
        Node("hrq", "process", "Status: pending_hr", 430, 260, 200, 48),
        Node("hr", "decision", "HR review?", 420, 340, 220, 80),
        Node("fwd", "process", "Forward to|Headteacher", 160, 460, 200, 56),
        Node("rej1", "end", "Rejected by HR", 700, 460, 180, 48),
        Node("htq", "process", "Status:|pending_headteacher", 160, 560, 200, 56),
        Node("ht", "decision", "Headteacher|decision?", 150, 660, 220, 80),
        Node("ok", "end", "Approved|payroll notified", 420, 780, 200, 56),
        Node("rej2", "end", "Rejected by|Headteacher", 700, 680, 180, 56),
    ]
    edges = [
        Edge("start", "req"),
        Edge("req", "hrq"),
        Edge("hrq", "hr"),
        Edge("hr", "fwd", "Forward", "left", "top", via=[(260, 380), (260, 440)]),
        Edge("hr", "rej1", "Reject", "right", "left"),
        Edge("fwd", "htq"),
        Edge("htq", "ht"),
        Edge("ht", "ok", "Approve", "bottom", "left", via=[(260, 808), (420, 808)]),
        Edge("ht", "rej2", "Reject", "right", "left"),
    ]
    return render(
        "03-leave-approval",
        980,
        920,
        "School SMS — leave approval flow",
        "Two-step chain: request → HR review → Headteacher approve/reject.",
        nodes,
        edges,
        footnotes=["Teachers see only their own requests. Super Admin may act on either desk."],
    )


def flow_payroll():
    nodes = [
        Node("start", "start", "Start pay period close", 70, 200, 200, 50),
        Node("att", "process", "Close staff attendance|& leave for period", 70, 300, 220, 56),
        Node("prep", "process", "HR prepares|payroll run", 70, 420, 200, 56),
        Node("calc", "process", "Calculate slips|(tax, SSNIT, loans, penalties)", 70, 540, 240, 56),
        Node("scan", "process", "Auto-scan anomalies", 70, 660, 200, 50),
        Node("crit", "decision", "Open critical|anomalies?", 340, 640, 220, 90),
        Node("fix", "process", "Resolve / exclude /|recalculate lines", 620, 650, 220, 56),
        Node("appr", "decision", "Headteacher|approve?", 340, 420, 220, 90),
        Node("paid", "process", "HR marks run paid", 620, 430, 200, 50),
        Node("slip", "io", "Download payslips|& reports", 620, 300, 200, 56),
        Node("end", "end", "Payroll complete", 620, 180, 180, 48),
        Node("block", "note", "Approve & Mark paid|blocked while critical|flags remain open.", 860, 620, 220, 70),
    ]
    edges = [
        Edge("start", "att"),
        Edge("att", "prep"),
        Edge("prep", "calc"),
        Edge("calc", "scan"),
        Edge("scan", "crit", "", "right", "left"),
        Edge("crit", "fix", "Yes", "right", "left"),
        Edge("fix", "crit", "", "bottom", "bottom", via=[(730, 760), (450, 760)]),
        Edge("crit", "appr", "No", "top", "bottom"),
        Edge("appr", "paid", "Approve", "right", "left"),
        Edge("appr", "fix", "Send back", "right", "top", via=[(560, 465), (560, 620), (620, 650)]),
        Edge("paid", "slip"),
        Edge("slip", "end"),
    ]
    return render(
        "04-payroll-cycle",
        1140,
        900,
        "School SMS — monthly payroll cycle",
        "Prepare → anomaly scan → clear critical flags → approve → mark paid → payslips.",
        nodes,
        edges,
        footnotes=["Accountant may view runs and slips but cannot prepare, resolve, approve, or mark paid."],
    )


def flow_academics():
    nodes = [
        Node("start", "start", "Academic work begins", 420, 90, 200, 48),
        Node("branch", "decision", "Task?", 410, 170, 220, 80),
        Node("admit", "process", "Admit / update|student", 80, 300, 200, 56),
        Node("assign", "process", "Assign class tutor|or JHS subject teacher", 320, 300, 240, 56),
        Node("myclass", "process", "Teacher opens|My class", 620, 300, 200, 56),
        Node("score", "process", "Enter assessment|scores / comments", 860, 300, 200, 56),
        Node("att", "io", "Mark pupil|attendance", 620, 420, 180, 56),
        Node("pdf", "io", "View / download|assessment PDF", 860, 420, 200, 56),
        Node("parent", "process", "Parent views|ward report", 860, 540, 200, 56),
        Node("end", "end", "Records saved", 420, 660, 180, 48),
    ]
    edges = [
        Edge("start", "branch"),
        Edge("branch", "admit", "Enrol", "left", "top", via=[(180, 210), (180, 280)]),
        Edge("branch", "assign", "Staffing", "bottom", "top"),
        Edge("branch", "myclass", "Teach", "right", "top", via=[(720, 210), (720, 280)]),
        Edge("branch", "score", "Assess", "right", "top", via=[(960, 210), (960, 280)]),
        Edge("myclass", "att"),
        Edge("score", "pdf"),
        Edge("pdf", "parent"),
        Edge("admit", "end", "", "bottom", "left", via=[(180, 684), (420, 684)]),
        Edge("assign", "end"),
        Edge("att", "end", "", "bottom", "top"),
        Edge("parent", "end", "", "bottom", "right", via=[(960, 684), (600, 684)]),
    ]
    return render(
        "05-academics",
        1140,
        800,
        "School SMS — academics flow",
        "Admissions, class staffing, My class attendance, scores and parent report access.",
        nodes,
        edges,
        footnotes=["Primary: one class tutor. JHS: one teacher per subject across JHS 1–3."],
    )


def flow_messaging():
    nodes = [
        Node("start", "start", "Need to notify parents", 420, 90, 220, 48),
        Node("reg", "decision", "Parent account|exists?", 410, 170, 240, 80),
        Node("create", "process", "HR / Head registers|parent + link wards", 80, 300, 240, 56),
        Node("compose", "io", "Compose notice / meeting|or broadcast", 420, 320, 240, 56),
        Node("chan", "decision", "Channels?", 430, 430, 200, 80),
        Node("email", "process", "Deliver via Email", 160, 560, 200, 50),
        Node("wa", "process", "Deliver via WhatsApp", 700, 560, 200, 50),
        Node("track", "process", "Update recipient status|& in-app notification", 400, 670, 260, 56),
        Node("inbox", "io", "Parent views inbox|/ dashboard notice", 420, 780, 240, 56),
        Node("end", "end", "Delivery complete", 450, 880, 180, 48),
    ]
    edges = [
        Edge("start", "reg"),
        Edge("reg", "create", "No", "left", "top", via=[(200, 210), (200, 280)]),
        Edge("reg", "compose", "Yes"),
        Edge("create", "compose", "", "right", "left"),
        Edge("compose", "chan"),
        Edge("chan", "email", "Email", "left", "top", via=[(260, 470), (260, 540)]),
        Edge("chan", "wa", "WhatsApp", "right", "top", via=[(800, 470), (800, 540)]),
        Edge("email", "track", "", "bottom", "left", via=[(260, 698), (400, 698)]),
        Edge("wa", "track", "", "bottom", "right", via=[(800, 698), (660, 698)]),
        Edge("track", "inbox"),
        Edge("inbox", "end"),
    ]
    return render(
        "06-parent-messaging",
        1040,
        1000,
        "School SMS — parent messaging flow",
        "Register household → compose → deliver by email and/or WhatsApp → parent inbox.",
        nodes,
        edges,
        footnotes=["Teachers can send notices; only HR/Headteacher/Super Admin can create parent accounts."],
    )


def write_index(files: list[tuple[str, str, str]]):
    cards = []
    for stem, title, blurb in files:
        cards.append(
            f"""
            <article class="card">
              <h2>{escape(title)}</h2>
              <p>{escape(blurb)}</p>
              <div class="actions">
                <a href="{stem}.png" download>Download PNG</a>
                <a href="{stem}.svg" download>Download SVG</a>
              </div>
              <a href="{stem}.svg" target="_blank"><img src="{stem}.svg" alt="{escape(title)}"></a>
            </article>"""
        )
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>School SMS — flowchart diagrams</title>
  <style>
    body {{ font-family: Segoe UI, Calibri, sans-serif; background: #F7F5F0; color: #1F2937; margin: 0; }}
    main {{ max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; }}
    h1 {{ font-size: 28px; margin: 0 0 8px; }}
    .lead {{ color: #6B7280; margin-bottom: 28px; }}
    .card {{ background: #fff; border: 1px solid #E5E1D8; border-radius: 10px; padding: 20px; margin-bottom: 28px; }}
    .card h2 {{ margin: 0 0 8px; font-size: 18px; }}
    .card p {{ margin: 0 0 12px; color: #4B5563; }}
    .actions a {{ display: inline-block; margin-right: 12px; margin-bottom: 12px; color: #1B365D; font-weight: 600; }}
    img {{ width: 100%; border: 1px solid #E5E1D8; border-radius: 6px; background: #F7F5F0; }}
  </style>
</head>
<body>
  <main>
    <h1>School SMS flowchart diagrams</h1>
    <p class="lead">Process flows for the main school operations. PNG for Word/PowerPoint; SVG for zoom and print.</p>
    {''.join(cards)}
  </main>
</body>
</html>
"""
    (OUT / "index.html").write_text(html, encoding="utf-8")


def main():
    files = []
    flow_overview()
    files.append(("01-system-overview", "System process overview", "Login to role desks: HR, payroll, academics, messaging, reports."))

    flow_login()
    files.append(("02-login-auth", "Login and authentication", "Email/password vs Staff-ID paths and token session."))

    flow_leave()
    files.append(("03-leave-approval", "Leave approval", "Request → HR review → Headteacher approve/reject."))

    flow_payroll()
    files.append(("04-payroll-cycle", "Monthly payroll cycle", "Prepare, scan anomalies, approve, mark paid, payslips."))

    flow_academics()
    files.append(("05-academics", "Academics", "Admissions, staffing, My class, scores and parent reports."))

    flow_messaging()
    files.append(("06-parent-messaging", "Parent messaging", "Register parent, compose, email/WhatsApp delivery, inbox."))

    write_index(files)
    print("Wrote flowcharts to", OUT)
    for stem, _, _ in files:
        print(" ", stem)


if __name__ == "__main__":
    main()
