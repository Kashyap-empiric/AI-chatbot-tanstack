import express from 'express'
import cors from 'cors'
import morgan from "morgan";
import conversationRoutes from './routes/conversation.routes.ts'
import chatRoutes from './routes/chat.routes.ts';
import { protect } from './middlewares/getAuth.ts'
import { clerkMiddleware } from '@clerk/express'

const app = express();
app.use(morgan("dev"));

app.use(cors({
    origin: ['http://localhost:5173', 'https://khz5bstr-5173.inc1.devtunnels.ms'],
    credentials: true
}));
app.use(express.json());
app.use((req, res, next) => {
    const token = req.query.token;
    if (token && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${token}`;
    }
    next();
});
app.use(clerkMiddleware());
app.disable("etag");

app.use("/api/conversation", protect, conversationRoutes);
app.use('/api/chat', protect, chatRoutes);

export default app;