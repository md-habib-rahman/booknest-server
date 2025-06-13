const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

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

async function run() {
  try {
    const db = client.db("booknestdb");
    const usersCollection = db.collection("users");
    const bookCollection = db.collection("books");

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await usersCollection.insertOne(newUser);
      console.log(result);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      if (user) {
        res.send(user);
      }
    });

    app.get("/books/:category", async (req, res) => {
      const cat = req.params.category;
      const books = await bookCollection.find({ category: cat }).toArray();
      if (books) {
        res.send(books);
      }
    });

    app.get("/book-details/:id", async (req, res) => {
		// console.log(req.params.id)
      const id = req.params.id;
      const book = await bookCollection.findOne({ _id: new ObjectId(id) });
	  console.log(book)
      if (book) {
        res.send(book);
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`BookNest Server is running on port: ${port}`);
});
