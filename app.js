const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const { MongoClient } = require("mongodb");
require("dotenv").config();
const pinataSDK = require("@pinata/sdk");
const fetch = require("node-fetch");

const uri = process.env.MONGO_URI;
const PORT = process.env.PORT || 8080;
const key = process.env.PINATA_PUBLIC;
const secret = process.env.PINATA_PRIVATE;
const pinata = pinataSDK(key, secret);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.status(200).send("Alive!");
});

app.post("/postData", (req, res, next) => {
  const data = req.body.data;
  const body = data;
  const options = {
    pinataMetadata: {
      name: `Token #${tokenId}`,
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };
  pinata
    .pinJSONToIPFS(body, options)
    .then((result) => {
      console.log(result);
      res.status(200).json({
        message: "success",
        ipfsHash: result.IpfsHash,
      });
    })
    .catch((err) => {
      console.log(err);
      next(err);
    });
});

app.post("/get", async (req, res, next) => {
  try {
    const url = `https://gateway.pinata.cloud/ipfs/${req.body.ipfsHash}`;
    console.log(`Hash - ${req.body.ipfsHash}`);
    const response = await fetch(url);
    const jsonRes = await response.json();
    // console.log(jsonRes.attributes[0].value);
    res.status(200).json({
      message: "success",
      data: jsonRes,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

app.delete("/delete", (req, res, next) => {
  const ipfsHash = req.body.ipfsHash;
  pinata
    .unpin(ipfsHash)
    .then((result) => {
      console.log(result);
      res.status(200).json({
        message: "success",
      });
    })
    .catch((err) => {
      res.status(500).json({
        message: "There was an error deleting the file",
      });
      console.log(err);
      next(err);
    });
});

app.post("/checkuserName", async (req, res, next) => {
  const username = req.body.username;
  try {
    await client.connect();
    console.log("Connected correctly to server");
    const collection = client.db("ethernals").collection("usernames");
    const response = await collection.find({ name: username }).toArray();
    if (response.length > 0) {
      res.status(400).json({
        message: "Username already exists",
      });
    } else {
      res.status(200).json({
        message: "OK",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message,
    });
    next(err);
  } finally {
    await client.close();
  }
});

app.get("/userExists", async (req, res, next) => {
  const email = req.query.email;
  try{
    await client.connect();
    console.log("Connected correctly to server");
    const collection = client.db("ethernals").collection("usernames");
    const response = await collection.find({ email: email }).toArray();
    if (response.length > 0) {
      res.send(200, {"result": true});
    } else {
      res.send(200, {"result": false});
    }
  }catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message,
    });
    next(err);
  } finally {
    await client.close();
  }
})


app.post("/createProfile", async (req, res, next) => {
  const username = req.body.username;
  const email = req.body.email;
  const data = req.body.data;
  const body = data;
  console.log(body);
  const options = {
    pinataMetadata: {
      name: `User - ${username}`,
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };
  try {
    await client.connect();
    console.log("Connected correctly to server");
    const collection = client.db("ethernals").collection("usernames");
    const response = await collection
      .find({
        name: username,
      })
      .toArray();
    if (response.length > 0) {
      res.status(406).json({
        message: "Username already exists",
      });
    } else {
      const addUsername = await collection.insertOne({
        name: username,
        email: email,
      });
      const result = await pinata.pinJSONToIPFS(body, options);
      console.log(result);
      res.status(200).json({
        message: "success",
        ipfsHash: result.IpfsHash,
      });
    }
  } catch {
    res.status(500).json({
      message: "There was an error.",
    });
    next(err);
  } finally {
    await client.close();
  }
});

app.post("/editPixel", async (req, res, next) => {
  const pixelNum = Number(req.body.pixelNum);
  const inputColor = req.body.color;
  const message = req.body.message;
  const title = req.body.title;
  console.log(typeof pixelNum);
  console.log(inputColor);
  console.log(message);
  console.log(title);

  const body = {
    pixelNum: pixelNum,
    message: message,
    color: inputColor,
    title: title,
  };

  const options = {
    pinataMetadata: {
      name: `Pixel #${pixelNum}`,
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };

  try {
    await client.connect();
    const collection = client.db("ethernals").collection("usernames");
    const resp = await collection.findOneAndUpdate(
      { _id: pixelNum },
      { $set: { color: inputColor } }
    );
    const response = await pinata.pinJSONToIPFS(body, options);

    res.status(200).json({
      message: "success",
      ipfsHash: response.IpfsHash,
      resp: resp,
    });
  } catch {
    res.status(500).json({
      message: "There was an error editing the pixel :(",
    });
    next(err);
  } finally {
    await client.close();
  }
});

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
  // res.end(res.sentry + "\n");
});

app.listen(PORT);
