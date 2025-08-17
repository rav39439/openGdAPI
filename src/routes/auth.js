const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const newmodelusers = require("../model/usermodel");

const doctor = require("../model/doctormodel");
const {
  getAllSlots,
  getSlotsByDoctor,
  getSlots,
  updateSlots,
} = require("../redis/slotsredis");

// const APPOINTMENTS=store.APPOINTMENTS

const {
  cleanup,
  generateTodaySlots,
  soonestAvailabilityForDoctor,
  isSlotLockedOrBooked,
  addMinutes,
  toISO,
  diffHours,
} = require("../helper/helpermethods");

const signup = async (req, res) => {
  console.log("Signup attempt...");
  let isDoctor = true;
  isDoctor = req.body.isDoctor;
      console.log("sssssssssssssssssssssssssdddddddddsdsds")

  if (isDoctor) {
    const { name, specialization, modes, email, password,experience } = req.body;
    if (!name || !specialization || !modes) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
      console.log("sssssssssssssssssssssssssdddddddddsdsds")

    try {
      // Run DB query and password hashing in parallel
      const [existingUser, hashedPassword] = await Promise.all([
        doctor.findOne({ email }),
        bcrypt.hash(password, 12),
      ]);

      if (existingUser) {
        return res
          .status(409)
          .json({ success: false, message: "doctor already exists" });
      }

      // Create new user

      console.log("sssssssssssssssssssssssssdddddddddsdsds")
      const newUser = await doctor.create({
        name,
        email,
        password: hashedPassword,
        modes,
        specialization,
        experience,
        joinedOn: new Date().toISOString(),
      });

      // Generate JWT Token
      const token = jwt.sign(
        { email: newUser.email, id: newUser._id },
        "test",
        { expiresIn: "1h" }
      );

      res
        .status(201)
        .json({
          success: true,
          message: "Signup successful",
          data: { user: newUser, token },
          result: newUser,
          token: token,
        });
    } catch (error) {
      console.error("Signup Error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  } else {
      const { username, email, password, phoneNumber } = req.body;

    console.log(username)
    console.log(email)
    console.log(password)
    console.log(phoneNumber)
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    try {
      // Run DB query and password hashing in parallel
      const [existingUser, hashedPassword] = await Promise.all([
        doctor.findOne({ email }),
        bcrypt.hash(password, 12),
      ]);

      if (existingUser) {
        return res
          .status(409)
          .json({ success: false, message: "user already exists" });
      }
console.log("mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm")
      // Create new user

    // Create user
    let newUser=null
    try{
  newUser = await newmodelusers.create({
      username,
      email,
      password: hashedPassword,
      phoneNumber,
      joinedOn: new Date(),
    });
      console.log(newUser)

    }
    catch(error){
      console.log(error)
    }
   

      // Generate JWT Token
      const token = jwt.sign(
        { email: newUser.email, id: newUser._id },
        "test",
        { expiresIn: "1h" }
      );

      res
        .status(201)
        .json({
          success: true,
          message: "Signup successful",
          data: { user: newUser, token },
          result: newUser,
          token: token,
        });
    } catch (error) {
      console.error("Signup Error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
};

const login = async (req, res) => {
  const { email, password, isDoctor } = req.body;
    console.log(email)
    console.log(password)
    console.log(isDoctor)

  if (isDoctor) {
    try {
      const existingdoctor = await doctor.findOne({ email });

      if (!existingdoctor) {
                      console.log("password mismatch")

        return res.status(404).json({ message: "Doctor do not exist" });
      }

      const isPasswordCrt = await bcrypt.compare(
        password,
        existingdoctor.password
      );
                console.log("sssssssssssssssdddddddddddd")

      if (!isPasswordCrt) {
              console.log("password mismatch")

        return res.status(400).json({ message: "Invalid credential" });
      }

      const token = jwt.sign(
        { email: existingdoctor.email, id: existingdoctor._id },
        "test",
        { expiresIn: "1h" }
      );
      await generateTodaySlots(existingdoctor);
      const slots = await getSlots(existingdoctor._id);
      res.status(200).json({ result: existingdoctor, token, slots: slots });
    } catch (err) {
      res.status(404).json({ message: "something went wrong" });
    }
  } else {
    try {
      const existinguser = await newmodelusers.findOne({ email });
      if (!existinguser) {
        return res.status(404).json({ message: "User do not exist" });
      }
      const isPasswordCrt = await bcrypt.compare(
        password,
        existinguser.password
      );
      if (!isPasswordCrt) {
        return res.status(400).json({ message: "Invalid credential" });
      }
      const token = jwt.sign(
        { email: existinguser.email, id: existinguser._id },
        "test",
        { expiresIn: "1h" }
      );
            console.log(existinguser)

      const slots = await getAllSlots();
      res.status(200).json({ result: existinguser, token, slots: slots });
    } catch (err) {
      res.status(404).json({ message: "something went wrong" });
    }
  }
};

module.exports = { signup, login };
