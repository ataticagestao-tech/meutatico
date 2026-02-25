import math
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import ConflictException, NotFoundException
from app.models.tenant.client import Client, ClientContact, ClientPartner
from app.models.tenant.user import User
from app.schemas.client import ClientCreate, ClientUpdate
from app.services.logo_service import LogoService


class ClientService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_clients(
        self,
        search: str | None = None,
        status: str | None = None,
        responsible_user_id: UUID | None = None,
        page: int = 1,
        per_page: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> dict:
        query = select(Client).options(
            selectinload(Client.contacts),
            selectinload(Client.partners),
        )
        count_query = select(func.count()).select_from(Client)

        if search:
            search_filter = (
                Client.company_name.ilike(f"%{search}%")
                | Client.trade_name.ilike(f"%{search}%")
                | Client.document_number.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        if status:
            query = query.where(Client.status == status)
            count_query = count_query.where(Client.status == status)

        if responsible_user_id:
            query = query.where(Client.responsible_user_id == responsible_user_id)
            count_query = count_query.where(
                Client.responsible_user_id == responsible_user_id
            )

        total = (await self.db.execute(count_query)).scalar()

        # Sorting
        sort_col = getattr(Client, sort_by, Client.created_at)
        if sort_order == "desc":
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        clients = result.scalars().unique().all()

        items = []
        for c in clients:
            resp_name = None
            if c.responsible_user_id:
                user_r = await self.db.execute(
                    select(User.name).where(User.id == c.responsible_user_id)
                )
                resp_name = user_r.scalar_one_or_none()

            items.append({
                "id": c.id,
                "company_name": c.company_name,
                "trade_name": c.trade_name,
                "document_type": c.document_type,
                "document_number": c.document_number,
                "email": c.email,
                "phone": c.phone,
                "secondary_phone": c.secondary_phone,
                "status": c.status,
                "responsible_user_id": c.responsible_user_id,
                "responsible_user_name": resp_name,
                "financial_company_id": c.financial_company_id,
                "tags": c.tags or [],
                "monthly_fee": float(c.monthly_fee) if c.monthly_fee else None,
                "contracted_plan": c.contracted_plan,
                "tax_regime": c.tax_regime,
                "logo_url": c.logo_url,
                "logo_source": c.logo_source,
                "contacts": c.contacts,
                "partners": c.partners,
                "created_at": c.created_at,
                "updated_at": c.updated_at,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
        }

    async def get_client(self, client_id: UUID) -> Client:
        result = await self.db.execute(
            select(Client)
            .options(
                selectinload(Client.contacts),
                selectinload(Client.partners),
            )
            .where(Client.id == client_id)
        )
        client = result.scalar_one_or_none()
        if not client:
            raise NotFoundException("Cliente não encontrado")
        return client

    async def check_document_exists(
        self, document_number: str, exclude_id: UUID | None = None
    ) -> Client | None:
        """Check if a client with the given document number already exists."""
        import re
        cleaned = re.sub(r"\D", "", document_number)
        query = select(Client).where(
            Client.document_number == cleaned,
            Client.status != "inactive",
        )
        if exclude_id:
            query = query.where(Client.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_client(self, data: ClientCreate, created_by: str) -> Client:
        import re
        cleaned_doc = re.sub(r"\D", "", data.document_number)

        # Validate duplicate document (active clients only)
        existing = await self.check_document_exists(data.document_number)
        if existing:
            raise ConflictException(
                f"Já existe um cliente cadastrado com este documento: "
                f"{existing.trade_name or existing.company_name}"
            )

        # Remove soft-deleted clients with the same document to avoid UNIQUE constraint violation
        inactive_result = await self.db.execute(
            select(Client).where(
                Client.document_number == cleaned_doc,
                Client.status == "inactive",
            )
        )
        for inactive_client in inactive_result.scalars().all():
            await self.db.delete(inactive_client)
        await self.db.flush()

        client_data = data.model_dump(exclude={"contacts", "partners"})
        client_data["created_by"] = created_by
        client = Client(**client_data)
        self.db.add(client)
        await self.db.flush()

        # Cria contatos
        for contact_data in data.contacts:
            contact = ClientContact(
                client_id=client.id, **contact_data.model_dump()
            )
            self.db.add(contact)

        # Cria sócios
        for partner_data in data.partners:
            partner = ClientPartner(
                client_id=client.id, **partner_data.model_dump()
            )
            self.db.add(partner)

        await self.db.flush()

        # Buscar logo automaticamente pelo email
        if client.email:
            try:
                logo_svc = LogoService()
                logo_url = await logo_svc.fetch_logo_url(client.email)
                if logo_url:
                    client.logo_url = logo_url
                    client.logo_source = "auto"
                    await self.db.flush()
            except Exception:
                pass  # Não bloquear criação se logo falhar

        # Reload com contatos e sócios
        return await self.get_client(client.id)

    async def update_client(
        self, client_id: UUID, data: ClientUpdate, updated_by: str
    ) -> Client:
        client = await self.get_client(client_id)

        # Validate duplicate document if changing
        update_data = data.model_dump(exclude_unset=True)
        if "document_number" in update_data:
            existing = await self.check_document_exists(
                update_data["document_number"], exclude_id=client_id
            )
            if existing:
                raise ConflictException(
                    f"Já existe outro cliente cadastrado com este documento: "
                    f"{existing.trade_name or existing.company_name}"
                )

        for key, value in update_data.items():
            setattr(client, key, value)
        await self.db.flush()
        return await self.get_client(client_id)

    async def soft_delete_client(self, client_id: UUID) -> None:
        client = await self.get_client(client_id)
        client.status = "inactive"
        await self.db.flush()

    # ── Contatos ─────────────────────────────────────

    async def add_contact(self, client_id: UUID, data) -> ClientContact:
        await self.get_client(client_id)  # Verifica existência
        contact = ClientContact(client_id=client_id, **data.model_dump())
        self.db.add(contact)
        await self.db.flush()
        return contact

    async def update_contact(self, client_id: UUID, contact_id: UUID, data) -> ClientContact:
        result = await self.db.execute(
            select(ClientContact).where(
                ClientContact.id == contact_id, ClientContact.client_id == client_id
            )
        )
        contact = result.scalar_one_or_none()
        if not contact:
            raise NotFoundException("Contato não encontrado")
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(contact, key, value)
        await self.db.flush()
        return contact

    async def delete_contact(self, client_id: UUID, contact_id: UUID) -> None:
        result = await self.db.execute(
            select(ClientContact).where(
                ClientContact.id == contact_id, ClientContact.client_id == client_id
            )
        )
        contact = result.scalar_one_or_none()
        if not contact:
            raise NotFoundException("Contato não encontrado")
        await self.db.delete(contact)
        await self.db.flush()

    # ── Sócios (Partners) ───────────────────────────

    async def list_partners(self, client_id: UUID) -> list[ClientPartner]:
        await self.get_client(client_id)  # Verifica existência
        result = await self.db.execute(
            select(ClientPartner)
            .where(ClientPartner.client_id == client_id)
            .order_by(ClientPartner.created_at)
        )
        return list(result.scalars().all())

    async def add_partner(self, client_id: UUID, data) -> ClientPartner:
        await self.get_client(client_id)
        partner = ClientPartner(client_id=client_id, **data.model_dump())
        self.db.add(partner)
        await self.db.flush()
        return partner

    async def update_partner(self, client_id: UUID, partner_id: UUID, data) -> ClientPartner:
        result = await self.db.execute(
            select(ClientPartner).where(
                ClientPartner.id == partner_id, ClientPartner.client_id == client_id
            )
        )
        partner = result.scalar_one_or_none()
        if not partner:
            raise NotFoundException("Sócio não encontrado")
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(partner, key, value)
        await self.db.flush()
        return partner

    async def delete_partner(self, client_id: UUID, partner_id: UUID) -> None:
        result = await self.db.execute(
            select(ClientPartner).where(
                ClientPartner.id == partner_id, ClientPartner.client_id == client_id
            )
        )
        partner = result.scalar_one_or_none()
        if not partner:
            raise NotFoundException("Sócio não encontrado")
        await self.db.delete(partner)
        await self.db.flush()
