import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import MessageItem from "./MessageItem";
import { useMessages } from "../../features/chat/queries";

const MessageList = () => {
  const { id: conversationId } = useParams();

  const {
    data: messages = [],
    isLoading,
  } = useMessages(conversationId);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const typingMessage = messages.find(
    (m) => m.role === "model" && m.content === ""
  );

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400">
        Select a conversation
      </div>
    );
  }

  if (isLoading) {
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
          <MessageItem
            key={msg.id}
            message={msg}
            isTyping={msg.id === typingMessage?.id}
          />
        ))}

        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
};

export default MessageList;
