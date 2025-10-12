// index.js
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const Tesseract = require("tesseract.js");
const { fromBuffer } = require("pdf2pic");
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

// --- Enhanced OCR Junk Filtering Function ---
function filterOCRJunk(text) {
  if (!text) return "";
  
  return text
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      
      // Skip empty lines and very short lines
      if (!trimmed || trimmed.length < 5) return false;
      
      // Skip file paths and image references
      if (/(\.jpg|\.jpeg|\.png|\.indd|\.pdf|Link:|Auther:|Author:|Panoramic|view\d*)/i.test(trimmed)) return false;
      
      // Skip date formats and page numbers (like "01-07-2025 2.10.46 PM")
      if (/\d{1,2}-\d{1,2}-\d{4}.*\d{1,2}\.\d{2}\.\d{2}\s*(AM|PM)/.test(trimmed)) return false;
      
      // Skip lines that are mostly numbers and special characters
      if (/^[\d\s\.\-–:]+$/.test(trimmed)) return false;
      
      // Skip lines with excessive numbers (more than 30% numbers)
      const digitCount = (trimmed.match(/\d/g) || []).length;
      const totalCharCount = trimmed.length;
      if (digitCount / totalCharCount > 0.3) return false;
      
      // Count Hindi characters to ensure substantial Hindi content
      const hindiCharCount = (trimmed.match(/[ऀ-ॿ]/g) || []).length;
      const englishCharCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
      
      // Prefer lines with more Hindi content than English
      return hindiCharCount >= englishCharCount;
    })
    .map(line => line.trim())
    .join('\n');
}

