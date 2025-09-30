
const express = require("express");
const router=express.Router()
const auth=require('../middleware/auth')
const {savedata,filterData,updateRecord,deleteRecord,getAllRecords,addRecord}=require('../helper/helpermethods')




router.get('/data',auth,filterData)
router.put('/data/:id',updateRecord)
router.delete('/data/:id',deleteRecord)
router.post('/data',addRecord)

router.post('/savedata',savedata)
router.get('/getabledata',auth,getAllRecords)

module.exports= router