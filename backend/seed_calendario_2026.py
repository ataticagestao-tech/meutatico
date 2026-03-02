"""
Script para inserir todas as datas relevantes de 2026 no calendário do sistema.
Categorias: feriado_nacional, comemorativa, comercial, saude
"""
import sqlite3
import uuid
from datetime import datetime, timezone

DB_PATH = "tatica_gestap.db"
ADMIN_ID = "1d5decc1-067d-4045-b4ac-5996db63a27f"

DATAS_2026 = [
    # ========== JANEIRO ==========
    {
        "data": "2026-01-01",
        "titulo": "Ano Novo",
        "categoria": "feriado_nacional",
        "descricao": "Confraternizacao Universal. Inicio do ano fiscal e comercial.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Enviar mensagem de boas-vindas ao novo ano com dicas de planejamento financeiro para o cliente."
    },
    {
        "data": "2026-01-08",
        "titulo": "Dia Nacional de Combate ao Cancer",
        "categoria": "saude",
        "descricao": "Data de conscientizacao sobre prevencao e combate ao cancer no Brasil.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Publicar conteudo sobre prevencao e check-ups regulares nas redes da clinica."
    },
    {
        "data": "2026-01-27",
        "titulo": "Dia Nacional de Combate a Hanseniase",
        "categoria": "saude",
        "descricao": "Data de conscientizacao sobre hanseniase e importancia do diagnostico precoce.",
        "relevancia_marketing": "baixa",
        "sugestao_acao": "Compartilhar informacoes sobre sintomas e tratamento da hanseniase."
    },
    {
        "data": "2026-01-31",
        "titulo": "Fechamento Fiscal Janeiro / IRPJ",
        "categoria": "comercial",
        "descricao": "Prazo para fechamento fiscal de janeiro e obrigacoes relacionadas ao IRPJ.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Lembrar clientes sobre prazos fiscais e oferecer suporte no fechamento mensal."
    },

    # ========== FEVEREIRO ==========
    {
        "data": "2026-02-04",
        "titulo": "Dia Mundial contra o Cancer",
        "categoria": "saude",
        "descricao": "Data internacional de conscientizacao sobre prevencao e tratamento do cancer.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Campanha nas redes sociais sobre importancia de exames preventivos."
    },
    {
        "data": "2026-02-16",
        "titulo": "Carnaval - Segunda-feira",
        "categoria": "feriado_nacional",
        "descricao": "Feriado de Carnaval. Ponto facultativo em muitas empresas.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Informar clientes sobre prazos fiscais que possam cair no periodo de Carnaval."
    },
    {
        "data": "2026-02-17",
        "titulo": "Carnaval - Terca-feira",
        "categoria": "feriado_nacional",
        "descricao": "Terca-feira de Carnaval. Feriado nacional.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Garantir que todas as obrigacoes pre-Carnaval estejam em dia."
    },
    {
        "data": "2026-02-18",
        "titulo": "Quarta-feira de Cinzas",
        "categoria": "feriado_nacional",
        "descricao": "Quarta-feira de Cinzas. Ponto facultativo ate 12h em muitas empresas.",
        "relevancia_marketing": "baixa",
        "sugestao_acao": "Retomar atividades normais e verificar pendencias acumuladas."
    },

    # ========== MARCO ==========
    {
        "data": "2026-03-08",
        "titulo": "Dia Internacional da Mulher",
        "categoria": "comemorativa",
        "descricao": "Data de celebracao e reflexao sobre os direitos e conquistas das mulheres.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Campanha de homenagem e promocoes especiais em clinicas de saude feminina."
    },
    {
        "data": "2026-03-15",
        "titulo": "Dia do Consumidor",
        "categoria": "comercial",
        "descricao": "Uma das maiores datas do varejo brasileiro, com promocoes e campanhas.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Criar promocoes especiais e campanhas de fidelizacao para clientes."
    },
    {
        "data": "2026-03-31",
        "titulo": "Fechamento Q1 / Inicio Declaracao IRPF",
        "categoria": "comercial",
        "descricao": "Fechamento do primeiro trimestre fiscal. Inicio do periodo de declaracao do IR Pessoa Fisica.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Alertar clientes sobre inicio da declaracao IRPF e oferecer suporte contabil."
    },

    # ========== ABRIL ==========
    {
        "data": "2026-04-01",
        "titulo": "Dia da Mentira / Inicio Q2",
        "categoria": "comemorativa",
        "descricao": "Dia da Mentira e inicio do segundo trimestre. Revisao de metas.",
        "relevancia_marketing": "baixa",
        "sugestao_acao": "Criar conteudo descontraido para redes sociais e revisar metas do Q2."
    },
    {
        "data": "2026-04-03",
        "titulo": "Sexta-feira Santa (Paixao de Cristo)",
        "categoria": "feriado_nacional",
        "descricao": "Feriado nacional religioso. Sexta-feira da Paixao.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Enviar mensagem de Pascoa aos clientes e verificar prazos da semana."
    },
    {
        "data": "2026-04-05",
        "titulo": "Pascoa",
        "categoria": "comemorativa",
        "descricao": "Domingo de Pascoa. Data comercial importante.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Campanhas sazonais de Pascoa para clinicas e comercio."
    },
    {
        "data": "2026-04-07",
        "titulo": "Dia Mundial da Saude",
        "categoria": "saude",
        "descricao": "Data da OMS para conscientizacao sobre saude global.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Promover check-ups e campanhas de prevencao nas clinicas parceiras."
    },
    {
        "data": "2026-04-21",
        "titulo": "Tiradentes",
        "categoria": "feriado_nacional",
        "descricao": "Feriado nacional em homenagem a Joaquim Jose da Silva Xavier, o Tiradentes.",
        "relevancia_marketing": "baixa",
        "sugestao_acao": "Verificar obrigacoes fiscais e prazos que possam ser impactados pelo feriado."
    },
    {
        "data": "2026-04-22",
        "titulo": "Dia da Terra",
        "categoria": "comemorativa",
        "descricao": "Dia internacional de conscientizacao ambiental.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Criar conteudo sobre sustentabilidade e saude ambiental."
    },
    {
        "data": "2026-04-30",
        "titulo": "Prazo IRPF",
        "categoria": "comercial",
        "descricao": "Ultimo dia para entrega da declaracao do Imposto de Renda Pessoa Fisica.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Alerta urgente para clientes que ainda nao entregaram a declaracao IRPF."
    },

    # ========== MAIO ==========
    {
        "data": "2026-05-01",
        "titulo": "Dia do Trabalho",
        "categoria": "feriado_nacional",
        "descricao": "Feriado nacional em homenagem aos trabalhadores.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Homenagem aos colaboradores e mensagem motivacional para clientes."
    },
    {
        "data": "2026-05-10",
        "titulo": "Dia das Maes",
        "categoria": "comemorativa",
        "descricao": "Segunda maior data do varejo brasileiro. Alta movimentacao em clinicas de estetica e saude.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Criar campanha de relacionamento para clinicas: promocoes em procedimentos esteticos e check-ups femininos."
    },
    {
        "data": "2026-05-31",
        "titulo": "Dia Mundial sem Tabaco",
        "categoria": "saude",
        "descricao": "Data da OMS para conscientizacao sobre os danos do tabagismo.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Publicar conteudo sobre programas de cessacao do tabagismo nas clinicas."
    },

    # ========== JUNHO ==========
    {
        "data": "2026-06-04",
        "titulo": "Corpus Christi",
        "categoria": "feriado_nacional",
        "descricao": "Feriado nacional religioso. Ponto facultativo em muitas cidades.",
        "relevancia_marketing": "baixa",
        "sugestao_acao": "Verificar prazos e obrigacoes fiscais impactados pelo feriado."
    },
    {
        "data": "2026-06-05",
        "titulo": "Dia Mundial do Meio Ambiente",
        "categoria": "saude",
        "descricao": "Data de conscientizacao sobre saude ambiental e sustentabilidade.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Conteudo sobre impacto ambiental na saude publica."
    },
    {
        "data": "2026-06-12",
        "titulo": "Dia dos Namorados",
        "categoria": "comemorativa",
        "descricao": "Data oficial do Dia dos Namorados no Brasil. Grande movimentacao no comercio.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Campanhas de promocao para casais em clinicas de estetica e bem-estar."
    },
    {
        "data": "2026-06-13",
        "titulo": "Festas Juninas - Santo Antonio",
        "categoria": "comemorativa",
        "descricao": "Inicio das festas juninas tradicionais brasileiras.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Acao tematica junina nas redes sociais e eventos internos."
    },
    {
        "data": "2026-06-14",
        "titulo": "Dia Mundial do Doador de Sangue",
        "categoria": "saude",
        "descricao": "Data para incentivar a doacao de sangue e reconhecer os doadores.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Campanha de incentivo a doacao de sangue nas clinicas parceiras."
    },
    {
        "data": "2026-06-26",
        "titulo": "Dia Internacional contra as Drogas",
        "categoria": "saude",
        "descricao": "Data de conscientizacao sobre prevencao ao uso de drogas.",
        "relevancia_marketing": "baixa",
        "sugestao_acao": "Publicar conteudo educativo sobre saude mental e prevencao."
    },
    {
        "data": "2026-06-30",
        "titulo": "Fechamento Semestral",
        "categoria": "comercial",
        "descricao": "Fechamento do primeiro semestre fiscal. Revisao de metas e resultados.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Preparar relatorios semestrais e agendar reunioes de revisao com clientes."
    },

    # ========== JULHO ==========
    {
        "data": "2026-07-01",
        "titulo": "Inicio do 2o Semestre",
        "categoria": "comercial",
        "descricao": "Inicio do segundo semestre. Planejamento de campanhas do segundo semestre.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Definir estrategias e campanhas para o segundo semestre."
    },
    {
        "data": "2026-07-28",
        "titulo": "Dia Mundial da Hepatite",
        "categoria": "saude",
        "descricao": "Data de conscientizacao sobre hepatites virais e importancia do diagnostico.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Campanha de testagem e prevencao de hepatite nas clinicas."
    },
    {
        "data": "2026-07-31",
        "titulo": "Obrigacoes Fiscais Mensais",
        "categoria": "comercial",
        "descricao": "Prazo para cumprimento de obrigacoes fiscais mensais de julho.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Lembrar clientes sobre prazos fiscais e obrigacoes pendentes."
    },

    # ========== AGOSTO ==========
    {
        "data": "2026-08-01",
        "titulo": "Semana Mundial do Aleitamento Materno",
        "categoria": "saude",
        "descricao": "Semana de conscientizacao sobre importancia do aleitamento materno.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Conteudo sobre saude materno-infantil nas clinicas de pediatria e ginecologia."
    },
    {
        "data": "2026-08-09",
        "titulo": "Dia dos Pais",
        "categoria": "comemorativa",
        "descricao": "Data comemorativa importante para o varejo. Segundo domingo de agosto.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Campanhas de check-up masculino e promocoes em clinicas de saude do homem."
    },
    {
        "data": "2026-08-10",
        "titulo": "Dia do Medico",
        "categoria": "saude",
        "descricao": "Data oficial de homenagem aos medicos no Brasil.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Homenagem especial aos medicos parceiros e clientes das clinicas."
    },
    {
        "data": "2026-08-15",
        "titulo": "Liquidacoes de Inverno",
        "categoria": "comercial",
        "descricao": "Inicio das liquidacoes de inverno no varejo.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Criar promocoes sazonais e campanhas de queima de estoque para clientes."
    },

    # ========== SETEMBRO ==========
    {
        "data": "2026-09-03",
        "titulo": "Setembro Amarelo - Prevencao ao Suicidio",
        "categoria": "saude",
        "descricao": "Inicio do Setembro Amarelo. Campanha de prevencao ao suicidio e saude mental.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Campanha de conscientizacao sobre saude mental nas clinicas e redes sociais."
    },
    {
        "data": "2026-09-07",
        "titulo": "Independencia do Brasil",
        "categoria": "feriado_nacional",
        "descricao": "Feriado nacional. Celebracao da independencia do Brasil.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Conteudo patriotico nas redes e verificar impacto em prazos fiscais."
    },
    {
        "data": "2026-09-10",
        "titulo": "Dia Mundial de Prevencao ao Suicidio",
        "categoria": "saude",
        "descricao": "Data internacional de prevencao ao suicidio.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Intensificar campanha do Setembro Amarelo com acoes de saude mental."
    },
    {
        "data": "2026-09-30",
        "titulo": "Fechamento Q3",
        "categoria": "comercial",
        "descricao": "Fechamento do terceiro trimestre fiscal. Preparacao para o ultimo trimestre.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Relatorios trimestrais e planejamento do Q4 com clientes."
    },

    # ========== OUTUBRO ==========
    {
        "data": "2026-10-01",
        "titulo": "Outubro Rosa - Inicio",
        "categoria": "saude",
        "descricao": "Inicio do Outubro Rosa. Campanha de prevencao ao cancer de mama.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Campanha massiva de mamografia e conscientizacao nas clinicas."
    },
    {
        "data": "2026-10-10",
        "titulo": "Dia Mundial da Saude Mental",
        "categoria": "saude",
        "descricao": "Data de conscientizacao sobre saude mental e bem-estar psicologico.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Promover servicos de psicologia e psiquiatria nas clinicas parceiras."
    },
    {
        "data": "2026-10-12",
        "titulo": "Dia das Criancas / Nossa Senhora Aparecida",
        "categoria": "feriado_nacional",
        "descricao": "Feriado nacional. Dia das Criancas e padroeira do Brasil.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Campanhas pediatricas e promocoes para publico infantil nas clinicas."
    },
    {
        "data": "2026-10-31",
        "titulo": "Halloween / Encerramento Outubro Rosa",
        "categoria": "comemorativa",
        "descricao": "Halloween e encerramento da campanha Outubro Rosa.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Encerrar campanha Outubro Rosa com relatorio de resultados. Acao tematica Halloween."
    },

    # ========== NOVEMBRO ==========
    {
        "data": "2026-11-01",
        "titulo": "Novembro Azul - Inicio",
        "categoria": "saude",
        "descricao": "Inicio do Novembro Azul. Campanha de prevencao ao cancer de prostata.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Campanha de conscientizacao masculina: exames de prostata e check-ups."
    },
    {
        "data": "2026-11-02",
        "titulo": "Finados",
        "categoria": "feriado_nacional",
        "descricao": "Feriado nacional. Dia de Finados.",
        "relevancia_marketing": "baixa",
        "sugestao_acao": "Verificar impacto em prazos fiscais da semana."
    },
    {
        "data": "2026-11-15",
        "titulo": "Proclamacao da Republica",
        "categoria": "feriado_nacional",
        "descricao": "Feriado nacional. Proclamacao da Republica do Brasil.",
        "relevancia_marketing": "baixa",
        "sugestao_acao": "Verificar prazos e obrigacoes impactados pelo feriado."
    },
    {
        "data": "2026-11-20",
        "titulo": "Consciencia Negra",
        "categoria": "feriado_nacional",
        "descricao": "Feriado nacional. Dia da Consciencia Negra e saude da populacao negra.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Conteudo sobre saude da populacao negra e combate ao racismo no setor de saude."
    },
    {
        "data": "2026-11-27",
        "titulo": "Black Friday",
        "categoria": "comercial",
        "descricao": "Maior data de descontos do varejo. Quarta sexta-feira de novembro.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Criar promocoes agressivas e campanhas de Black Friday para todos os clientes."
    },
    {
        "data": "2026-11-30",
        "titulo": "Cyber Monday / Planejamento Fiscal 2027",
        "categoria": "comercial",
        "descricao": "Cyber Monday e inicio do planejamento fiscal para 2027.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Promocoes online pos-Black Friday e iniciar planejamento tributario 2027."
    },

    # ========== DEZEMBRO ==========
    {
        "data": "2026-12-01",
        "titulo": "Dia Mundial de Combate a AIDS / Inicio Compras Natal",
        "categoria": "saude",
        "descricao": "Dia de conscientizacao sobre HIV/AIDS e inicio do periodo de compras natalinas.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Campanha de testagem HIV nas clinicas e inicio das campanhas de Natal."
    },
    {
        "data": "2026-12-03",
        "titulo": "Dia Internacional da Pessoa com Deficiencia",
        "categoria": "saude",
        "descricao": "Data de conscientizacao sobre direitos e inclusao de pessoas com deficiencia.",
        "relevancia_marketing": "media",
        "sugestao_acao": "Conteudo sobre acessibilidade e inclusao nos servicos de saude."
    },
    {
        "data": "2026-12-25",
        "titulo": "Natal",
        "categoria": "feriado_nacional",
        "descricao": "Feriado nacional. Maior data comemorativa e comercial do ano.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Mensagem natalina para clientes e encerramento das campanhas do ano."
    },
    {
        "data": "2026-12-31",
        "titulo": "Reveillon / Fechamento Anual",
        "categoria": "comercial",
        "descricao": "Ultimo dia do ano. Fechamento anual e balanco patrimonial.",
        "relevancia_marketing": "alta",
        "sugestao_acao": "Finalizar balancos, relatorios anuais e planejamento para 2027."
    },
]


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    inserted = 0
    skipped = 0

    for d in DATAS_2026:
        data_str = d["data"]
        titulo = d["titulo"]

        # Check if already exists
        cursor.execute(
            "SELECT id FROM calendar_events WHERE title = ? AND date(start_date) = ?",
            (titulo, data_str)
        )
        if cursor.fetchone():
            print(f"  SKIP: {data_str} - {titulo} (ja existe)")
            skipped += 1
            continue

        event_id = str(uuid.uuid4())
        start_date = f"{data_str}T00:00:00+00:00"
        end_date = f"{data_str}T23:59:59+00:00"

        # Build description with metadata
        desc_parts = [d["descricao"]]
        desc_parts.append(f"\n\nCategoria: {d['categoria']}")
        desc_parts.append(f"Relevancia Marketing: {d['relevancia_marketing']}")
        desc_parts.append(f"Sugestao de Acao: {d['sugestao_acao']}")
        description = "".join(desc_parts)

        # Map categoria to event type (cores no frontend)
        # deadline = Feriado Nacional (VERMELHO)
        # other = Comemorativa/Comercial (ROSA)
        # reminder = Saude (AZUL)
        tipo_map = {
            "feriado_nacional": "deadline",
            "comemorativa": "other",
            "comercial": "other",
            "saude": "reminder"
        }
        event_type = tipo_map.get(d["categoria"], "other")

        cursor.execute("""
            INSERT INTO calendar_events
            (id, title, description, type, start_date, end_date, all_day,
             client_id, assigned_user_id, google_event_id, sync_source,
             location, meet_link, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_id,
            titulo,
            description,
            event_type,
            start_date,
            end_date,
            1,  # all_day = True
            None,  # client_id
            None,  # assigned_user_id
            None,  # google_event_id
            "local",  # sync_source
            None,  # location
            None,  # meet_link
            ADMIN_ID,
            now,
            now,
        ))

        tag_map = {
            "feriado_nacional": "[FERIADO]",
            "comemorativa": "[COMEMORATIVA]",
            "comercial": "[COMERCIAL]",
            "saude": "[SAUDE]"
        }
        tag = tag_map.get(d["categoria"], "[OUTRO]")
        print(f"  {tag} INSERT: {data_str} - {titulo}")
        inserted += 1

    conn.commit()
    conn.close()

    print(f"\n{'='*50}")
    print(f"Resultado: {inserted} inseridos, {skipped} ja existiam")
    print(f"Total de datas 2026: {len(DATAS_2026)}")
    print(f"{'='*50}")


if __name__ == "__main__":
    print("=" * 50)
    print("SEED CALENDARIO 2026 - TATICA GESTAP")
    print("=" * 50)
    main()
