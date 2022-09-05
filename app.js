require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");
const connectToDB = require("./db/connect");
const notFoundMiddleware = require("./middlewares/notFound");
const errorHandlerMiddleware = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

const mongoURI =
    process.env.MONGO_URI || "mongodb://localhost:27017/BitBuckets";
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("<h1>Welcome to Bit Buckets</h1>");
});
app.use("/api/auth", require("./routes/authRouter"));
app.use("/api/buckets", require("./routes/bucketsRouter"));
app.use("/api/users", require("./routes/usersRouter"));

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const start = async () => {
    try {
        await connectToDB(mongoURI);
    } catch (err) {
        console.log(`ERROR : while connecting to DB\nErr : ${err}`);
    }

    console.log("connected to DB...");

    app.listen(port, (err) => {
        if (err) {
            console.log(`ERROR : while listening to app\nErr: ${err}`);
            return;
        }
        console.log(
            `listening on port : ${
                process.env.PORT || `http://localhost:${port}`
            }`
        );
    });
};

start();
