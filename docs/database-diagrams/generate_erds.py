"""Generate School SMS ER diagrams as SVG and PNG from the live schema."""

from __future__ import annotations

import math
import os
from dataclasses import dataclass, field
from html import escape
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont

    HAS_PIL = True
except ImportError:
    HAS_PIL = False

OUT = Path(__file__).resolve().parent
BG = "#F6F4EF"
INK = "#1F2937"
MUTED = "#6B7280"
LINE = "#4B5563"
STROKE = "#D6D3CD"
WHITE = "#FFFFFF"
PK_TINT = "#FFF8E8"
FK_TINT = "#F3F7FB"

DOMAINS = {
    "identity": "#1B365D",
    "hr": "#0E4D4A",
    "payroll": "#6B3F1D",
    "academics": "#1B4D3E",
    "messaging": "#3D2B56",
    "governance": "#374151",
}

HEADER_H = 34
ROW_H = 20
COL_W = 268
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
class Col:
    name: str
    typ: str
    pk: bool = False
    fk: bool = False
    uk: bool = False


@dataclass
class Table:
    name: str
    domain: str
    cols: list[Col]
    x: float
    y: float
    width: float = COL_W

    @property
    def h(self) -> float:
        return HEADER_H + ROW_H * max(len(self.cols), 1)

    @property
    def right(self) -> float:
        return self.x + self.width

    @property
    def bottom(self) -> float:
        return self.y + self.h

    @property
    def cx(self) -> float:
        return self.x + self.width / 2

    @property
    def cy(self) -> float:
        return self.y + self.h / 2

    def col_y(self, name: str) -> float:
        for i, col in enumerate(self.cols):
            if col.name == name:
                return self.y + HEADER_H + i * ROW_H + ROW_H / 2
        return self.cy


@dataclass
class Rel:
    a: str
    a_col: str
    b: str
    b_col: str
    a_card: str
    b_card: str
    a_side: str = "right"
    b_side: str = "left"
    label: str = ""
    via: list[tuple[float, float]] = field(default_factory=list)


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
            self.f11b = _pil_font(11, True)
            self.f12 = _pil_font(12)
            self.f13b = _pil_font(13, True)
            self.f16b = _pil_font(16, True)
            self.f22b = _pil_font(22, True)

    def rect(self, x, y, w, h, fill, stroke=STROKE, sw=1, radius=0):
        svg_fill = fill if fill and fill != "none" else "none"
        self.svg.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
            f'rx="{radius}" fill="{svg_fill}" stroke="{stroke}" stroke-width="{sw}"/>'
        )
        if self.draw:
            pil_fill = None if (not fill or fill == "none") else fill
            box = [x, y, x + w, y + h]
            if radius:
                self.draw.rounded_rectangle(box, radius=radius, fill=pil_fill, outline=stroke, width=max(1, sw))
            else:
                self.draw.rectangle(box, fill=pil_fill, outline=stroke, width=max(1, sw))

    def line(self, pts, color=LINE, sw=1.4, dashed=False):
        d = " ".join(f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}" for i, (x, y) in enumerate(pts))
        dash = ' stroke-dasharray="5 4"' if dashed else ""
        self.svg.append(
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="round"{dash}/>'
        )
        if self.draw:
            xy = [(round(x), round(y)) for x, y in pts]
            if dashed:
                self._dashed(xy, color, sw)
            else:
                self.draw.line(xy, fill=color, width=max(1, round(sw)))

    def _dashed(self, xy, color, sw):
        # Approximate dashes along polyline.
        remaining = 0.0
        on = True
        dash, gap = 5.0, 4.0
        for i in range(len(xy) - 1):
            x1, y1 = xy[i]
            x2, y2 = xy[i + 1]
            dx, dy = x2 - x1, y2 - y1
            dist = math.hypot(dx, dy) or 1
            ux, uy = dx / dist, dy / dist
            pos = 0.0
            cx, cy = float(x1), float(y1)
            while pos < dist:
                seg = (dash if on else gap) - remaining
                take = min(seg, dist - pos)
                nx, ny = cx + ux * take, cy + uy * take
                if on:
                    self.draw.line([(cx, cy), (nx, ny)], fill=color, width=max(1, round(sw)))
                remaining = 0
                if take < seg:
                    remaining = seg - take
                    cx, cy = nx, ny
                    pos = dist
                    break
                on = not on
                cx, cy = nx, ny
                pos += take

    def polygon(self, pts, fill, stroke=None, sw=1):
        points = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ' stroke="none"'
        self.svg.append(f'<polygon points="{points}" fill="{fill}"{st}/>')
        if self.draw:
            self.draw.polygon([(round(x), round(y)) for x, y in pts], fill=fill, outline=stroke)

    def circle(self, x, y, r, fill=WHITE, stroke=LINE, sw=1.4):
        self.svg.append(
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{sw}"/>'
        )
        if self.draw:
            self.draw.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=stroke, width=max(1, round(sw)))

    def text(self, x, y, s, size=12, color=INK, bold=False, anchor="start"):
        weight = "600" if bold else "400"
        anc = {"start": "start", "middle": "middle", "end": "end"}[anchor]
        self.svg.append(
            f'<text x="{x:.1f}" y="{y:.1f}" fill="{color}" font-size="{size}" '
            f'font-family="{FONT}" font-weight="{weight}" text-anchor="{anc}" '
            f'dominant-baseline="central">{escape(s)}</text>'
        )
        if self.draw:
            font = {
                (11, False): self.f11,
                (11, True): self.f11b,
                (12, False): self.f12,
                (12, True): self.f13b,
                (13, True): self.f13b,
                (16, True): self.f16b,
                (22, True): self.f22b,
            }.get((size, bold), self.f12 if not bold else self.f13b)
            if size >= 20:
                font = self.f22b
            elif size >= 15:
                font = self.f16b
            elif bold:
                font = self.f13b if size >= 12 else self.f11b
            else:
                font = self.f12 if size >= 12 else self.f11
            ax = {"start": "lm", "middle": "mm", "end": "rm"}[anchor]
            self.draw.text((x, y), s, fill=color, font=font, anchor=ax)

    def save(self, stem: str):
        header = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.width}" height="{self.height}" '
            f'viewBox="0 0 {self.width} {self.height}">\n'
            f'<rect width="100%" height="100%" fill="{BG}"/>\n'
        )
        svg_path = OUT / f"{stem}.svg"
        svg_path.write_text(header + "\n".join(self.svg) + "\n</svg>\n", encoding="utf-8")
        png_path = None
        if self.img:
            png_path = OUT / f"{stem}.png"
            self.img.save(png_path, "PNG")
        return svg_path, png_path


