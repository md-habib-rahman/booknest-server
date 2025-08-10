require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

var admin = require("firebase-admin");
var serviceAccount = require("./book-nest-auth-firebase-adminsdk.json");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("BookNest Server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xgjcv8g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch (err) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  //   console.log("token in the middleware", token);
};

async function run() {
  try {
    const db = client.db("booknestdb");
    const usersCollection = db.collection("users");
    const bookCollection = db.collection("books");
    const borrowedCollection = db.collection("borrowedBooks");

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await usersCollection.insertOne(newUser);
      //   console.log(result);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      //   console.log(email);
      const user = await usersCollection.findOne({ email });
      if (user) {
        res.send(user);
      } else {
        res.send("No data found");
      }
    });

    app.get("/top-rated", async (req, res) => {
      const books = await bookCollection.find().sort({ rating: -1 }.limit(4));
      res.send(books);
    });

    app.get("/books/:category", async (req, res) => {
      const cat = req.params.category;
      const books = await bookCollection.find({ category: cat }).toArray();
      if (books) {
        res.send(books);
      }
    });

    app.get("/book-details/:id", async (req, res) => {
      //   console.log(req.params);
      const id = req.params.id;
      const book = await bookCollection.findOne({ _id: new ObjectId(id) });
      //   console.log(book);
      if (book) {
        res.send(book);
      }
    });

    app.post("/book-borrow", async (req, res) => {
      const { email, bookId, returnDate, borrowedOn } = req.body;
      const newEntry = {
        email,
        bookId: new ObjectId(bookId),
        returnDate,
        borrowedOn,
      };

      //   console.log(newEntry);
      const result = await borrowedCollection.insertOne(newEntry);
      //   console.log(result);
      res.send(result);
    });

    app.patch("/update-quantity/:id", async (req, res) => {
      const id = req.params.id;
      const count = req.body.q;
      const result = await bookCollection.updateOne(
        { _id: new ObjectId(id), quantity: { $gt: 0 } },
        { $inc: { quantity: count } }
      );
      res.status(200).send(result);
    });

    app.post("/add-book", async (req, res) => {
      const newBook = req.body;
      const result = await bookCollection.insertOne(newBook);
      if (result) {
        res.send(result);
      }
    });

    app.get("/books", async (req, res) => {
      const books = await bookCollection.find().toArray();
      //   console.log(books);
      if (books) {
        res.send(books);
      }
    });

    app.patch("/update-book/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      //delete updatedData._id;
      //   console.log(updatedData);
      const result = await bookCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    app.get("/borrowed-books/:email", async (req, res) => {
      const email = req.params.email;
      const borrowedBooks = await borrowedCollection.find({ email }).toArray();
      if (borrowedBooks) {
        res.send(borrowedBooks);
        // console.log(borrowedBooks);
      } else {
        res.status(404).send("No data available");
      }
    });

    app.get(
      "/borrowed-books-lists/:email",
      verifyFirebaseToken,
      async (req, res) => {
        //   console.log("req header", req.headers);
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        const aggregationResult = await borrowedCollection
          .aggregate([
            {
              $match: {
                email: email,
              },
            },
            {
              $lookup: {
                from: "books",
                localField: "bookId",
                foreignField: "_id",
                as: "bookDetails",
              },
            },
            {
              $unwind: "$bookDetails",
            },
          ])
          .toArray();

        res.send(aggregationResult);
      }
    );

    app.delete("/book-return/:id", async (req, res) => {
      const id = req.params.id;
      const result = await borrowedCollection.deleteOne({
        _id: new ObjectId(id),
      });
      if (result.deletedCount === 1) {
        res.status(200).send("Id Deleted");
      }
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`BookNest Server is running on port: ${port}`);
});
