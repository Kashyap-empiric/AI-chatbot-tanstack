import type { Message } from "../../features/chat/types";
import Markdown from "./Markdown";
import TypingIndicator from "./TypingIndicator";

const Avatar = ({ role }: { role: string }) => {
  return (
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 border border-neutral-700 ${
        role === "user"
          ? "bg-blue-600 text-white"
          : "bg-neutral-800 text-neutral-200"
      }`}
    >
      {role === "user" ? "U" : "AI"}
    </div>
  );
};

const MessageItem = ({
  message,
  isTyping,
}: {
  message: Message;
  isTyping: boolean;
}) => {
  const isUser = message.role === "user";

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-screen-lg px-4 flex gap-3 py-3">
        {!isUser && <Avatar role="model" />}

        <div
          className={`flex flex-col w-full ${
            isUser ? "items-end" : "items-start"
          }`}
        >
          {isUser ? (
            <div className="bg-blue-600 text-white border border-blue-500 rounded-2xl px-4 py-2 text-base whitespace-pre-wrap break-words max-w-[85%]">
              {message.content}
            </div>
          ) : (
            <div className="w-full text-base leading-7 text-neutral-100">
              <Markdown content={message.content} />
            </div>
          )}

          {!isUser && isTyping && (
            <TypingIndicator />
          )}
        </div>

        {isUser && <Avatar role="user" />}
      </div>
    </div>
  );
};

export default MessageItem;