def draw_title(c: Canvas):
    c.text(28, 28, c.title, size=22, color=INK, bold=True)
    c.text(28, 52, c.subtitle, size=12, color=MUTED)
    c.line([(28, 68), (c.width - 28, 68)], color="#E5E1D8", sw=1)


def draw_legend(c: Canvas, x: float, y: float):
    c.rect(x, y, 430, 54, WHITE, radius=6)
    items = [
        ("PK", "Primary key", DOMAINS["payroll"]),
        ("FK", "Foreign key", DOMAINS["identity"]),
        ("UK", "Unique", DOMAINS["hr"]),
        ("|--<", "Crow's foot: one / many", LINE),
    ]
    c.text(x + 12, y + 16, "Notation", size=11, color=MUTED, bold=True)
    ox = x + 12
    for badge, label, color in items:
        c.text(ox, y + 36, badge, size=11, color=color, bold=True)
        tw = 22 if len(badge) <= 2 else 42
        c.text(ox + tw, y + 36, label, size=11, color=INK)
        ox += 22 + tw + 70 if len(badge) > 2 else 108


def draw_table(c: Canvas, t: Table):
    color = DOMAINS[t.domain]
    c.rect(t.x, t.y, t.width, t.h, WHITE, STROKE, 1, radius=5)
    c.rect(t.x, t.y, t.width, HEADER_H, color, color, 1, radius=5)
    c.rect(t.x, t.y + HEADER_H - 6, t.width, 6, color, color, 0)
    c.text(t.x + 12, t.y + HEADER_H / 2, t.name, size=13, color=WHITE, bold=True)
    for i, col in enumerate(t.cols):
        yy = t.y + HEADER_H + i * ROW_H
        fill = WHITE
        if col.pk:
            fill = PK_TINT
        elif col.fk:
            fill = FK_TINT
        c.rect(t.x + 1, yy, t.width - 2, ROW_H, fill, fill, 0)
        badge = "PK" if col.pk else "FK" if col.fk else "UK" if col.uk else ""
        bcolor = DOMAINS["payroll"] if col.pk else DOMAINS["identity"] if col.fk else DOMAINS["hr"]
        if badge:
            c.text(t.x + 10, yy + ROW_H / 2, badge, size=11, color=bcolor, bold=True)
        c.text(t.x + (36 if badge else 10), yy + ROW_H / 2, col.name, size=11, color=INK, bold=col.pk)
        c.text(t.x + t.width - 10, yy + ROW_H / 2, col.typ, size=11, color=MUTED, anchor="end")
    c.rect(t.x, t.y, t.width, t.h, fill="none", stroke=STROKE, sw=1, radius=5)


def _anchor(t: Table, col: str, side: str) -> tuple[float, float, float, float]:
    y = t.col_y(col)
    if side == "left":
        return t.x, y, -1, 0
    if side == "right":
        return t.right, y, 1, 0
    if side == "top":
        return t.cx, t.y, 0, -1
    return t.cx, t.bottom, 0, 1


def _unit(dx, dy):
    mag = math.hypot(dx, dy) or 1
    return dx / mag, dy / mag


