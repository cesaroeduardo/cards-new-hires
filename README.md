# Cards New Hires

Aplicação **Vue 3** para uma dinâmica de boas-vindas: um facilitador cria uma **sessão**, compartilha o link e os participantes veem as **cartas** (conteúdo vindo do CMS), podendo virá-las em tempo real. O estado da sessão (cartas viradas, quem entrou, cursores) fica no **Supabase**; o conteúdo editorial das cartas fica no **Sanity**.

---

## Visão geral da arquitetura

| Camada | Tecnologia | Responsabilidade |
|--------|------------|------------------|
| Frontend | Vue 3, Vue Router, Vite, Tailwind | UI, roteamento `/` e `/session/:sessionCode` |
| Conteúdo (cartas) | **Sanity** | Textos, imagens e número de cada carta (`_type: "card"`) |
| Dados em tempo real / sessões | **Supabase** (Postgres + Realtime) | Sessões, participantes, posição do mouse, JSON de cartas viradas |

**Sanity** não conhece sessões nem usuários: ele só expõe a lista estática de cartas. **Supabase** não armazena o conteúdo do verso da carta; ele só guarda **qual carta está virada** (`flipped_cards`) por sessão, além de metadados da dinâmica.

Fluxo típico:

1. **Home** (`HomeView.vue`): insere uma linha em `sessions` (código único, expiração) e redireciona para `/session/:sessionCode`.
2. **Sessão** (`SessionView.vue`): valida o código em `sessions`, busca as cartas no Sanity via GROQ, sincroniza estado com Realtime nas tabelas `sessions`, `users` e `mouse_positions`.
3. **App** (`App.vue`): ao carregar, chama a RPC `delete_expired_sessions` para limpar sessões antigas.

Para **replicar o projeto em outra conta**, você precisa: (1) um projeto Sanity com o mesmo tipo de documento esperado pelo GROQ; (2) um projeto Supabase com as tabelas, políticas (RLS), Realtime e função SQL descritos abaixo; (3) atualizar IDs/URLs no código ou em variáveis de ambiente.

---

## Pré-requisitos

