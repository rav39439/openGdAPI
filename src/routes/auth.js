const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const newmodelusers = require("../model/usermodel");

const signup = async (req, res) => {

  console.log("addasfa")
    console.log(req)

   const {username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    try {
      // Run DB query and password hashing in parallel
      const [existingUser, hashedPassword] = await Promise.all([
        newmodelusers.findOne({ email }),
        bcrypt.hash(password, 12),
      ]);

      if (existingUser) {
        return res
          .status(409)
          .json({ success: false, message: "user already exists" });
      }
     
    let newUser=null
    try{
  newUser = await newmodelusers.create({
      username,
      email,
      password: hashedPassword,
      // phoneNumber,
      joinedOn: new Date(),
    });

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
          access_token: token,
        });
    } catch (error) {
      console.error("Signup Error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  //}
};

const login = async (req, res) => {
  
  const { email, password } = req.body;

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

      console.log("saddddddddddddddddddd")
      res.status(200).json({ result: existinguser,access_token:token});
    } catch (err) {
      res.status(404).json({ message: "something went wrong" });
    }
 // }
};

module.exports = { signup, login };
