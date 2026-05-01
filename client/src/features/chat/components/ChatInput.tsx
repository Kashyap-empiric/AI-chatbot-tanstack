import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { useParams } from "react-router-dom";
import { useChatStore } from "../../../app/store/chatStore";
import { useStreaming } from "../hooks/useStreaming";
import ModelSelector from "./ui/ModelSelector";

const ChatInput = () => {
    const [input, setInput] = useState("");
    const [model, setModel] = useState("gpt-oss-120b");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { id: conversationId } = useParams();
    const { startStreaming, stopStreaming } = useStreaming();

    const isStreaming = useChatStore((state) => state.isStreaming);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || !conversationId || isStreaming) return;

        setInput("");

        await startStreaming({
            conversationId,
            content: trimmed,
            model,
        });
    };

    const handleStop = () => {
        if (!conversationId) return;
        stopStreaming(conversationId);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    return (
        <div className="w-full bg-[#212121] pt-4 pb-2 px-4">
            <div className="max-w-3xl mx-auto relative">
                <div className="w-full bg-[#2f2f2f] rounded-2xl border border-white/10 shadow-2xl focus-within:border-primary/40 transition-all duration-300">
                    <div className="flex flex-col p-2 sm:p-3">
                        {/* 1. TEXTAREA: Tightened padding and custom scrollbar */}
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message AI Chatbot..."
                            rows={1}
                            className="
                w-full 
                bg-transparent text-white 
                border-none focus:ring-0 
                resize-none outline-none 
                min-h-[40px] max-h-48
                px-2 py-1
                text-sm sm:text-base
                overflow-y-auto
                /* Custom Scrollbar Classes */
                scrollbar-thin scrollbar-thumb-[#424754] scrollbar-track-transparent
                [&::-webkit-scrollbar]:w-1
                [&::-webkit-scrollbar-thumb]:bg-[#424754]
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:hover:bg-[#8c909f]
            "
                        />

                        {/* 2. ACTION ROW: Compacted spacing */}
                        <div className="flex items-center justify-between mt-1 px-1">
                            {/* Left Side: Model Selector */}
                            <div className="flex items-center scale-90 origin-left">
                                <ModelSelector
                                    value={model}
                                    onChange={setModel}
                                />
                            </div>

                            {/* Right Side: Send Button (Slightly smaller for compactness) */}
                            <button
                                onClick={() =>
                                    isStreaming
                                        ? handleStop()
                                        : void handleSend()
                                }
                                disabled={!input.trim() && !isStreaming}
                                className="
                    w-8 h-8 sm:w-9 sm:h-9
                    bg-white text-black rounded-full 
                    flex items-center justify-center 
                    hover:bg-neutral-200 active:scale-95 
                    transition-all shadow-lg 
                    disabled:bg-neutral-600/50 disabled:text-neutral-400
                "
                            >
                                {isStreaming ? (
                                    <Square className="w-4 h-4 fill-current" />
                                ) : (
                                    <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <p className="text-center text-neutral-500 text-xs mt-1">
                    AI can make mistakes. Please double-check important
                    information.
                </p>
            </div>
        </div>
    );
};

export default ChatInput;
