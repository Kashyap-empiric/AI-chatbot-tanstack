import { useConversationStore } from "../../features/conversation/store";
import ConversationItem from "./ConversationItem";
import { ChevronDown } from "lucide-react";
import {
  useConversations,
  useCreateConversation,
} from "../../features/conversation/queries";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const { activeConversationId, setActiveConversation } =
    useConversationStore();

  const navigate = useNavigate();
  const { data: conversations = [], isLoading } = useConversations();
  const { mutateAsync: createConversation } = useCreateConversation();

  const handleNewChat = async () => {
    const newConv = await createConversation();
    setActiveConversation(newConv.id);
    navigate(`/app/chat/${newConv.id}`);
  };

  return (
    <div className="w-72 h-screen bg-neutral-950 text-white flex flex-col border-r border-neutral-800">
      <div className="p-4 border-b border-neutral-800">
        <button
          onClick={handleNewChat}
          className="w-full bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] transition py-2.5 rounded-lg text-base font-medium"
        >
          + New Chat
        </button>
      </div>

      <button className="flex items-center gap-2 px-4 pt-4 pb-2 text-base font-semibold text-neutral-400">
        Chat History
        <ChevronDown size={18} />
      </button>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="p-4 text-neutral-400">Loading...</div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              onClick={() => {
                setActiveConversation(conv.id);
                navigate(`/app/chat/${conv.id}`);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};


export default Sidebar;
