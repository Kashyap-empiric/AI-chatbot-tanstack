import dotenv from "dotenv";
dotenv.config();

import app from './app.ts'
import morgan from "morgan";
import connectDB from "./config/db.ts"

const port = Number(process.env.PORT) || 5000;

const startServer = async () => {
  await connectDB();

  app.use(morgan("dev"));

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer()