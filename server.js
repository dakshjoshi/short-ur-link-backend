"use strict";
const express = require("express");
const cors = require("cors");
const app = express();
const mongodb = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { default: axios } = require("axios");
require("dotenv").config();
const URL = process.env.DATABASE_OH_YEAH;
//How to secure the link ?
const DB = "users";

const PORT = process.env.PORT || 6969;

app.use(cors());
app.use(express.json());

// Functionalities which I have :
// 1. add users (registering new users) --DONE
// 2. Adding Links to users --DONE
// 3. Deleting users
// 4. Displaying userData seperately and --DONE
// 5. Dispaying user wokrspace --DONE

// Functionalities which I need to add:
// 1. Delete links from Links array in users -- DONE
// 2. Writing logic to convert from big website link to small website link -- DONE
// 3. Making everything operational from frontend instead of from Insomnia --DONE

//Things need to be done :
//1. Upload to cloud and adjust links accordingly -- DONE
//2. Make UI very beautiful/sexy, include form input required and parameters
//3. Understand your own code
//4. Add lazy loading to pages

//Things to do for 12/04/2021 night
//1. Create working register and login page --DONE
//2. Find method to re-direct user after registering to his workspace --DONE
//3. Make website operational on netlify --IN PROGRESS

//Things to do for 13/04/2021 & 14/04/2021
//1. Use JWT tokens for registration and login
//2. Make an OTP api for Phone Number/Email or both.
//3. Work with a payment gateway

const auth = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    res.json({
      message: "Token does not exist",
      name: "",
      Links: [{ fullform: "", shortform: "" }],
    });
  }
  console.log(token);
  try {
    const verify = jwt.verify(token, process.env.SECRET_TOKEN_OH_YEAH);
    if (verify._id !== req.params.id) {
      res.json({
        message: "Please log in first, don't directly jump to link",
        name: "",
        Links: [{ fullform: "", shortform: "" }],
      });
    }
    console.log(verify);
    next();
  } catch (error) {
    res.json({
      message: "Token Invalid",
      name: "",
      Links: [{ fullform: "", shortform: "" }],
    });
  }
};

const adminAuth = async (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    res.json({
      message: "Token does not exist",
      name: "",
      number: "",
      user_id: "",
      priorCode: "",
    });
  }
  console.log(token);
  try {
    const verify = jwt.verify(token, process.env.SECRET_TOKEN_OH_YEAH);

    let connection = await mongodb.connect(URL);
    let db = connection.db(DB);
    let user = await db.collection("admin").findOne({ user_id: "admin" });

    connection.close();

    console.log(user);

    if (verify._id !== mongodb.ObjectId(user._id).toString()) {
      res.json([
        {
          message: "Please log in first",
          name: "",
          number: "",
          user_id: "",
          priorCode: "",
        },
      ]);
    }
    console.log(verify);
    next();
  } catch (error) {
    res.json([
      {
        message: "Invalid token",
        name: "",
        number: "",
        user_id: "",
        priorCode: "",
      },
    ]);
  }
};

app.get("/userList", adminAuth, async function (req, res) {
  try {
    let connection = await mongodb.connect(URL);
    let db = connection.db(DB);
    let users = await db.collection("userList").find().toArray();
    await connection.close();

    res.json(users);
  } catch (error) {
    console.log(error);
  }
});

app.post("/userList", async function (req, res) {
  try {
    //Checking for already existing username
    let connection = await mongodb.connect(URL);
    let db = connection.db(DB);
    const user = await db.collection("userList").findOne({
      $or: [{ user_id: req.body.user_id }, { email: req.body.email }],
    });
    if (user) {
      res.json({
        message: "User already exists",
      });
    }

    //Hashing password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    req.body.password = hashedPassword;

    // //connect to db server
    // let connection = await mongodb.connect(URL);
    // //Select the db
    // let db = connection.db(DB);

    const priorcode = (await db.collection("userList").count()) + 1;
    req.body.priorCode = priorcode;
    req.body.Links = [];

    //do crud operation
    await db.collection("userList").insertOne(req.body);
    //disconnect from db
    await connection.close();

    res.json({ message: "User Added" });
  } catch (error) {
    console.log(error);
  }
});

