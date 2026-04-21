import { http } from '../../services/http';
import type { ApiMessage } from './types';

interface SendMessagePayload {
    conversationId: string;
    content: string;
}

interface SendMessageResponse {
    messages: ApiMessage[];
    model_version: string | null;
    model_selected: string;
}

export const fetchMessage = async (conversationId: string): Promise<ApiMessage[]> => {
    const res = await http.get(`/conversation/${conversationId}`);
    return Array.isArray(res.data) ? res.data : [];
}

export const sendMessage = async ( payload: SendMessagePayload ): Promise<SendMessageResponse> => {
    const res = await http.post("/chat", payload);
    return res.data;
}