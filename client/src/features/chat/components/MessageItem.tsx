import type { Message } from "../types";
import Markdown from "./Markdown.tsx";
import TypingIndicator from "./ui/TypingIndicator.tsx";

const MessageItem = ({ message }: { message: Message }) => {
    const isUser = message.role === "user";
    const status = message.status;
    const hasContent = Boolean(message.content?.length);

    const isPending = status === "pending";
    const isStreaming = status === "streaming";
    const isAborted = status === "aborted";
    // const isCompleted = status === "completed";

    return (
        <div className="w-full flex justify-center">
            <div className="w-full max-w-screen-lg flex gap-2 md:gap-3 py-2 md:py-3">
                <div
                    className={`flex flex-col w-full ${
                        isUser ? "items-end" : "items-start"
                    }`}
                >
                    {isUser ? (
                        <div className="bg-blue-600 text-white border border-blue-500 rounded-2xl px-3 md:px-4 py-2 text-base whitespace-pre-wrap break-words max-w-[90%] md:max-w-[85%]">
                            {message.content}
                        </div>
                    ) : (
                        <div className="w-full text-sm md:text-base leading-6 md:leading-7 text-neutral-100 break-words">
                            {/* CONTENT RENDERING */}
                            {hasContent && (
                                <div className="relative">
                                    <Markdown content={message.content} />
                                    {isStreaming && (
                                        <span className="inline-block w-1 h-4 bg-neutral-400 animate-pulse ml-1" />
                                    )}
                                </div>
                            )}

                            {/* PENDING / EMPTY STATE */}
                            {isPending && !hasContent && <TypingIndicator />}

                            {/* ABORTED INDICATOR */}
                            {isAborted && (
                                <div
                                    className={`text-neutral-500 italic ${hasContent ? "mt-2 text-sm" : "text-sm"}`}
                                >
                                    Response stopped
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageItem;
