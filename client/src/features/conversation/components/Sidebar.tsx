import { useState } from "react";
import { UserButton, useUser } from "@clerk/react";
import { ChevronDown, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConversationItem from "./ConversationItem";
import {
  useConversations,
  useCreateConversation,
} from "../services/conversationQueries";

const Sidebar = ({ onClose }: { onClose?: () => void }) => {
  const navigate = useNavigate();
  const { user } = useUser();

  const { data: conversations = [], isLoading } = useConversations();
  const { mutateAsync: createConversation } = useCreateConversation();
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);

  const handleNewChat = async () => {
    const newConv = await createConversation();
    navigate(`/app/chat/${newConv.id}`);
    onClose?.();
  };

  return (
    <div className="w-64 h-dvh bg-neutral-900 text-white flex flex-col md:border-r border-neutral-800">
      <div className="p-4 border-b border-neutral-800 shrink-0 flex items-center">
        <button
          onClick={handleNewChat}
          className="
      w-full bg-neutral-800 hover:bg-neutral-700
      active:scale-[0.98] transition
      py-2.5 rounded-lg text-sm font-medium
    "
        >
          + New Chat
        </button>

        <button onClick={onClose} className="ml-2 md:hidden">
          <X className="text-neutral-400 hover:text-white" />
        </button>
      </div>

      <button
        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
        className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors w-full"
      >
        Chat History
        <ChevronDown
          size={18}
          className={`transition-transform duration-200 ${
            isHistoryExpanded ? "" : "-rotate-90"
          }`}
        />
      </button>

      <div
        className={`flex-1 overflow-y-auto p-2 space-y-1 min-h-0 transition-all duration-300 ${
          isHistoryExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {isHistoryExpanded && (
          <>
            {isLoading ? (
              <div className="p-4 text-neutral-400">Loading...</div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem key={conv.id} conversation={conv} />
              ))
            )}
          </>
        )}
      </div>

      <div className=" p-4 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <UserButton
            appearance={{
              elements: {
                avatarBox: {
                  width: "35px",
                  height: "35px",
                },
              },
            }}
          />
          <div className="text-sm text-neutral-400 truncate">
            {user?.firstName || user?.primaryEmailAddress?.emailAddress}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
