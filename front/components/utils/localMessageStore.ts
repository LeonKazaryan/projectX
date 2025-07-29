// Локальное хранилище истории сообщений для чатов (IndexedDB)
import { set, get, del, update } from 'idb-keyval';
import type { Message } from '../messaging/types';

const getChatKey = (chatId: string | number) => `chat_history_${chatId}`;

export async function saveMessage(chatId: string | number, message: Message) {
  const key = getChatKey(chatId);
  const messages: Message[] = (await get(key)) || [];
  messages.push(message);
  await set(key, messages);
}

export async function getMessages(chatId: string | number): Promise<Message[]> {
  const key = getChatKey(chatId);
  return (await get(key)) || [];
}

export async function setMessages(chatId: string | number, messages: Message[]) {
  const key = getChatKey(chatId);
  await set(key, messages);
}

export async function clearMessages(chatId: string | number) {
  const key = getChatKey(chatId);
  await del(key);
}

export async function deleteMessage(chatId: string | number, messageId: string | number) {
  const key = getChatKey(chatId);
  const messages: Message[] = (await get(key)) || [];
  const filtered = messages.filter((m) => m.id !== messageId.toString());
  await set(key, filtered);
} 