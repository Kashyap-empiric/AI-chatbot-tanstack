const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-1 mt-2 text-neutral-400">
      <span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
      <span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.1s]" />
      <span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-neutral-400 rounded-full animate-bounce" />
    </div>
  );
};


export default TypingIndicator;