def draw_card(c: Canvas, x, y, nx, ny, card: str):
    """Draw IE cardinality at entity edge. (nx,ny) is outward normal."""
    size = 10
    tx, ty = -ny, nx
    color = LINE
    # Move slightly outside the box.
    ox, oy = x + nx * 1, y + ny * 1
    if card in ("0..*", "1..*", "*"):
        tip = (ox + nx * size, oy + ny * size)
        p0 = (ox + tx * size * 0.65, oy + ty * size * 0.65)
        p1 = (ox - tx * size * 0.65, oy - ty * size * 0.65)
        c.line([tip, p0], color, 1.4)
        c.line([tip, (ox, oy)], color, 1.4)
        c.line([tip, p1], color, 1.4)
        bar_at = size + 4
        if card == "1..*":
            bx = ox + nx * bar_at
            by = oy + ny * bar_at
            c.line([(bx + tx * 6, by + ty * 6), (bx - tx * 6, by - ty * 6)], color, 1.6)
        elif card == "0..*":
            cx = ox + nx * (size + 6)
            cy = oy + ny * (size + 6)
            c.circle(cx, cy, 3.4, WHITE, color, 1.3)
    elif card in ("0..1", "1"):
        bar_at = 8
        bx = ox + nx * bar_at
        by = oy + ny * bar_at
        c.line([(bx + tx * 7, by + ty * 7), (bx - tx * 7, by - ty * 7)], color, 1.6)
        if card == "0..1":
            cx = ox + nx * (bar_at + 7)
            cy = oy + ny * (bar_at + 7)
            c.circle(cx, cy, 3.4, WHITE, color, 1.3)
        else:
            bx2 = ox + nx * (bar_at + 5)
            by2 = oy + ny * (bar_at + 5)
            c.line([(bx2 + tx * 7, by2 + ty * 7), (bx2 - tx * 7, by2 - ty * 7)], color, 1.6)


def card_clearance(card: str) -> float:
    if card in ("0..1", "0..*"):
        return 22
    if card in ("1..*", "*"):
        return 16
    return 16


def draw_rel(c: Canvas, tables: dict[str, Table], r: Rel):
    a, b = tables[r.a], tables[r.b]
    x1, y1, nx1, ny1 = _anchor(a, r.a_col, r.a_side)
    x2, y2, nx2, ny2 = _anchor(b, r.b_col, r.b_side)
    g1 = card_clearance(r.a_card)
    g2 = card_clearance(r.b_card)
    p1 = (x1 + nx1 * g1, y1 + ny1 * g1)
    p2 = (x2 + nx2 * g2, y2 + ny2 * g2)
    if r.via:
        pts = [p1, *r.via, p2]
    elif r.a_side in ("left", "right") and r.b_side in ("left", "right"):
        mid = (p1[0] + p2[0]) / 2
        if r.via:
            pts = [p1, *r.via, p2]
        else:
            pts = [p1, (mid, p1[1]), (mid, p2[1]), p2]
    elif r.a_side in ("top", "bottom") and r.b_side in ("top", "bottom"):
        mid = (p1[1] + p2[1]) / 2
        pts = [p1, (p1[0], mid), (p2[0], mid), p2]
    else:
        if r.a_side in ("left", "right"):
            pts = [p1, (p2[0], p1[1]), p2]
        else:
            pts = [p1, (p1[0], p2[1]), p2]
    c.line(pts, LINE, 1.35)
    draw_card(c, x1, y1, nx1, ny1, r.a_card)
    draw_card(c, x2, y2, nx2, ny2, r.b_card)
    if r.label:
        mx = (p1[0] + p2[0]) / 2
        my = (p1[1] + p2[1]) / 2 - 8
        c.text(mx, my, r.label, size=11, color=MUTED, anchor="middle")


def render_diagram(stem, width, height, title, subtitle, tables: list[Table], rels: list[Rel], footnotes=None):
    c = Canvas(width, height, title, subtitle)
    draw_title(c)
    lookup = {t.name: t for t in tables}
    for r in rels:
        draw_rel(c, lookup, r)
    for t in tables:
        draw_table(c, t)
    draw_legend(c, 28, height - 78)
    c.text(
        width - 28,
        height - 28,
        "Source: Laravel migrations in backend/database/migrations · School SMS",
        size=11,
        color=MUTED,
        anchor="end",
    )
    if footnotes:
        for i, note in enumerate(footnotes):
            c.text(28, height - 100 - i * 16, note, size=11, color=MUTED)
    return c.save(stem)


PK = lambda n="id", t="bigint": Col(n, t, pk=True)
FK = lambda n, t="bigint": Col(n, t, fk=True)
UK = lambda n, t="varchar": Col(n, t, uk=True)
C = lambda n, t="varchar": Col(n, t)


def identity_tables():
    return [
        Table("roles", "identity", [PK(), C("name"), UK("slug")], 60, 100),
        Table(
            "users",
            "identity",
            [
                PK(),
                FK("role_id"),
                C("first_name"),
                C("last_name"),
                UK("email"),
                C("phone"),
                C("status"),
                C("password", "varchar"),
                C("email_verified_at", "timestamp"),
            ],
            420,
            90,
        ),
        Table(
            "staff",
            "hr",
            [
                PK(),
                FK("user_id"),
                FK("salary_grade_id"),
                UK("employee_id"),
                C("first_name"),
                C("last_name"),
                C("job_title"),
                C("department"),
                C("status"),
            ],
            420,
            420,
        ),
        Table(
            "sessions",
            "identity",
            [
                PK("id", "varchar"),
                FK("user_id"),
                C("ip_address", "varchar(45)"),
                C("user_agent", "text"),
                C("last_activity", "int"),
            ],
            820,
            90,
        ),
        Table(
            "personal_access_tokens",
            "identity",
            [
                PK(),
                C("tokenable_type"),
                C("tokenable_id", "bigint"),
                C("name", "text"),
                UK("token", "varchar(64)"),
                C("abilities", "text"),
                C("expires_at", "timestamp"),
            ],
            820,
            300,
            300,
        ),
        Table(
            "password_reset_tokens",
            "identity",
            [PK("email", "varchar"), C("token"), C("created_at", "timestamp")],
            820,
            540,
            300,
        ),
        Table(
            "students",
            "academics",
            [PK(), UK("admission_number"), FK("class_id"), FK("parent_id"), C("status")],
            60,
            420,
        ),
    ]


