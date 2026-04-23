import { useParams } from "react-router-dom";
import ChatHome from "../features/chat/components/ChatHome";
import ChatWindow from "../features/chat/components/ChatWindow";
import Sidebar from "../features/conversation/components/Sidebar";

const ChatPage = () => {
  const { id } = useParams();

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {id ? <ChatWindow /> : <ChatHome />}
      </div>
    </div>
  );
};

export default ChatPage;