- Node.js 18+ (recomendado)
- Conta [Sanity](https://www.sanity.io/) e [Supabase](https://supabase.com/)
- Opcional: CLI do Sanity (`npm install -g @sanity/cli`)

---

## Como rodar o frontend (Vue)

Na raiz do repositório:

```bash
npm install
npm run dev
```

O Vite sobe em **http://localhost:3000** (ver `vite.config.js`).

Scripts úteis:

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Desenvolvimento com **Vite** (recomendado) |
| `npm run build` | Build de produção (Vite) |
| `npm run preview` | Preview do build |
| `npm run serve` | Servidor **Vue CLI** (legado; há também `vue.config.js`) |
| `npm run lint` | ESLint |

> **Build / deploy:** o `main.js` exporta a instância do app para integração com deploy na **Azion** (`azion/` na raiz). Ajuste conforme o provedor que você usar.

---

## Como rodar o Sanity Studio

O CMS fica em **`studio-azion-cards-hire/`** (projeto Sanity separado).

```bash
cd studio-azion-cards-hire
npm install
npm run dev
```

- Configure `projectId` e `dataset` em `sanity.config.ts` e `sanity.cli.ts` para **o seu** projeto Sanity.
- Deploy do Studio (hosting Sanity): `npm run deploy` (após `sanity login`).

O schema atual define um único tipo de documento, `card`, em `schemaTypes/cards.ts`:

| Campo | Tipo | Uso no app |
|-------|------|------------|
| `number` | number | Ordem da carta; o GROQ ordena por isso |
| `backTitle` | string | Título no verso |
| `backContent` | text | Texto no verso |
| `backImage` | image (hotspot) | URL resolvida no cliente e passada como string para o componente `Card` |

Se você **mudar nomes de campos ou `_type`**, atualize também a query GROQ em `src/components/SessionView.vue` (`fetchCards`).

### Query esperada pelo frontend

O app executa (equivalente):

```groq
*[_type == "card"] | order(number asc) {
  number,
  backTitle,
  backContent,
  "backImageUrl": backImage.asset->url
}
```

Garanta que existam documentos `card` publicados no dataset configurado em `src/utils/sanity.js` (hoje o cliente aponta para `projectId` + `dataset` fixos; ao forkar, substitua pelos seus).

---

## Supabase: o que o código usa

O cliente está em `src/utils/supabase.js`. **Recomenda-se** trocar URL e `anon key` por variáveis de ambiente (por exemplo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com `import.meta.env` no Vite) e **não commitar chaves**.

### Tabelas

#### `sessions`

| Coluna | Uso no código |
|--------|----------------|
| `id` | UUID; na criação o app gera com `uuid` (`HomeView.vue`) |
| `session_code` | String única; aparece na URL |
| `expires_at` | ISO timestamp; sessão expira ~6h após criação |
| `flipped_cards` | JSON/array no Postgres (`jsonb`): lista `{ cardNumber, isFlipped }` alinhada aos `number` das cartas do Sanity |

Leitura com `.single()` em `SessionView` ao entrar; updates em `flipCard` para sincronizar viradas.

#### `users`

| Coluna | Uso no código |
|--------|----------------|
| `id` | Chave primária (o cliente usa `payload.old.id` no Realtime) |
| `name` | Nome exibido na lista de participantes |
| `session_id` | FK lógica para `sessions.id` |

Insert ao entrar na sessão se o par `(session_id, name)` ainda não existir; lista carregada com `select('*')`.

#### `mouse_positions`

| Coluna | Uso no código |
|--------|----------------|
| `user_name` | Identifica o cursor na UI |
| `session_id` | Filtra por sessão |
| `x`, `y` | Coordenadas do mouse |

O fluxo **apaga** posições anteriores do mesmo usuário na sessão e depois faz **upsert**. É necessário um **índice único** (por exemplo em `(user_name, session_id)`) para o `upsert` funcionar como esperado no PostgREST.

### Realtime

`SessionView.vue` inscreve canais `postgres_changes` em:

- `mouse_positions` (eventos `*`, filtro `session_id`)
- `sessions` (UPDATE, filtro `id`)
- `users` (INSERT e DELETE, filtro `session_id`)

No Supabase: **Database → Replication**, habilite Realtime para essas tabelas (ou use a UI de publicação de tabelas em tempo real).

### Função RPC

- **`delete_expired_sessions`**: chamada sem argumentos em `App.vue`. Deve remover (ou arquivar) sessões com `expires_at < now()` e, em geral, registros relacionados (`users`, `mouse_positions`) para evitar órfãos.

Exemplo de implementação mínima (ajuste nomes de FK conforme seu DDL):

```sql
create or replace function public.delete_expired_sessions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.mouse_positions
  where session_id in (
    select id from public.sessions where expires_at < now()
  );
  delete from public.users
  where session_id in (
    select id from public.sessions where expires_at < now()
  );
  delete from public.sessions
  where expires_at < now();
end;
$$;

grant execute on function public.delete_expired_sessions() to anon, authenticated;
```

> **RLS:** Com a chave `anon`, o app só funciona se as **políticas** permitirem `select`/`insert`/`update`/`delete` necessários (e Realtime respeitar o que as políticas expõem). Para um fork interno você pode começar com políticas permissivas em desenvolvimento e depois restringir. Sem políticas adequadas, o cliente retornará erros ao criar sessão ou ao entrar na sala.

### DDL de referência (esboço)

Use como base no SQL Editor do Supabase; adapte tipos e FKs ao seu padrão:

```sql
create table public.sessions (
  id uuid primary key,
  session_code text not null unique,
  expires_at timestamptz not null,
  flipped_cards jsonb default '[]'::jsonb
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  session_id uuid not null references public.sessions(id) on delete cascade
);

create table public.mouse_positions (
  id uuid primary key default gen_random_uuid(),
  user_name text not null,
  session_id uuid not null references public.sessions(id) on delete cascade,
  x double precision not null,
  y double precision not null,
  unique (user_name, session_id)
);
```

Confirme se o tipo de `users.id` no seu banco bate com o que o Realtime envia (o código Vue compara `payload.old.id`).

---

## Onde ajustar ao forkar o projeto

1. **Sanity:** `studio-azion-cards-hire/sanity.config.ts`, `sanity.cli.ts` e `src/utils/sanity.js` — `projectId`, `dataset`, `apiVersion`.
2. **Supabase:** `src/utils/supabase.js` — URL e anon key (idealmente `.env`).
3. **Schema Sanity:** se renomear campos, alinhar `schemaTypes/cards.ts` e o GROQ em `SessionView.vue`.
4. **Supabase:** recriar tabelas, RLS, Realtime e RPC; testar criação de sessão e entrada na rota `/session/:codigo`.

---

## Estrutura de pastas (resumo)

```
├── src/
│   ├── components/     # HomeView, SessionView, Card
│   ├── router/
│   ├── utils/          # sanity.js, supabase.js
│   └── main.js
├── studio-azion-cards-hire/   # Sanity Studio + schemaTypes
├── azion/              # Config deploy Azion (opcional)
├── index.html          # Entrada Vite
├── vite.config.js
└── package.json
```

---

## Licença e privacidade

O repositório pode conter identificadores de projeto Sanity e chaves Supabase em arquivos de exemplo ou histórico. Em um fork público, **rotacione chaves** no painel do Supabase e use variáveis de ambiente.