def identity_rels():
    return [
        Rel("roles", "id", "users", "role_id", "1", "0..*", "right", "left"),
        Rel("users", "id", "staff", "user_id", "0..1", "0..1", "bottom", "top"),
        Rel("users", "id", "sessions", "user_id", "0..1", "0..*", "right", "left"),
        Rel("users", "id", "personal_access_tokens", "tokenable_id", "0..1", "0..*", "right", "left", label="morph"),
        Rel("users", "id", "students", "parent_id", "0..1", "0..*", "left", "right"),
    ]


def hr_payroll_tables():
    return [
        Table(
            "salary_grades",
            "hr",
            [
                PK(),
                UK("code"),
                C("name"),
                C("basic_salary", "decimal"),
                C("max_allowance_total", "decimal"),
                C("description", "text"),
            ],
            40,
            90,
        ),
        Table(
            "allowance_types",
            "hr",
            [PK(), C("name"), UK("code"), C("is_taxable", "bool"), C("requires_authorization", "bool")],
            40,
            320,
        ),
        Table(
            "staff",
            "hr",
            [
                PK(),
                FK("user_id"),
                FK("salary_grade_id"),
                UK("employee_id"),
                C("title"),
                C("first_name"),
                C("last_name"),
                C("job_title"),
                C("rank"),
                C("employment_type"),
                C("hire_date", "date"),
                C("salary", "decimal"),
                C("salary_type"),
                C("ssnit_number"),
                C("tin"),
                C("bank_name"),
                C("bank_account"),
                C("status"),
                C("… ERP profile fields"),
            ],
            400,
            90,
            290,
        ),
        Table(
            "staff_allowances",
            "hr",
            [PK(), FK("staff_id"), FK("allowance_type_id"), C("amount", "decimal"), C("is_authorized", "bool")],
            40,
            520,
        ),
        Table(
            "loans",
            "hr",
            [
                PK(),
                FK("staff_id"),
                C("reference"),
                C("principal", "decimal"),
                C("outstanding_balance", "decimal"),
                C("monthly_deduction", "decimal"),
                C("status"),
                C("issued_on", "date"),
            ],
            400,
            560,
        ),
        Table(
            "staff_attendances",
            "hr",
            [
                PK(),
                FK("staff_id"),
                C("date", "date"),
                C("check_in_time", "time"),
                C("check_out_time", "time"),
                C("hours_worked", "decimal"),
                C("status"),
                C("penalty_amount", "decimal"),
                C("payroll_processed", "bool"),
            ],
            760,
            90,
        ),
        Table(
            "leave_requests",
            "hr",
            [
                PK(),
                FK("staff_id"),
                C("leave_type"),
                C("start_date", "date"),
                C("end_date", "date"),
                C("days_requested", "int"),
                C("status"),
                FK("reviewed_by"),
                FK("approved_by"),
                C("contact_phone"),
                C("handover_to"),
                C("payroll_notified", "bool"),
            ],
            760,
            380,
        ),
        Table(
            "users",
            "identity",
            [PK(), FK("role_id"), UK("email"), C("status")],
            1120,
            90,
        ),
        Table(
            "payroll_runs",
            "payroll",
            [
                PK(),
                C("run_name"),
                C("pay_period_start", "date"),
                C("pay_period_end", "date"),
                C("payment_date", "date"),
                C("status"),
                C("total_staff", "int"),
                C("total_gross", "decimal"),
                C("total_deductions", "decimal"),
                C("total_net", "decimal"),
                FK("created_by"),
                FK("approved_by"),
                C("approved_at", "timestamp"),
            ],
            1120,
            260,
        ),
        Table(
            "payrolls",
            "payroll",
            [
                PK(),
                FK("payroll_run_id"),
                FK("staff_id"),
                C("payment_date", "date"),
                C("basic_salary", "decimal"),
                C("allowances", "decimal"),
                C("income_tax", "decimal"),
                C("ssnit_contribution", "decimal"),
                C("loan_deductions", "decimal"),
                C("absence_penalties", "decimal"),
                C("net_salary", "decimal"),
                C("status"),
            ],
            1120,
            620,
        ),
        Table(
            "payroll_anomalies",
            "payroll",
            [
                PK(),
                C("scan_batch_id", "uuid"),
                FK("payroll_run_id"),
                FK("payroll_id"),
                FK("staff_id"),
                C("rule_code"),
                C("category"),
                C("severity"),
                C("confidence_score", "decimal"),
                C("status"),
                FK("resolved_by"),
            ],
            760,
            720,
        ),
    ]


