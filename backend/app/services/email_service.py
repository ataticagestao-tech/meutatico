"""
Email Service — send emails via SMTP and manage email templates.
Supports Gmail and Outlook API integration when credentials are configured.
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from uuid import UUID

from jinja2 import Template
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.exceptions import NotFoundException
from app.models.tenant.client import Client
from app.models.tenant.inbox import EmailTemplate, InboxMessage
from app.models.tenant.user import User

# Default email templates
DEFAULT_EMAIL_TEMPLATES = [
    {
        "name": "Boas-vindas ao Novo Cliente",
        "subject": "Bem-vindo(a) à A Tática Gestão Financeira, {{nome_cliente}}!",
        "category": "onboarding",
        "html_body": """<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #1a1a1a;">Olá, {{nome_cliente}}! 👋</h2>
<p>Seja bem-vindo(a) à <strong>A Tática Gestão Financeira</strong>!</p>
<p>Estamos muito felizes em ter você como nosso cliente. Seu responsável de conta é
<strong>{{nome_responsavel}}</strong>, que estará à disposição para ajudá-lo(a).</p>
<p>Nos próximos dias, daremos início ao processo de onboarding, que inclui:</p>
<ul>
<li>Cadastro completo dos seus dados</li>
<li>Configuração do acesso ao sistema financeiro</li>
<li>Reunião de kickoff para alinhar processos</li>
</ul>
<p>Qualquer dúvida, estamos à disposição!</p>
<p>Atenciosamente,<br><strong>Equipe A Tática</strong></p>
</div>""",
    },
    {
        "name": "Envio de Relatório Mensal",
        "subject": "Relatório Financeiro - {{mes_referencia}} | {{nome_cliente}}",
        "category": "relatorio",
        "html_body": """<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #1a1a1a;">Relatório Financeiro — {{mes_referencia}}</h2>
<p>Olá, {{nome_cliente}}!</p>
<p>Segue em anexo o relatório financeiro referente ao mês de <strong>{{mes_referencia}}</strong>.</p>
<p>Principais indicadores do período:</p>
<ul>
<li>Contas a Pagar: conferidas e lançadas</li>
<li>Contas a Receber: atualizadas</li>
<li>Conciliação Bancária: realizada</li>
<li>Resultado apurado</li>
</ul>
<p>Caso tenha alguma dúvida sobre os números apresentados, entre em contato com
<strong>{{nome_responsavel}}</strong>.</p>
<p>Atenciosamente,<br><strong>Equipe A Tática</strong></p>
</div>""",
    },
    {
        "name": "Cobrança Padrão",
        "subject": "Lembrete: Mensalidade pendente — {{nome_cliente}}",
        "category": "cobranca",
        "html_body": """<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #1a1a1a;">Lembrete de Pagamento</h2>
<p>Olá, {{nome_cliente}}!</p>
<p>Identificamos que sua mensalidade referente ao mês de <strong>{{mes_referencia}}</strong>
encontra-se em aberto.</p>
<p>Solicitamos gentilmente a regularização do pagamento o mais breve possível.</p>
<p>Caso o pagamento já tenha sido efetuado, por favor desconsidere esta mensagem.</p>
<p>Atenciosamente,<br><strong>Equipe A Tática</strong></p>
</div>""",
    },
    {
        "name": "Lembrete de Documento Pendente",
        "subject": "Documento pendente — {{nome_cliente}}",
        "category": "lembrete",
        "html_body": """<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #1a1a1a;">Documento Pendente</h2>
<p>Olá, {{nome_cliente}}!</p>
<p>Gostaríamos de lembrá-lo(a) que temos documentação pendente de envio.
Para que possamos dar continuidade aos serviços, precisamos receber os documentos
o mais breve possível.</p>
<p>Por favor, entre em contato com <strong>{{nome_responsavel}}</strong> para mais detalhes.</p>
<p>Atenciosamente,<br><strong>Equipe A Tática</strong></p>
</div>""",
    },
    {
        "name": "Comunicado Geral",
        "subject": "Comunicado — A Tática Gestão Financeira",
        "category": "comunicado",
        "html_body": """<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #1a1a1a;">Comunicado</h2>
