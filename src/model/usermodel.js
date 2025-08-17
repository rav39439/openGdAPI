const mongoose=require('mongoose')


const ClientSchema=new mongoose.Schema({
    username:{type:String,required:true},
    email:{type:String,required:true},
    password:{type:String,required:true},
    phoneNumber:{type:String,required:true},

     joinedOn:{type:Date,default:Date.now},
})
module.exports=mongoose.model("newmodelusers",ClientSchema)