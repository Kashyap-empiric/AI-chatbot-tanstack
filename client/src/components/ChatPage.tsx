import Sidebar from "./sidebar/Sidebar";
import { useParams } from "react-router-dom";
import ChatHome from "./chat/ChatHome";
import ChatWindow from "./chat/ChatWindow";
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
