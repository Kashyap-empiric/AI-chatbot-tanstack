import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useChatStore } from "../../../app/store/chatStore";
import MessageItem from "./MessageItem";
import { useMessages } from "../services/chatQueries";

const MessageList = () => {
  const { id: conversationId } = useParams();

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hydratedConversationRef = useRef<string | null>(null);

  const messages = useChatStore((state) => state.messages);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const isStreaming = useChatStore((state) => state.isStreaming);

  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const setMessages = useChatStore((state) => state.setMessages);

  const { data: fetchedMessages = [], isLoading } = useMessages(conversationId);

  /**
   * Set active conversation ONLY
   */
  useEffect(() => {
    hydratedConversationRef.current = null;
    setActiveConversation(conversationId ?? null);
  }, [conversationId, setActiveConversation]);

  /**
   * Hydration effect (FIXED: removed isStreaming dependency)
   */
  useEffect(() => {
    if (
      !conversationId ||
      isLoading ||
      activeConversationId !== conversationId ||
      hydratedConversationRef.current === conversationId
    ) {
      return;
    }

    setMessages(fetchedMessages);
    hydratedConversationRef.current = conversationId;
  }, [
    activeConversationId,
    conversationId,
    fetchedMessages,
    isLoading,
    setMessages,
  ]);

  /**
   * Scroll management (frame-safe behavior)
   */
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: isStreaming ? "auto" : "smooth",
      });
    });

    return () => cancelAnimationFrame(id);
  }, [messages, isStreaming]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400">
        Select a conversation
      </div>
    );
  }

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex justify-center w-full bg-[#212121]">
      <div className="max-w-4xl w-full px-4 md:px-6 space-y-4">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
};

export default MessageList;
