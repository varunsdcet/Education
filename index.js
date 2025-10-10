// index.js
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ storage: multer.memoryStorage() });
const JWT_SECRET = "your_secret_key";

// --- MongoDB Connection ---
const MONGO_URI = "mongodb+srv://varunsinghal78_db_user:xRbG512ylHcUMpfL@cluster0.mjjsjk9.mongodb.net/school?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// --- Schemas ---
const classSchema = new mongoose.Schema({ name: String }, { timestamps: true });
const subjectSchema = new mongoose.Schema({ name: String, classId: String }, { timestamps: true });
const bookSchema = new mongoose.Schema({ name: String, subjectId: String }, { timestamps: true });
const chapterSchema = new mongoose.Schema({ name: String, bookId: String }, { timestamps: true });
const chapterContentSchema = new mongoose.Schema({
  chapterId: String,
  content: String,
  fileName: String,
  size: Number
}, { timestamps: true });

const ClassModel = mongoose.model("Class", classSchema);
const SubjectModel = mongoose.model("Subject", subjectSchema);
const BookModel = mongoose.model("Book", bookSchema);
const ChapterModel = mongoose.model("Chapter", chapterSchema);
const ChapterContentModel = mongoose.model("ChapterContent", chapterContentSchema);

// --- Login ---
app.post("/free-login", (req, res) => {
  const { email, password } = req.body;
  if (email === "superadmin@gmail.com" && password === "Sikander") {
    const token = jwt.sign({ email }, JWT_SECRET);
    return res.json({ success: true, token });
  }
  res.status(401).json({ success: false });
});

// --- JWT middleware ---
function verifyToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.split(" ")[1];
  if (!token) return res.status(401).json({ success: false });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false });
  }
}

// --- CLASS CRUD ---
app.post("/class/add", verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Class name required" });
  const cls = await ClassModel.create({ name });
  res.json({ success: true, id: cls._id });
});

app.get("/class/list", verifyToken, async (req, res) => {
  const classes = await ClassModel.find();
  const result = await Promise.all(classes.map(async cls => {
    const subjectCount = await SubjectModel.countDocuments({ classId: cls._id });
    return { ...cls.toObject(), subjectCount };
  }));
  res.json({ success: true, items: result });
});

app.put("/class/edit/:id", verifyToken, async (req, res) => {
  await ClassModel.findByIdAndUpdate(req.params.id, { name: req.body.name });
  res.json({ success: true });
});

