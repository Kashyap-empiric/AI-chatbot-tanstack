import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Conversation } from "../../features/conversation/types";
import {
  useDeleteConversation,
  useUpdateConversationTitle,
} from "../../features/conversation/queries";
import { useParams, useNavigate } from "react-router-dom";

interface Props {
  conversation: Conversation;
}

const ConversationItem = ({ conversation }: Props) => {
  const navigate = useNavigate();
  const { id: activeConversationId } = useParams();

  const { mutateAsync: deleteConversation } = useDeleteConversation();
  const { mutateAsync: updateConversationTitle } = useUpdateConversationTitle();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);

  const isActive = activeConversationId === conversation.id;

  const handleSelect = () => {
    if (!editing) {
      navigate(`/app/chat/${conversation.id}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    const wasActive = isActive;

    await deleteConversation(conversation.id);

    if (wasActive) {
      navigate("/app");
    }
  };

  const handleSave = async () => {
    setEditing(false);

    const trimmed = title.trim();

    if (!trimmed) {
      setTitle(conversation.title);
      return;
    }

    if (trimmed !== conversation.title) {
      await updateConversationTitle({
        id: conversation.id,
        title: trimmed,
      });
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={`
        group flex items-center justify-between gap-2
        px-3 py-2 rounded-lg cursor-pointer
        transition-all duration-200
        min-w-0
        ${isActive ? "bg-neutral-800" : "hover:bg-neutral-900"}
      `}
    >
      {editing ? (
        <input
          className="text-sm bg-transparent outline-none text-neutral-200 w-full min-w-0"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
      ) : (
        <span className="text-sm truncate text-neutral-200 min-w-0 flex-1">
          {conversation.title}
        </span>
      )}

      <div className="flex items-center gap-2 shrink-0">
        {!editing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="
              opacity-0 group-hover:opacity-100
              text-neutral-500 hover:text-neutral-200
              transition
            "
          >
            <Pencil size={16} />
          </button>
        )}

        <button
          onClick={handleDelete}
          className="
            opacity-0 group-hover:opacity-100
            text-neutral-500 hover:text-red-400
            transition
          "
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};


export default ConversationItem;
