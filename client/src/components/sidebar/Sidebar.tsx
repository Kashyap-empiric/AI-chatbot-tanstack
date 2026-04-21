import { useNavigate } from "react-router-dom";
import ConversationItem from "./ConversationItem";
import { ChevronDown } from "lucide-react";
import {
  useConversations,
  useCreateConversation,
} from "../../features/conversation/queries";
import { UserButton, useUser } from "@clerk/react";

const Sidebar = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const { data: conversations = [], isLoading } = useConversations();
  const { mutateAsync: createConversation } = useCreateConversation();

  const handleNewChat = async () => {
    const newConv = await createConversation();
    navigate(`/app/chat/${newConv.id}`);
  };

  return (
    <div className="w-72 h-screen bg-neutral-950 text-white flex flex-col border-r border-neutral-800 overflow-hidden">
      {/* Top */}
      <div className="p-4 border-b border-neutral-800">
        <button
          onClick={handleNewChat}
          className="w-full bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] transition py-2.5 rounded-lg text-base font-medium"
        >
          + New Chat
        </button>
      </div>

      {/* Section header */}
      <button className="flex items-center gap-2 px-4 pt-4 pb-2 text-base font-semibold text-neutral-400">
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
      <div className="border-t border-neutral-800 p-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <UserButton />

          <div className="text-base text-neutral-400 truncate">
            {user?.firstName || user?.primaryEmailAddress?.emailAddress}
          </div>
        </div>

        <div className="flex items-center gap-1 text-base text-green-400 whitespace-nowrap">
          <span className="w-4 h-4 rounded-full bg-green-500" />
          signed in
        </div>
      </div>
    </div>
  );
};


export default Sidebar;
