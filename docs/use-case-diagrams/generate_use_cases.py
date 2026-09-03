"""Generate School SMS UML use-case diagrams as SVG and PNG."""

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
DASH = "#6B7280"
INCLUDE = "#0E4D4A"
EXTEND = "#6B3F1D"
SYSTEM = "#1B365D"
ACTOR_COLOR = "#1F2937"
FONT = "Segoe UI, Calibri, Arial, sans-serif"

ROLE_COLORS = {
    "Super Admin": "#1B365D",
    "Headteacher": "#6B3F1D",
    "HR Officer": "#0E4D4A",
    "Accountant": "#374151",
    "Auditor": "#3D2B56",
    "Teacher": "#1B4D3E",
    "Parent": "#7C2D12",
    "Email system": "#475569",
    "WhatsApp API": "#166534",
    "Anomaly engine": "#9A3412",
}


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
class Actor:
    name: str
    x: float
    y: float
    external: bool = False


@dataclass
class UseCase:
    name: str
    x: float
    y: float
    w: float = 200
    h: float = 44

    @property
    def cx(self) -> float:
        return self.x + self.w / 2

    @property
    def cy(self) -> float:
        return self.y + self.h / 2


@dataclass
class Assoc:
    actor: str
    use_case: str
    side: str = "left"  # which side of the use case the line approaches


@dataclass
class Rel:
    """«include» / «extend» between use cases."""

    src: str
    dst: str
    kind: str  # include | extend
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
            self.f10 = _pil_font(10)
            self.f11 = _pil_font(11)
            self.f11b = _pil_font(11, True)
            self.f12 = _pil_font(12)
            self.f13b = _pil_font(13, True)
            self.f16b = _pil_font(16, True)
            self.f22b = _pil_font(22, True)

    def rect(self, x, y, w, h, fill, stroke=STROKE, sw=1, radius=0, dashed=False):
        dash = ' stroke-dasharray="6 4"' if dashed else ""
        svg_fill = fill if fill and fill != "none" else "none"
        self.svg.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
            f'rx="{radius}" fill="{svg_fill}" stroke="{stroke}" stroke-width="{sw}"{dash}/>'
        )
        if self.draw:
            box = [x, y, x + w, y + h]
            pil_fill = None if (not fill or fill == "none") else fill
            if dashed and pil_fill is None:
                # Outline-only dashed box: approximate with solid outline
                self.draw.rounded_rectangle(box, radius=radius or 1, outline=stroke, width=max(1, round(sw)))
            elif radius:
                self.draw.rounded_rectangle(
                    box, radius=radius, fill=pil_fill, outline=stroke, width=max(1, round(sw))
                )
            else:
                self.draw.rectangle(box, fill=pil_fill, outline=stroke, width=max(1, round(sw)))

    def ellipse(self, x, y, w, h, fill=WHITE, stroke=SYSTEM, sw=1.6):
        self.svg.append(
            f'<ellipse cx="{x + w / 2:.1f}" cy="{y + h / 2:.1f}" rx="{w / 2:.1f}" ry="{h / 2:.1f}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
        )
        if self.draw:
            self.draw.ellipse([x, y, x + w, y + h], fill=fill, outline=stroke, width=max(1, round(sw)))

    def line(self, pts, color=LINE, sw=1.4, dashed=False):
        d = " ".join(f"{'M' if i == 0 else 'L'}{px:.1f},{py:.1f}" for i, (px, py) in enumerate(pts))
        dash = ' stroke-dasharray="6 4"' if dashed else ""
        self.svg.append(
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="round"{dash}/>'
        )
        if self.draw:
            xy = [(round(px), round(py)) for px, py in pts]
            if dashed:
                self._dashed(xy, color, sw)
            else:
                self.draw.line(xy, fill=color, width=max(1, round(sw)))

    def _dashed(self, xy, color, sw):
        remaining = 0.0
        on = True
        dash, gap = 6.0, 4.0
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
        points = " ".join(f"{px:.1f},{py:.1f}" for px, py in pts)
        st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ' stroke="none"'
        self.svg.append(f'<polygon points="{points}" fill="{fill}"{st}/>')
        if self.draw:
            self.draw.polygon([(round(px), round(py)) for px, py in pts], fill=fill, outline=stroke)

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
            if size >= 20:
                font = self.f22b
            elif size >= 15:
                font = self.f16b
            elif bold:
                font = self.f13b if size >= 12 else self.f11b
            else:
                font = self.f12 if size >= 12 else (self.f11 if size >= 11 else self.f10)
            ax = {"start": "lm", "middle": "mm", "end": "rm"}[anchor]
            self.draw.text((x, y), s, fill=color, font=font, anchor=ax)

    def arrowhead(self, x, y, nx, ny, color=LINE, size=8):
        ang = math.atan2(ny, nx)
        pts = [
            (x, y),
            (x - size * math.cos(ang - 0.4), y - size * math.sin(ang - 0.4)),
            (x - size * math.cos(ang + 0.4), y - size * math.sin(ang + 0.4)),
        ]
        self.polygon(pts, color, color)

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