app.get("/refer/:id", async function (req, res) {
  try {
    let connection = await mongodb.connect(URL);
    let db = connection.db(DB);
    let users = await db.collection("userList").findOne({
      Links: {
        $elemMatch: {
          shortform: req.params.id,
        },
      },
    });
    await connection.close();

    res.json(users);
  } catch (error) {
    console.log(error);
  }
});

//OLD -->
// app.get("/userList/:id", async function (req, res) {
//   try {
//     let connection = await mongodb.connect(URL);
//     let db = connection.db(DB);
//     let user = await db
//       .collection("userList")
//       .findOne({ _id: mongodb.ObjectId(req.params.id) });

//     await connection.close();

//     res.json({ user });
//   } catch (error) {
//     console.log(error);
//   }
// });

app.get("/userList/:id", auth, async function (req, res) {
  try {
    let connection = await mongodb.connect(URL);
    let db = connection.db(DB);
    let user = await db
      .collection("userList")
      .findOne({ _id: mongodb.ObjectId(req.params.id) });

    await connection.close();

    res.json({ user });
  } catch (error) {
    console.log(error);
  }
});

app.put("/userList/:id", async function (req, res) {
  try {
    let connection = await mongodb.connect(URL);
    let db = connection.db(DB);

    //Forming the short URL :

    const value = await db
      .collection("userList")
      .findOne({ _id: mongodb.ObjectID(req.params.id) });

    var afterValue;
    var isLink = Object.keys(value).filter((element) => element == "Links");
    console.log(isLink);

    if (isLink[0] == "Links") {
      afterValue = value.Links.length + 1;
    } else {
      afterValue = 1;
    }

    //

    await db.collection("userList").updateOne(
      { _id: mongodb.ObjectID(req.params.id) },
      {
        $push: {
          Links: {
            fullform: req.body.linkToAdd,
            shortform: `${value.priorCode}U${afterValue}`,
          },
          //Think of trademark
        },
      }
    );
    await connection.close();

    res.json({
      message: "Link added",
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/workSpace/:id", async function (req, res) {
  try {
    let connection = await mongodb.connect(URL);
    let db = connection.db(DB);
    let data = await db
      .collection("userList")
      .findOne({ _id: mongodb.ObjectID(req.params.id) });

    await connection.close();

    res.json(data);
  } catch (error) {
    console.log(error);
  }
});

app.put("/workSpace/:id", async function (req, res) {
  try {
    let connection = await mongodb.connect(URL);
    let db = connection.db(DB);
    await db.collection("userList").updateOne(
      { _id: mongodb.ObjectID(req.params.id) },
      {
        $pull: {
          Links: {
            fullform: req.body.linkToDelete,
          },
        },
      }
    );

    await db.collection("userList").updateOne(
      { _id: mongodb.ObjectID(req.params.id) },
      {
        $push: {
          Links: {
            shortform: null,
            fullform: null,
          },
        },
      }
    );
    await connection.close();
    res.json("Link was deleted");
  } catch (error) {
    console.log(error);
  }
});

app.post("/userLogin/", async function (req, res) {
  try {
    //Connecting to DB
    let connection = await mongodb.connect(URL);
    let db = connection.db(DB);
    let user = await db
      .collection("userList")
      .findOne({ user_id: req.body.user_id });
    await connection.close();

    //If user does not exist
    if (!user) {
      res.send("username not valid");
    }

    //Comparing the Hash
    let hashCompare = bcrypt.compareSync(req.body.password, user.password);

    //If hash is not true
    if (!hashCompare) {
      res.send("password not valid");
    }

    //Generate Token and send it to frontend
    const token = jwt.sign({ _id: user._id }, process.env.SECRET_TOKEN_OH_YEAH);
    console.log(token);
    res.header("Authorization", token).json({
      token: token,
      _id: user._id,
    });
  } catch (error) {
    console.log(error);
  }
});

app.post("/adminLogin", async function (req, res) {
  console.log(req.body);
  try {
    //Connecting to DB
    let connection = await mongodb.connect(URL);
    let db = connection.db(DB);
    let user = await db
      .collection("admin")
      .findOne({ user_id: req.body.user_id });
    await connection.close();

    //If user does not exist
    if (!user) {
      res.send("username not valid");
    }

    console.log(`DB user is :`, user);

    if (user.password !== req.body.password) {
      res.send("password not valid");
    }

    //Generate Token and send it to frontend
    const token = jwt.sign({ _id: user._id }, process.env.SECRET_TOKEN_OH_YEAH);
    console.log(token);
    res.header("Authorization", token).json({
      token: token,
      _id: user._id,
    });
  } catch (error) {
    console.log(error);
  }
});

app.post("/forgot", async function (req, res) {
  // Go in DB and check if user exists
  let connection = await mongodb.connect(URL);
  let db = connection.db(DB);
  let user = await db
    .collection("userList")
    .findOne({ user_id: req.body.user_id });

  if (!user) {
    res.json({
      message: "user does not exist bro, not cool",
    });
  }
  //Get his email id
  const email = user.email;
  if (!email) {
    res.json({
      message: `Your email is not registerd bro, wtf? You will have to contact the admin to reset your password now`,
    });
  }
  //Generate a random 15 digit number, apply it to the userPassword reset front end form.
  const variable = Math.random() * 10 ** 15;
  const roundedVariable = Math.round(variable);

  //store 15 digit code in forgot-Password collection with user_id
  const time = Date.now();
  console.log(time);
  const toBeInserted = {
    codeTemp: roundedVariable,
    user: user.user_id,
    generatedAt: time,
  };

  await db.collection("irresponsibleUsers").insertOne(toBeInserted);
  await connection.close();

  //email the password reset link to user
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  const localWebsite = "https://elated-yalow-069089.netlify.app/reset/";
  const website = `http://localhost:3000/reset/`;

  // send mail with defined transport object
  let information = await transporter.sendMail({
    from: `"SHORT UR LINK" ${process.env.MAIL_USER}`, // sender address
    to: user.email, // list of receivers
    subject: `RESET PASSWORD`, // Subject line
    // text: `${req.body.message}`, // plain text body
    html: `

      <h3>Message  :</h3>
      <p>CLICK ON THE LINK TO RESET YOUR PASSWORD</p>
      <a href="${localWebsite}${roundedVariable}">THE LINK</a>
      <p>Hope this message finds you well, and I hope you have a very good day and I also hope you remember your password nect time, eat 
      some almonds man. <br>
      <br><br>
      Thank you
      Cheers & Regards <br>
      SUL team</p>`, // html body
  });
  if (!information) {
    res.json({
      message: "Email now sent, probably server fault or your internet sucks",
    });
  }
  //Send back confirmation
  res.json({
    message: `Email Sent`,
  });
});

app.put("/reset", async function (req, res) {
  //get the req.body.code (15 digit code)
  const variable = req.body.variable;
  //check the database if such a request exists
  let connection = await mongodb.connect(URL);
  let db = connection.db(DB);
  const userReq = await db.collection("irresponsibleUsers").findOne({
    codeTemp: +req.body.variable,
  });
  console.log(userReq);
  if (!userReq) {
    res.json({
      message: `What you trying to do bro?`,
    });
  }
  //check if it's past 10 minutes of request generation
  const time = Date.now();
  if (time > userReq.generatedAt + 600000) {
    res.json({
      message:
        "Hello, Mr. Kachow please go back and generate new request for new password as this one has timed out",
    });
  }
  //get new password from req.body.password
  //Hash it
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);
  req.body.password = hashedPassword;

  //Update new password
  const updatedUser = await db.collection("userList").updateOne(
    { user_id: userReq.user },
    {
      $set: {
        password: req.body.password,
      },
    }
  );

  console.log(updatedUser);

  //Change the variable to null so that user can only use the request once to change possword
  await db.collection("irresponsibleUsers").updateOne(
    { codeTemp: +req.body.variable },
    {
      $set: {
        codeTemp: `Already used once boy`,
      },
    }
  );
  connection.close();

  res.json({
    message: "PASSWORD UPDATED! CONGRATULATIONS",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running in ${PORT}`);
});

