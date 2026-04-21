import { useState } from "react";
import Sidebar from "./sidebar/Sidebar";
import { useParams } from "react-router-dom";
import ChatHome from "./chat/ChatHome";
import ChatWindow from "./chat/ChatWindow";
import { Menu, X } from "lucide-react";

const ChatPage = () => {
  const { id } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar (unchanged) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 flex items-center px-3 border-b border-neutral-800 bg-neutral-950 z-30">
        <button onClick={() => setSidebarOpen(true)}>
          <Menu className="text-white" />
        </button>
      </div>

      {/* Overlay */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`
          fixed inset-0 bg-black/60 z-40 transition-opacity
          md:hidden
          ${sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"}
        `}
      />

      {/* Offcanvas Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full w-72 bg-neutral-950
          border-r border-neutral-800 z-50
          transform transition-transform duration-300 md:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Close button */}
        <div className="flex justify-end p-3 border-b border-neutral-800">
          <button onClick={() => setSidebarOpen(false)}>
            <X className="text-neutral-400 hover:text-white" />
          </button>
        </div>

        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 mt-12 md:mt-0 overflow-hidden">
        {id ? <ChatWindow /> : <ChatHome />}
      </div>
    </div>
  );
};

export default ChatPage;