def draw_actor(c: Canvas, a: Actor):
    color = ROLE_COLORS.get(a.name, ACTOR_COLOR)
    # Stick figure: head, body, arms, legs
    hx, hy = a.x, a.y
    c.circle(hx, hy, 10, WHITE, color, 1.8)
    c.line([(hx, hy + 10), (hx, hy + 34)], color, 1.8)
    c.line([(hx - 14, hy + 20), (hx + 14, hy + 20)], color, 1.8)
    c.line([(hx, hy + 34), (hx - 12, hy + 52)], color, 1.8)
    c.line([(hx, hy + 34), (hx + 12, hy + 52)], color, 1.8)
    # Name (wrap long names)
    label = a.name
    c.text(hx, hy + 68, label, size=11, color=color, bold=True, anchor="middle")
    if a.external:
        c.text(hx, hy + 84, "<<external>>", size=10, color=MUTED, anchor="middle")


def draw_usecase(c: Canvas, uc: UseCase):
    c.ellipse(uc.x, uc.y, uc.w, uc.h, WHITE, SYSTEM, 1.7)
    # Support two-line labels with | as break
    if "|" in uc.name:
        a, b = uc.name.split("|", 1)
        c.text(uc.x + uc.w / 2, uc.y + uc.h / 2 - 8, a.strip(), size=11, color=INK, bold=True, anchor="middle")
        c.text(uc.x + uc.w / 2, uc.y + uc.h / 2 + 9, b.strip(), size=11, color=INK, bold=True, anchor="middle")
    else:
        c.text(uc.x + uc.w / 2, uc.y + uc.h / 2, uc.name, size=12, color=INK, bold=True, anchor="middle")


def actor_anchor(a: Actor) -> tuple[float, float]:
    return a.x, a.y + 28


def uc_anchor(uc: UseCase, side: str) -> tuple[float, float]:
    if side == "left":
        return uc.x, uc.y + uc.h / 2
    if side == "right":
        return uc.x + uc.w, uc.y + uc.h / 2
    if side == "top":
        return uc.x + uc.w / 2, uc.y
    return uc.x + uc.w / 2, uc.y + uc.h


def draw_assoc(c: Canvas, actors: dict[str, Actor], ucs: dict[str, UseCase], assoc: Assoc):
    a = actors[assoc.actor]
    uc = ucs[assoc.use_case]
    x1, y1 = actor_anchor(a)
    x2, y2 = uc_anchor(uc, assoc.side)
    # Route: horizontal then to oval
    if assoc.side == "left":
        mid = (x1 + x2) / 2
        pts = [(x1, y1), (mid, y1), (mid, y2), (x2, y2)]
    elif assoc.side == "right":
        mid = (x1 + x2) / 2
        pts = [(x1, y1), (mid, y1), (mid, y2), (x2, y2)]
    else:
        pts = [(x1, y1), (x2, y1), (x2, y2)]
    c.line(pts, LINE, 1.25)


