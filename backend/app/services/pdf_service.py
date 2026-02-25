"""
PDF Generation Service — generates contracts and terms from HTML templates.
Uses Jinja2 for template rendering and basic HTML-to-PDF conversion.
"""

import os
from datetime import datetime
from io import BytesIO
from uuid import UUID

from jinja2 import Template
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.exceptions import NotFoundException
from app.models.tenant.client import Client
from app.models.tenant.document_template import DocumentTemplate, GeneratedDocument


# Available template variables
TEMPLATE_VARIABLES = {
    "razao_social": "Razão Social do Cliente",
    "nome_fantasia": "Nome Fantasia",
    "cnpj": "CNPJ/CPF",
    "endereco_completo": "Endereço Completo",
    "email": "E-mail do Cliente",
    "telefone": "Telefone do Cliente",
    "regime_tributario": "Regime Tributário",
    "valor_mensalidade": "Valor da Mensalidade",
    "data_inicio_contrato": "Data Início do Contrato",
    "data_fim_contrato": "Data Fim do Contrato",
    "plano_contratado": "Plano Contratado",
    "data_geracao": "Data de Geração do Documento",
    "empresa_nome": "Nome da Empresa (Tática)",
    "empresa_cnpj": "CNPJ da Empresa (Tática)",
}

