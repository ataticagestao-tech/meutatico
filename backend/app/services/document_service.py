import math
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import BadRequestException, NotFoundException
from app.models.tenant.document import Document, DocumentFolder
from app.schemas.document import DocumentFolderCreate, DocumentFolderUpdate, DocumentUpdate


class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Folders ─────────────────────────────────────────────────────────

    async def list_folders(
        self,
        parent_folder_id: UUID | None = None,
        client_id: UUID | None = None,
        root_only: bool = True,
    ) -> list[dict]:
        query = select(DocumentFolder)

        if client_id:
            query = query.where(DocumentFolder.client_id == client_id)

        if parent_folder_id:
            query = query.where(
                DocumentFolder.parent_folder_id == parent_folder_id
            )
        elif root_only:
            query = query.where(DocumentFolder.parent_folder_id.is_(None))

        query = query.order_by(DocumentFolder.name.asc())
        result = await self.db.execute(query)
        folders = result.scalars().all()

        items = []
        for f in folders:
            # Conta documentos ativos na pasta
            doc_count_result = await self.db.execute(
                select(func.count())
                .select_from(Document)
                .where(
                    Document.folder_id == f.id,
                    Document.status == "active",
                )
            )
            doc_count = doc_count_result.scalar()

            # Conta subpastas
            subfolder_count_result = await self.db.execute(
                select(func.count())
                .select_from(DocumentFolder)
                .where(DocumentFolder.parent_folder_id == f.id)
            )
            subfolder_count = subfolder_count_result.scalar()

            items.append({
                "id": f.id,
                "name": f.name,
                "parent_folder_id": f.parent_folder_id,
                "client_id": f.client_id,
                "color": f.color,
                "created_by": f.created_by,
                "created_at": f.created_at,
                "document_count": doc_count,
                "subfolder_count": subfolder_count,
            })

        return items

    async def create_folder(
        self, data: DocumentFolderCreate, created_by: UUID
    ) -> DocumentFolder:
        # Verifica pasta pai se informada
        if data.parent_folder_id:
            parent = await self.db.execute(
                select(DocumentFolder).where(
                    DocumentFolder.id == data.parent_folder_id
                )
            )
            if not parent.scalar_one_or_none():
                raise BadRequestException("Pasta pai n\u00e3o encontrada")

        folder = DocumentFolder(
            name=data.name,
            parent_folder_id=data.parent_folder_id,
            client_id=data.client_id,
            color=data.color,
            created_by=created_by,
        )
        self.db.add(folder)
        await self.db.flush()
        return folder

    async def update_folder(
        self, folder_id: UUID, data: DocumentFolderUpdate
    ) -> DocumentFolder:
        result = await self.db.execute(
            select(DocumentFolder).where(DocumentFolder.id == folder_id)
        )
        folder = result.scalar_one_or_none()
        if not folder:
            raise NotFoundException("Pasta n\u00e3o encontrada")

        update_data = data.model_dump(exclude_unset=True)

        # Evita loop de refer\u00eancia circular
        if "parent_folder_id" in update_data:
            if update_data["parent_folder_id"] == folder_id:
                raise BadRequestException("Uma pasta n\u00e3o pode ser pai de si mesma")

        for key, value in update_data.items():
            setattr(folder, key, value)

        await self.db.flush()
        return folder

    # ── Documents ───────────────────────────────────────────────────────

    async def list_documents(
        self,
        search: str | None = None,
        folder_id: UUID | None = None,
        client_id: UUID | None = None,
        mime_type: str | None = None,
        status: str | None = None,
        page: int = 1,
        per_page: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> dict:
        # Por padrao, lista apenas documentos ativos
        if not status:
            status = "active"

        query = select(Document)
        count_query = select(func.count()).select_from(Document)

        # Filtro de status
        query = query.where(Document.status == status)
        count_query = count_query.where(Document.status == status)

        if search:
            search_filter = (
                Document.name.ilike(f"%{search}%")
                | Document.original_filename.ilike(f"%{search}%")
                | Document.description.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        if folder_id:
            query = query.where(Document.folder_id == folder_id)
            count_query = count_query.where(Document.folder_id == folder_id)

        if client_id:
            query = query.where(Document.client_id == client_id)
            count_query = count_query.where(Document.client_id == client_id)

        if mime_type:
            query = query.where(Document.mime_type.ilike(f"%{mime_type}%"))
            count_query = count_query.where(
                Document.mime_type.ilike(f"%{mime_type}%")
            )

        total = (await self.db.execute(count_query)).scalar()

        # Sorting
        sort_col = getattr(Document, sort_by, Document.created_at)
        if sort_order == "desc":
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        query = query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(query)
        documents = result.scalars().all()

        items = [
            {
                "id": d.id,
                "folder_id": d.folder_id,
                "client_id": d.client_id,
                "name": d.name,
                "original_filename": d.original_filename,
                "file_url": d.file_url,
                "file_size": d.file_size,
                "mime_type": d.mime_type,
                "description": d.description,
                "tags": d.tags or [],
                "status": d.status,
                "version": d.version,
                "uploaded_by": d.uploaded_by,
                "created_at": d.created_at,
                "updated_at": d.updated_at,
            }
            for d in documents
        ]

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": math.ceil(total / per_page) if per_page > 0 else 0,
        }

    async def upload_document(
        self,
        name: str,
        original_filename: str,
        file_url: str,
        file_size: int,
        mime_type: str,
        uploaded_by: UUID,
        folder_id: UUID | None = None,
        client_id: UUID | None = None,
        description: str | None = None,
        tags: list[str] | None = None,
    ) -> Document:
        """Cria o registro do documento (metadados). O upload do arquivo
        em si deve ser tratado pelo endpoint."""
        # Verifica pasta se informada
        if folder_id:
            f_result = await self.db.execute(
                select(DocumentFolder).where(DocumentFolder.id == folder_id)
            )
            if not f_result.scalar_one_or_none():
                raise BadRequestException("Pasta n\u00e3o encontrada")

        document = Document(
            name=name,
            original_filename=original_filename,
            file_url=file_url,
            file_size=file_size,
            mime_type=mime_type,
            uploaded_by=uploaded_by,
            folder_id=folder_id,
            client_id=client_id,
            description=description,
            tags=tags or [],
        )
        self.db.add(document)
        await self.db.flush()
        return document

    async def get_document(self, document_id: UUID) -> Document:
        result = await self.db.execute(
            select(Document).where(
                Document.id == document_id, Document.status != "deleted"
            )
        )
        document = result.scalar_one_or_none()
        if not document:
            raise NotFoundException("Documento n\u00e3o encontrado")
        return document

    async def update_document(
        self, document_id: UUID, data: DocumentUpdate
    ) -> Document:
        document = await self.get_document(document_id)
        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(document, key, value)

        await self.db.flush()
        return document

    async def delete_document(self, document_id: UUID) -> None:
        """Soft delete: marca o documento como 'deleted'."""
        document = await self.get_document(document_id)
        document.status = "deleted"
        await self.db.flush()
