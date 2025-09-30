
const dotenv = require("dotenv");
const mongoose = require("mongoose");
require('dotenv').config()

mongoose.connect(process.env.MONGO_KEY,{useNewUrlParser:true , useUnifiedTopology:true}).then( ()=>
    console.log("connection successful")
).catch((err)=>console.log(err))

const conn = mongoose.createConnection(process.env.MONGO_KEY,{ useNewUrlParser: true ,useUnifiedTopology: true} );

module.exports=conn