// --- Dynamic Hindi Text Cleaning Function ---
function cleanHindiTextEnhanced(rawText) {
  if (!rawText || typeof rawText !== 'string') return "";
  
  return rawText
    // Step 1: Normalize to NFC form (combines characters properly)
    .normalize("NFC")
    
    // Step 2: Fix common OCR segmentation issues
    // Remove newlines and spaces between Hindi characters (within words)
    .replace(/([ऀ-ॿ])\s*\n\s*([ऀ-ॿ])/g, '$1$2')
    .replace(/([ऀ-ॿ])\s+([ऀ-ॿ])/g, '$1$2')
    
    // Step 3: Dynamic duplicate character removal
    // Remove 2+ consecutive identical Hindi characters but keep legitimate doubles
    .replace(/([ऀ-ॿ])\1+/g, (match, char) => {
      // Keep legitimate double consonants in Hindi (like क्क, त्त, etc.)
      const legitimateDoubles = ['क्क', 'त्त', 'द्ध', 'न्न', 'म्म', 'ल्ल', 'त्त', 'ष्ठ', 'श्च', 'स्स'];
      if (legitimateDoubles.includes(match)) return match;
      return char; // Remove unnecessary duplicates
    })
    
    // Step 4: Fix common vowel/consonant combinations
    // Matra (vowel signs) corrections
    .replace(/ि([क-ह])/g, '$1ि') // Fix half 'i' matra position
    .replace(/््+/g, '्') // Remove duplicate halants
    
    // Step 5: Fix specific common OCR errors dynamically
    .replace(/([क-ह])([ा-ौ])\2+/g, '$1$2') // Remove duplicate matras
    .replace(/([अ-औ])\1+/g, '$1') // Remove duplicate independent vowels
    
    // Step 6: Clean up punctuation and spaces
    .replace(/[॰ॱ]/g, '।') // Normalize different danda characters to standard ।
    .replace(/[|\/\\_~`@#$%^&*+=\[\]{}<>]/g, '') // Remove unwanted symbols
    .replace(/["“”]/g, '"') // Normalize quotes
    .replace(/['‘’]/g, "'") // Normalize apostrophes
    
    // Step 7: Advanced line cleaning with context awareness
    .split('\n')
    .map(line => {
      // Remove lines that are just numbers or symbols
      if (/^[\d\s\.\-–,;:!?]*$/.test(line)) return '';
      
      // Fix common word breaks at line endings
      return line
        .replace(/\s+([,\.;:!?।])/g, '$1') // Remove space before punctuation
        .replace(/([क-ह])\s*-\s*([क-ह])/g, '$1$2') // Fix hyphen-separated words
        .trim();
    })
    .filter(line => {
      // Filter out empty lines and junk lines
      const trimmed = line.trim();
      return trimmed.length > 1 && // At least 2 characters
             !/^[\d\s\W]+$/.test(trimmed) && // Not just numbers/symbols
             !/^[\.\-–_\s]+$/.test(trimmed); // Not just dots/dashes
    })
    .join('\n')
    
    // Step 8: Final whitespace normalization
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/[ \t]{2,}/g, ' ') // Multiple spaces to single space
    .replace(/\s+\./g, '.') // Remove spaces before periods
    .replace(/\s+,/g, ',') // Remove spaces before commas
    
    // Step 9: Paragraph detection and formatting
    .replace(/([.!?।])\s*\n\s*([ऀ-ॿ])/g, '$1\n\n$2') // Add paragraph breaks after sentences
    .trim();
}

// --- Clean Hindi Text Function ---
function cleanHindiText(rawText) {
  return cleanHindiTextEnhanced(rawText);
}

// --- CRUD APIs (Class, Subject, Book, Chapter) ---
// Class
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

// Subject
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

// Book
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

// Chapter
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

// --- Enhanced PDF Upload & OCR ---
app.post("/upload/pdf", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { chapterId } = req.body;
    if (!chapterId || !req.file) return res.status(400).json({ success: false, message: "chapterId & file required" });

    let fullText = "";

    // First try direct PDF text extraction
    try {
      const pdfData = await pdfParse(req.file.buffer);
      fullText = (pdfData.text || "").trim();
    } catch (parseError) {
      console.log("PDF parse failed, proceeding with OCR...");
    }

    // If no text found or very little text, use OCR
    if (!fullText || fullText.length < 50) {
      console.log("Performing page-by-page OCR with enhanced settings...");

      const options = {
        density: 300, // Higher DPI for better accuracy
        saveFilename: "temp",
        savePath: "./",
        format: "png", 
        width: 2480,   // Higher resolution
        height: 3508,
        quality: 100
      };

      const pdfConverter = fromBuffer(req.file.buffer, options);
      
      // Get number of pages
      const pdfData = await pdfParse(req.file.buffer);
      const numPages = pdfData.numpages || 1;

      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdfConverter(i);
          const imgBuffer = Buffer.from(page.base64, "base64");
          
          // Enhanced Tesseract configuration for Hindi
          const { data: { text } } = await Tesseract.recognize(imgBuffer, "hin+eng", {
            logger: m => console.log(`Page ${i}:`, m),
            oem: 1, // Use LSTM engine only
            psm: 6, // Uniform block of text
            tessedit_pageseg_mode: 6,
            tessedit_char_whitelist: 'ऀ-ॿ०-९a-zA-Z\\s.,;!?।\-–\'()'
          });
          
          // Apply junk filtering immediately after OCR
          const cleanedPageText = filterOCRJunk(text);
          fullText += cleanedPageText + "\n\n";
          
          console.log(`Page ${i} OCR completed. Clean text length: ${cleanedPageText.length}`);
        } catch (pageError) {
          console.error(`Error processing page ${i}:`, pageError);
        }
      }
    }

    // Enhanced Hindi text cleaning
    fullText = cleanHindiTextEnhanced(fullText);

    await ChapterContentModel.findOneAndUpdate(
      { chapterId },
      { chapterId, content: fullText, fileName: req.file.originalname, size: req.file.size },
      { upsert: true }
    );

    res.json({ 
      success: true, 
      message: "PDF OCR completed and saved", 
      length: fullText.length,
      preview: fullText.substring(0, 200) + "..." 
    });
  } catch (err) {
    console.error("PDF upload error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Get multiple chapters combined ---
app.post("/content/multiple", async (req, res) => {
  const { chapterIds } = req.body;
  if (!Array.isArray(chapterIds) || chapterIds.length === 0)
    return res.status(400).json({ success: false, message: "chapterIds array required" });

  try {
    const items = await ChapterContentModel.find({ chapterId: { $in: chapterIds } });
    if (!items || items.length === 0) return res.status(404).json({ success: false, message: "No content found" });

    const combinedRawText = items.map(i => i.content).join("\n\n");
    const combinedCleanText = cleanHindiText(combinedRawText);

    res.json({ success: true, combinedText: combinedCleanText, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Public APIs ---
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
  const combinedText = cleanHindiText(items.map(i => i.content).join("\n\n"));
  res.json({ success: true, combinedText, items });
});

// --- Test PDF Processing Endpoint ---
app.post("/test-pdf-processing", upload.single("file"), async (req, res) => {
  try {
    const pdfData = await pdfParse(req.file.buffer);
    let extractedText = pdfData.text || "";
    
    const result = {
      directText: {
        content: extractedText,
        length: extractedText.length,
        preview: extractedText.substring(0, 300)
      },
      needsOCR: !extractedText || extractedText.length < 50,
      filteredText: filterOCRJunk(extractedText)
    };
    
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));