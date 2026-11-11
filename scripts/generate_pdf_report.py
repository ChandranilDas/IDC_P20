#!/usr/bin/env python3
"""
scripts/generate_pdf_report.py
Generates a formal, beautiful PDF technical report for Project P20 from docs/final_report.md
into web/public/downloads/P20_Technical_Report.pdf.
"""

from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

ROOT = Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "final_report.md"
PDF_PATH = ROOT / "web" / "public" / "downloads" / "P20_Technical_Report.pdf"
PDF_PATH.parent.mkdir(parents=True, exist_ok=True)

def build_pdf():
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#102c57'),
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#102c57'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=6
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#147d92'),
        spaceAfter=4
    )

    story = []

    text = MD_PATH.read_text()
    lines = text.split('\n')

    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
        if line_str.startswith('# '):
            story.append(Paragraph(line_str[2:], title_style))
            story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#147d92'), spaceAfter=8))
        elif line_str.startswith('## '):
            story.append(Spacer(1, 6))
            story.append(Paragraph(line_str[3:], h1_style))
        elif line_str.startswith('### '):
            sub_style = ParagraphStyle('Sub', parent=h1_style, fontSize=11, leading=14, textColor=colors.HexColor('#147d92'))
            story.append(Paragraph(line_str[4:], sub_style))
        elif line_str.startswith('- '):
            story.append(Paragraph(f"• {line_str[2:]}", body_style))
        elif line_str.startswith('$$') or line_str.startswith('\\['):
            clean_eq = line_str.replace('$$', '').replace('\\[', '').replace('\\]', '').replace('\\boxed{', '').replace('}', '')
            story.append(Paragraph(f"<b>[Equation]</b> {clean_eq}", code_style))
        elif line_str.startswith('|'):
            # Table row or divider
            if '---' in line_str:
                continue
            cols = [c.strip() for c in line_str.split('|')[1:-1]]
            story.append(Paragraph(" | ".join(cols), code_style))
        else:
            # clean basic markdown bold
            clean = line_str.replace('**', '<b>', 1).replace('**', '</b>', 1)
            story.append(Paragraph(clean, body_style))

    doc.build(story)
    print(f"Generated PDF report: {PDF_PATH} ({PDF_PATH.stat().st_size / 1024:.1f} KB)")

if __name__ == "__main__":
    build_pdf()