# Default templates
DEFAULT_TEMPLATES = [
    {
        "name": "Contrato de Prestação de Serviços",
        "category": "contrato",
        "description": "Contrato padrão de prestação de serviços de BPO Financeiro",
        "html_content": """<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px;">
CONTRATO DE PRESTAÇÃO DE SERVIÇOS
</h1>

<p style="text-align: center; color: #666; margin-bottom: 30px;">
Contrato nº {{ numero_contrato }}
</p>

<h3>DAS PARTES</h3>

<p><strong>CONTRATADA:</strong> {{ empresa_nome }}, inscrita no CNPJ sob nº {{ empresa_cnpj }},
doravante denominada simplesmente CONTRATADA.</p>

<p><strong>CONTRATANTE:</strong> {{ razao_social }}, inscrita no CNPJ/CPF sob nº {{ cnpj }},
{% if nome_fantasia %}nome fantasia {{ nome_fantasia }}, {% endif %}
com sede em {{ endereco_completo }}, e-mail {{ email }}, telefone {{ telefone }},
doravante denominada simplesmente CONTRATANTE.</p>

<h3>DO OBJETO</h3>

<p>O presente contrato tem por objeto a prestação de serviços de <strong>BPO Financeiro</strong>,
conforme plano <strong>{{ plano_contratado }}</strong>, que inclui gestão de contas a pagar e receber,
conciliação bancária, relatórios financeiros mensais e demais serviços descritos na proposta comercial.</p>

<h3>DO VALOR E PAGAMENTO</h3>

<p>O valor mensal dos serviços é de <strong>{{ valor_mensalidade }}</strong>, com vencimento
todo dia 10 de cada mês, mediante boleto bancário ou transferência.</p>

<h3>DO PRAZO</h3>

<p>O presente contrato tem vigência de {{ data_inicio_contrato }} a {{ data_fim_contrato }},
podendo ser renovado automaticamente por períodos iguais e sucessivos.</p>

<h3>DO REGIME TRIBUTÁRIO</h3>

<p>A CONTRATANTE declara estar enquadrada no regime tributário: <strong>{{ regime_tributario }}</strong>.</p>

<div style="margin-top: 60px;">
<p>Por estarem assim justas e contratadas, as partes assinam o presente contrato em 2 (duas) vias
de igual teor e forma.</p>

<p style="text-align: center; margin-top: 40px;">{{ data_geracao }}</p>

<div style="display: flex; justify-content: space-between; margin-top: 60px;">
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #333; padding-top: 5px;">
{{ empresa_nome }}<br>CONTRATADA
</div>
</div>
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #333; padding-top: 5px;">
{{ razao_social }}<br>CONTRATANTE
</div>
</div>
</div>
</div>
</div>""",
    },
    {
        "name": "Termo de Responsabilidade Técnica",
        "category": "termo",
        "description": "Termo de responsabilidade técnica para serviços financeiros",
        "html_content": """<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; color: #1a1a1a;">TERMO DE RESPONSABILIDADE TÉCNICA</h1>

<p>Pelo presente instrumento, a empresa {{ empresa_nome }}, inscrita no CNPJ {{ empresa_cnpj }},
assume a responsabilidade técnica pelos serviços de gestão financeira prestados à empresa
{{ razao_social }}, CNPJ/CPF {{ cnpj }}.</p>

<p>Os serviços incluem, mas não se limitam a: gestão de contas a pagar e receber, conciliação bancária,
apuração de resultados e geração de relatórios financeiros, conforme plano {{ plano_contratado }}.</p>

<p style="text-align: center; margin-top: 50px;">{{ data_geracao }}</p>

<div style="text-align: center; margin-top: 60px; border-top: 1px solid #333; padding-top: 5px; width: 50%; margin-left: auto; margin-right: auto;">
{{ empresa_nome }}
</div>
</div>""",
    },
    {
        "name": "Termo de Confidencialidade (NDA)",
        "category": "termo",
        "description": "Acordo de não divulgação de informações confidenciais",
        "html_content": """<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; color: #1a1a1a;">TERMO DE CONFIDENCIALIDADE</h1>
<h3 style="text-align: center; color: #666;">Acordo de Não Divulgação (NDA)</h3>

<p>Pelo presente instrumento, as partes abaixo qualificadas:</p>

<p><strong>PARTE REVELADORA:</strong> {{ razao_social }}, CNPJ/CPF {{ cnpj }},
com sede em {{ endereco_completo }}.</p>

<p><strong>PARTE RECEPTORA:</strong> {{ empresa_nome }}, CNPJ {{ empresa_cnpj }}.</p>

<p>Comprometem-se mutuamente a manter sob sigilo absoluto todas as informações financeiras,
contábeis, bancárias e operacionais compartilhadas em razão da prestação de serviços de
BPO Financeiro, incluindo mas não se limitando a: extratos bancários, fluxo de caixa,
dados de clientes e fornecedores, valores de contratos e quaisquer informações estratégicas.</p>

<p>A violação deste termo sujeitará a parte infratora às penalidades previstas em lei,
incluindo indenização por perdas e danos.</p>

<p>Este termo tem validade por tempo indeterminado, permanecendo válido mesmo após o
encerramento da relação contratual.</p>

<p style="text-align: center; margin-top: 50px;">{{ data_geracao }}</p>

<div style="display: flex; justify-content: space-between; margin-top: 60px;">
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #333; padding-top: 5px;">
PARTE REVELADORA<br>{{ razao_social }}
</div>
</div>
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #333; padding-top: 5px;">
PARTE RECEPTORA<br>{{ empresa_nome }}
</div>
</div>
</div>
</div>""",
    },
    {
        "name": "Autorização de Acesso Bancário",
        "category": "termo",
        "description": "Autorização para acesso ao sistema bancário do cliente",
        "html_content": """<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; color: #1a1a1a;">AUTORIZAÇÃO DE ACESSO AO SISTEMA BANCÁRIO</h1>

<p>Pelo presente instrumento, a empresa {{ razao_social }}, inscrita no CNPJ/CPF {{ cnpj }},
com sede em {{ endereco_completo }}, representada por seu(sua) responsável legal,
<strong>AUTORIZA</strong> a empresa {{ empresa_nome }}, CNPJ {{ empresa_cnpj }},
a acessar seus sistemas bancários exclusivamente para fins de:</p>

<ul>
<li>Consulta de extratos e saldos bancários</li>
<li>Conciliação bancária</li>
<li>Registro de pagamentos previamente autorizados</li>
<li>Emissão de boletos bancários</li>
<li>Geração de relatórios financeiros</li>
</ul>

<p>Esta autorização poderá ser revogada a qualquer tempo, mediante comunicação formal por escrito.</p>

<p style="text-align: center; margin-top: 50px;">{{ data_geracao }}</p>

<div style="text-align: center; margin-top: 60px; border-top: 1px solid #333; padding-top: 5px; width: 50%; margin-left: auto; margin-right: auto;">
{{ razao_social }}<br>AUTORIZANTE
</div>
</div>""",
    },
    {
        "name": "Aditivo Contratual",
        "category": "termo",
        "description": "Aditivo para alteração de cláusulas contratuais",
        "html_content": """<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; color: #1a1a1a;">ADITIVO CONTRATUAL</h1>

<p>Pelo presente instrumento, as partes:</p>

<p><strong>CONTRATADA:</strong> {{ empresa_nome }}, CNPJ {{ empresa_cnpj }}.</p>
<p><strong>CONTRATANTE:</strong> {{ razao_social }}, CNPJ/CPF {{ cnpj }},
com sede em {{ endereco_completo }}.</p>

<p>Resolvem, de comum acordo, alterar as seguintes cláusulas do contrato de prestação de
serviços firmado em {{ data_inicio_contrato }}:</p>

<p><em>[Descrever as alterações aqui]</em></p>

<p>As demais cláusulas permanecem inalteradas.</p>

<p style="text-align: center; margin-top: 50px;">{{ data_geracao }}</p>

<div style="display: flex; justify-content: space-between; margin-top: 60px;">
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #333; padding-top: 5px;">
{{ empresa_nome }}<br>CONTRATADA
</div>
</div>
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #333; padding-top: 5px;">
{{ razao_social }}<br>CONTRATANTE
</div>
</div>
</div>
</div>""",
    },
    {
        "name": "Termo LGPD — Tratamento de Dados",
        "category": "termo",
        "description": "Termo de consentimento para tratamento de dados pessoais (LGPD)",
        "html_content": """<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
<h1 style="text-align: center; color: #1a1a1a;">TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS</h1>
<h3 style="text-align: center; color: #666;">Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</h3>

<p>Pelo presente instrumento, {{ razao_social }}, inscrita no CNPJ/CPF {{ cnpj }},
com sede em {{ endereco_completo }}, na qualidade de <strong>CONTROLADORA</strong> dos dados,
<strong>AUTORIZA</strong> a empresa {{ empresa_nome }}, CNPJ {{ empresa_cnpj }},
na qualidade de <strong>OPERADORA</strong>, a realizar o tratamento de dados pessoais
e financeiros necessários à prestação dos serviços de BPO Financeiro.</p>

<p>Os dados tratados incluem: informações cadastrais, dados bancários, registros financeiros,
dados de colaboradores e demais informações necessárias à execução dos serviços contratados.</p>

<p>A OPERADORA compromete-se a:</p>
<ul>
<li>Tratar os dados exclusivamente para a finalidade contratada</li>
<li>Implementar medidas de segurança adequadas</li>
<li>Não compartilhar dados com terceiros sem autorização</li>
<li>Eliminar os dados ao término da relação contratual, quando solicitado</li>
</ul>

<p style="text-align: center; margin-top: 50px;">{{ data_geracao }}</p>

<div style="display: flex; justify-content: space-between; margin-top: 60px;">
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #333; padding-top: 5px;">
CONTROLADORA<br>{{ razao_social }}
</div>
</div>
<div style="text-align: center; width: 45%;">
<div style="border-top: 1px solid #333; padding-top: 5px;">
OPERADORA<br>{{ empresa_nome }}
</div>
</div>
</div>
</div>""",
    },
]


