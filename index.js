// index.js
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const Tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs");
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

// --- BETTER PDF EXTRACTION with Multiple Methods ---
app.post("/upload/pdf", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { chapterId } = req.body;
    if (!chapterId || !req.file)
      return res.status(400).json({ success: false, message: "chapterId & file required" });

    console.log("Starting PDF extraction...");
    let fullText = "";
    let extractionMethod = "";

    // METHOD 1: Try pdf-parse with render_page callback for better text extraction
    try {
      const pdfData = await pdfParse(req.file.buffer, {
        max: 0, // Parse all pages
        version: 'default'
      });
      
      fullText = (pdfData.text || "").trim();
      extractionMethod = "pdf-parse";
      console.log(`pdf-parse extracted ${fullText.length} characters`);
    } catch (err) {
      console.log("pdf-parse failed:", err.message);
    }

    // METHOD 2: If pdf-parse gives poor results, try OCR
    const textQualityScore = calculateTextQuality(fullText);
    console.log(`Text quality score: ${textQualityScore}`);

    if (textQualityScore < 0.5 || fullText.length < 100) {
      console.log("Text quality poor, trying OCR...");
      
      // Save to temp file for OCR
      const tempPdfPath = path.join('./temp', `upload_${Date.now()}.pdf`);
      if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp');
      }
      fs.writeFileSync(tempPdfPath, req.file.buffer);

      try {
        // Use Tesseract OCR with better configuration
        const { data: { text } } = await Tesseract.recognize(
          tempPdfPath,
          'hin+eng',
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            },
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            preserve_interword_spaces: '1'
          }
        );
        
        if (text && text.length > fullText.length) {
          fullText = text;
          extractionMethod = "OCR";
          console.log(`OCR extracted ${fullText.length} characters`);
        }
      } catch (ocrErr) {
        console.log("OCR failed:", ocrErr.message);
      }

      // Cleanup
      try {
        if (fs.existsSync(tempPdfPath)) {
          fs.unlinkSync(tempPdfPath);
        }
      } catch (e) {}
    }

    if (!fullText || fullText.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: "Could not extract text from PDF. The PDF might be image-based or corrupted." 
      });
    }

    // ADVANCED CLEANING for Hindi text
    fullText = cleanHindiText(fullText);

    console.log(`Final text length: ${fullText.length} characters`);
    console.log(`Extraction method: ${extractionMethod}`);

    // Save to database
    await ChapterContentModel.findOneAndUpdate(
      { chapterId },
      {
        chapterId,
        content: fullText,
        fileName: req.file.originalname,
        size: req.file.size
      },
      { upsert: true }
    );

    res.json({ 
      success: true, 
      message: `PDF extracted successfully using ${extractionMethod}`,
      length: fullText.length,
      method: extractionMethod
    });
  } catch (err) {
    console.error("PDF extraction error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper function to calculate text quality
function calculateTextQuality(text) {
  if (!text || text.length === 0) return 0;
  
  // Count Hindi characters
  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  // Count replacement characters (corruption indicators)
  const badChars = (text.match(/[�\uFFFD]/g) || []).length;
  // Count excessive newlines (formatting issues)
  const excessiveNewlines = (text.match(/\n{3,}/g) || []).length;
  
  const totalChars = text.length;
  const hindiRatio = hindiChars / totalChars;
  const corruptionRatio = badChars / totalChars;
  
  // Quality score: high Hindi ratio, low corruption
  return hindiRatio - (corruptionRatio * 2) - (excessiveNewlines * 0.01);
}

// Advanced Hindi text cleaning function
function cleanHindiText(text) {
  return text
    // Remove newlines breaking Hindi characters
    .replace(/([\u0900-\u097F])\n+(?=[\u0900-\u097F])/g, '$1')
    .replace(/\n+(?=[\u093E-\u094F\u0962-\u0963])/g, '')
    .replace(/([\u0915-\u0939\u0958-\u095F])\n+/g, '$1')
    .replace(/\u094D\n+/g, '\u094D')
    .replace(/\n+(?=[\u0901-\u0903])/g, '')
    .replace(/([\u0901-\u0903])\n+/g, '$1')
    // Remove corruption markers
    .replace(/��/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
    // Normalize Unicode
    .normalize("NFC")
    // Fix duplicate matras (vowel signs)
    .replace(/(\u093E)\1+/g, '$1') // ा
    .replace(/(\u093F)\1+/g, '$1') // ि
    .replace(/(\u0940)\1+/g, '$1') // ी
    .replace(/(\u0941)\1+/g, '$1') // ु
    .replace(/(\u0942)\1+/g, '$1') // ू
    .replace(/(\u0943)\1+/g, '$1') // ृ
    .replace(/(\u0947)\1+/g, '$1') // े
    .replace(/(\u0948)\1+/g, '$1') // ै
    .replace(/(\u094B)\1+/g, '$1') // ो
    .replace(/(\u094C)\1+/g, '$1') // ौ
    .replace(/(\u0902)\1+/g, '$1') // ं
    .replace(/(\u0901)\1+/g, '$1') // ँ
    .replace(/(\u0903)\1+/g, '$1') // ः
    // Remove standalone newlines within text
    .replace(/([\u0900-\u097F])\n(?=[\u0900-\u097F])/g, '$1')
    // Clean excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([।,;!?])/g, '$1')
    .replace(/([।,;!?])\s+/g, '$1 ')
    .trim();
}

// --- Get multiple chapters content ---
app.post("/content/multiple", async (req, res) => {
  const { chapterIds } = req.body;
  if (!Array.isArray(chapterIds) || chapterIds.length === 0)
    return res.status(400).json({ success: false, message: "chapterIds array required" });

  const items = await ChapterContentModel.find({ chapterId: { $in: chapterIds } });
  const combinedText = items.map(i => i.content).join("\n\n");

  res.json({ success: true, combinedText, items });
});

// --- PUBLIC APIs ---
app.get("/public/class/list", async (req, res) => {
  const classes = await ClassModel.find();
  const result = await Promise.all(classes.map(async cls => {
    const subjectCount = await SubjectModel.countDocuments({ classId: cls._id });
    return { ...cls.toObject(), subjectCount };
  }));
  res.json({ success: true, items: result });
});

app.get("/public/subject/list/:classId", async (req, res) => {
  const subjects = await SubjectModel.find({ classId: req.params.classId });
  const result = await Promise.all(subjects.map(async subj => {
    const bookCount = await BookModel.countDocuments({ subjectId: subj._id });
    return { ...subj.toObject(), bookCount };
  }));
  res.json({ success: true, items: result });
});

app.get("/public/book/list/:subjectId", async (req, res) => {
  const books = await BookModel.find({ subjectId: req.params.subjectId });
  const result = await Promise.all(books.map(async book => {
    const chapterCount = await ChapterModel.countDocuments({ bookId: book._id });
    return { ...book.toObject(), chapterCount };
  }));
  res.json({ success: true, items: result });
});

app.get("/public/chapter/list/:bookId", async (req, res) => {
  const chapters = await ChapterModel.find({ bookId: req.params.bookId });
  const result = await Promise.all(chapters.map(async chap => {
    const pdfCount = await ChapterContentModel.countDocuments({ chapterId: chap._id });
    return { ...chap.toObject(), pdfCount };
  }));
  res.json({ success: true, items: result });
});

app.get("/public/content/:chapterId", async (req, res) => {
  const content = await ChapterContentModel.findOne({ chapterId: req.params.chapterId });
  if (!content) return res.status(404).json({ success: false, message: "No content found" });
  res.json({ success: true, content });
});

app.post("/public/content/multiple", async (req, res) => {
  const { chapterIds } = req.body;
  if (!Array.isArray(chapterIds) || chapterIds.length === 0)
    return res.status(400).json({ success: false, message: "chapterIds array required" });

  const items = await ChapterContentModel.find({ chapterId: { $in: chapterIds } });
  const combinedText = items.map(i => i.content).join("\n\n");

  res.json({ success: true, combinedText, items });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));