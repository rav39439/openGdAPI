const express = require("express");
const app = express();
const server = require('http').createServer(app);
const dotenv = require("dotenv");
const mongoose = require("mongoose");
require('dotenv').config()
const userRoute = require("./src/routestest/users");

const doctorRoute = require("./src/routestest/doctorsroute");


const cors=require('cors');
const { flush } = require("./src/redis/slotsredis");

// flush()
mongoose.connect(process.env.MONGO_KEY,{useNewUrlParser:true , useUnifiedTopology:true}).then( ()=>
    console.log("connection successful")
).catch((err)=>console.log(err))

const conn = mongoose.createConnection(process.env.MONGO_KEY,{ useNewUrlParser: true ,useUnifiedTopology: true} );


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
  app.use("/api/doctors", doctorRoute);

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
  
