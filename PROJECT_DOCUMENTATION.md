src/
│
├── app/ # App-level setup
│ ├── providers/ # Global providers
│ │ ├── QueryProvider.jsx
│ │ ├── AuthProvider.jsx
│ │ └── ThemeProvider.jsx
│ │
│ ├── router/ # Routing config
│ │ └── AppRouter.jsx
│ │
│ └── store/ # Zustand stores (global)
│ ├── chatStore.js
│ ├── uiStore.js
│ └── index.js
│
├── features/ # Feature-based modules (important)
│ │
│ ├── chat/
│ │ ├── components/ # Chat-specific UI
│ │ │ ├── ChatWindow.jsx
│ │ │ ├── MessageList.jsx
│ │ │ ├── MessageItem.jsx
│ │ │ ├── ChatInput.jsx
│ │ │ └── TypingIndicator.jsx
│ │ │
│ │ ├── hooks/ # Chat logic hooks
│ │ │ ├── useChat.js
│ │ │ ├── useStreaming.js
│ │ │ └── useConversation.js
│ │ │
│ │ ├── services/ # API calls (TanStack Query)
│ │ │ ├── chatApi.js
│ │ │ └── chatQueries.js
│ │ │
│ │ ├── utils/ # Helpers (formatting, parsing)
│ │ │ ├── formatMessage.js
│ │ │ └── streamParser.js
│ │ │
│ │ └── types/ # (optional) types/interfaces
│ │ └── chat.types.js
│ │
│ ├── conversations/
│ │ ├── components/
│ │ │ ├── Sidebar.jsx
│ │ │ ├── ConversationItem.jsx
│ │ │ └── NewChatButton.jsx
│ │ │
│ │ ├── services/
│ │ │ ├── conversationApi.js
│ │ │ └── conversationQueries.js
│ │ │
│ │ └── hooks/
│ │ └── useConversations.js
│ │
│ ├── auth/
│ │ ├── components/
│ │ ├── services/
│ │ └── hooks/
│ │
│ └── common/ # Shared feature-level components
│ ├── components/
│ │ ├── Button.jsx
│ │ ├── Loader.jsx
│ │ └── ErrorState.jsx
│ │
│ └── hooks/
│
├── lib/ # External configs/util wrappers
│ ├── axios.js
│ ├── queryClient.js
│ └── eventSource.js # SSE / streaming setup
│
├── components/ # Truly global UI (layout etc.)
│ ├── layout/
│ │ ├── AppLayout.jsx
│ │ └── SidebarLayout.jsx
│ │
│ └── ui/ # Design system primitives
│ ├── Modal.jsx
│ └── Toast.jsx
│
├── pages/ # Route-level pages
│ ├── ChatPage.jsx
│ ├── LoginPage.jsx
│ └── NotFound.jsx
│
├── styles/
│ └── globals.css
│
└── main.jsx