def hr_payroll_rels():
    return [
        Rel("salary_grades", "id", "staff", "salary_grade_id", "0..1", "0..*", "right", "left"),
        Rel("allowance_types", "id", "staff_allowances", "allowance_type_id", "1", "0..*", "bottom", "top"),
        Rel("staff", "id", "staff_allowances", "staff_id", "1", "0..*", "left", "right"),
        Rel("staff", "id", "loans", "staff_id", "1", "0..*", "bottom", "top"),
        Rel("staff", "id", "staff_attendances", "staff_id", "1", "0..*", "right", "left"),
        Rel("staff", "id", "leave_requests", "staff_id", "1", "0..*", "right", "left"),
        Rel("users", "id", "staff", "user_id", "0..1", "0..1", "left", "right"),
        Rel("users", "id", "leave_requests", "reviewed_by", "0..1", "0..*", "bottom", "right", label="reviewer"),
        Rel("users", "id", "payroll_runs", "created_by", "0..1", "0..*", "bottom", "top"),
        Rel("payroll_runs", "id", "payrolls", "payroll_run_id", "1", "1..*", "bottom", "top"),
        Rel("staff", "id", "payrolls", "staff_id", "1", "0..*", "right", "left"),
        Rel("payroll_runs", "id", "payroll_anomalies", "payroll_run_id", "1", "0..*", "left", "right"),
        Rel("payrolls", "id", "payroll_anomalies", "payroll_id", "0..1", "0..*", "left", "right"),
        Rel("staff", "id", "payroll_anomalies", "staff_id", "0..1", "0..*", "right", "left"),
        Rel("users", "id", "payroll_anomalies", "resolved_by", "0..1", "0..*", "bottom", "right", label="resolver"),
    ]


def academics_tables():
    return [
        Table(
            "staff",
            "hr",
            [PK(), UK("employee_id"), C("first_name"), C("last_name"), C("job_title"), C("status")],
            40,
            90,
        ),
        Table(
            "school_classes",
            "academics",
            [
                PK(),
                C("name"),
                C("level"),
                C("sort_order", "smallint"),
                C("capacity", "int"),
                FK("teacher_id"),
            ],
            400,
            90,
        ),
        Table(
            "subjects",
            "academics",
            [PK(), C("name"), UK("code", "varchar(20)"), C("levels", "json"), C("sort_order", "smallint")],
            40,
            320,
        ),
        Table(
            "staff_subject",
            "academics",
            [PK(), FK("staff_id"), FK("subject_id")],
            400,
            320,
        ),
        Table(
            "users",
            "identity",
            [PK(), UK("email"), C("first_name"), C("last_name"), C("status")],
            760,
            90,
        ),
        Table(
            "students",
            "academics",
            [
                PK(),
                UK("admission_number"),
                C("first_name"),
                C("middle_name"),
                C("last_name"),
                C("gender"),
                C("date_of_birth", "date"),
                FK("class_id"),
                FK("parent_id"),
                C("guardian_name"),
                C("guardian_phone"),
                C("status"),
                C("… admission / medical fields"),
            ],
            760,
            280,
            300,
        ),
        Table(
            "student_assessments",
            "academics",
            [
                PK(),
                FK("student_id"),
                FK("subject_id"),
                C("academic_year", "varchar(12)"),
                C("term", "tinyint"),
                C("classwork", "decimal"),
                C("project", "decimal"),
                C("assignment", "decimal"),
                C("homework", "decimal"),
                C("remark"),
                FK("recorded_by"),
            ],
            40,
            520,
        ),
        Table(
            "student_term_reports",
            "academics",
            [
                PK(),
                FK("student_id"),
                C("academic_year", "varchar(12)"),
                C("term", "tinyint"),
                C("teacher_comment", "text"),
                FK("recorded_by"),
            ],
            400,
            520,
        ),
        Table(
            "student_attendances",
            "academics",
            [
                PK(),
                FK("student_id"),
                FK("class_id"),
                C("date", "date"),
                C("status"),
                C("notes"),
                FK("recorded_by"),
            ],
            760,
            640,
        ),
    ]


def academics_rels():
    return [
        Rel("staff", "id", "school_classes", "teacher_id", "0..1", "0..*", "right", "left", label="class tutor"),
        Rel("staff", "id", "staff_subject", "staff_id", "1", "0..*", "bottom", "left"),
        Rel("subjects", "id", "staff_subject", "subject_id", "1", "0..1", "right", "left", label="one teacher / subject"),
        Rel("school_classes", "id", "students", "class_id", "0..1", "0..*", "right", "left"),
        Rel("users", "id", "students", "parent_id", "0..1", "0..*", "bottom", "top", label="parent account"),
        Rel("students", "id", "student_assessments", "student_id", "1", "0..*", "left", "right"),
        Rel("subjects", "id", "student_assessments", "subject_id", "1", "0..*", "bottom", "top"),
        Rel("students", "id", "student_term_reports", "student_id", "1", "0..*", "left", "right"),
        Rel("students", "id", "student_attendances", "student_id", "1", "0..*", "bottom", "top"),
        Rel("school_classes", "id", "student_attendances", "class_id", "0..1", "0..*", "bottom", "left"),
        Rel("users", "id", "student_assessments", "recorded_by", "0..1", "0..*", "left", "right"),
        Rel("users", "id", "student_term_reports", "recorded_by", "0..1", "0..*", "left", "right"),
        Rel("users", "id", "student_attendances", "recorded_by", "0..1", "0..*", "bottom", "right"),
    ]


