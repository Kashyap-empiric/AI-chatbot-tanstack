import { useEffect } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import { useConversationStore } from "../features/conversation/store";

const ChatPage = () => {
  const { id } = useParams();
  const { activeConversationId, setActiveConversation } =
    useConversationStore();

  // sync URL → store
  useEffect(() => {
    if (id && id !== activeConversationId) {
      setActiveConversation(id);
    }
  }, [id, activeConversationId, setActiveConversation]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <ChatWindow />
    </div>
  );
};

export default ChatPage;
