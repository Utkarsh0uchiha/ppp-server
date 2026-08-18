import "dotenv/config";
import { testConnection } from "./connections/pg-connection";
import app from "./app";

testConnection();
app.listen();
app.initializeRoutes();



