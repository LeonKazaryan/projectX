# API Endpoints Documentation

This file documents all available API endpoints for the project.

## RAG Endpoints (`/api/rag`)

| Method | Path                     | Description                                                                                              | Request Body/Params                                                                                                       |
| ------ | ------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/store_messages`        | Securely stores message embeddings. Raw text is not stored.                                              | `session_id: str`, `chat_id: int`, `messages: List[Dict]`                                                                 |
| POST   | `/search_similar`        | Searches for semantically similar messages using embeddings. Returns metadata, not raw text.             | `session_id: str`, `chat_id: int`, `query: str`, `limit: Optional[int]`, `score_threshold: Optional[float]`               |
| GET    | `/stats`                 | Gets secure statistics about the RAG system (vector counts, etc.).                                       | None                                                                                                                      |
| POST   | `/clear_chat`            | Securely clears all stored embedding data for a specific chat.                                           | `session_id: str`, `chat_id: int`                                                                                         |
| GET    | `/health`                | Checks the health of the RAG system components (OpenAI, Qdrant).                                         | None                                                                                                                      |
| POST   | `/suggest-enhanced`      | **The main endpoint for AI suggestions.** Generates a suggestion enhanced with RAG context from history. | `session_id: str`, `chat_id: int`, `user_id: int`, `current_message: str`, `use_rag: bool`, `recent_messages: List[Dict]` |
| POST   | `/sync-telegram-history` | Triggers a background task to fetch and store message history for one or all chats into the RAG system.  | `session_id: str`, `chat_id: Optional[int]`, `message_limit: Optional[int]`, `force_resync: Optional[bool]`               |
| GET    | `/sync-telegram-history` | (GET version) Triggers a background sync.                                                                | Query params: `session_id: str`, `chat_id: Optional[int]`, `limit: int`                                                   |

## AI Settings Endpoints (`/api/ai`)

| Method | Path        | Description                                      | Request Body/Params                       |
| ------ | ----------- | ------------------------------------------------ | ----------------------------------------- |
| GET    | `/settings` | Gets the current AI settings for a session.      | Query params: `session_id: str`           |
| POST   | `/settings` | Updates the AI settings for a session.           | `session_id: str`, `settings: AISettings` |
| GET    | `/health`   | Checks the health of the AI system (OpenAI key). | None                                      |

## Auth Endpoints (`/api/auth`)

| Method | Path               | Description                                   | Request Body/Params                                                  |
| ------ | ------------------ | --------------------------------------------- | -------------------------------------------------------------------- |
| POST   | `/send-code`       | Sends a login code to the user's phone.       | `phone: str`                                                         |
| POST   | `/verify-code`     | Verifies the login code.                      | `phone: str`, `code: str`, `phone_code_hash: str`, `session_id: str` |
| POST   | `/verify-password` | Verifies the 2FA password.                    | `password: str`, `session_id: str`                                   |
| POST   | `/restore-session` | Restores a session from a session string.     | `session_string: str`                                                |
| POST   | `/logout`          | Logs the user out and terminates the session. | `session_id: str`                                                    |
| GET    | `/user-info`       | Gets info about the current logged-in user.   | Query params: `session_id: str`                                      |

## Chats Endpoints (`/api/chats`)

| Method | Path       | Description                         | Request Body/Params                                                                                                       |
| ------ | ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/dialogs` | Gets the list of all dialogs/chats. | Query params: `session_id: str`, `limit: int`, `include_archived: bool`, `include_readonly: bool`, `include_groups: bool` |

## Messages Endpoints (`/api/messages`)

| Method | Path       | Description                          | Request Body/Params                                                               |
| ------ | ---------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| GET    | `/history` | Gets the message history for a chat. | Query params: `session_id: str`, `dialog_id: int`, `limit: int`, `offset_id: int` |
| POST   | `/send`    | Sends a message to a chat.           | `dialog_id: int`, `text: str`, `session_id: str`                                  |