def draw_rel(c: Canvas, ucs: dict[str, UseCase], r: Rel):
    """Dashed arrow from src → dst. For «include»/«extend», src is the base/extension as modelled."""
    src, dst = ucs[r.src], ucs[r.dst]
    color = INCLUDE if r.kind == "include" else EXTEND

    # Prefer side exit toward the destination
    if abs(src.cy - dst.cy) <= 40:
        if src.cx < dst.cx:
            x1, y1 = src.x + src.w, src.cy
            x2, y2 = dst.x, dst.cy
        else:
            x1, y1 = src.x, src.cy
            x2, y2 = dst.x + dst.w, dst.cy
        mid = (x1 + x2) / 2
        pts = [(x1, y1), (mid, y1), (mid, y2), (x2, y2)]
    elif src.cy < dst.cy:
        x1, y1 = src.cx, src.y + src.h
        x2, y2 = dst.cx, dst.y
        midy = (y1 + y2) / 2
        pts = [(x1, y1), (x1, midy), (x2, midy), (x2, y2)]
    else:
        x1, y1 = src.cx, src.y
        x2, y2 = dst.cx, dst.y + dst.h
        midy = (y1 + y2) / 2
        pts = [(x1, y1), (x1, midy), (x2, midy), (x2, y2)]

    if r.via:
        pts = [(x1, y1), *r.via, (x2, y2)]

    c.line(pts, color, 1.3, dashed=True)
    dx = pts[-1][0] - pts[-2][0]
    dy = pts[-1][1] - pts[-2][1]
    mag = math.hypot(dx, dy) or 1
    c.arrowhead(pts[-1][0], pts[-1][1], dx / mag, dy / mag, color, 7)
    mx = (pts[0][0] + pts[-1][0]) / 2
    my = (pts[0][1] + pts[-1][1]) / 2 - 11
    c.text(mx, my, f"«{r.kind}»", size=10, color=color, bold=True, anchor="middle")


def draw_boundary(c: Canvas, x, y, w, h, label: str):
    c.rect(x, y, w, h, "none", SYSTEM, 1.8, radius=8)
    # Label chip on top border
    tw = 12 * len(label) * 0.55 + 24
    c.rect(x + 18, y - 12, tw, 24, WHITE, SYSTEM, 1.4, radius=4)
    c.text(x + 18 + tw / 2, y, label, size=12, color=SYSTEM, bold=True, anchor="middle")


def draw_legend(c: Canvas, x, y):
    c.rect(x, y, 620, 58, WHITE, radius=6)
    c.text(x + 14, y + 16, "Notation", size=11, color=MUTED, bold=True)
    items = [
        ("Actor", "role / system", ACTOR_COLOR),
        ("Oval", "use case", SYSTEM),
        ("«include»", "required step", INCLUDE),
        ("«extend»", "optional path", EXTEND),
    ]
    ox = x + 14
    for badge, label, color in items:
        c.text(ox, y + 38, badge, size=11, color=color, bold=True)
        c.text(ox + (62 if "«" in badge else 40), y + 38, label, size=11, color=INK)
        ox += 155


def render(
    stem: str,
    width: int,
    height: int,
    title: str,
    subtitle: str,
    boundary: tuple[float, float, float, float, str],
    actors: list[Actor],
    usecases: list[UseCase],
    assocs: list[Assoc],
    rels: list[Rel] | None = None,
    footnotes: list[str] | None = None,
):
    c = Canvas(width, height, title, subtitle)
    draw_title(c)
    bx, by, bw, bh, blabel = boundary
    draw_boundary(c, bx, by, bw, bh, blabel)
    actor_map = {a.name: a for a in actors}
    uc_map = {u.name: u for u in usecases}
    # Also index by short key before | for rels that use short names
    for u in usecases:
        uc_map[u.name.split("|")[0].strip()] = u

    for assoc in assocs:
        draw_assoc(c, actor_map, uc_map, assoc)
    for r in rels or []:
        draw_rel(c, uc_map, r)
    for a in actors:
        draw_actor(c, a)
    for u in usecases:
        draw_usecase(c, u)

    draw_legend(c, 28, height - 78)
    if footnotes:
        for i, note in enumerate(footnotes):
            c.text(28, height - 100 - i * 16, note, size=11, color=MUTED)
    c.text(
        width - 28,
        height - 28,
        "Source: roles, API middleware, portal pages · School SMS",
        size=11,
        color=MUTED,
        anchor="end",
    )
    return c.save(stem)


