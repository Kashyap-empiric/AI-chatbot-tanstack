import type { Message } from "../types";
import Markdown from "./Markdown.tsx";
import TypingIndicator from "./ui/TypingIndicator.tsx";

const MessageItem = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  const isStreaming = Boolean(message.isStreaming);
  const hasContent = Boolean(message.content?.length);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-screen-lg flex gap-2 md:gap-3 py-2 md:py-3">

        <div
          className={`flex flex-col w-full ${
            isUser ? "items-end" : "items-start"
          }`}
        >
          {isUser ? (
            <div className="
              bg-blue-600 text-white border border-blue-500
              rounded-2xl px-3 md:px-4 py-2 text-sm md:text-base
              whitespace-pre-wrap break-words
              max-w-[90%] md:max-w-[85%]
            ">
              {message.content}
            </div>
          ) : (
            <div className="w-full text-sm md:text-base leading-6 md:leading-7 text-neutral-100 break-words">

              {/* STREAM STATE */}
              {!hasContent && isStreaming && (
                <TypingIndicator />
              )}

              {/* STREAMING RENDER (lightweight) */}
              {isStreaming && hasContent && (
                <div className="whitespace-pre-wrap">
                  {message.content}
                  <span className="ml-1 inline-block animate-pulse text-neutral-300">
                    ▍
                  </span>
                </div>
              )}

              {/* FINAL RENDER (stable DOM, no layout shift) */}
              {!isStreaming && hasContent && (
                <Markdown content={message.content} />
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MessageItem;
