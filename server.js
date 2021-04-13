const express = require("express");
const cors = require("cors");
const app = express();
const mongodb = require("mongodb");
const bcrypt = require("bcrypt");
const URL = "mongodb+srv://Daksh:Daksh@08@cluster0.psgym.mongodb.net/test";
//How to secure the link ?
const DB = "users"; 

app.use(cors());
app.use(express.json());

// Functionalities which I have :
// 1. add users (registering new users)
// 2. Adding Links to users
// 3. Deleting users
// 4. Displaying userData seperately and
// 5. Dispaying user wokrspace

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
//1. Create working register and login page
//2. Find method to re-direct user after registering to his workspace
//3. Make website operational on netlify

app.post("/userList", async function (req, res) {
  try {
    //Checking for already existing username

    //Hashing password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    req.body.password = hashedPassword;

    //connect to db server
    let connection = await mongodb.connect(URL);
    //Select the db
    let db = connection.db(DB);

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

app.get("/userLogin/:id", async function (req, res) {
  try {
    //connect to db server
    let connection = await mongodb.connect(URL);
    //Select the db
    let db = connection.db(DB);
    //do crud operation
    let loggedInUser = await db.collection("userList").findOne({
      user_id: req.params.id,
    });
    //disconnect from db
    await connection.close();

    res.json("user logged in");
  } catch (error) {
    console.log(error);
  }
});

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

app.get("/userList", async function (req, res) {
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

app.get("/userList/:id", async function (req, res) {
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

  res.json("Hello");
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

app.get("/login", async function (req, res) {
  try {
    //Connecting to DB
    let connection = await mongodb.connect(URL);
    let db = connection.db(DB);
    let user = await db
      .collection("userList")
      .findOne({ user_id: req.body.user_id });
    await connection.close();

    //Comparing the Hash
    let hashCompare = bcrypt.compareSync(req.body.password, user.password);

    if (hashCompare == true) {
      res.send({ message: "hash is true" });
    } else {
      res.send({ message: "hash is not true" });
    }
  } catch (error) {
    console.log(error);
  }
});

app.listen(process.env.PORT || 6969);