# ---------------------------------------------------------------------------
# Diagrams
# ---------------------------------------------------------------------------


def diagram_actors_overview():
    """High-level actor map — who uses the system."""
    c = Canvas(
        1320,
        900,
        "School SMS — actors overview",
        "Seven portal roles plus external delivery and detection services. Super Admin can perform every other desk’s use cases.",
    )
    draw_title(c)

    # System box
    draw_boundary(c, 300, 100, 680, 500, "School SMS portal")

    groups = [
        (70, 110, "Leadership & assurance", ["Super Admin", "Headteacher", "Auditor"]),
        (70, 500, "Operations", ["HR Officer", "Accountant"]),
        (1120, 110, "School community", ["Teacher", "Parent"]),
        (1120, 360, "External systems", ["Email system", "WhatsApp API", "Anomaly engine"]),
    ]
    for gx, gy, title, names in groups:
        c.text(gx, gy - 14, title, size=12, color=MUTED, bold=True)
        for i, name in enumerate(names):
            draw_actor(
                c,
                Actor(
                    name,
                    gx + 50,
                    gy + 20 + i * 105,
                    external=name in ("Email system", "WhatsApp API", "Anomaly engine"),
                ),
            )

    # Core capability chips inside boundary
    chips = [
        (340, 150, "Identity & users"),
        (540, 150, "HR & compensation"),
        (740, 150, "Payroll & anomalies"),
        (340, 260, "Attendance & leave"),
        (540, 260, "Classes & students"),
        (740, 260, "Assessments"),
        (340, 370, "Parent messaging"),
        (540, 370, "Reports"),
        (740, 370, "Audit trail"),
        (420, 480, "Dashboard & notifications"),
        (640, 480, "Help / user manual"),
    ]
    for x, y, label in chips:
        c.rect(x, y, 150, 40, WHITE, STROKE, 1, radius=20)
        c.text(x + 75, y + 20, label, size=11, color=INK, bold=True, anchor="middle")

    notes = [
        "Password login: Super Admin, Headteacher, HR Officer, Auditor, Parent.",
        "Staff-ID login: Teacher, Accountant (employment email + staff ID; no day-to-day password).",
        "Parents cannot self-register — HR or Headteacher creates the household account.",
    ]
    for i, note in enumerate(notes):
        c.text(28, 720 + i * 20, f"{i + 1}.  {note}", size=12, color=INK)
    draw_legend(c, 28, c.height - 78)
    c.text(
        c.width - 28,
        c.height - 28,
        "Source: Role model, AuthController, portalRoles.js · School SMS",
        size=11,
        color=MUTED,
        anchor="end",
    )
    return c.save("01-actors-overview")


