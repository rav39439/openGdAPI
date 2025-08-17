
const express = require("express");
const router=express.Router()
const auth=require('../middleware/auth')
const {getdoctorslots,getPastAppointmentsByPhone,cancelandremove,getUpcomingAppointmentsByPhone,rescheduleAppointment,cancelappointment,getDoctors,getselectedDoctor,addDoctors,bookSlot,confirmBooking}=require('../routes/doctors')

// router.post('/doctors/:doctorId/slots',auth,getdoctorslots)

router.get('/doctors',getDoctors)

router.get('/doctors/:id',getselectedDoctor)
router.post('/doctors',addDoctors)
router.post('/fixappointment',bookSlot)
router.post('/Confirmappointment',confirmBooking)
router.get('/slots/:doctorId',getdoctorslots)
router.post('/cancel',cancelappointment)
router.post('/pastappointments',getPastAppointmentsByPhone)
router.post('/upcomingappointments',getUpcomingAppointmentsByPhone)
router.post('/cancelandremove',cancelandremove)

router.post('/resechedule',rescheduleAppointment)

module.exports= router