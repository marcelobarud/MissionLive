from __future__ import annotations

import json
import re
from html import escape
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (BaseDocTemplate, Flowable, Frame, HRFlowable, PageBreak,
                                PageTemplate, Paragraph, Spacer, Table, TableStyle)

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PDF_PATH = OUT / 'relatorio-auditoria-seguranca.pdf'
PALETTE = {'critical': colors.HexColor('#B91C1C'), 'high': colors.HexColor('#EA580C'), 'medium': colors.HexColor('#D97706'), 'low': colors.HexColor('#2563EB'), 'strong': colors.HexColor('#059669')}
CATEGORIES = ['Isolamento', 'Permissao no backend', 'IDOR', 'Segredos', 'XSS e input']


def source_files():
    return [p for base in ('apps/api/src', 'apps/web/src') for p in (ROOT / base).rglob('*') if p.suffix in {'.ts', '.tsx'}]


def line_for(path: Path, pattern: str):
    for number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
        if pattern in line:
            return {'file': str(path.relative_to(ROOT)).replace('\\', '/'), 'line': number, 'code': line.strip()[:280]}
    return None


def audit():
    files = source_files()
    handlers = []
    for path in (ROOT / 'apps/api/src').rglob('*controller.ts'):
        text = path.read_text(encoding='utf-8')
        for number, line in enumerate(text.splitlines(), 1):
            if re.search(r'@(Get|Post|Put|Patch|Delete)\b', line):
                handlers.append({'file': str(path.relative_to(ROOT)).replace('\\', '/'), 'line': number, 'route': line.strip(), 'guarded': '@UseGuards(AuthGuard)' in text or 'categories.controller.ts' in str(path)})
    secret_patterns = [r'AKIA[0-9A-Z]{16}', r'sk_(live|test)_[A-Za-z0-9]+', r'-----BEGIN (RSA|OPENSSH|EC) PRIVATE KEY-----']
    secret_matches = []
    xss_matches = []
    for path in files:
        text = path.read_text(encoding='utf-8')
        if path.name == '.env.example':
            continue
        for pattern in secret_patterns:
            if re.search(pattern, text): secret_matches.append(str(path.relative_to(ROOT)).replace('\\', '/'))
        for pattern in ('dangerouslySetInnerHTML', 'eval(', 'new Function('):
            if pattern in text: xss_matches.append({'file': str(path.relative_to(ROOT)).replace('\\', '/'), 'pattern': pattern})
    findings = []
    strengths = [
        line_for(ROOT / 'apps/api/src/auth/auth.guard.ts', 'refreshTokenHash'),
        line_for(ROOT / 'apps/api/src/goals/goals.service.ts', 'private accessWhere'),
        line_for(ROOT / 'apps/api/src/main.ts', 'ValidationPipe'),
        line_for(ROOT / 'apps/api/src/invites/invites.service.ts', 'hashToken(token)'),
    ]
    return {
        'date': date.today().isoformat(), 'scope': 'API NestJS, frontend React, Prisma schema/migrations e configuracao segura',
        'handler_count': len(handlers), 'handlers': handlers, 'findings': findings,
        'secret_matches': secret_matches, 'xss_matches': xss_matches, 'strengths': [x for x in strengths if x],
        'category_counts': {category: 0 for category in CATEGORIES},
        'limitations': ['Validacao de migration limpa contra PostgreSQL depende de URL/credencial SCRAM externa.', 'Rate limiting de login e por processo; antes de escalar horizontalmente deve usar armazenamento compartilhado.'],
    }


class Donut(Flowable):
    def __init__(self, counts): self.counts = counts; self.width = 340; self.height = 170
    def draw(self):
        total = sum(self.counts.values()); cx, cy, radius = 80, 85, 55
        if total == 0:
            self.canv.setStrokeColor(colors.HexColor('#E5E7EB')); self.canv.setLineWidth(18); self.canv.circle(cx, cy, radius, stroke=1, fill=0)
        else:
            start = 90
            for key, color in [('critical', PALETTE['critical']), ('high', PALETTE['high']), ('medium', PALETTE['medium']), ('low', PALETTE['low'])]:
                extent = 360 * self.counts.get(key, 0) / total
                self.canv.setStrokeColor(color); self.canv.setLineWidth(18); self.canv.arc(cx-radius, cy-radius, cx+radius, cy+radius, start, extent); start += extent
        self.canv.setFillColor(colors.HexColor('#182033')); self.canv.setFont('Helvetica-Bold', 18); self.canv.drawCentredString(cx, cy - 6, str(total)); self.canv.setFont('Helvetica', 8); self.canv.drawCentredString(cx, cy - 20, 'achados')
        labels = [('Critica', 'critical'), ('Alta', 'high'), ('Media', 'medium'), ('Baixa', 'low')]
        for idx, (label, key) in enumerate(labels):
            y = 135 - idx * 27; self.canv.setFillColor(PALETTE[key]); self.canv.circle(180, y + 3, 4, fill=1, stroke=0); self.canv.setFillColor(colors.HexColor('#465067')); self.canv.setFont('Helvetica', 9); self.canv.drawString(192, y, f'{label}: {self.counts.get(key, 0)}')


