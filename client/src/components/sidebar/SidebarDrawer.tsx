import { X } from "lucide-react";
import Sidebar from "./Sidebar";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SidebarDrawer = ({ open, onClose }: Props) => {
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`
          fixed inset-0 bg-black/60 z-40 transition-opacity
          ${open ? "opacity-100 visible" : "opacity-0 invisible"}
        `}
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 left-0 h-full w-72 bg-neutral-950
          border-r border-neutral-800 z-50
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Close button */}
        <div className="flex justify-end p-3 border-b border-neutral-800">
          <button onClick={onClose}>
            <X className="text-neutral-400 hover:text-white" />
          </button>
        </div>

        {/* Your existing sidebar */}
        <Sidebar />
      </div>
    </>
  );
};

export default SidebarDrawer;