<p>Olá, {{nome_cliente}}!</p>
<p>[Conteúdo do comunicado aqui]</p>
<p>Atenciosamente,<br><strong>Equipe A Tática</strong></p>
</div>""",
    },
]


class EmailService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @property
    def smtp_configured(self) -> bool:
        return bool(settings.SMTP_HOST and settings.SMTP_USER)

    async def ensure_default_templates(self) -> None:
        """Create default email templates if they don't exist."""
        result = await self.db.execute(
            select(func.count()).select_from(EmailTemplate)
        )
        count = result.scalar()
        if count and count > 0:
            return

        for tpl in DEFAULT_EMAIL_TEMPLATES:
            template = EmailTemplate(
                name=tpl["name"],
                subject=tpl["subject"],
                category=tpl["category"],
                html_body=tpl["html_body"],
            )
            self.db.add(template)
        await self.db.flush()

    async def list_templates(self, category: str | None = None) -> list[dict]:
        """List email templates."""
        await self.ensure_default_templates()

        query = select(EmailTemplate).order_by(EmailTemplate.name)
        if category:
            query = query.where(EmailTemplate.category == category)

        result = await self.db.execute(query)
        templates = result.scalars().all()
        return [
            {
                "id": str(t.id),
                "name": t.name,
                "subject": t.subject,
                "category": t.category,
                "html_body": t.html_body,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in templates
        ]

    async def get_template(self, template_id: UUID) -> dict:
        """Get a specific email template."""
        result = await self.db.execute(
            select(EmailTemplate).where(EmailTemplate.id == template_id)
        )
        t = result.scalar_one_or_none()
        if not t:
            raise NotFoundException("Template de email não encontrado")
        return {
            "id": str(t.id),
            "name": t.name,
            "subject": t.subject,
            "category": t.category,
            "html_body": t.html_body,
        }

    async def preview_template(self, template_id: UUID, client_id: UUID) -> dict:
        """Render an email template with client data."""
        result = await self.db.execute(
            select(EmailTemplate).where(EmailTemplate.id == template_id)
        )
        tpl = result.scalar_one_or_none()
        if not tpl:
            raise NotFoundException("Template não encontrado")

        client = await self.db.get(Client, client_id)
        if not client:
            raise NotFoundException("Cliente não encontrado")

        responsible_name = ""
        if client.responsible_user_id:
            user = await self.db.get(User, client.responsible_user_id)
            if user:
                responsible_name = user.name

        MESES = [
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
        ]
        from datetime import datetime
        now = datetime.now()
        mes_ref = f"{MESES[now.month - 1]} de {now.year}"

        variables = {
            "nome_cliente": client.trade_name or client.company_name,
            "nome_responsavel": responsible_name or "Equipe A Tática",
            "mes_referencia": mes_ref,
        }

        subject = Template(tpl.subject).render(**variables)
        body = Template(tpl.html_body).render(**variables)

        return {
            "subject": subject,
            "html_body": body,
            "variables": variables,
            "client_email": client.email,
        }

    async def send_email(
        self, to_email: str, subject: str, html_body: str
    ) -> dict:
        """Send an email via SMTP."""
        if not self.smtp_configured:
            return {"sent": False, "reason": "SMTP não configurado"}

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            return {"sent": True, "to": to_email}
        except Exception as e:
            return {"sent": False, "reason": str(e)}

    # ── Inbox ──

    async def list_inbox(
        self,
        status: str | None = None,
        channel: str | None = None,
        client_id: UUID | None = None,
        page: int = 1,
        per_page: int = 20,
    ) -> dict:
        """List inbox messages."""
        query = select(InboxMessage).order_by(InboxMessage.received_at.desc())
        count_query = select(func.count()).select_from(InboxMessage)

        if status:
            query = query.where(InboxMessage.status == status)
            count_query = count_query.where(InboxMessage.status == status)
        if channel:
            query = query.where(InboxMessage.channel == channel)
            count_query = count_query.where(InboxMessage.channel == channel)
        if client_id:
            query = query.where(InboxMessage.client_id == client_id)
            count_query = count_query.where(InboxMessage.client_id == client_id)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        messages = result.scalars().all()

        items = []
        for m in messages:
            client_name = None
            if m.client_id:
                client = await self.db.get(Client, m.client_id)
                if client:
                    client_name = client.trade_name or client.company_name

            assigned_name = None
            if m.assigned_user_id:
                user = await self.db.get(User, m.assigned_user_id)
                if user:
                    assigned_name = user.name

            items.append({
                "id": str(m.id),
                "channel": m.channel,
                "status": m.status,
                "subject": m.subject,
                "body": m.body,
                "sender": m.sender,
                "sender_email": m.sender_email,
                "client_id": str(m.client_id) if m.client_id else None,
                "client_name": client_name,
                "assigned_user_id": str(m.assigned_user_id) if m.assigned_user_id else None,
                "assigned_user_name": assigned_name,
                "task_id": str(m.task_id) if m.task_id else None,
                "received_at": m.received_at.isoformat() if m.received_at else None,
            })

        return {"items": items, "total": total, "page": page, "per_page": per_page}

    async def update_inbox_status(
        self, message_id: UUID, status: str, assigned_user_id: UUID | None = None
    ) -> dict:
        """Update inbox message status."""
        result = await self.db.execute(
            select(InboxMessage).where(InboxMessage.id == message_id)
        )
        msg = result.scalar_one_or_none()
        if not msg:
            raise NotFoundException("Mensagem não encontrada")

        msg.status = status
        if assigned_user_id:
            msg.assigned_user_id = assigned_user_id
        await self.db.flush()

        return {"id": str(msg.id), "status": msg.status}

    async def create_inbox_message(
        self,
        channel: str,
        subject: str | None,
        body: str | None,
        sender: str | None,
        sender_email: str | None = None,
        client_id: UUID | None = None,
        external_id: str | None = None,
    ) -> InboxMessage:
        """Create a new inbox message."""
        msg = InboxMessage(
            channel=channel,
            subject=subject,
            body=body,
            sender=sender,
            sender_email=sender_email,
            client_id=client_id,
            external_id=external_id,
        )
        self.db.add(msg)
        await self.db.flush()
        return msg
