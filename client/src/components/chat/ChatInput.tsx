import { useState } from "react";
import { useSendMessage } from "../../features/chat/queries";
import { useConversationStore } from "../../features/conversation/store";

const ChatInput = () => {
  const [input, setInput] = useState("");

  const { mutateAsync: sendMessage, isPending } = useSendMessage();
  const { activeConversationId } = useConversationStore();

  const handleSend = async () => {
    const trimmed = input.trim();

    if (!trimmed || !activeConversationId) return;

    await sendMessage({
      conversationId: activeConversationId,
      content: trimmed,
    });
    console.log("after send");

    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-neutral-950 w-full max-w-screen-lg">
      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          className="
            flex-1 resize-none rounded-xl
            bg-neutral-900 text-white
            px-4 py-3 text-base
            outline-none
            focus:ring-2 focus:ring-blue-600
            transition
          "
        />

        <button
          onClick={handleSend}
          disabled={isPending || !activeConversationId}
          className="
            px-4 py-3 rounded-xl
            bg-blue-600 hover:bg-blue-500
            disabled:opacity-50
            transition active:scale-[0.97]
            text-base font-medium
          "
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
