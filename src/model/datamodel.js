
const mongoose=require('mongoose')
const {conn}=require('../db/mongooose')

const opengds=mongoose.Schema({
 Year:{type:String,required:true},
    Month:{type:String,required:true},
    Benezene:{type:Number,required:true},
    NoEmmisions:{type:Number,required:true},
    Toulene:{type:Number, required:true},

     publishedon:{type:String},

})
module.exports=mongoose.model("opengds",opengds)


