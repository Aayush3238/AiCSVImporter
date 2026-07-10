import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import importRoutes from "./routes/importRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin: FRONTEND_URL
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "groweasy-csv-importer-backend"
  });
});

app.use("/api/import", importRoutes);

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error:
      statusCode === 500
        ? "Something went wrong while processing the import."
        : error.message
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