class PdfService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ensure_default_templates(self) -> None:
        """Create default templates if they don't exist."""
        result = await self.db.execute(
            select(func.count()).select_from(DocumentTemplate)
        )
        count = result.scalar()
        if count and count > 0:
            return

        for tpl in DEFAULT_TEMPLATES:
            template = DocumentTemplate(
                name=tpl["name"],
                category=tpl["category"],
                description=tpl["description"],
                html_content=tpl["html_content"],
            )
            self.db.add(template)
        await self.db.flush()

    async def list_templates(self, category: str | None = None) -> list[dict]:
        """List all document templates."""
        await self.ensure_default_templates()

        query = select(DocumentTemplate).order_by(
            DocumentTemplate.category, DocumentTemplate.name
        )
        if category:
            query = query.where(DocumentTemplate.category == category)

        result = await self.db.execute(query)
        templates = result.scalars().all()

        return [
            {
                "id": str(t.id),
                "name": t.name,
                "category": t.category,
                "description": t.description,
                "version": t.version,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in templates
        ]

    async def get_template(self, template_id: UUID) -> DocumentTemplate:
        """Get a template by ID."""
        result = await self.db.execute(
            select(DocumentTemplate).where(DocumentTemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        if not template:
            raise NotFoundException("Template não encontrado")
        return template

    def _build_client_variables(self, client: Client) -> dict:
        """Build template variables from a client."""
        address_parts = []
        if client.address_street:
            address_parts.append(client.address_street)
        if client.address_number:
            address_parts.append(client.address_number)
        if client.address_complement:
            address_parts.append(client.address_complement)
        if client.address_neighborhood:
            address_parts.append(client.address_neighborhood)
        if client.address_city:
            address_parts.append(client.address_city)
        if client.address_state:
            address_parts.append(f"- {client.address_state}")
        if client.address_zip:
            address_parts.append(f"CEP {client.address_zip}")

        fee = ""
        if client.monthly_fee:
            fee = f"R$ {float(client.monthly_fee):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

        return {
            "razao_social": client.company_name or "",
            "nome_fantasia": client.trade_name or "",
            "cnpj": client.document_number or "",
            "endereco_completo": ", ".join(address_parts) if address_parts else "Não informado",
            "email": client.email or "",
            "telefone": client.phone or "",
            "regime_tributario": client.tax_regime or "Não informado",
            "valor_mensalidade": fee or "A definir",
            "data_inicio_contrato": (
                client.contract_start_date.strftime("%d/%m/%Y")
                if client.contract_start_date
                else "A definir"
            ),
            "data_fim_contrato": (
                client.contract_end_date.strftime("%d/%m/%Y")
                if client.contract_end_date
                else "Indeterminado"
            ),
            "plano_contratado": client.contracted_plan or "Não informado",
            "data_geracao": datetime.now().strftime("%d de %B de %Y").replace(
                "January", "Janeiro"
            ).replace("February", "Fevereiro").replace("March", "Março").replace(
                "April", "Abril"
            ).replace("May", "Maio").replace("June", "Junho").replace(
                "July", "Julho"
            ).replace("August", "Agosto").replace("September", "Setembro").replace(
                "October", "Outubro"
            ).replace("November", "Novembro").replace("December", "Dezembro"),
            "empresa_nome": "A Tática Gestão Financeira",
            "empresa_cnpj": "00.000.000/0001-00",
            "numero_contrato": f"CT-{datetime.now().strftime('%Y%m')}-{client.document_number[-4:] if client.document_number else '0000'}",
        }

    async def preview_document(
        self, template_id: UUID, client_id: UUID
    ) -> dict:
        """Render template with client data and return HTML preview."""
        template = await self.get_template(template_id)
        client = await self.db.get(Client, client_id)
        if not client:
            raise NotFoundException("Cliente não encontrado")

        variables = self._build_client_variables(client)
        jinja_tpl = Template(template.html_content)
        rendered_html = jinja_tpl.render(**variables)

        return {
            "template_name": template.name,
            "client_name": client.company_name,
            "html": rendered_html,
            "variables": variables,
        }

    async def generate_pdf(
        self, template_id: UUID, client_id: UUID, user_id: UUID
    ) -> dict:
        """Generate a PDF from a template + client data and save it."""
        template = await self.get_template(template_id)
        client = await self.db.get(Client, client_id)
        if not client:
            raise NotFoundException("Cliente não encontrado")

        variables = self._build_client_variables(client)
        jinja_tpl = Template(template.html_content)
        rendered_html = jinja_tpl.render(**variables)

        # Wrap in full HTML document
        full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body {{ font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.6; }}
    h1 {{ color: #1a1a1a; }}
    h3 {{ color: #333; margin-top: 25px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    td, th {{ padding: 8px; text-align: left; }}
</style>
</head>
<body>{rendered_html}</body>
</html>"""

        # Determine version
        existing_count = await self.db.execute(
            select(func.count())
            .select_from(GeneratedDocument)
            .where(
                GeneratedDocument.template_id == template_id,
                GeneratedDocument.client_id == client_id,
            )
        )
        version = (existing_count.scalar() or 0) + 1

        # Save HTML file (PDF conversion can use browser print or wkhtmltopdf)
        safe_name = (client.company_name or "cliente").replace("/", "-").replace("\\", "-")
        filename = f"{template.name} - {safe_name} - v{version}.html"

        upload_dir = settings.STORAGE_LOCAL_PATH
        os.makedirs(upload_dir, exist_ok=True)

        import uuid as uuid_mod
        stored_name = f"{uuid_mod.uuid4()}.html"
        file_path = os.path.join(upload_dir, stored_name)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(full_html)

        file_url = f"/uploads/{stored_name}"

        # Save record
        generated = GeneratedDocument(
            template_id=template_id,
            client_id=client_id,
            name=filename,
            file_url=file_url,
            version=version,
            generated_by=user_id,
        )
        self.db.add(generated)
        await self.db.flush()

        return {
            "id": str(generated.id),
            "name": filename,
            "file_url": file_url,
            "version": version,
            "html": full_html,
        }

    async def list_generated(
        self, client_id: UUID | None = None, category: str | None = None
    ) -> list[dict]:
        """List generated documents."""
        query = (
            select(GeneratedDocument)
            .join(DocumentTemplate, GeneratedDocument.template_id == DocumentTemplate.id)
            .order_by(GeneratedDocument.created_at.desc())
        )

        if client_id:
            query = query.where(GeneratedDocument.client_id == client_id)
        if category:
            query = query.where(DocumentTemplate.category == category)

        result = await self.db.execute(query)
        docs = result.scalars().all()

        items = []
        for d in docs:
            tpl = await self.db.get(DocumentTemplate, d.template_id)
            items.append({
                "id": str(d.id),
                "name": d.name,
                "template_name": tpl.name if tpl else "",
                "category": tpl.category if tpl else "",
                "file_url": d.file_url,
                "version": d.version,
                "client_id": str(d.client_id),
                "created_at": d.created_at.isoformat() if d.created_at else None,
            })

        return items
