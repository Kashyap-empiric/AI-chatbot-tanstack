import { useNavigate } from "react-router-dom";
import ConversationItem from "./ConversationItem";
import { ChevronDown, X } from "lucide-react";
import {
  useConversations,
  useCreateConversation,
} from "../../features/conversation/queries";
import { UserButton, useUser } from "@clerk/react";

const Sidebar = ({ onClose }: { onClose?: () => void }) => {
  const navigate = useNavigate();
  const { user } = useUser();

  const { data: conversations = [], isLoading } = useConversations();
  const { mutateAsync: createConversation } = useCreateConversation();

  const handleNewChat = async () => {
    const newConv = await createConversation();
    navigate(`/app/chat/${newConv.id}`);
    onClose?.();
  };

  return (
    <div className="w-64 h-dvh bg-neutral-900 text-white flex flex-col md:border-r border-neutral-800">
      <div className="p-4 border-b border-neutral-800 shrink-0 flex items-center">
        {/* New Chat button */}
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

        {/* Close button (mobile only) */}
        <button onClick={onClose} className="ml-2 md:hidden">
          <X className="text-neutral-400 hover:text-white" />
        </button>
      </div>

      {/* Section header */}
      <button className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-semibold text-neutral-400">
        Chat History
        <ChevronDown size={18} />
      </button>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {isLoading ? (
          <div className="p-4 text-neutral-400">Loading...</div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))
        )}
      </div>

      {/* Footer */}
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
