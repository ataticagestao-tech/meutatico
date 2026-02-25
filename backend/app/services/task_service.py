import math
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import BadRequestException, NotFoundException
from app.models.tenant.client import Client
from app.models.tenant.task import Task, TaskTemplate
from app.models.tenant.user import User
from app.schemas.task import TaskCreate, TaskMoveRequest, TaskTemplateCreate, TaskUpdate


class TaskService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_tasks(
        self,
        search: str | None = None,
        status: str | None = None,
        priority: str | None = None,
        assigned_user_id: UUID | None = None,
        client_id: UUID | None = None,
        ticket_id: UUID | None = None,
        category: str | None = None,
        page: int = 1,
        per_page: int = 50,
        sort_by: str = "position",
        sort_order: str = "asc",
    ) -> dict:
        query = select(Task)
        count_query = select(func.count()).select_from(Task)

        if search:
            search_filter = Task.title.ilike(f"%{search}%") | Task.description.ilike(
                f"%{search}%"
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        if status:
            query = query.where(Task.status == status)
            count_query = count_query.where(Task.status == status)

        if priority:
            query = query.where(Task.priority == priority)
            count_query = count_query.where(Task.priority == priority)

        if assigned_user_id:
            query = query.where(Task.assigned_user_id == assigned_user_id)
            count_query = count_query.where(
                Task.assigned_user_id == assigned_user_id
            )

        if client_id:
            query = query.where(Task.client_id == client_id)
            count_query = count_query.where(Task.client_id == client_id)

        if ticket_id:
            query = query.where(Task.ticket_id == ticket_id)
            count_query = count_query.where(Task.ticket_id == ticket_id)

        if category:
            query = query.where(Task.category == category)
            count_query = count_query.where(Task.category == category)

        total = (await self.db.execute(count_query)).scalar()

        # Sorting
        sort_col = getattr(Task, sort_by, Task.position)
        if sort_order == "desc":
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        tasks = result.scalars().all()

        items = []
        for t in tasks:
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
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "position": t.position,
                "priority": t.priority,
                "category": t.category,
                "tags": t.tags or [],
                "client_id": t.client_id,
                "client_name": client_name,
                "ticket_id": t.ticket_id,
                "assigned_user_id": t.assigned_user_id,
                "assigned_user_name": assigned_user_name,
                "due_date": t.due_date,
                "started_at": t.started_at,
                "completed_at": t.completed_at,
                "is_recurring": t.is_recurring,
                "recurrence_rule": t.recurrence_rule,
                "checklist": t.checklist or [],
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

    async def get_task(self, task_id: UUID) -> Task:
        result = await self.db.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()
        if not task:
            raise NotFoundException("Tarefa n\u00e3o encontrada")
        return task

    async def create_task(self, data: TaskCreate, created_by: UUID) -> dict:
        task_data = data.model_dump()
        task_data["created_by"] = created_by

        # Se status \u00e9 in_progress, marca started_at
        if task_data.get("status") == "in_progress":
            task_data["started_at"] = datetime.now(timezone.utc)

        # Se status \u00e9 done, marca completed_at
        if task_data.get("status") == "done":
            task_data["completed_at"] = datetime.now(timezone.utc)

        # Calcula posi\u00e7\u00e3o: coloca no final da coluna
        if task_data.get("position", 0) == 0:
            max_pos_result = await self.db.execute(
                select(func.coalesce(func.max(Task.position), 0)).where(
                    Task.status == task_data["status"]
                )
            )
            task_data["position"] = max_pos_result.scalar() + 1

        task = Task(**task_data)
        self.db.add(task)
        await self.db.flush()

        return await self._task_to_dict(task)

    async def update_task(self, task_id: UUID, data: TaskUpdate) -> dict:
        task = await self.get_task(task_id)
        update_data = data.model_dump(exclude_unset=True)

        # Gerencia timestamps de status
        new_status = update_data.get("status")
        if new_status and new_status != task.status:
            if new_status == "in_progress" and not task.started_at:
                task.started_at = datetime.now(timezone.utc)
            elif new_status == "done":
                task.completed_at = datetime.now(timezone.utc)
                if not task.started_at:
                    task.started_at = datetime.now(timezone.utc)

        for key, value in update_data.items():
            setattr(task, key, value)

        await self.db.flush()
        return await self._task_to_dict(task)

    async def move_task(self, task_id: UUID, data: TaskMoveRequest) -> dict:
        task = await self.get_task(task_id)
        old_status = task.status

        task.status = data.status
        task.position = data.position

        # Gerencia timestamps
        if data.status != old_status:
            if data.status == "in_progress" and not task.started_at:
                task.started_at = datetime.now(timezone.utc)
            elif data.status == "done":
                task.completed_at = datetime.now(timezone.utc)
                if not task.started_at:
                    task.started_at = datetime.now(timezone.utc)

        # Reordena outras tarefas na coluna de destino
        await self.db.execute(
            select(Task).where(
                Task.status == data.status,
                Task.id != task_id,
                Task.position >= data.position,
            )
        )
        other_tasks_result = await self.db.execute(
            select(Task)
            .where(
                Task.status == data.status,
                Task.id != task_id,
                Task.position >= data.position,
            )
            .order_by(Task.position.asc())
        )
        pos = data.position + 1
        for other_task in other_tasks_result.scalars().all():
            other_task.position = pos
            pos += 1

        await self.db.flush()
        return await self._task_to_dict(task)

    async def delete_task(self, task_id: UUID) -> None:
        task = await self.get_task(task_id)
        await self.db.delete(task)
        await self.db.flush()

    # ── Templates ───────────────────────────────────────────────────────

    async def list_templates(
        self,
        is_active: bool | None = None,
    ) -> list[dict]:
        query = select(TaskTemplate).order_by(TaskTemplate.name.asc())

        if is_active is not None:
            query = query.where(TaskTemplate.is_active == is_active)

        result = await self.db.execute(query)
        templates = result.scalars().all()

        return [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "trigger_event": t.trigger_event,
                "tasks_config": t.tasks_config or [],
                "is_active": t.is_active,
                "created_by": t.created_by,
                "created_at": t.created_at,
                "updated_at": t.updated_at,
            }
            for t in templates
        ]

    async def create_template(
        self, data: TaskTemplateCreate, created_by: UUID
    ) -> dict:
        template = TaskTemplate(
            name=data.name,
            description=data.description,
            trigger_event=data.trigger_event,
            tasks_config=data.tasks_config,
            is_active=data.is_active,
            created_by=created_by,
        )
        self.db.add(template)
        await self.db.flush()

        return {
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "trigger_event": template.trigger_event,
            "tasks_config": template.tasks_config or [],
            "is_active": template.is_active,
            "created_by": template.created_by,
            "created_at": template.created_at,
            "updated_at": template.updated_at,
        }

    async def apply_template(
        self, template_id: UUID, client_id: UUID | None, assigned_user_id: UUID | None, created_by: UUID
    ) -> list[dict]:
        """Create tasks from a template."""
        result = await self.db.execute(
            select(TaskTemplate).where(TaskTemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        if not template:
            raise NotFoundException("Template não encontrado")

        created_tasks = []
        now = datetime.now(timezone.utc)
        for i, task_cfg in enumerate(template.tasks_config or []):
            due_date = None
            if task_cfg.get("relative_due_days"):
                from datetime import timedelta
                due_date = now + timedelta(days=task_cfg["relative_due_days"])

            task = Task(
                title=task_cfg.get("title", f"Tarefa {i + 1}"),
                description=task_cfg.get("description"),
                status="todo",
                position=i,
                priority=task_cfg.get("priority", "medium"),
                category=task_cfg.get("category"),
                client_id=client_id,
                assigned_user_id=assigned_user_id,
                due_date=due_date,
                created_by=created_by,
            )
            self.db.add(task)
            await self.db.flush()
            created_tasks.append(await self._task_to_dict(task))

        return created_tasks

    async def seed_default_templates(self, created_by: UUID) -> list[dict]:
        """Create the 7 default task templates if they don't exist."""
        existing = await self.db.execute(select(func.count()).select_from(TaskTemplate))
        if (existing.scalar() or 0) > 0:
            return await self.list_templates()

        defaults = [
            {
                "name": "Lançar Contas a Pagar",
                "description": "Rotina de lançamento das contas a pagar do cliente",
                "trigger_event": "weekly",
                "tasks_config": [
                    {"title": "Coletar notas e boletos", "priority": "high", "category": "Financeiro", "relative_due_days": 1},
                    {"title": "Lançar no sistema financeiro", "priority": "high", "category": "Financeiro", "relative_due_days": 2},
                    {"title": "Conferir lançamentos", "priority": "medium", "category": "Financeiro", "relative_due_days": 3},
                ],
            },
            {
                "name": "Lançar Contas a Receber",
                "description": "Rotina de lançamento das contas a receber",
                "trigger_event": "weekly",
                "tasks_config": [
                    {"title": "Verificar faturamento pendente", "priority": "high", "category": "Financeiro", "relative_due_days": 1},
                    {"title": "Lançar recebimentos no sistema", "priority": "high", "category": "Financeiro", "relative_due_days": 2},
                    {"title": "Baixar pagamentos recebidos", "priority": "medium", "category": "Financeiro", "relative_due_days": 3},
                ],
            },
            {
                "name": "Conciliação Bancária",
                "description": "Conferência e conciliação dos extratos bancários",
                "trigger_event": "weekly",
                "tasks_config": [
                    {"title": "Importar extrato bancário", "priority": "high", "category": "Financeiro", "relative_due_days": 1},
                    {"title": "Conciliar lançamentos", "priority": "high", "category": "Financeiro", "relative_due_days": 2},
                    {"title": "Resolver pendências de conciliação", "priority": "medium", "category": "Financeiro", "relative_due_days": 3},
                ],
            },
            {
                "name": "Emitir Boleto / 2ª Via",
                "description": "Emissão de boletos e segundas vias para clientes",
                "trigger_event": "on_demand",
                "tasks_config": [
                    {"title": "Verificar dados do boleto", "priority": "medium", "category": "Cobrança", "relative_due_days": 1},
                    {"title": "Emitir boleto no sistema", "priority": "high", "category": "Cobrança", "relative_due_days": 1},
                    {"title": "Enviar boleto ao cliente", "priority": "high", "category": "Cobrança", "relative_due_days": 1},
                ],
            },
            {
                "name": "Cobrar Inadimplente",
                "description": "Fluxo de cobrança de clientes inadimplentes",
                "trigger_event": "on_demand",
                "tasks_config": [
                    {"title": "Identificar títulos em atraso", "priority": "high", "category": "Cobrança", "relative_due_days": 1},
                    {"title": "Enviar lembrete de cobrança", "priority": "high", "category": "Cobrança", "relative_due_days": 1},
                    {"title": "Acompanhar retorno do cliente", "priority": "medium", "category": "Cobrança", "relative_due_days": 3},
                    {"title": "Negociar pagamento se necessário", "priority": "medium", "category": "Cobrança", "relative_due_days": 5},
                ],
            },
            {
                "name": "Enviar NF / Comprovante",
                "description": "Envio de notas fiscais e comprovantes de pagamento",
                "trigger_event": "on_demand",
                "tasks_config": [
                    {"title": "Localizar NF/comprovante", "priority": "medium", "category": "Documentos", "relative_due_days": 1},
                    {"title": "Enviar ao cliente por email", "priority": "high", "category": "Documentos", "relative_due_days": 1},
                ],
            },
            {
                "name": "Organizar Documentos do Mês",
                "description": "Organização mensal de documentos contábeis e fiscais",
                "trigger_event": "monthly",
                "tasks_config": [
                    {"title": "Coletar documentos do mês", "priority": "medium", "category": "Documentos", "relative_due_days": 2},
                    {"title": "Classificar e organizar", "priority": "medium", "category": "Documentos", "relative_due_days": 4},
                    {"title": "Armazenar no repositório", "priority": "low", "category": "Documentos", "relative_due_days": 5},
                    {"title": "Notificar responsável", "priority": "low", "category": "Documentos", "relative_due_days": 5},
                ],
            },
        ]

        created = []
        for tmpl in defaults:
            template = TaskTemplate(
                name=tmpl["name"],
                description=tmpl["description"],
                trigger_event=tmpl["trigger_event"],
                tasks_config=tmpl["tasks_config"],
                is_active=True,
                created_by=created_by,
            )
            self.db.add(template)
            await self.db.flush()
            created.append({
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "trigger_event": template.trigger_event,
                "tasks_config": template.tasks_config or [],
                "is_active": template.is_active,
                "created_by": template.created_by,
                "created_at": template.created_at,
                "updated_at": template.updated_at,
            })

        return created

    # ── Helpers ──────────────────────────────────────────────────────────

    async def _task_to_dict(self, task: Task) -> dict:
        client_name = None
        if task.client_id:
            c_result = await self.db.execute(
                select(Client.company_name).where(Client.id == task.client_id)
            )
            client_name = c_result.scalar_one_or_none()

        assigned_user_name = None
        if task.assigned_user_id:
            u_result = await self.db.execute(
                select(User.name).where(User.id == task.assigned_user_id)
            )
            assigned_user_name = u_result.scalar_one_or_none()

        return {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "position": task.position,
            "priority": task.priority,
            "category": task.category,
            "tags": task.tags or [],
            "client_id": task.client_id,
            "client_name": client_name,
            "ticket_id": task.ticket_id,
            "assigned_user_id": task.assigned_user_id,
            "assigned_user_name": assigned_user_name,
            "due_date": task.due_date,
            "started_at": task.started_at,
            "completed_at": task.completed_at,
            "is_recurring": task.is_recurring,
            "recurrence_rule": task.recurrence_rule,
            "checklist": task.checklist or [],
            "created_by": task.created_by,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
        }
