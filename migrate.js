// migrate.js — FINAL VERSION (works 100% in 2025)

const { MongoClient } = require("mongodb");

// OLD CLUSTER (your old data)
const OLD_URI = "mongodb+srv://varunsinghal78_db_user:xRbG512ylHcUMpfL@cluster0.mjjsjk9.mongodb.net/school?retryWrites=true&w=majority";

// NEW CLUSTER + NEW DATABASE
const NEW_URI = "mongodb+srv://multimediagbp_db_user:vfO3nJRaKxJntgkC@cluster0.l09l3hk.mongodb.net/multimediagbp?retryWrites=true&w=majority";

async function migrate() {
  const oldClient = new MongoClient(OLD_URI);
  const newClient = new MongoClient(NEW_URI);

  try {
    console.log("Connecting to OLD cluster...");
    await oldClient.connect();
    console.log("Connected to OLD cluster");

    console.log("Connecting to NEW cluster...");
    await newClient.connect();
    console.log("Connected to NEW cluster");

    const oldDb = oldClient.db("school");
    const newDb = newClient.db("multimediagbp");

    const collections = await oldDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);

    for (const col of collections) {
      const name = col.name;
      console.log(`\nCopying ${name}...`);

      const docs = await oldDb.collection(name).find({}).toArray();
      await newDb.collection(name).drop().catch(() => {});
      
      if (docs.length > 0) {
        await newDb.collection(name).insertMany(docs);
        console.log(`Copied ${docs.length} documents`);
      } else {
        console.log(`${name} is empty`);
      }
    }

    console.log("\nMIGRATION SUCCESSFUL!");
    console.log("All your data is now in 'multimediagbp' database");

  } catch (error) {
    console.error("Failed:", error.message);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

migrate();