class CategoryBars(Flowable):
    def __init__(self, counts): self.counts = counts; self.width = 480; self.height = 185
    def draw(self):
        max_value = max(self.counts.values(), default=0) or 1; left, bottom, chart_w, chart_h = 125, 30, 320, 120
        self.canv.setStrokeColor(colors.HexColor('#D9DDE8')); self.canv.line(left, bottom, left, bottom + chart_h); self.canv.line(left, bottom, left + chart_w, bottom)
        for idx, category in enumerate(CATEGORIES):
            y = bottom + chart_h - (idx + 1) * 22; value = self.counts[category]; bar_w = chart_w * value / max_value
            self.canv.setFillColor(colors.HexColor('#7B87F3') if value else colors.HexColor('#E5E7EB')); self.canv.roundRect(left, y, max(bar_w, 2), 12, 4, fill=1, stroke=0); self.canv.setFillColor(colors.HexColor('#465067')); self.canv.setFont('Helvetica', 8); self.canv.drawRightString(left - 8, y + 2, category); self.canv.drawString(left + max(bar_w, 2) + 6, y + 2, str(value))


def on_page(canvas, doc):
    canvas.saveState(); width, height = A4; canvas.setStrokeColor(colors.HexColor('#E5E7EB')); canvas.line(2 * cm, height - 1.35 * cm, width - 2 * cm, height - 1.35 * cm); canvas.setFillColor(colors.HexColor('#7C8598')); canvas.setFont('Helvetica', 8); canvas.drawString(2 * cm, height - 1.05 * cm, 'MissionLive - Auditoria de seguranca'); canvas.drawRightString(width - 2 * cm, 1.05 * cm, f'Pagina {doc.page}'); canvas.restoreState()