def messaging_tables():
    return [
        Table(
            "users",
            "identity",
            [PK(), FK("role_id"), C("first_name"), C("last_name"), UK("email"), C("phone"), C("status")],
            420,
            90,
        ),
        Table(
            "parent_messages",
            "messaging",
            [
                PK(),
                FK("sender_id"),
                C("type"),
                C("subject"),
                C("body", "text"),
                C("meeting_at", "timestamp"),
                C("meeting_venue"),
                C("is_broadcast", "bool"),
                C("channels", "json"),
                C("sent_count", "int"),
                C("failed_count", "int"),
            ],
            40,
            90,
            300,
        ),
        Table(
            "parent_message_recipients",
            "messaging",
            [
                PK(),
                FK("parent_message_id"),
                FK("parent_id"),
                C("email"),
                C("phone"),
                C("status"),
                C("email_status"),
                C("whatsapp_status"),
                C("error"),
                C("whatsapp_error"),
                C("sent_at", "timestamp"),
            ],
            40,
            430,
            300,
        ),
        Table(
            "students",
            "academics",
            [PK(), UK("admission_number"), FK("parent_id"), C("first_name"), C("last_name"), C("status")],
            420,
            360,
        ),
        Table(
            "notifications",
            "governance",
            [
                PK(),
                FK("user_id"),
                C("type"),
                C("title"),
                C("message", "text"),
                C("severity"),
                C("is_read", "bool"),
                C("read_at", "timestamp"),
            ],
            780,
            90,
        ),
        Table(
            "audit_logs",
            "governance",
            [
                PK(),
                FK("user_id"),
                C("action"),
                C("auditable_type"),
                C("auditable_id", "bigint"),
                C("metadata", "json"),
                C("ip_address", "varchar(45)"),
            ],
            780,
            360,
        ),
    ]


def messaging_rels():
    return [
        Rel("users", "id", "parent_messages", "sender_id", "1", "0..*", "left", "right", label="sender"),
        Rel("parent_messages", "id", "parent_message_recipients", "parent_message_id", "1", "1..*", "bottom", "top"),
        Rel("users", "id", "parent_message_recipients", "parent_id", "1", "0..*", "left", "right", label="parent"),
        Rel("users", "id", "students", "parent_id", "0..1", "0..*", "bottom", "top"),
        Rel("users", "id", "notifications", "user_id", "0..1", "0..*", "right", "left"),
        Rel("users", "id", "audit_logs", "user_id", "0..1", "0..*", "right", "left"),
    ]


def overview_tables():
    compact = lambda name, domain, cols, x, y, w=250: Table(name, domain, cols, x, y, w)
    return [
        compact("roles", "identity", [PK(), UK("slug")], 40, 100, 220),
        compact("users", "identity", [PK(), FK("role_id"), UK("email"), C("status")], 40, 210, 220),
        compact("staff", "hr", [PK(), FK("user_id"), FK("salary_grade_id"), UK("employee_id")], 40, 380, 220),
        compact("salary_grades", "hr", [PK(), UK("code"), C("basic_salary", "decimal")], 40, 540, 220),
        compact("allowance_types", "hr", [PK(), UK("code")], 320, 100, 230),
        compact("staff_allowances", "hr", [PK(), FK("staff_id"), FK("allowance_type_id")], 320, 230, 230),
        compact("loans", "hr", [PK(), FK("staff_id"), C("outstanding_balance", "decimal")], 320, 370, 230),
        compact("staff_attendances", "hr", [PK(), FK("staff_id"), UK("date", "date")], 320, 510, 230),
        compact("leave_requests", "hr", [PK(), FK("staff_id"), FK("reviewed_by"), FK("approved_by")], 320, 650, 230),
        compact("payroll_runs", "payroll", [PK(), C("status"), FK("created_by"), FK("approved_by")], 620, 100, 250),
        compact("payrolls", "payroll", [PK(), FK("payroll_run_id"), FK("staff_id"), C("net_salary", "decimal")], 620, 280, 250),
        compact(
            "payroll_anomalies",
            "payroll",
            [PK(), FK("payroll_run_id"), FK("payroll_id"), FK("staff_id"), C("rule_code")],
            620,
            460,
            250,
        ),
        compact("school_classes", "academics", [PK(), C("name"), C("level"), FK("teacher_id")], 940, 100, 250),
        compact("students", "academics", [PK(), UK("admission_number"), FK("class_id"), FK("parent_id")], 940, 270, 250),
        compact("subjects", "academics", [PK(), UK("code"), C("levels", "json")], 940, 450, 250),
        compact("staff_subject", "academics", [PK(), FK("staff_id"), FK("subject_id")], 940, 590, 250),
        compact(
            "student_assessments",
            "academics",
            [PK(), FK("student_id"), FK("subject_id"), C("academic_year"), C("term", "tinyint")],
            1260,
            100,
            270,
        ),
        compact(
            "student_term_reports",
            "academics",
            [PK(), FK("student_id"), C("academic_year"), C("term", "tinyint")],
            1260,
            300,
            270,
        ),
        compact(
            "student_attendances",
            "academics",
            [PK(), FK("student_id"), FK("class_id"), UK("date", "date")],
            1260,
            460,
            270,
        ),
        compact("parent_messages", "messaging", [PK(), FK("sender_id"), C("type"), C("channels", "json")], 1260, 620, 270),
        compact(
            "parent_message_recipients",
            "messaging",
            [PK(), FK("parent_message_id"), FK("parent_id"), C("status")],
            940,
            730,
            250,
        ),
        compact("audit_logs", "governance", [PK(), FK("user_id"), C("action"), C("auditable_type")], 620, 660, 250),
        compact("notifications", "governance", [PK(), FK("user_id"), C("title"), C("is_read", "bool")], 40, 700, 220),
    ]