app.delete("/class/delete/:id", verifyToken, async (req, res) => {
  await ClassModel.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// --- SUBJECT CRUD ---
app.post("/subject/add", verifyToken, async (req, res) => {
  const { name, classId } = req.body;
  if (!name || !classId) return res.status(400).json({ success: false, message: "Name & classId required" });
  const subject = await SubjectModel.create({ name, classId });
  res.json({ success: true, id: subject._id });
});

app.get("/subject/list/:classId", verifyToken, async (req, res) => {
  const subjects = await SubjectModel.find({ classId: req.params.classId });
  const result = await Promise.all(subjects.map(async subj => {
    const bookCount = await BookModel.countDocuments({ subjectId: subj._id });
    return { ...subj.toObject(), bookCount };
  }));
  res.json({ success: true, items: result });
});

app.put("/subject/edit/:id", verifyToken, async (req, res) => {
  await SubjectModel.findByIdAndUpdate(req.params.id, { name: req.body.name });
  res.json({ success: true });
});

app.delete("/subject/delete/:id", verifyToken, async (req, res) => {
  await SubjectModel.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// --- BOOK CRUD ---
app.post("/book/add", verifyToken, async (req, res) => {
  const { name, subjectId } = req.body;
  if (!name || !subjectId) return res.status(400).json({ success: false, message: "Name & subjectId required" });
  const book = await BookModel.create({ name, subjectId });
  res.json({ success: true, id: book._id });
});

app.get("/book/list/:subjectId", verifyToken, async (req, res) => {
  const books = await BookModel.find({ subjectId: req.params.subjectId });
  const result = await Promise.all(books.map(async book => {
    const chapterCount = await ChapterModel.countDocuments({ bookId: book._id });
    return { ...book.toObject(), chapterCount };
  }));
  res.json({ success: true, items: result });
});

app.put("/book/edit/:id", verifyToken, async (req, res) => {
  await BookModel.findByIdAndUpdate(req.params.id, { name: req.body.name });
  res.json({ success: true });
});

app.delete("/book/delete/:id", verifyToken, async (req, res) => {
  await BookModel.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// --- CHAPTER CRUD ---
app.post("/chapter/add", verifyToken, async (req, res) => {
  const { name, bookId } = req.body;
  if (!name || !bookId) return res.status(400).json({ success: false, message: "Name & bookId required" });
  const chapter = await ChapterModel.create({ name, bookId });
  res.json({ success: true, id: chapter._id });
});

app.get("/chapter/list/:bookId", verifyToken, async (req, res) => {
  const chapters = await ChapterModel.find({ bookId: req.params.bookId });
  const result = await Promise.all(chapters.map(async chap => {
    const pdfCount = await ChapterContentModel.countDocuments({ chapterId: chap._id });
    return { ...chap.toObject(), pdfCount };
  }));
  res.json({ success: true, items: result });
});

app.put("/chapter/edit/:id", verifyToken, async (req, res) => {
  await ChapterModel.findByIdAndUpdate(req.params.id, { name: req.body.name });
  res.json({ success: true });
});

app.delete("/chapter/delete/:id", verifyToken, async (req, res) => {
  await ChapterModel.findByIdAndDelete(req.params.id);
  await ChapterContentModel.deleteMany({ chapterId: req.params.id }).catch(() => {});
  res.json({ success: true });
});

// --- PDF Upload & Extract Text ---
app.post("/upload/pdf", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { chapterId } = req.body;
    if (!chapterId || !req.file) return res.status(400).json({ success: false, message: "chapterId & file required" });

    const data = await pdfParse(req.file.buffer);
    const extractedText = data.text || "";

    await ChapterContentModel.findOneAndUpdate(
      { chapterId },
      { chapterId, content: extractedText, fileName: req.file.originalname, size: req.file.size },
      { upsert: true }
    );

    res.json({ success: true, message: "PDF text extracted and saved" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Get multiple chapters content ---
app.post("/content/multiple", async (req, res) => {
  const { chapterIds } = req.body;
  if (!Array.isArray(chapterIds) || chapterIds.length === 0)
    return res.status(400).json({ success: false, message: "chapterIds array required" });

  const items = await ChapterContentModel.find({ chapterId: { $in: chapterIds } });
  const combinedText = items.map(i => i.content).join("\n\n");

  res.json({ success: true, combinedText, items });
});

// --- PUBLIC APIs (No token required) ---

// Public Class List
app.get("/public/class/list", async (req, res) => {
  const classes = await ClassModel.find();
  const result = await Promise.all(classes.map(async cls => {
    const subjectCount = await SubjectModel.countDocuments({ classId: cls._id });
    return { ...cls.toObject(), subjectCount };
  }));
  res.json({ success: true, items: result });
});

// Public Subject List
app.get("/public/subject/list/:classId", async (req, res) => {
  const subjects = await SubjectModel.find({ classId: req.params.classId });
  const result = await Promise.all(subjects.map(async subj => {
    const bookCount = await BookModel.countDocuments({ subjectId: subj._id });
    return { ...subj.toObject(), bookCount };
  }));
  res.json({ success: true, items: result });
});

// Public Book List
app.get("/public/book/list/:subjectId", async (req, res) => {
  const books = await BookModel.find({ subjectId: req.params.subjectId });
  const result = await Promise.all(books.map(async book => {
    const chapterCount = await ChapterModel.countDocuments({ bookId: book._id });
    return { ...book.toObject(), chapterCount };
  }));
  res.json({ success: true, items: result });
});

// Public Chapter List
app.get("/public/chapter/list/:bookId", async (req, res) => {
  const chapters = await ChapterModel.find({ bookId: req.params.bookId });
  const result = await Promise.all(chapters.map(async chap => {
    const pdfCount = await ChapterContentModel.countDocuments({ chapterId: chap._id });
    return { ...chap.toObject(), pdfCount };
  }));
  res.json({ success: true, items: result });
});

// Public PDF Content
app.get("/public/content/:chapterId", async (req, res) => {
  const content = await ChapterContentModel.findOne({ chapterId: req.params.chapterId });
  if (!content) return res.status(404).json({ success: false, message: "No content found" });
  res.json({ success: true, content });
});


// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