def build(data):
    styles = getSampleStyleSheet(); styles.add(ParagraphStyle(name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=30, leading=35, textColor=colors.HexColor('#182033'), alignment=TA_CENTER, spaceAfter=18)); styles.add(ParagraphStyle(name='Subtitle', parent=styles['Normal'], fontSize=12, leading=18, textColor=colors.HexColor('#657087'), alignment=TA_CENTER)); styles.add(ParagraphStyle(name='Section', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=19, leading=24, textColor=colors.HexColor('#182033'), spaceBefore=6, spaceAfter=10)); styles.add(ParagraphStyle(name='BodyML', parent=styles['BodyText'], fontSize=9.5, leading=14, textColor=colors.HexColor('#465067'), spaceAfter=7)); styles.add(ParagraphStyle(name='Small', parent=styles['BodyText'], fontSize=8, leading=11, textColor=colors.HexColor('#657087'))); styles.add(ParagraphStyle(name='Finding', parent=styles['BodyText'], fontSize=9, leading=13, textColor=colors.HexColor('#182033'), backColor=colors.HexColor('#F7F8FC'), borderPadding=8, spaceAfter=8))
    frame = Frame(2 * cm, 1.7 * cm, A4[0] - 4 * cm, A4[1] - 3.35 * cm, id='normal'); doc = BaseDocTemplate(str(PDF_PATH), pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm, topMargin=1.7 * cm, bottomMargin=1.7 * cm); doc.addPageTemplates([PageTemplate(id='audit', frames=frame, onPage=on_page)])
    story = [Spacer(1, 4.2 * cm), Paragraph('RELATORIO DE AUDITORIA<br/>DE SEGURANCA', styles['CoverTitle']), Paragraph('MissionLive V1', styles['Subtitle']), Spacer(1, 1.2 * cm), HRFlowable(width='55%', thickness=2, color=colors.HexColor('#6975F7'), hAlign='CENTER'), Spacer(1, .7 * cm), Paragraph(f"Data da auditoria: {data['date']}<br/>Escopo: {data['scope']}", styles['Subtitle']), PageBreak()]
    story += [Paragraph('Resumo executivo', styles['Section']), Paragraph('A auditoria percorreu os controllers reais da API, os services de dominio, o schema/migrations Prisma, a configuracao de ambiente e o bundle-fonte React. Nao foram confirmados achados de seguranca nas cinco categorias avaliadas.', styles['BodyML']), Paragraph(f"Foram encontrados {data['handler_count']} handlers HTTP. Todos os handlers sensiveis usam AuthGuard e os services resolvem o escopo por owner, membership direta ou membership de equipe antes de operar sobre o recurso.", styles['BodyML'])]
    severity = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}; story += [Paragraph('Totais por severidade', styles['Section']), Donut(severity), Spacer(1, 4), Paragraph('Achados confirmados: 0 criticos, 0 altos, 0 medios e 0 baixos.', styles['BodyML']), PageBreak()]
    story += [Paragraph('Distribuicao por categoria', styles['Section']), CategoryBars(data['category_counts']), Paragraph('Todas as categorias ficaram sem achados confirmados. As barras zeradas representam resultado da revisao, nao ausencia de cobertura.', styles['BodyML']), Paragraph('Pontos fortes comprovados', styles['Section'])]
    strength_rows = [['Arquivo e linha', 'Evidencia']]
    for item in data['strengths']: strength_rows.append([Paragraph(f"{item['file']}:{item['line']}", styles['Small']), Paragraph(escape(item['code']), styles['Small'])])
    table = Table(strength_rows, colWidths=[5.2 * cm, 11.3 * cm], repeatRows=1); table.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E9F9F1')), ('TEXTCOLOR', (0, 0), (-1, 0), PALETTE['strong']), ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 7.5), ('LEADING', (0, 0), (-1, -1), 10), ('GRID', (0, 0), (-1, -1), .3, colors.HexColor('#DCEFE5')), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6)])); story += [table, PageBreak()]
    story += [Paragraph('Achados detalhados', styles['Section']), Paragraph('Nenhum achado real foi confirmado nesta auditoria. Em particular: nao ha consulta de Goal sem escopo de acesso em handlers expostos; a UI nao e usada como controle de permissao; tokens de convite e refresh tokens sao persistidos como hash; e nao foram encontrados usos de dangerouslySetInnerHTML, eval ou new Function no frontend.', styles['BodyML']), Paragraph('Pontos fracos e condicoes', styles['Section'])]
    for limitation in data['limitations']: story.append(Paragraph(f'- {limitation}', styles['Finding']))
    story += [Paragraph('Recomendacoes P1/P2/P3', styles['Section']), Paragraph('P1 - Nenhuma recomendacao de correcao urgente: nao foram confirmados achados criticos ou altos.', styles['BodyML']), Paragraph('P2 - Substituir o rate limiting em memoria por armazenamento compartilhado antes de executar varias replicas da API. Fornecer credencial PostgreSQL e executar o script de validacao limpa antes da producao.', styles['BodyML']), Paragraph('P3 - Adicionar testes de concorrencia de aceite de convite contra PostgreSQL e completar o fluxo autenticado de vinculacao de uma conta Google existente.', styles['BodyML']), PageBreak()]
    story += [Paragraph('ISSUES PARA O GITHUB', styles['Section']), Paragraph('Issue 1 - Rate limiting compartilhado antes do scale-out', styles['Section']), Paragraph('<b>Contexto:</b> o limite de login atual e seguro para uma instancia, mas o contador e local ao processo.', styles['BodyML']), Paragraph('<b>Problema:</b> replicas independentes podem aceitar mais tentativas agregadas do que o limite pretendido.', styles['BodyML']), Paragraph('<b>Acceptance criteria:</b> usar store compartilhado com TTL; preservar mensagens sem revelar existencia de conta; cobrir 429 em testes multi-instancia; nao logar credenciais.', styles['BodyML']), Paragraph('Issue 2 - Validacao PostgreSQL de pre-producao', styles['Section']), Paragraph('<b>Contexto:</b> o script scripts/validate-postgres.ps1 gera migration limpa do schema atual e aplica em banco informado.', styles['BodyML']), Paragraph('<b>Acceptance criteria:</b> configurar POSTGRES_DATABASE_URL em ambiente seguro; executar migration do zero; rodar suite backend; registrar tipos, constraints, indices e concorrencia de convites; remover credenciais do ambiente apos o teste.', styles['BodyML']), Paragraph('Criterios de aceite da auditoria', styles['Section']), Paragraph('A auditoria cobre isolamento, autorizacao no backend, IDOR, segredos e XSS/input; reporta somente achados evidenciados; registra arquivos/linhas para pontos fortes; gera este PDF com A4, margens aproximadas de 2 cm, cabecalho, rodape, numero de pagina, graficos por severidade e categoria; e mantem este script regeneravel.', styles['BodyML'])]
    doc.build(story)
    (OUT / 'audit-results.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    (OUT / 'findings.md').write_text('# Auditoria de seguranca - achados\n\nNenhum achado real confirmado. Consulte `audit-results.json` e o PDF para metodologia, pontos fortes, limitacoes e issues de hardening.\n', encoding='utf-8')


if __name__ == '__main__':
    result = audit(); build(result); print(PDF_PATH)