def overview_rels():
    return [
        Rel("roles", "id", "users", "role_id", "1", "0..*", "bottom", "top"),
        Rel("users", "id", "staff", "user_id", "0..1", "0..1", "bottom", "top"),
        Rel("salary_grades", "id", "staff", "salary_grade_id", "0..1", "0..*", "top", "bottom"),
        Rel("staff", "id", "staff_allowances", "staff_id", "1", "0..*", "right", "left"),
        Rel("allowance_types", "id", "staff_allowances", "allowance_type_id", "1", "0..*", "bottom", "top"),
        Rel("staff", "id", "loans", "staff_id", "1", "0..*", "right", "left"),
        Rel("staff", "id", "staff_attendances", "staff_id", "1", "0..*", "right", "left"),
        Rel("staff", "id", "leave_requests", "staff_id", "1", "0..*", "right", "left"),
        Rel("payroll_runs", "id", "payrolls", "payroll_run_id", "1", "1..*", "bottom", "top"),
        Rel("staff", "id", "payrolls", "staff_id", "1", "0..*", "right", "left"),
        Rel("payrolls", "id", "payroll_anomalies", "payroll_id", "0..1", "0..*", "bottom", "top"),
        Rel("school_classes", "id", "students", "class_id", "0..1", "0..*", "bottom", "top"),
        Rel("subjects", "id", "staff_subject", "subject_id", "1", "0..1", "bottom", "top"),
        Rel("students", "id", "student_assessments", "student_id", "1", "0..*", "right", "left"),
        Rel("students", "id", "student_term_reports", "student_id", "1", "0..*", "right", "left"),
        Rel("students", "id", "student_attendances", "student_id", "1", "0..*", "right", "left"),
        Rel("parent_messages", "id", "parent_message_recipients", "parent_message_id", "1", "1..*", "bottom", "right"),
        Rel("users", "id", "notifications", "user_id", "0..1", "0..*", "bottom", "top"),
    ]


def domain_map(c: Canvas):
    draw_title(c)
    boxes = [
        (40, 100, 280, 230, "identity", "Identity", ["roles", "users", "sessions", "personal_access_tokens"]),
        (360, 100, 300, 230, "hr", "HR & compensation", ["staff", "salary_grades", "allowance_types", "staff_allowances", "loans"]),
        (700, 100, 300, 230, "payroll", "Payroll", ["payroll_runs", "payrolls", "payroll_anomalies", "staff_attendances", "leave_requests"]),
        (1040, 100, 300, 230, "academics", "Academics", ["school_classes", "students", "subjects", "staff_subject", "assessments", "student_attendances"]),
        (360, 400, 300, 180, "messaging", "Home–school messaging", ["parent_messages", "parent_message_recipients"]),
        (700, 400, 300, 180, "governance", "Governance", ["audit_logs", "notifications"]),
    ]
    for x, y, w, h, domain, title, tables in boxes:
        color = DOMAINS[domain]
        c.rect(x, y, w, h, WHITE, STROKE, 1, 8)
        c.rect(x, y, 8, h, color, color, 0, 0)
        c.text(x + 24, y + 24, title, size=16, color=color, bold=True)
        for i, name in enumerate(tables):
            c.text(x + 24, y + 52 + i * 22, name, size=12, color=INK)
    # Domain arrows
    def arrow(x1, y1, x2, y2, label=""):
        c.line([(x1, y1), (x2, y2)], LINE, 1.6)
        ang = math.atan2(y2 - y1, x2 - x1)
        s = 9
        c.polygon(
            [
                (x2, y2),
                (x2 - s * math.cos(ang - 0.4), y2 - s * math.sin(ang - 0.4)),
                (x2 - s * math.cos(ang + 0.4), y2 - s * math.sin(ang + 0.4)),
            ],
            LINE,
            LINE,
        )
        if label:
            c.text((x1 + x2) / 2, (y1 + y2) / 2 - 10, label, size=11, color=MUTED, anchor="middle")

    arrow(320, 180, 360, 180, "authenticates")
    arrow(660, 180, 700, 180, "pays")
    arrow(1000, 180, 1040, 180, "teaches")
    arrow(180, 330, 180, 490)
    c.line([(180, 490), (360, 490)], LINE, 1.6)
    c.text(200, 478, "parent accounts", size=11, color=MUTED)
    arrow(510, 330, 510, 400, "notices")
    arrow(850, 330, 850, 400, "records")
    arrow(660, 490, 700, 490)
    c.text(28, 620, "How to read this map", size=13, color=INK, bold=True)
    notes = [
        "Identity is the hub: every officer, teacher, parent and auditor is a user with one role.",
        "Staff is the HR master record. It may link to a user (officers) or stand alone for staff-ID login (teachers, accountants).",
        "Payroll runs generate one slip per staff member and scan payroll_anomalies before Headteacher approval.",
        "Primary classes have one tutor (school_classes.teacher_id). Junior High teachers are assigned per subject via staff_subject.",
        "Parents (users) link to students and receive parent_messages by email and WhatsApp.",
    ]
    for i, note in enumerate(notes):
        c.text(28, 646 + i * 20, f"{i + 1}.  {note}", size=12, color=INK)
    c.text(
        c.width - 28,
        c.height - 28,
        "Source: Laravel migrations in backend/database/migrations · School SMS",
        size=11,
        color=MUTED,
        anchor="end",
    )