def diagram_identity():
    actors = [
        Actor("Super Admin", 90, 140),
        Actor("Headteacher", 90, 280),
        Actor("HR Officer", 90, 420),
        Actor("Auditor", 90, 560),
        Actor("Teacher", 1190, 180),
        Actor("Accountant", 1190, 340),
        Actor("Parent", 1190, 500),
    ]
    ucs = [
        UseCase("Self-register|officer account", 420, 110, 210, 48),
        UseCase("Sign in with|email & password", 420, 200, 210, 48),
        UseCase("Sign in with|Staff ID", 720, 200, 210, 48),
        UseCase("Manage portal users", 420, 320, 210, 44),
        UseCase("View dashboard", 720, 320, 210, 44),
        UseCase("Change password", 420, 420, 210, 44),
        UseCase("Sign out", 720, 420, 210, 44),
        UseCase("Browse Help|/ download manual", 570, 520, 220, 48),
    ]
    assocs = [
        Assoc("Super Admin", "Self-register|officer account"),
        Assoc("Headteacher", "Self-register|officer account"),
        Assoc("HR Officer", "Self-register|officer account"),
        Assoc("Auditor", "Self-register|officer account"),
        Assoc("Super Admin", "Sign in with|email & password"),
        Assoc("Headteacher", "Sign in with|email & password"),
        Assoc("HR Officer", "Sign in with|email & password"),
        Assoc("Auditor", "Sign in with|email & password"),
        Assoc("Parent", "Sign in with|email & password", "right"),
        Assoc("Teacher", "Sign in with|Staff ID", "right"),
        Assoc("Accountant", "Sign in with|Staff ID", "right"),
        Assoc("Super Admin", "Manage portal users"),
        Assoc("Super Admin", "View dashboard"),
        Assoc("Headteacher", "View dashboard"),
        Assoc("HR Officer", "View dashboard"),
        Assoc("Auditor", "View dashboard"),
        Assoc("Teacher", "View dashboard", "right"),
        Assoc("Accountant", "View dashboard", "right"),
        Assoc("Parent", "View dashboard", "right"),
        Assoc("Super Admin", "Change password"),
        Assoc("Parent", "Change password", "right"),
        Assoc("Super Admin", "Sign out"),
        Assoc("Teacher", "Sign out", "right"),
        Assoc("Parent", "Browse Help|/ download manual", "right"),
        Assoc("HR Officer", "Browse Help|/ download manual"),
    ]
    return render(
        "02-identity-access",
        1320,
        780,
        "School SMS — identity and access",
        "Registration, login paths, user administration and session basics.",
        (300, 90, 700, 540, "Identity & access"),
        actors,
        ucs,
        assocs,
        footnotes=[
            "Officer self-register requires captcha. Teachers/accountants are created from the staff register, not /register.",
            "Super Admin alone manages the Users desk (CRUD any role).",
        ],
    )


def diagram_hr_leave():
    actors = [
        Actor("HR Officer", 90, 160),
        Actor("Super Admin", 90, 340),
        Actor("Headteacher", 90, 520),
        Actor("Teacher", 1190, 200),
        Actor("Accountant", 1190, 400),
        Actor("Auditor", 1190, 560),
    ]
    ucs = [
        UseCase("Register / update staff", 400, 100, 220, 44),
        UseCase("Manage salary grades", 400, 170, 220, 44),
        UseCase("Post allowances & loans", 400, 240, 220, 44),
        UseCase("View staff register", 680, 140, 220, 44),
        UseCase("Mark staff attendance", 680, 220, 220, 44),
        UseCase("Request leave", 400, 340, 220, 44),
        UseCase("HR review leave", 680, 340, 220, 44),
        UseCase("Approve / reject leave", 680, 420, 220, 44),
        UseCase("Deactivate staff", 400, 420, 220, 44),
        UseCase("View leave requests", 400, 500, 220, 44),
    ]
    assocs = [
        Assoc("HR Officer", "Register / update staff"),
        Assoc("Super Admin", "Register / update staff"),
        Assoc("HR Officer", "Manage salary grades"),
        Assoc("Super Admin", "Manage salary grades"),
        Assoc("HR Officer", "Post allowances & loans"),
        Assoc("Super Admin", "Post allowances & loans"),
        Assoc("HR Officer", "Deactivate staff"),
        Assoc("Super Admin", "Deactivate staff"),
        Assoc("HR Officer", "View staff register"),
        Assoc("Headteacher", "View staff register"),
        Assoc("Accountant", "View staff register", "right"),
        Assoc("Auditor", "View staff register", "right"),
        Assoc("HR Officer", "Mark staff attendance"),
        Assoc("Headteacher", "Mark staff attendance"),
        Assoc("Teacher", "Mark staff attendance", "right"),
        Assoc("Super Admin", "Mark staff attendance"),
        Assoc("Teacher", "Request leave", "right"),
        Assoc("HR Officer", "Request leave"),
        Assoc("HR Officer", "HR review leave"),
        Assoc("Super Admin", "HR review leave"),
        Assoc("Headteacher", "Approve / reject leave"),
        Assoc("Super Admin", "Approve / reject leave"),
        Assoc("Teacher", "View leave requests", "right"),
        Assoc("HR Officer", "View leave requests"),
        Assoc("Headteacher", "View leave requests"),
    ]
    rels = [
        # Base → included: review always involves an existing request; approve follows HR forward
        Rel("HR review leave", "Request leave", "include"),
        Rel("Approve / reject leave", "HR review leave", "include"),
    ]
    return render(
        "03-hr-attendance-leave",
        1320,
        780,
        "School SMS — HR, attendance and leave",
        "Staff file, compensation, daily attendance and the two-step leave approval chain.",
        (320, 80, 640, 520, "HR · attendance · leave"),
        actors,
        ucs,
        assocs,
        rels,
        footnotes=[
            "Leave happy path: Request → HR review (forward) → Headteacher approve. Teachers see only their own leave.",
            "Accountant and Auditor view the staff register read-only; they do not edit employment files.",
        ],
    )


