const express = require("express");
const app = express();
const server = require('http').createServer(app);
require('dotenv').config()
const rateLimit = require("express-rate-limit");
const fs=require('fs')
// Apply rate limiter globally
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    status: 429,
    error: "Too many requests, please try again later."
  }
});

// Apply to all routes
// app.use(apiLimiter);
const userRoute = require("./src/controllers/users");

const dataRoute = require("./src/controllers/dataRoute");

const {conn}=require('./src/db/mongooose')
const cors=require('cors');

// app.use(cors(), function(req, res, next) {
//     res.header("Access-Control-Allow-Origin","https://taskmanagerforusers.netlify.app"); // update to match the domain you will make the request from
//     res.header(
//       "Access-Control-Allow-Headers",
//       "Origin, X-Requested-With, Content-Type, Accept"
//     );
//     next();
//   });

// app.use(function(req, res, next) {
//   res.header('Access-Control-Allow-Origin', 'http://localhost:3000');

//   res.header(
//     'Access-Control-Allow-Headers',
//     'Origin, X-Requested-With, Content-Type, Accept'
//   );

//   next();
// });
// flush()
// console.log("flueshed")
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
    credentials: true, // if you're using cookies or tokens
  })
);


  app.use(express.json());
  app.use("/api/users", userRoute);
  app.use("/api/opendata", dataRoute);

  // const { FilesetResolver, LanguageDetector } =require("@mediapipe/tasks-text");

  async function getext(){
    const text = await FilesetResolver.forTextTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text/wasm"
  );
  return text
  }

  server.listen(process.env.PORT||5000,function(){
    console.log("connected")
  
  })