def write_index(files: list[tuple[str, str, str]]):
    cards = []
    for stem, title, blurb in files:
        png = f"{stem}.png"
        svg = f"{stem}.svg"
        cards.append(
            f"""
            <article class="card">
              <h2>{escape(title)}</h2>
              <p>{escape(blurb)}</p>
              <div class="actions">
                <a href="{png}" download>Download PNG</a>
                <a href="{svg}" download>Download SVG</a>
              </div>
              <a href="{svg}" target="_blank"><img src="{svg}" alt="{escape(title)}"></a>
            </article>"""
        )
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>School SMS — database diagrams</title>
  <style>
    body {{ font-family: Segoe UI, Calibri, sans-serif; background: #F6F4EF; color: #1F2937; margin: 0; }}
    main {{ max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; }}
    h1 {{ font-size: 28px; margin: 0 0 8px; }}
    .lead {{ color: #6B7280; margin-bottom: 28px; }}
    .card {{ background: #fff; border: 1px solid #E5E1D8; border-radius: 10px; padding: 20px; margin-bottom: 28px; }}
    .card h2 {{ margin: 0 0 8px; font-size: 18px; }}
    .card p {{ margin: 0 0 12px; color: #4B5563; }}
    .actions a {{ display: inline-block; margin-right: 12px; margin-bottom: 12px; color: #1B365D; font-weight: 600; }}
    img {{ width: 100%; border: 1px solid #E5E1D8; border-radius: 6px; background: #F6F4EF; }}
  </style>
</head>
<body>
  <main>
    <h1>School SMS database diagrams</h1>
    <p class="lead">Entity-relationship diagrams generated from the Laravel migrations.
    PNG is best for slides and Word; SVG stays sharp when you zoom or print.</p>
    {''.join(cards)}
  </main>
</body>
</html>
"""
    (OUT / "index.html").write_text(html, encoding="utf-8")


def main():
    files = []

    c = Canvas(1380, 780, "School SMS — domain map", "How the six data areas connect. Use the ER diagrams below for keys and columns.")
    domain_map(c)
    c.save("01-domain-map")
    files.append(("01-domain-map", "Domain map", "Six subject areas and the main links between them."))

    render_diagram(
        "02-logical-overview",
        1600,
        1000,
        "School SMS — logical data model",
        "All application tables with primary keys, foreign keys and uniqueness. Crow's foot = many; circle = optional.",
        overview_tables(),
        overview_rels(),
        footnotes=["Lines show neighbouring foreign keys. Cross-domain FKs (parent_id, teacher_id, sender_id, recorded_by) are listed in the tables and drawn on the subject-area diagrams."],
    )
    files.append(("02-logical-overview", "Logical overview", "Every application table and its foreign keys, in one diagram."))

    render_diagram(
        "03-identity-access",
        1200,
        760,
        "School SMS — identity and access",
        "Roles, users, optional staff login records, parent links, sessions and API tokens.",
        identity_tables(),
        identity_rels(),
        footnotes=["staff.user_id is optional: teachers and accountants sign in with employee ID, not a password."],
    )
    files.append(("03-identity-access", "Identity and access", "Users, roles, staff login, parent accounts and tokens."))

    render_diagram(
        "04-hr-payroll",
        1500,
        1080,
        "School SMS — HR, leave and payroll",
        "Staff file, compensation, attendance, leave, payroll runs, payslips and anomaly flags.",
        hr_payroll_tables(),
        hr_payroll_rels(),
        footnotes=["Staff also stores Ghana Card, NTC, next of kin and other ERP profile columns omitted here for readability."],
    )
    files.append(("04-hr-payroll", "HR, leave and payroll", "Compensation, attendance, leave, runs, slips and anomalies."))

    render_diagram(
        "05-academics",
        1140,
        900,
        "School SMS — classes, students and assessment",
        "Class tutors, Junior High subject teachers, the student file, term scores and daily attendance.",
        academics_tables(),
        academics_rels(),
        footnotes=["staff_subject.subject_id is unique: one teacher covers a Junior High subject across JHS 1–3."],
    )
    files.append(("05-academics", "Classes, students and assessment", "Rooms, roll, subjects, scores, reports and attendance."))

    render_diagram(
        "06-messaging-governance",
        1140,
        760,
        "School SMS — messaging, audit and notifications",
        "Home–school notices (email and WhatsApp), in-app alerts, and the polymorphic audit trail.",
        messaging_tables(),
        messaging_rels(),
        footnotes=["audit_logs.auditable_type + auditable_id is a morph: it can point at payroll, staff, leave, parent messages, and other records."],
    )
    files.append(("06-messaging-governance", "Messaging, audit and notifications", "Parent notices, in-app alerts and audit logs."))

    write_index(files)
    print("Wrote diagrams to", OUT)
    for stem, _, _ in files:
        print(" ", stem)


if __name__ == "__main__":
    main()