def diagram_payroll():
    actors = [
        Actor("HR Officer", 90, 180),
        Actor("Headteacher", 90, 380),
        Actor("Super Admin", 90, 560),
        Actor("Accountant", 1190, 160),
        Actor("Auditor", 1190, 360),
        Actor("Anomaly engine", 1190, 560, external=True),
    ]
    ucs = [
        UseCase("Prepare payroll run", 400, 110, 220, 44),
        UseCase("Auto-scan anomalies", 680, 110, 220, 44),
        UseCase("Cancel draft run", 400, 190, 220, 44),
        UseCase("Recalculate payslip", 680, 190, 220, 44),
        UseCase("Exclude / restore|staff line", 400, 270, 220, 48),
        UseCase("Resolve anomaly", 680, 270, 220, 44),
        UseCase("Approve payroll run", 400, 370, 220, 44),
        UseCase("Mark run paid", 680, 370, 220, 44),
        UseCase("Download payslip PDF", 400, 460, 220, 44),
        UseCase("View reports & CSV", 680, 460, 220, 44),
        UseCase("Browse anomalies", 540, 550, 220, 44),
    ]
    assocs = [
        Assoc("HR Officer", "Prepare payroll run"),
        Assoc("Super Admin", "Prepare payroll run"),
        Assoc("Anomaly engine", "Auto-scan anomalies", "right"),
        Assoc("HR Officer", "Cancel draft run"),
        Assoc("HR Officer", "Recalculate payslip"),
        Assoc("Super Admin", "Recalculate payslip"),
        Assoc("HR Officer", "Exclude / restore|staff line"),
        Assoc("Headteacher", "Exclude / restore|staff line"),
        Assoc("Super Admin", "Exclude / restore|staff line"),
        Assoc("HR Officer", "Resolve anomaly"),
        Assoc("Headteacher", "Resolve anomaly"),
        Assoc("Auditor", "Resolve anomaly", "right"),
        Assoc("Super Admin", "Resolve anomaly"),
        Assoc("Headteacher", "Approve payroll run"),
        Assoc("Super Admin", "Approve payroll run"),
        Assoc("HR Officer", "Mark run paid"),
        Assoc("Super Admin", "Mark run paid"),
        Assoc("Accountant", "Download payslip PDF", "right"),
        Assoc("HR Officer", "Download payslip PDF"),
        Assoc("Auditor", "Download payslip PDF", "right"),
        Assoc("Headteacher", "Download payslip PDF"),
        Assoc("Accountant", "View reports & CSV", "right"),
        Assoc("Auditor", "View reports & CSV", "right"),
        Assoc("HR Officer", "View reports & CSV"),
        Assoc("Headteacher", "View reports & CSV"),
        Assoc("Accountant", "Browse anomalies", "right"),
        Assoc("Auditor", "Browse anomalies", "right"),
        Assoc("HR Officer", "Browse anomalies"),
    ]
    rels = [
        Rel("Prepare payroll run", "Auto-scan anomalies", "include"),
        # Extending UC → base UC: resolving flags can inject into the approval path
        Rel("Resolve anomaly", "Approve payroll run", "extend"),
    ]
    return render(
        "04-payroll-anomalies",
        1320,
        800,
        "School SMS — payroll, anomalies and reports",
        "Monthly pay cycle: prepare → clear critical flags → approve → mark paid.",
        (320, 80, 640, 560, "Payroll & assurance"),
        actors,
        ucs,
        assocs,
        rels,
        footnotes=[
            "Approval and Mark paid are blocked while open critical anomalies remain.",
            "Accountant views runs, slips, anomalies and reports but cannot resolve or mutate pay.",
        ],
    )


