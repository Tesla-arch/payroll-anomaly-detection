"""One simplified UML use-case diagram — classic textbook layout."""

from __future__ import annotations

import math
import os
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont

    HAS_PIL = True
except ImportError:
    HAS_PIL = False

OUT = Path(__file__).resolve().parent
BG = "#FFFFFF"
INK = "#111111"
OVAL_FILL = "#FFF9DB"
STROKE = "#222222"
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
    return ImageFont.truetype(path, size) if path else ImageFont.load_default()


class Canvas:
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self.svg: list[str] = []
        self.img = None
        self.draw = None
        if HAS_PIL:
            self.img = Image.new("RGB", (width, height), BG)
            self.draw = ImageDraw.Draw(self.img)
            self.f12 = _pil_font(12)
            self.f13 = _pil_font(13)
            self.f14 = _pil_font(14)
            self.f15b = _pil_font(15, True)

    def rect(self, x, y, w, h, sw=2.0, radius=20):
        self.svg.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{radius}" '
            f'fill="none" stroke="{STROKE}" stroke-width="{sw}"/>'
        )
        if self.draw:
            self.draw.rounded_rectangle(
                [x, y, x + w, y + h], radius=radius, outline=STROKE, width=max(1, round(sw))
            )

    def ellipse(self, cx, cy, rx, ry):
        self.svg.append(
            f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" '
            f'fill="{OVAL_FILL}" stroke="{STROKE}" stroke-width="1.6"/>'
        )
        if self.draw:
            self.draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=OVAL_FILL, outline=STROKE, width=2)

    def text(self, x, y, s, size=13, bold=False, anchor="middle"):
        weight = "600" if bold else "400"
        anc = {"start": "start", "middle": "middle", "end": "end"}[anchor]
        self.svg.append(
            f'<text x="{x:.1f}" y="{y:.1f}" fill="{INK}" font-size="{size}" font-family="{FONT}" '
            f'font-weight="{weight}" text-anchor="{anc}" dominant-baseline="central">{s}</text>'
        )
        if self.draw:
            font = self.f15b if bold else (self.f14 if size >= 14 else (self.f13 if size >= 13 else self.f12))
            self.draw.text((x, y), s, fill=INK, font=font, anchor={"start": "lm", "middle": "mm", "end": "rm"}[anchor])

    def path(self, pts, dashed=False, sw=1.55):
        d = " ".join(f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}" for i, (x, y) in enumerate(pts))
        dash = ' stroke-dasharray="7 5"' if dashed else ""
        self.svg.append(
            f'<path d="{d}" fill="none" stroke="{STROKE}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round"{dash}/>'
        )
        if self.draw:
            xy = [(round(x), round(y)) for x, y in pts]
            if not dashed:
                self.draw.line(xy, fill=STROKE, width=max(1, round(sw)))
            else:
                self._dash(xy, sw)
        # arrow head
        dx = pts[-1][0] - pts[-2][0]
        dy = pts[-1][1] - pts[-2][1]
        mag = math.hypot(dx, dy) or 1
        ang = math.atan2(dy / mag, dx / mag)
        x, y = pts[-1]
        size = 8
        tri = [
            (x, y),
            (x - size * math.cos(ang - 0.45), y - size * math.sin(ang - 0.45)),
            (x - size * math.cos(ang + 0.45), y - size * math.sin(ang + 0.45)),
        ]
        self.svg.append(
            f'<polygon points="{" ".join(f"{px:.1f},{py:.1f}" for px, py in tri)}" fill="{STROKE}"/>'
        )
        if self.draw:
            self.draw.polygon([(round(px), round(py)) for px, py in tri], fill=STROKE)

    def _dash(self, xy, sw):
        on, rem = True, 0.0
        for i in range(len(xy) - 1):
            x1, y1 = xy[i]
            x2, y2 = xy[i + 1]
            dx, dy = x2 - x1, y2 - y1
            dist = math.hypot(dx, dy) or 1
            ux, uy = dx / dist, dy / dist
            pos = 0.0
            cx, cy = float(x1), float(y1)
            while pos < dist:
                seg = (7.0 if on else 5.0) - rem
                take = min(seg, dist - pos)
                nx, ny = cx + ux * take, cy + uy * take
                if on:
                    self.draw.line([(cx, cy), (nx, ny)], fill=STROKE, width=max(1, round(sw)))
                rem = 0
                if take < seg:
                    rem = seg - take
                    cx, cy = nx, ny
                    break
                on = not on
                cx, cy = nx, ny
                pos += take

    def oval(self, cx, cy, label, rx=100, ry=28):
        self.ellipse(cx, cy, rx, ry)
        self.text(cx, cy, label, size=13)
        return cx, cy, rx, ry

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
            self.img.save(png, "PNG")
        return svg, png


