# Setup de Webhooks empresa-flow → meutatico.site

Sempre que algo importante acontece no Supabase Financeiro (empresa-flow / ataticagestao.com),
o evento dispara um POST pro meutatico.site, que cria notification pros usuarios da Tatica.

## 1. Backend meutatico (✅ ja feito)

- Endpoint receiver: `POST https://blissful-respect-production.up.railway.app/api/v1/webhooks/empresa-flow/event`
- Health: `GET https://blissful-respect-production.up.railway.app/api/v1/webhooks/empresa-flow/health`

### Variavel de ambiente no Railway

Adicionar no servico **blissful-respect** → **Variables**:

```
EMPRESA_FLOW_WEBHOOK_SECRET = <gerar com: openssl rand -hex 32>
```

Sem essa var, o endpoint retorna 503 (security-by-default).

## 2. Eventos suportados

| Event | Quando dispara | Tipo notification |
|---|---|---|
| `payable.created` | Nova conta a pagar lancada | info |
| `payable.due_soon` | Conta a pagar vence em 3 dias | warning |
| `receivable.created` | Nova conta a receber criada | info |
| `receivable.received` | Recebimento confirmado | success |
| `reconciliation.done` | Conciliacao do mes concluida | success |
| `monthly_report.sent` | Relatorio mensal enviado ao cliente | success |

Payload esperado:
```json
{
  "event": "payable.created",
  "company_id": "<uuid_da_empresa_no_supabase>",
  "data": {
    "valor": 1500.00,
    "credor_nome": "Fornecedor X",
    "vencimento": "2026-05-15"
  },
  "occurred_at": "2026-05-05T12:00:00Z"
}
```

## 3. Setup no Supabase Financeiro

Existem **3 abordagens**, escolha conforme o setup do empresa-flow:

### Opcao A: Database Webhooks (mais simples — Supabase Cloud / self-hosted)

No SQL Editor do Supabase:

```sql
-- 1. Habilitar a extension pg_net (caso nao esteja)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Funcao que dispara o webhook
CREATE OR REPLACE FUNCTION public.notify_meutatico_payable_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://blissful-respect-production.up.railway.app/api/v1/webhooks/empresa-flow/event',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', '<COLAR_AQUI_O_VALOR_DE_EMPRESA_FLOW_WEBHOOK_SECRET>'
    ),
    body := jsonb_build_object(
      'event', 'payable.created',
      'company_id', NEW.company_id,
      'data', jsonb_build_object(
        'valor', NEW.valor,
        'credor_nome', NEW.credor_nome,
        'vencimento', NEW.vencimento
      ),
      'occurred_at', to_char(NEW.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  );
  RETURN NEW;
END;
$$;

-- 3. Trigger que chama a funcao
DROP TRIGGER IF EXISTS trg_notify_meutatico_payable_created ON public.contas_pagar;
CREATE TRIGGER trg_notify_meutatico_payable_created
  AFTER INSERT ON public.contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_meutatico_payable_created();
```

Repetir o pattern para os outros eventos:
- `contas_receber INSERT` → `receivable.created`
- `contas_receber UPDATE` quando `data_recebimento IS NOT NULL` → `receivable.received`
- etc.

### Opcao B: Edge Functions (Supabase Cloud)

Criar uma Edge Function `notify-meutatico` que recebe um body genérico e chama o
endpoint. Disparar via trigger SQL como acima OU diretamente do app empresa-flow.

```typescript
// supabase/functions/notify-meutatico/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const body = await req.json()
  const resp = await fetch(
    'https://blissful-respect-production.up.railway.app/api/v1/webhooks/empresa-flow/event',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': Deno.env.get('EMPRESA_FLOW_WEBHOOK_SECRET')!,
      },
      body: JSON.stringify(body),
    }
  )
  return new Response(await resp.text(), { status: resp.status })
})
```

### Opcao C: Disparar do client (frontend empresa-flow)

Direto no React/Vite do empresa-flow, ao salvar uma conta a pagar:

```typescript
// empresa-flow/src/hooks/useCreatePayable.ts
async function notifyMeutatico(payable) {
  try {
    await fetch('https://blissful-respect-production.up.railway.app/api/v1/webhooks/empresa-flow/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': import.meta.env.VITE_MEUTATICO_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        event: 'payable.created',
        company_id: payable.company_id,
        data: { valor: payable.valor, credor_nome: payable.credor_nome, vencimento: payable.vencimento },
        occurred_at: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.warn('Webhook meutatico falhou (nao bloqueia):', e)
  }
}
```

⚠️ Opcao C expoe o secret no bundle do navegador — cuidado. Prefira A ou B.

## 4. Testar

```bash
curl -X POST https://blissful-respect-production.up.railway.app/api/v1/webhooks/empresa-flow/event \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <SECRET>" \
  -d '{
    "event": "payable.created",
    "company_id": "<uuid_da_empresa_supabase>",
    "data": {"valor": 1500, "credor_nome": "Fornecedor Teste", "vencimento": "2026-05-15"},
    "occurred_at": "2026-05-05T12:00:00Z"
  }'
```

Resposta esperada (cliente vinculado):
```json
{
  "processed": true,
  "notifications_created": 1,
  "client_id": "<uuid>",
  "event": "payable.created"
}
```

Resposta se cliente nao tem `financial_company_id` apontando pra esse company_id:
```json
{ "processed": false, "reason": "company_not_linked", "notifications_created": 0 }
```

## 5. Observacoes

- O endpoint **rejeita silenciosamente** eventos para empresas nao vinculadas a um cliente
  CRM. Use a aba **Financeiro** do detalhe do cliente em `/clients/<id>` pra vincular.
- Se nenhum cliente do meutatico tiver `financial_company_id` setado, **nada acontece**.
- Notifications aparecem no sino do header (`Bell` do Header).
- Cada usuario ativo recebe a notification (ate o sistema ter regra de quem deve ser
  notificado por categoria de evento — futuro).
