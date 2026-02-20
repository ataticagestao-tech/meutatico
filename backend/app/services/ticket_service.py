import math
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.exceptions import BadRequestException, NotFoundException
from app.models.tenant.client import Client
from app.models.tenant.ticket import Ticket, TicketMessage
from app.models.tenant.user import User
from app.schemas.ticket import TicketCreate, TicketMessageCreate, TicketUpdate


class TicketService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_tickets(
        self,
        search: str | None = None,
        status: str | None = None,
        priority: str | None = None,
        type: str | None = None,
        client_id: UUID | None = None,
        assigned_user_id: UUID | None = None,
        created_by: UUID | None = None,
        page: int = 1,
        per_page: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> dict:
        query = select(Ticket)
        count_query = select(func.count()).select_from(Ticket)

        if search:
            search_filter = (
                Ticket.title.ilike(f"%{search}%")
                | Ticket.description.ilike(f"%{search}%")
                | Ticket.requester_name.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        if status:
            query = query.where(Ticket.status == status)
            count_query = count_query.where(Ticket.status == status)

        if priority:
            query = query.where(Ticket.priority == priority)
            count_query = count_query.where(Ticket.priority == priority)

        if type:
            query = query.where(Ticket.type == type)
            count_query = count_query.where(Ticket.type == type)

        if client_id:
            query = query.where(Ticket.client_id == client_id)
            count_query = count_query.where(Ticket.client_id == client_id)

        if assigned_user_id:
            query = query.where(Ticket.assigned_user_id == assigned_user_id)
            count_query = count_query.where(
                Ticket.assigned_user_id == assigned_user_id
            )

        if created_by:
            query = query.where(Ticket.created_by == created_by)
            count_query = count_query.where(Ticket.created_by == created_by)

        total = (await self.db.execute(count_query)).scalar()

        # Sorting
        sort_col = getattr(Ticket, sort_by, Ticket.created_at)
        if sort_order == "desc":
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        tickets = result.scalars().all()

        items = []
        for t in tickets:
            # Resolve nomes relacionados
            client_name = None
            if t.client_id:
                c_result = await self.db.execute(
                    select(Client.company_name).where(Client.id == t.client_id)
                )
                client_name = c_result.scalar_one_or_none()

            assigned_user_name = None
            if t.assigned_user_id:
                u_result = await self.db.execute(
                    select(User.name).where(User.id == t.assigned_user_id)
                )
                assigned_user_name = u_result.scalar_one_or_none()

            items.append({
                "id": t.id,
                "ticket_number": t.ticket_number,
                "title": t.title,
                "description": t.description,
                "type": t.type,
                "priority": t.priority,
                "category": t.category,
                "status": t.status,
                "source": t.source,
                "client_id": t.client_id,
                "client_name": client_name,
                "requester_user_id": t.requester_user_id,
                "requester_name": t.requester_name,
                "assigned_user_id": t.assigned_user_id,
                "assigned_user_name": assigned_user_name,
                "due_date": t.due_date,
                "resolved_at": t.resolved_at,
                "closed_at": t.closed_at,
                "tags": t.tags or [],
                "messages": [],
                "created_by": t.created_by,
                "created_at": t.created_at,
                "updated_at": t.updated_at,
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
        }

    async def get_ticket(self, ticket_id: UUID) -> dict:
        result = await self.db.execute(
            select(Ticket)
            .options(selectinload(Ticket.messages))
            .where(Ticket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        if not ticket:
            raise NotFoundException("Solicita\u00e7\u00e3o n\u00e3o encontrada")

        # Resolve nomes
        client_name = None
        if ticket.client_id:
            c_result = await self.db.execute(
                select(Client.company_name).where(Client.id == ticket.client_id)
            )
            client_name = c_result.scalar_one_or_none()

        assigned_user_name = None
        if ticket.assigned_user_id:
            u_result = await self.db.execute(
                select(User.name).where(User.id == ticket.assigned_user_id)
            )
            assigned_user_name = u_result.scalar_one_or_none()

        # Resolve nomes dos autores nas mensagens
        messages = []
        for msg in ticket.messages:
            author_name = msg.author_name
            if not author_name and msg.author_user_id:
                a_result = await self.db.execute(
                    select(User.name).where(User.id == msg.author_user_id)
                )
                author_name = a_result.scalar_one_or_none()

            messages.append({
                "id": msg.id,
                "ticket_id": msg.ticket_id,
                "author_user_id": msg.author_user_id,
                "author_name": author_name,
                "content": msg.content,
                "is_internal_note": msg.is_internal_note,
                "attachments": msg.attachments or [],
                "created_at": msg.created_at,
            })

        return {
            "id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "description": ticket.description,
            "type": ticket.type,
            "priority": ticket.priority,
            "category": ticket.category,
            "status": ticket.status,
            "source": ticket.source,
            "client_id": ticket.client_id,
            "client_name": client_name,
            "requester_user_id": ticket.requester_user_id,
            "requester_name": ticket.requester_name,
            "assigned_user_id": ticket.assigned_user_id,
            "assigned_user_name": assigned_user_name,
            "due_date": ticket.due_date,
            "resolved_at": ticket.resolved_at,
            "closed_at": ticket.closed_at,
            "tags": ticket.tags or [],
            "messages": messages,
            "created_by": ticket.created_by,
            "created_at": ticket.created_at,
            "updated_at": ticket.updated_at,
        }

    async def create_ticket(
        self,
        data: TicketCreate,
        created_by: UUID,
        requester_user_id: UUID | None = None,
        requester_name: str | None = None,
    ) -> dict:
        ticket_data = data.model_dump()
        ticket_data["created_by"] = created_by
        ticket_data["requester_user_id"] = requester_user_id

        # Define requester_name a partir do user se n\u00e3o informado
        if not requester_name and requester_user_id:
            u_result = await self.db.execute(
                select(User.name).where(User.id == requester_user_id)
            )
            requester_name = u_result.scalar_one_or_none()
        ticket_data["requester_name"] = requester_name

        ticket = Ticket(**ticket_data)
        self.db.add(ticket)
        await self.db.flush()

        return await self.get_ticket(ticket.id)

    async def update_ticket(
        self, ticket_id: UUID, data: TicketUpdate
    ) -> dict:
        result = await self.db.execute(
            select(Ticket).where(Ticket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        if not ticket:
            raise NotFoundException("Solicita\u00e7\u00e3o n\u00e3o encontrada")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(ticket, key, value)

        await self.db.flush()
        return await self.get_ticket(ticket_id)

    async def add_message(
        self,
        ticket_id: UUID,
        data: TicketMessageCreate,
        author_user_id: UUID | None = None,
        author_name: str | None = None,
    ) -> dict:
        # Verifica se o ticket existe
        result = await self.db.execute(
            select(Ticket).where(Ticket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        if not ticket:
            raise NotFoundException("Solicita\u00e7\u00e3o n\u00e3o encontrada")

        if ticket.status in ("closed", "cancelled"):
            raise BadRequestException(
                "N\u00e3o \u00e9 poss\u00edvel adicionar mensagens a uma solicita\u00e7\u00e3o fechada ou cancelada"
            )

        # Resolve nome do autor
        if not author_name and author_user_id:
            u_result = await self.db.execute(
                select(User.name).where(User.id == author_user_id)
            )
            author_name = u_result.scalar_one_or_none()

        message = TicketMessage(
            ticket_id=ticket_id,
            author_user_id=author_user_id,
            author_name=author_name,
            content=data.content,
            is_internal_note=data.is_internal_note,
            attachments=data.attachments,
        )
        self.db.add(message)
        await self.db.flush()

        return {
            "id": message.id,
            "ticket_id": message.ticket_id,
            "author_user_id": message.author_user_id,
            "author_name": message.author_name,
            "content": message.content,
            "is_internal_note": message.is_internal_note,
            "attachments": message.attachments or [],
            "created_at": message.created_at,
        }

    async def resolve_ticket(self, ticket_id: UUID) -> dict:
        result = await self.db.execute(
            select(Ticket).where(Ticket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        if not ticket:
            raise NotFoundException("Solicita\u00e7\u00e3o n\u00e3o encontrada")

        if ticket.status in ("closed", "cancelled"):
            raise BadRequestException(
                "Solicita\u00e7\u00e3o j\u00e1 est\u00e1 fechada ou cancelada"
            )

        ticket.status = "resolved"
        ticket.resolved_at = datetime.now(timezone.utc)
        await self.db.flush()
        return await self.get_ticket(ticket_id)

    async def close_ticket(self, ticket_id: UUID) -> dict:
        result = await self.db.execute(
            select(Ticket).where(Ticket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        if not ticket:
            raise NotFoundException("Solicita\u00e7\u00e3o n\u00e3o encontrada")

        if ticket.status == "cancelled":
            raise BadRequestException("Solicita\u00e7\u00e3o cancelada n\u00e3o pode ser fechada")

        ticket.status = "closed"
        ticket.closed_at = datetime.now(timezone.utc)
        if not ticket.resolved_at:
            ticket.resolved_at = datetime.now(timezone.utc)
        await self.db.flush()
        return await self.get_ticket(ticket_id)
