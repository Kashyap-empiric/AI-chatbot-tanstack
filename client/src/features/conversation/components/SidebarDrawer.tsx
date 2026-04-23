import Sidebar from "./Sidebar";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SidebarDrawer = ({ open, onClose }: Props) => {
  return (
    <>
      <div
        onClick={onClose}
        className={`
          fixed inset-0 bg-black/60 z-40 transition-opacity
          ${open ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"}
        `}
      />

      <div
        className={`
          fixed top-0 left-0 h-dvh w-64 bg-neutral-900
          z-50 transform transition-transform duration-300
          flex flex-col
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar onClose={onClose} />
      </div>
    </>
  );
};

export default SidebarDrawer;
