import { useEffect, useRef } from "react";
import MessageItem from "./MessageItem";
import { useMessages } from "../../features/chat/queries";
import { useConversationStore } from "../../features/conversation/store";

const MessageList = () => {
  const { activeConversationId } = useConversationStore();
  const { data: messages = [], isLoading } = useMessages(activeConversationId);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 flex justify-center w-full bg-[#212121]">
      <div className="max-w-screen-lg space-y-4">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
};

export default MessageList;