def build():
    W, H = 1000, 820
    c = Canvas(W, H)

    # Boundary
    bx, by, bw, bh = 220, 30, 700, 740
    c.rect(bx, by, bw, bh)
    c.text(bx + bw / 2, by + 18, "School Management System with Payroll Integration", size=15, bold=True)

    # Use cases — left column
    LX, RX = 390, 790
    finance = c.oval(LX, 95, "Manage Finance")
    payroll = c.oval(LX, 165, "Process Payroll")
    users = c.oval(LX, 235, "Manage Users")
    reports = c.oval(LX, 305, "Generate Reports")
    view_rep = c.oval(LX, 375, "View Student Reports")
    notify = c.oval(LX, 445, "Receive Notifications")
    students = c.oval(LX, 515, "Manage Students")
    results = c.oval(LX, 585, "Upload Results")
    leave = c.oval(LX, 655, "Manage Leave")

    # Right column (includes / shared)
    payslips = c.oval(RX, 110, "Generate Payslips", 96, 27)
    anomalies = c.oval(RX, 200, "Scan Anomalies", 96, 27)
    classes = c.oval(RX, 515, "Manage Classes", 96, 27)
    attendance = c.oval(RX, 600, "Record Attendance", 96, 27)
    staff = c.oval(RX, 690, "Manage Staff", 96, 27)

    def left(o):
        return o[0] - o[2], o[1]

    def right(o):
        return o[0] + o[2], o[1]

    # Actors aligned with their clusters
    AX = 100
    c.text(AX, 130, "Accountant", size=14, anchor="end")
    c.text(AX, 270, "Administrator", size=14, anchor="end")
    c.text(AX, 410, "Parent", size=14, anchor="end")
    c.text(AX, 550, "Teacher", size=14, anchor="end")
    c.text(AX, 720, "HR Officer", size=14, anchor="end")

    # Accountant
    c.path([(AX + 12, 110), (165, 48), (320, 48), (320, 95), left(finance)])
    c.path([(AX + 12, 130), left(finance)])
    c.path([(AX + 12, 150), left(payroll)])

    # Administrator
    c.path([(AX + 12, 255), left(users)])
    c.path([(AX + 12, 285), left(reports)])

    # Parent
    c.path([(AX + 12, 395), left(view_rep)])
    c.path([(AX + 12, 425), left(notify)])

    # Teacher
    c.path([(AX + 12, 525), left(students)])
    c.path([(AX + 12, 560), left(results)])
    c.path([(AX + 12, 590), left(leave)])
    c.path([(AX + 12, 550), (200, 550), (560, 550), left(classes)])
    c.path([(AX + 12, 615), (185, 700), (500, 700), (500, 600), left(attendance)])

    # HR Officer — bottom fan (sample style): leave, attendance, staff
    c.path([(AX + 12, 690), left(leave)])
    c.path([(AX + 12, 715), (195, 770), (520, 770), (520, 600), left(attendance)])
    c.path([(AX + 12, 740), (205, 790), (690, 790), (690, 690), left(staff)])
    # HR also prepares payroll (short jog along left gutter, then in)
    c.path([(AX + 12, 670), (195, 670), (195, 165), left(payroll)])

    # includes
    c.path([right(payroll), left(payslips)], dashed=True)
    c.text(600, 105, "includes", size=12)
    c.path([right(payroll), (560, 200), left(anomalies)], dashed=True)
    c.text(600, 185, "includes", size=12)
    c.path([right(payroll), (555, 380), (555, 600), left(attendance)], dashed=True)
    c.text(570, 390, "includes", size=12)

    c.text(
        W / 2,
        H - 18,
        "Administrator = Super Admin / Headteacher · Simplified system use-case diagram",
        size=11,
    )
    return c.save("00-system-use-cases")


def update_index():
    index = OUT / "index.html"
    card = """
            <article class="card" style="border-color:#1B365D;">
              <h2>System use cases (simplified — one diagram)</h2>
              <p>All main use cases in one classic UML diagram (textbook layout).</p>
              <div class="actions">
                <a href="00-system-use-cases.png" download>Download PNG</a>
                <a href="00-system-use-cases.svg" download>Download SVG</a>
              </div>
              <a href="00-system-use-cases.svg" target="_blank"><img src="00-system-use-cases.svg" alt="System use cases"></a>
            </article>"""
    if not index.exists():
        index.write_text(
            f"<!DOCTYPE html><html><body><main>{card}</main></body></html>",
            encoding="utf-8",
        )
        return
    html = index.read_text(encoding="utf-8")
    if "00-system-use-cases" in html:
        return
    end = html.find("</p>", html.find('<p class="lead">'))
    if end != -1:
        index.write_text(html[: end + 4] + card + html[end + 4 :], encoding="utf-8")


if __name__ == "__main__":
    svg, png = build()
    update_index()
    print("Wrote", svg, png)
