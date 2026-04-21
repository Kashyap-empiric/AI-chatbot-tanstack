import express from 'express'
import cors from 'cors'
import conversationRoutes from './routes/conversation.routes.ts'
import chatRoutes from './routes/chat.routes.ts';
import { protect } from './middlewares/getAuth.ts'
import { clerkMiddleware } from '@clerk/express'

const app = express();

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(clerkMiddleware())
app.use("/api/conversation", protect, conversationRoutes);
app.use('/api/chat', protect, chatRoutes);

export default app;