def diagram_academics():
    actors = [
        Actor("Teacher", 90, 200),
        Actor("HR Officer", 90, 400),
        Actor("Headteacher", 90, 560),
        Actor("Parent", 1190, 220),
        Actor("Super Admin", 1190, 420),
    ]
    ucs = [
        UseCase("Admit / update student", 400, 110, 220, 44),
        UseCase("View student register", 680, 110, 220, 44),
        UseCase("Create class", 400, 190, 220, 44),
        UseCase("Assign class tutor|(P1–P6)", 680, 190, 220, 48),
        UseCase("Assign JHS subject|teacher", 680, 270, 220, 48),
        UseCase("Open My class", 400, 290, 220, 44),
        UseCase("Mark pupil attendance", 400, 370, 220, 44),
        UseCase("Enter assessment scores", 680, 370, 220, 44),
        UseCase("View assessment report", 400, 460, 220, 44),
        UseCase("Download assessment PDF", 680, 460, 220, 44),
    ]
    assocs = [
        Assoc("Teacher", "Admit / update student"),
        Assoc("HR Officer", "Admit / update student"),
        Assoc("Super Admin", "Admit / update student", "right"),
        Assoc("Teacher", "View student register"),
        Assoc("Parent", "View student register", "right"),
        Assoc("Headteacher", "View student register"),
        Assoc("HR Officer", "View student register"),
        Assoc("Teacher", "Create class"),
        Assoc("HR Officer", "Create class"),
        Assoc("Headteacher", "Assign class tutor|(P1–P6)"),
        Assoc("HR Officer", "Assign class tutor|(P1–P6)"),
        Assoc("Super Admin", "Assign class tutor|(P1–P6)", "right"),
        Assoc("Headteacher", "Assign JHS subject|teacher"),
        Assoc("HR Officer", "Assign JHS subject|teacher"),
        Assoc("Teacher", "Open My class"),
        Assoc("Super Admin", "Open My class", "right"),
        Assoc("Teacher", "Mark pupil attendance"),
        Assoc("Teacher", "Enter assessment scores"),
        Assoc("Super Admin", "Enter assessment scores", "right"),
        Assoc("Parent", "View assessment report", "right"),
        Assoc("Teacher", "View assessment report"),
        Assoc("Headteacher", "View assessment report"),
        Assoc("Parent", "Download assessment PDF", "right"),
        Assoc("Teacher", "Download assessment PDF"),
    ]
    rels = [
        Rel("Open My class", "Mark pupil attendance", "include"),
        Rel("Enter assessment scores", "Open My class", "extend"),
    ]
    return render(
        "05-academics",
        1320,
        760,
        "School SMS — classes, students and assessment",
        "Admissions, class staffing, My class, pupil attendance and term scores.",
        (320, 80, 640, 500, "Academics"),
        actors,
        ucs,
        assocs,
        rels,
        footnotes=[
            "Parents see only their own wards. Teachers enter scores for assigned primary classes or JHS subjects.",
            "Primary classes use one tutor (teacher_id). JHS uses one teacher per subject across JHS 1–3.",
        ],
    )


