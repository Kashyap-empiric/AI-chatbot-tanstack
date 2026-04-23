import { useParams } from "react-router-dom";
import { Menu } from "lucide-react";
import { useState } from "react";
import SidebarDrawer from "../../conversation/components/SidebarDrawer";
import { useConversations } from "../../conversation/services/conversationQueries";
import ChatHome from "./ChatHome.tsx";
import ChatInput from "./ChatInput";
import MessageList from "./MessageList";

const ChatWindow = () => {
    const { id } = useParams();
    const { data: conversations = [] } = useConversations();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const activeConversation = conversations.find((c) => c.id === id);

    if (!id) return <ChatHome />;

    return (
        <div className="flex flex-col h-dvh bg-[#212121] text-white relative">
            {/* Header */}
            <div className="sticky top-0 z-30">
                <div
                    className="
            flex items-center justify-between
            px-3 md:px-6 h-16
            bg-[#212121]
          "
                >
                    {/* Left */}
                    <div className="flex items-center gap-2">
                        <button
                            className="md:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="text-white ml-2" />
                        </button>

                        <span className="hidden md:block text-base font-medium text-neutral-100">
                            AI chatbot
                        </span>
                    </div>

                    {/* Center */}
                    <div className="hidden md:block absolute left-1/2 -translate-x-1/2 text-base text-neutral-100 truncate max-w-[60%]">
                        {activeConversation?.title || "New Converstaion"}
                    </div>
                </div>
            </div>

            {/* Sidebar drawer (mobile) */}
            <SidebarDrawer
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Messages */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                <MessageList />
            </div>

            {/* Input */}
            <ChatInput />
        </div>
    );
};

export default ChatWindow;
