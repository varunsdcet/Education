// index.js
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const mongoose = require("mongoose");
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
  size: Number,
  pages: Number
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

// --- Helper function to convert PDF to images using poppler (most reliable) ---
async function convertPdfToImages(pdfBuffer, chapterId) {
  const tempDir = path.join(__dirname, 'temp', chapterId);
  await fs.mkdir(tempDir, { recursive: true });
  
  const pdfPath = path.join(tempDir, 'input.pdf');
  await fs.writeFile(pdfPath, pdfBuffer);
  
  try {
    // Try using poppler's pdftoppm (if installed)
    await execPromise(`pdftoppm -png -r 300 "${pdfPath}" "${path.join(tempDir, 'page')}"`);
    const files = await fs.readdir(tempDir);
    const imageFiles = files.filter(f => f.endsWith('.png')).sort();
    return { tempDir, imageFiles };
  } catch (err) {
    // If pdftoppm not found, use pdf-lib method
    console.log('pdftoppm not found, using alternative method...');
    return await convertPdfToImagesAlternative(pdfBuffer, tempDir);
  }
}

// Alternative method using pdf-lib (works but needs ghostscript or similar)
async function convertPdfToImagesAlternative(pdfBuffer, tempDir) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();
  const imageFiles = [];
  
  for (let i = 0; i < pageCount; i++) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
    newPdf.addPage(copiedPage);
    
    const singlePageBytes = await newPdf.save();
    const pagePath = path.join(tempDir, `page-${i + 1}.pdf`);
    await fs.writeFile(pagePath, singlePageBytes);
    
    // Convert single page PDF to image using ghostscript
    const imagePath = path.join(tempDir, `page-${i + 1}.png`);
    try {
      await execPromise(`gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r300 -sOutputFile="${imagePath}" "${pagePath}"`);
      imageFiles.push(`page-${i + 1}.png`);
    } catch (err) {
      console.error(`Failed to convert page ${i + 1}:`, err.message);
    }
  }
  
  return { tempDir, imageFiles };
}

// --- SIMPLEST METHOD: Using Tesseract directly on PDF ---
app.post("/upload/pdf", verifyToken, upload.single("file"), async (req, res) => {
  let tempDir = null;
  
  try {
    const { chapterId } = req.body;
    if (!chapterId || !req.file)
      return res.status(400).json({ success: false, message: "chapterId & file required" });

    console.log(`Processing PDF: ${req.file.originalname} (${req.file.size} bytes)`);

    // Create temp directory
    tempDir = path.join(__dirname, 'temp', chapterId);
    await fs.mkdir(tempDir, { recursive: true });
    
    const pdfPath = path.join(tempDir, 'input.pdf');
    await fs.writeFile(pdfPath, req.file.buffer);

    let extractedText = "";
    let pageCount = 0;

    // Method 1: Try Tesseract directly on PDF (fastest if supported)
    try {
      console.log("Attempting direct PDF OCR...");
      const { data: { text, pdf } } = await Tesseract.recognize(pdfPath, 'hin', {
        logger: info => {
          if (info.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
          }
        }
      });
      extractedText = text;
      pageCount = 1; // Tesseract processes PDF as single document
    } catch (err) {
      console.log("Direct PDF OCR failed, converting to images...");
      
      // Method 2: Convert PDF pages to images
      const { tempDir: dir, imageFiles } = await convertPdfToImages(req.file.buffer, chapterId);
      tempDir = dir;
      pageCount = imageFiles.length;

      for (let i = 0; i < imageFiles.length; i++) {
        const imagePath = path.join(tempDir, imageFiles[i]);
        console.log(`OCR processing page ${i + 1}/${imageFiles.length}...`);
        
        const { data: { text } } = await Tesseract.recognize(imagePath, 'hin', {
          logger: info => {
            if (info.status === 'recognizing text') {
              console.log(`Page ${i + 1} OCR: ${Math.round(info.progress * 100)}%`);
            }
          }
        });
        
        extractedText += `\n--- पृष्ठ ${i + 1} ---\n${text}\n`;
      }
    }

    // Save extracted text to MongoDB
    await ChapterContentModel.findOneAndUpdate(
      { chapterId },
      { 
        chapterId, 
        content: extractedText.trim(), 
        fileName: req.file.originalname, 
        size: req.file.size,
        pages: pageCount
      },
      { upsert: true }
    );

    // Cleanup temp files
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }

    console.log("PDF processing completed successfully!");

    res.json({ 
      success: true, 
      message: "Hindi PDF OCR extracted and saved", 
      content: extractedText.trim(),
      pages: pageCount
    });

  } catch (err) {
    console.error("PDF OCR error:", err);
    
    // Cleanup on error
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
    
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Update Chapter Content ---
app.post("/update/chapter-content", verifyToken, async (req, res) => {
  try {
    const { chapterId, content } = req.body;

    if (!chapterId || !content) {
      return res.status(400).json({ success: false, message: "chapterId and content are required" });
    }

    const existingRecord = await ChapterContentModel.findOne({ chapterId });
    if (!existingRecord) {
      return res.status(404).json({ success: false, message: "No record found for this chapterId" });
    }

    existingRecord.content = content;
    await existingRecord.save();

    res.json({ success: true, message: "Content updated successfully" });
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

// Public Multiple Contents
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