def diagram_messaging():
    actors = [
        Actor("Headteacher", 90, 160),
        Actor("HR Officer", 90, 320),
        Actor("Teacher", 90, 480),
        Actor("Parent", 1190, 180),
        Actor("Auditor", 1190, 360),
        Actor("Super Admin", 1190, 520),
        Actor("Email system", 90, 640, external=True),
        Actor("WhatsApp API", 1190, 660, external=True),
    ]
    ucs = [
        UseCase("Register parent|household", 420, 110, 220, 48),
        UseCase("Browse parent register", 700, 110, 220, 44),
        UseCase("Compose notice / meeting", 420, 220, 220, 44),
        UseCase("Broadcast to all parents", 700, 220, 220, 44),
        UseCase("Deliver via Email", 420, 320, 220, 44),
        UseCase("Deliver via WhatsApp", 700, 320, 220, 44),
        UseCase("View message inbox", 560, 410, 220, 44),
        UseCase("View audit trail", 420, 510, 220, 44),
        UseCase("View / read|notifications", 700, 510, 220, 48),
    ]
    assocs = [
        Assoc("Headteacher", "Register parent|household"),
        Assoc("HR Officer", "Register parent|household"),
        Assoc("Super Admin", "Register parent|household", "right"),
        Assoc("Teacher", "Browse parent register"),
        Assoc("HR Officer", "Browse parent register"),
        Assoc("Headteacher", "Compose notice / meeting"),
        Assoc("HR Officer", "Compose notice / meeting"),
        Assoc("Teacher", "Compose notice / meeting"),
        Assoc("Super Admin", "Compose notice / meeting", "right"),
        Assoc("Headteacher", "Broadcast to all parents"),
        Assoc("Teacher", "Broadcast to all parents"),
        Assoc("Email system", "Deliver via Email"),
        Assoc("WhatsApp API", "Deliver via WhatsApp", "right"),
        Assoc("Parent", "View message inbox", "right"),
        Assoc("Auditor", "View audit trail", "right"),
        Assoc("Headteacher", "View audit trail"),
        Assoc("Super Admin", "View audit trail", "right"),
        Assoc("Parent", "View / read|notifications", "right"),
        Assoc("Teacher", "View / read|notifications"),
        Assoc("HR Officer", "View / read|notifications"),
    ]
    rels = [
        Rel("Compose notice / meeting", "Deliver via Email", "include"),
        Rel("Deliver via WhatsApp", "Compose notice / meeting", "extend"),
        Rel("Broadcast to all parents", "Deliver via Email", "include"),
    ]
    return render(
        "06-messaging-governance",
        1320,
        880,
        "School SMS — parent messaging, notifications and audit",
        "Home–school notices (email / WhatsApp), in-app alerts and the assurance audit trail.",
        (340, 80, 640, 540, "Messaging & governance"),
        actors,
        ucs,
        assocs,
        rels,
        footnotes=[
            "Teachers can browse parents and send notices but cannot create or edit parent accounts.",
            "Audit trail is available to Super Admin, Auditor and Headteacher (read / export).",
        ],
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
  <title>School SMS — use case diagrams</title>
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
    <h1>School SMS use case diagrams</h1>
    <p class="lead">UML use-case diagrams derived from portal roles, API middleware and pages.
    PNG is best for slides and Word; SVG stays sharp when you zoom or print.</p>
    {''.join(cards)}
  </main>
</body>
</html>
"""
    (OUT / "index.html").write_text(html, encoding="utf-8")


def main():
    files = []
    diagram_actors_overview()
    files.append(("01-actors-overview", "Actors overview", "Seven portal roles and external systems around the School SMS portal."))

    diagram_identity()
    files.append(("02-identity-access", "Identity and access", "Self-register, password vs Staff-ID login, users desk and session basics."))

    diagram_hr_leave()
    files.append(("03-hr-attendance-leave", "HR, attendance and leave", "Staff file, compensation, attendance and the leave approval chain."))

    diagram_payroll()
    files.append(("04-payroll-anomalies", "Payroll, anomalies and reports", "Prepare, scan, approve, pay, slips and assurance reports."))

    diagram_academics()
    files.append(("05-academics", "Classes, students and assessment", "Admissions, class staffing, My class, attendance and scores."))

    diagram_messaging()
    files.append(("06-messaging-governance", "Messaging, notifications and audit", "Parent notices, email/WhatsApp delivery, alerts and audit trail."))

    write_index(files)
    print("Wrote use-case diagrams to", OUT)
    for stem, _, _ in files:
        print(" ", stem)


if __name__ == "__main__":
    main()
