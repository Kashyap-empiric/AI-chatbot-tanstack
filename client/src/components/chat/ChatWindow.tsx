import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import ChatHome from "./ChatHome";
import { useParams } from "react-router-dom";

const ChatWindow = () => {
  const { id } = useParams();

  if (!id) {
    return <ChatHome />;
  }

  return (
    <div className="flex flex-col flex-1 bg-[#212121] text-white">
      <MessageList />
      <ChatInput />
    </div>
  );
};

export default ChatWindow;
