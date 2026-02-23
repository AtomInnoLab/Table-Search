# API Reference

## Dynamic Literature Matrix - Backend API

**Base URL**: `http://47.236.40.227:9992/api/v1` (公网) / `http://localhost:9992/api/v1` (本地)

**Protocol**: HTTP + Server-Sent Events (SSE)

**Auto-generated docs**: `http://47.236.40.227:9992/docs` (Swagger UI)

---

## Overview

Backend provides two core capabilities via SSE streaming:

1. **Search** - Search academic papers, receive results and recommended columns via SSE
2. **Extract** - Extract structured information from papers into table cells via SSE

All SSE endpoints use `POST` with JSON body and return `text/event-stream` responses.

---

## Health Check

### `GET /`

Root endpoint returning application info.

**Response**:
```json
{
  "app": "Dynamic Literature Matrix",
  "version": "0.1.0",
  "status": "running",
  "mode": "mock"
}
```

### `GET /health`

Simple health check.

**Response**:
```json
{
  "status": "healthy"
}
```

---

## Search API

### `POST /api/v1/search/stream`

Search papers with SSE streaming. Supports two backends:
- **Mock mode** (`USE_MOCK_SEARCH=true`): Returns predefined paper data with suggested columns
- **Real mode** (`USE_MOCK_SEARCH=false`): Proxies to Wispaper Search API (returns papers + suggested columns)

**Request Body**:
```json
{
  "query": "LLM memory optimization",
  "page": 1,
  "page_size": 20
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `query` | string | required | Search query text |
| `page` | int | `1` | Page number (1-based) |
| `page_size` | int | `20` | Results per page |

**Response**: `text/event-stream`

SSE events are emitted in this order:

#### Event: `session`

Emitted once at the start with the session ID.

```
event: session
data: {"session_id": "550e8400-e29b-41d4-a716-446655440000"}
```

#### Event: `paper`

Emitted once per paper found. Papers arrive incrementally.

```
event: paper
data: {
  "id": "paper_001",
  "title": "Attention Is All You Need",
  "authors": ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"],
  "year": 2017,
  "abstract": "The dominant sequence transduction models are based on...",
  "pdf_url": "https://arxiv.org/pdf/1706.03762.pdf"
}
```

In Mock mode, all fields are populated from predefined data.
In Real mode, fields are populated from Wispaper search results (some may be null).

#### Event: `column`

Emitted for each recommended extraction column (typically 3).

```
event: column
data: {
  "id": "col_auto_0",
  "name": "Model Architecture",
  "prompt": "What is the model architecture?",
  "description": "The basic architecture type of the model"
}
```

Column suggestions in Mock mode are determined by query keywords:

| Keywords | Suggested Columns |
|----------|-------------------|
| memory, VRAM | Optimization method, Memory savings, Hardware |
| model | Architecture, Parameters, Training data |
| attention | Attention mechanism, Time complexity, Speedup |
| (default) | Main method, Evaluation datasets, Metrics |

#### Event: `error`

Emitted when the search backend encounters an error.

```
event: error
data: {"message": "Search timeout"}
```

#### Event: `complete`

Emitted once at the end to signal the stream is finished.

```
event: complete
data: {"total": 10, "query": "LLM memory optimization"}
```

---

### `POST /api/v1/search`

Traditional REST endpoint (non-streaming). Returns all results at once.

**Request Body**: Same as `/search/stream`.

**Response**:
```json
{
  "session_id": "uuid",
  "query": "LLM memory optimization",
  "papers": [ ... ],
  "suggested_columns": [ ... ],
  "total": 10
}
```

> **Note**: This endpoint always uses mock data regardless of `USE_MOCK_SEARCH` setting.

---

## Extraction API

### `POST /api/v1/extract/batch`

Extract information for multiple papers across multiple columns. Used after
initial search to populate the matrix table.

**Request Body**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "paper_ids": ["paper_001", "paper_002", "paper_003"],
  "column_ids": ["col_auto_0", "col_auto_1", "col_auto_2"],
  "column_prompts": {
    "col_auto_0": "What is the model architecture?",
    "col_auto_1": "How many parameters does the model have?",
    "col_auto_2": "What dataset is used for training?"
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `session_id` | string | required | Session from search |
| `paper_ids` | string[] | required | Papers to extract from |
| `column_ids` | string[] | required | Columns to extract |
| `column_prompts` | object | `{}` | Column ID to prompt mapping |

**Response**: `text/event-stream`

#### Event: `cell_update`

Emitted twice per cell: first with `loading` status, then with the result.

**Loading state**:
```
event: cell_update
data: {"paper_id": "paper_001", "column_id": "col_auto_0", "status": "loading", "value": null, "evidence": null}
```

**Completed state**:
```
event: cell_update
data: {
  "paper_id": "paper_001",
  "column_id": "col_auto_0",
  "status": "completed",
  "value": "Multi-Head Self-Attention",
  "evidence": {
    "text": "Evidence text for 'Multi-Head Self-Attention'...",
    "page": 3,
    "bbox": [100.0, 200.0, 400.0, 220.0],
    "confidence": 0.92
  }
}
```

**N/A state** (information not found in paper):
```
event: cell_update
data: {"paper_id": "paper_001", "column_id": "col_auto_2", "status": "na", "value": null, "evidence": null}
```

**Error state** (extraction failed):
```
event: cell_update
data: {"paper_id": "paper_001", "column_id": "col_auto_0", "status": "error", "value": "LLM API key invalid or expired", "evidence": null}
```

#### Cell Status Values

| Status | Meaning |
|--------|---------|
| `loading` | Extraction in progress |
| `completed` | Value successfully extracted |
| `na` | Information not available in the paper |
| `error` | Extraction failed (check `value` for error message) |

#### Event: `complete`

Emitted when all extractions finish.

```
event: complete
data: {"completed": 30, "total": 30}
```

---

### `POST /api/v1/extract/column`

Extract a single column for all papers. Used when the user adds a custom column.

**Request Body**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "column_id": "col_custom_1708234567890",
  "paper_ids": ["paper_001", "paper_002", "paper_003"],
  "column_prompt": "What dataset is used for training?"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `session_id` | string | required | Session from search |
| `column_id` | string | required | The column to extract |
| `paper_ids` | string[] | required | Papers to extract from |
| `column_prompt` | string | `""` | Extraction instruction |

**Response**: Same SSE format as `/extract/batch`.

---

## Data Models

### Paper

```typescript
{
  id: string          // Unique identifier
  title: string       // Paper title
  authors: string[]   // Author names
  year: number        // Publication year
  abstract: string    // Paper abstract
  pdf_url?: string    // Link to PDF
}
```

### ColumnSuggestion

```typescript
{
  id: string          // e.g. "col_auto_0"
  name: string        // Display name
  prompt: string      // Extraction instruction for LLM
  description: string // Why this column matters
}
```

### CellUpdate

```typescript
{
  paper_id: string       // Which paper
  column_id: string      // Which column
  status: string         // "loading" | "completed" | "na" | "error"
  value?: string         // Extracted value (null when loading/na)
  evidence?: {
    text: string         // Source text from paper
    page: number         // Page number
    bbox?: number[]      // Bounding box [x0, y0, x1, y1]
    confidence: number   // Confidence score (0-1)
  }
}
```

---

## Configuration

Backend configuration is managed via environment variables (`.env` file in `backend/`).

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | Environment name |
| `APP_NAME` | `Dynamic Literature Matrix` | Application name |
| `LOG_LEVEL` | `INFO` | Logging level |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `USE_MOCK_SEARCH` | `true` | Use mock data for search |
| `USE_MOCK_EXTRACTION` | `true` | Use mock data for extraction |
| `WISPAPER_API_URL` | `https://gateway.dev.wispaper.ai/api/v1/search/completions` | Wispaper Search API endpoint |
| `WISPAPER_AUTH_TOKEN` | `""` | Wispaper Bearer token (JWT) |
| `MINIMAX_API_KEY` | `""` | MiniMax LLM API key |
| `MINIMAX_BASE_URL` | `https://api.minimax.chat/v1` | MiniMax API base URL |
| `MINIMAX_MODEL` | `MiniMax-M2.5` | Model name for extraction |
| `EXTRACTION_CONCURRENCY` | `5` | Max concurrent LLM calls |

### Switching from Mock to Real APIs

To use real search and extraction:

```bash
# backend/.env
USE_MOCK_SEARCH=false
USE_MOCK_EXTRACTION=false
WISPAPER_AUTH_TOKEN=your-jwt-token
MINIMAX_API_KEY=your-key-here
```

---

## SSE Client Implementation Notes

### Connecting to SSE Endpoints

SSE endpoints use `POST` (not `GET`), so the browser's native `EventSource` API
cannot be used. Use `fetch` with streaming response reading instead:

```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
  },
  body: JSON.stringify(requestBody),
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const text = decoder.decode(value, { stream: true })
  // Parse SSE events from text...
}
```

### SSE Message Format

Each message follows the standard SSE format:

```
event: <event_type>\n
data: <json_string>\n
\n
```

- `event:` line specifies the event type
- `data:` line contains JSON payload
- Empty line (`\n\n`) marks the end of a message

### Recommended Headers for Reverse Proxy

When behind Nginx or similar:

```
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

---

## Error Handling

### HTTP Errors

| Status | Meaning |
|--------|---------|
| `200` | Success (including SSE streams) |
| `422` | Validation error (invalid request body) |
| `500` | Internal server error |

### SSE Error Events

Errors during streaming are delivered as SSE events rather than HTTP status codes:

```
event: error
data: {"message": "Search timeout"}
```

### LLM Extraction Errors

When using real LLM extraction, cells may fail individually:

| Error | Cause |
|-------|-------|
| `LLM API key invalid or expired` | Authentication failure |
| `LLM API rate limit exceeded` | Too many requests |
| `Cannot connect to LLM API` | Network issue |
| `Paper data not available` | Paper not in cache |

---

## Upstream API: Wispaper Search

When `USE_MOCK_SEARCH=false`, the backend proxies search requests to the [Wispaper](https://gateway.dev.wispaper.ai) Search API. This API searches academic papers across multiple sources, verifies relevance, and suggests analysis dimensions.

### Upstream Endpoint

```
POST https://gateway.dev.wispaper.ai/api/v1/search/completions
```

### Request Format

```json
{
  "message": "transformer attention mechanism",
  "stream": false,
  "search_scholar": true,
  "slow_search": true,
  "offset": 0,
  "limit": 20,
  "x-billing": "search"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Search query (maps from our `query` field) |
| `stream` | bool | Always `false` (backend still reads SSE stream via `accept: text/event-stream`) |
| `search_scholar` | bool | Search external scholar databases |
| `slow_search` | bool | Enable deeper, slower search |
| `offset` | int | Pagination offset (`(page - 1) * page_size`) |
| `limit` | int | Results per page |
| `x-billing` | string | Always `"search"` |

### Request Headers

```http
Accept: text/event-stream
Content-Type: application/json
Authorization: Bearer <WISPAPER_AUTH_TOKEN>
Cache-Control: no-cache
```

### Upstream SSE Response

The API returns `data:` lines (no `event:` field). Special markers:

| Marker | Meaning |
|--------|---------|
| `data: [PENDING]:{"uuid":...}` | Pipeline started, skipped |
| `data: [DONE]:{"uuid":...}` | Stream finished |

Each data line contains a JSON object with `event`, `name`, and `data` fields.

### Event Mapping Logic

The backend extracts two types of upstream events:

**1. Papers** — from `verification` + `onAgentEnd`:

```json
{
  "event": "onAgentEnd",
  "name": "verification",
  "data": {
    "metadata": {
      "uuid": "paper-uuid",
      "title": "Attention Is All You Need",
      "year": 2017,
      "authors": "Ashish Vaswani, Noam Shazeer, ...",
      "abstract": "The dominant sequence transduction models...",
      "url": "https://arxiv.org/abs/1706.03762",
      "pdf_url": "https://arxiv.org/pdf/1706.03762.pdf",
      "doi": "10.48550/arXiv.1706.03762",
      "venue": "NeurIPS 2017",
      "citations": 100000,
      "final_score": 0.95
    }
  }
}
```

Each verified paper becomes a `paper` event sent to the frontend. Fields:

| Upstream field | Our field | Notes |
|----------------|-----------|-------|
| `uuid` / `id` | `id` | Paper identifier |
| `title` | `title` | |
| `year` | `year` | Publication year |
| `authors` | `authors` | Comma-separated string → array (max 10) |
| `abstract` | `abstract` | Used as LLM context for extraction |
| `url` | `url` | Paper URL |
| `pdf_url` | `pdf_url` | PDF link |
| `doi` | `doi` | DOI identifier |
| `venue` | `venue` | Publication venue |
| `citations` | `citations` | Citation count |
| `final_score` | `score` | Relevance score |

**2. Suggested columns** — from `search_verify_agent` + `onAgentEnd`:

```json
{
  "event": "onAgentEnd",
  "name": "search_verify_agent",
  "data": {
    "content": {
      "metadata": {
        "criteria": [
          {"name": "Model Architecture", "description": "What is the model architecture?"},
          {"name": "Parameters", "description": "How many parameters does the model have?"},
          {"name": "Training Data", "description": "What dataset is used for training?"}
        ]
      }
    }
  }
}
```

Each criterion becomes a `column` event with `id`, `name`, and `prompt` fields. These are the auto-generated analysis dimensions.

### Wispaper Auth Token

The token is a JWT issued by `https://auth.dev.wispaper.ai/oidc`. It has an expiration time (`exp` claim). When expired, you need to obtain a new token from the Wispaper authentication service.

### Error Handling

| Scenario | Behavior |
|----------|----------|
| HTTP status != 200 | Emits `error` event with status code and first 500 chars of response body |
| `httpx.TimeoutException` | Emits `error` event: `"Search timeout"` (timeout: 120s) |
| Other exceptions | Emits `error` event with exception message |
| All error cases | Followed by `complete` event with `total: 0` or actual paper count |

### curl Example

```bash
curl -X POST 'https://gateway.dev.wispaper.ai/api/v1/search/completions' \
  -H 'accept: text/event-stream' \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <WISPAPER_AUTH_TOKEN>' \
  -H 'cache-control: no-cache' \
  -d '{
    "message": "transformer attention mechanism",
    "stream": false,
    "search_scholar": true,
    "slow_search": true,
    "offset": 0,
    "limit": 20,
    "x-billing": "search"
  }'
```

---

## Upstream API: MiniMax LLM Extraction

When `USE_MOCK_EXTRACTION=false`, the backend calls the [MiniMax](https://www.minimaxi.com/) LLM (OpenAI-compatible API) to extract structured information from paper metadata.

### Connection Details

| Setting | Value |
|---------|-------|
| Base URL | `https://api.minimax.chat/v1` |
| Model | `MiniMax-M2.5` (reasoning model) |
| Client | `openai.AsyncOpenAI` (OpenAI-compatible SDK) |
| Auth | API key via `Authorization: Bearer <MINIMAX_API_KEY>` |

### How It Works

The extraction service uses the OpenAI Python SDK (`openai.AsyncOpenAI`) configured with MiniMax's base URL. Each cell extraction makes one Chat Completions call:

```python
client = AsyncOpenAI(
    api_key="sk-api-...",
    base_url="https://api.minimax.chat/v1",
)

response = await client.chat.completions.create(
    model="MiniMax-M2.5",
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": USER_PROMPT},
    ],
    temperature=0.1,
    max_tokens=512,
)
```

### System Prompt

```text
You are an academic paper analyst. Given a paper's metadata,
extract the requested information.

Rules:
1. Respond ONLY with a single JSON object, nothing else.
2. Do NOT include any explanation, reasoning, or thinking.
3. Format: {"value": "concise answer", "evidence": "quote from abstract"}
4. If not available: {"value": null, "evidence": null}
5. Use your knowledge about well-known papers to supplement the abstract.
```

### User Prompt Template

```text
Paper: {title} ({year})
Authors: {authors}
Abstract: {abstract}

Extract: {column_prompt}
```

- `column_prompt` is the extraction instruction for the column, e.g.:
  - `"What is the model architecture?"`
  - `"How many parameters does the model have?"`
  - `"What dataset is used for training?"`

### Expected Response

```json
{"value": "Multi-Head Self-Attention with 6 layers", "evidence": "We propose a model architecture based solely on attention mechanisms..."}
```

Or when information is not available:

```json
{"value": null, "evidence": null}
```

### Response Post-Processing

MiniMax-M2.5 is a reasoning model that may output `<think>...</think>` blocks before the JSON. The service applies these cleanup steps in order:

1. **Strip `<think>` blocks**: Remove `<think>...</think>` tags and their content via regex
2. **Strip markdown fences**: Remove `` ```json ... ``` `` wrappers if present
3. **Empty check**: If content is empty after stripping (model only produced thinking), return `null`
4. **JSON parse**: Parse the remaining content as JSON
5. **Null check**: If `value` is `null`, return `null` (maps to `"na"` status)

### Concurrency Control

Extraction uses an `asyncio.Semaphore` to limit concurrent LLM calls:

| Setting | Default | Description |
|---------|---------|-------------|
| `EXTRACTION_CONCURRENCY` | `5` | Max parallel LLM API calls |

For a batch of N papers × M columns, all N×M extraction tasks are launched as asyncio tasks, but at most `EXTRACTION_CONCURRENCY` calls run simultaneously. Results stream to the client as they complete (not in fixed order).

### Paper Cache Dependency

Extraction requires paper metadata (title, abstract, authors, year) to build the LLM prompt. This data is stored in an **in-memory cache** (`paper_store`) during search:

```
Search → store_paper(id, data) → Paper Cache → get_paper(id) → Extraction
```

If a paper is not found in cache (e.g., server restarted between search and extraction), the cell returns `status: "error"` with `value: "Paper data not available"`.

### Error Scenarios

| Exception | Mapped Error |
|-----------|-------------|
| `AuthenticationError` | `"LLM API key invalid or expired"` |
| `RateLimitError` | `"LLM API rate limit exceeded, please retry later"` |
| `APIConnectionError` | `"Cannot connect to LLM API"` |
| `json.JSONDecodeError` | Returns `null` (logged as warning) |
| Other exceptions | `"LLM API error: {message}"` |

### curl Example (Direct MiniMax Call)

```bash
curl -X POST 'https://api.minimax.chat/v1/chat/completions' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <MINIMAX_API_KEY>' \
  -d '{
    "model": "MiniMax-M2.5",
    "messages": [
      {
        "role": "system",
        "content": "You are an academic paper analyst. Respond ONLY with JSON: {\"value\": \"answer\", \"evidence\": \"quote\"}"
      },
      {
        "role": "user",
        "content": "Paper: Attention Is All You Need (2017)\nAuthors: Vaswani et al.\nAbstract: The dominant sequence transduction models...\n\nExtract: What is the model architecture?"
      }
    ],
    "temperature": 0.1,
    "max_tokens": 512
  }'
```

---

## Frontend-Backend Interaction Flow

### 1. Initial Search

```
Frontend                          Backend
   │                                │
   ├─POST /search/stream───────────>│
   │                                ├─ Emit: session
   │<───────────────────────────────┤
   │                                ├─ Emit: paper (x N)
   │<───────────────────────────────┤
   │                                ├─ Emit: column (x 3)
   │<───────────────────────────────┤
   │                                ├─ Emit: complete
   │<───────────────────────────────┤
   │                                │
   ├─POST /extract/batch────────────>│  ← auto-triggered for all columns
   │                                ├─ Emit: cell_update (loading)
   │<───────────────────────────────┤
   │                                ├─ Emit: cell_update (completed/na)
   │<───────────────────────────────┤
   │                                ├─ ... (N papers x M columns)
   │                                ├─ Emit: complete
   │<───────────────────────────────┤
```

### 2. Add Custom Column

```
Frontend                          Backend
   │                                │
   ├─POST /extract/column───────────>│
   │                                ├─ Emit: cell_update (x N papers)
   │<───────────────────────────────┤
   │                                ├─ Emit: complete
   │<───────────────────────────────┤
```

### 3. Load More Papers

```
Frontend                          Backend
   │                                │
   ├─POST /search/stream (page=2)──>│
   │                                ├─ Emit: paper (x N new)
   │<───────────────────────────────┤
   │                                ├─ Emit: complete
   │<───────────────────────────────┤
   │                                │
   ├─POST /extract/batch────────────>│  (new papers x existing columns)
   │                                ├─ Emit: cell_update ...
   │<───────────────────────────────┤
```

---

**Last updated**: 2026-02-20
