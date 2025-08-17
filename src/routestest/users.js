const router = require("express").Router();

const path = require('path')

const {login, signup}=require('../routes/auth')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })


router.post('/signup',signup)
router.post('/login',login)
module.exports=router