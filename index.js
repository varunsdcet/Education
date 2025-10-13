// index.js
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const Tesseract = require("tesseract.js");
const { fromBuffer } = require("pdf2pic"); // CommonJS version
const path = require("path");
const fs = require("fs");
const app = express();
const { createCanvas, loadImage } = require("canvas");
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

// --- PDF Upload & Extract Text (Hindi + English) - Pure JS Solution ---
// Enhanced PDF Upload & Extract Text (Hindi + English) with Advanced Cleaning
// Enhanced PDF Upload with Font Encoding Detection & OCR Fallback
app.post("/upload/pdf", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { chapterId } = req.body;
    if (!chapterId || !req.file)
      return res.status(400).json({ success: false, message: "chapterId & file required" });

    console.log("Starting PDF text extraction...");

    // Method 1: Try pdf-parse first
    let pdfData = await pdfParse(req.file.buffer);
    let fullText = (pdfData.text || "").trim();

    console.log(`Extracted ${fullText.length} characters using pdf-parse`);

    // ============================================
    // DETECT FONT ENCODING CORRUPTION
    // ============================================
    const isCorrupted = detectFontEncodingCorruption(fullText);
    
    if (isCorrupted) {
      console.log("⚠️ FONT ENCODING CORRUPTION DETECTED - Switching to OCR");
      
      // Force OCR for corrupted PDFs
      fullText = await performOCR(req.file.buffer);
      
    } else if (fullText && fullText.length > 100) {
      console.log("✓ Text looks valid, applying standard cleaning");
      
      // Apply standard cleaning for valid text
      fullText = cleanHindiText(fullText);
      
    } else {
      console.log("Text extraction insufficient, trying OCR fallback");
      fullText = await performOCR(req.file.buffer);
    }

    // Final validation
    if (!fullText || fullText.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: "Could not extract sufficient text from PDF. The PDF may be image-based or have encoding issues." 
      });
    }

    // Quality metrics
    const hindiCharCount = (fullText.match(/[\u0900-\u097F]/g) || []).length;
    const englishCharCount = (fullText.match(/[a-zA-Z]/g) || []).length;
    const totalChars = fullText.length;
    
    console.log(`Quality metrics: Total=${totalChars}, Hindi=${hindiCharCount}, English=${englishCharCount}`);

    // Save to DB
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
      message: "PDF text extracted and saved successfully", 
      stats: {
        totalLength: fullText.length,
        pages: pdfData.numpages,
        hindiChars: hindiCharCount,
        englishChars: englishCharCount,
        hindiPercentage: totalChars > 0 ? Math.round((hindiCharCount / totalChars) * 100) : 0,
        extractionMethod: isCorrupted ? 'OCR' : 'Text'
      }
    });
    
  } catch (err) {
    console.error("PDF extraction error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// HELPER FUNCTION: DETECT FONT ENCODING CORRUPTION
// ============================================
function detectFontEncodingCorruption(text) {
  if (!text || text.length < 50) return false;
  
  // Check for suspicious patterns that indicate font encoding issues
  const suspiciousPatterns = [
    /[a-z]{2,}\s[A-Z][a-z]+\s[a-z]{2,}/g,  // Pattern like: "fganh&6 ^QkWjsLV eSu"
    /\^[A-Z][a-z]+/g,                       // Pattern like: ^QkWjsLV
    /os[QKk]/g,                             // Common corruption pattern
    /[a-z]&\d/g,                            // Pattern like: fganh&6
    /[a-z]{3,}[A-Z][a-z]+/g,                // Mixed case nonsense
  ];
  
  let suspiciousMatches = 0;
  for (const pattern of suspiciousPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      suspiciousMatches += matches.length;
    }
  }
  
  // Check Hindi character ratio
  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const totalChars = text.length;
  const hindiRatio = hindiChars / totalChars;
  
  // If we expect Hindi but have very little Hindi + lots of suspicious patterns
  const hasLowHindiRatio = hindiRatio < 0.05;  // Less than 5% Hindi
  const hasSuspiciousPatterns = suspiciousMatches > 10;
  
  // Check for common corrupted Hindi words
  const corruptedHindiWords = [
    'fganh', 'tkno', 'eksykbZ', '^QkWjsLV', 'eSu',
    'osQ', 'izfln~', 'txg', 'gSa', 'vkSj'
  ];
  
  let corruptedWordCount = 0;
  for (const word of corruptedHindiWords) {
    if (text.includes(word)) {
      corruptedWordCount++;
    }
  }
  
  console.log(`Corruption detection: HindiRatio=${hindiRatio.toFixed(3)}, Suspicious=${suspiciousMatches}, CorruptedWords=${corruptedWordCount}`);
  
  // Decision: Text is corrupted if it has low Hindi AND (suspicious patterns OR corrupted words)
  return hasLowHindiRatio && (hasSuspiciousPatterns || corruptedWordCount >= 3);
}

// ============================================
// HELPER FUNCTION: PERFORM OCR
// ============================================
async function performOCR(fileBuffer) {
  const tempPdfPath = path.join('./temp', `upload_${Date.now()}.pdf`);
  const tempImageDir = path.join('./temp', `images_${Date.now()}`);
  
  try {
    // Create temp directories
    if (!fs.existsSync('./temp')) {
      fs.mkdirSync('./temp');
    }
    if (!fs.existsSync(tempImageDir)) {
      fs.mkdirSync(tempImageDir);
    }
    
    // Save buffer to file
    fs.writeFileSync(tempPdfPath, fileBuffer);
    
    console.log("Converting PDF to images for better OCR...");
    
    // Convert PDF pages to images using pdf2pic
    const convert = fromBuffer(fileBuffer, {
      density: 300,           // Higher DPI for better quality
      saveFilename: "page",
      savePath: tempImageDir,
      format: "png",
      width: 2480,            // A4 at 300 DPI
      height: 3508
    });
    
    // Get total pages
    const pdfData = await pdfParse(fileBuffer);
    const totalPages = pdfData.numpages;
    console.log(`Processing ${totalPages} pages...`);
    
    let allText = "";
    
    // Process each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`Processing page ${pageNum}/${totalPages}...`);
        
        // Convert page to image
        const result = await convert(pageNum, { responseType: "image" });
        const imagePath = result.path;
        
        // Perform OCR on the image with optimized settings
        const { data: { text } } = await Tesseract.recognize(
          imagePath,
          "hin+eng",
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                process.stdout.write(`\rPage ${pageNum} OCR: ${Math.round(m.progress * 100)}%`);
              }
            },
            // Optimized Tesseract parameters for Hindi textbooks
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            preserve_interword_spaces: '1'
          }
        );
        
        if (text && text.trim().length > 0) {
          allText += text + "\n\n";
          console.log(`\n✓ Page ${pageNum} completed (${text.length} chars)`);
        }
        
      } catch (pageErr) {
        console.error(`\n✗ Error on page ${pageNum}:`, pageErr.message);
        // Continue with next page
      }
    }
    
    console.log("\n✓ All pages processed successfully");
    
    // Clean the combined OCR output
    return cleanHindiText(allText);
    
  } catch (ocrErr) {
    console.error("OCR failed:", ocrErr.message);
    
    // Fallback: Try direct PDF OCR if image conversion fails
    console.log("Trying direct PDF OCR as fallback...");
    try {
      const { data: { text } } = await Tesseract.recognize(
        tempPdfPath,
        "hin+eng",
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );
      return cleanHindiText(text);
    } catch (fallbackErr) {
      throw new Error("OCR extraction failed: " + fallbackErr.message);
    }
    
  } finally {
    // Clean up temp files
    try {
      if (fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
      if (fs.existsSync(tempImageDir)) {
        const files = fs.readdirSync(tempImageDir);
        for (const file of files) {
          fs.unlinkSync(path.join(tempImageDir, file));
        }
        fs.rmdirSync(tempImageDir);
      }
    } catch (e) {
      console.error("Temp file cleanup error:", e.message);
    }
  }
}

// ============================================
// HELPER FUNCTION: CLEAN HINDI TEXT
// ============================================
function cleanHindiText(text) {
  if (!text) return "";
  
  return text
    // Step 1: Remove corrupted/replacement characters
    .replace(/��/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\u0000/g, '')
    
    // Step 2: Remove zero-width and invisible characters
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    
    // Step 3: Normalize Unicode to composed form (NFC)
    .normalize("NFC")
    
    // Step 4: Fix newlines breaking Hindi characters
    .replace(/([\u0900-\u097F])\n+(?=[\u0900-\u097F])/g, '$1')
    .replace(/\n+(?=[\u093E-\u094F\u0962-\u0963])/g, '')
    .replace(/([\u0915-\u0939\u0958-\u095F])\n+(?=[\u093E-\u094F])/g, '$1')
    .replace(/\u094D\n+/g, '\u094D')
    .replace(/\n+(?=[\u0901-\u0903])/g, '')
    .replace(/([\u0901-\u0903])\n+/g, '$1')
    
    // Step 5: Fix duplicate matras (vowel signs)
    .replace(/(\u093E){2,}/g, '$1')  // ा
    .replace(/(\u093F){2,}/g, '$1')  // ि
    .replace(/(\u0940){2,}/g, '$1')  // ी
    .replace(/(\u0941){2,}/g, '$1')  // ु
    .replace(/(\u0942){2,}/g, '$1')  // ू
    .replace(/(\u0943){2,}/g, '$1')  // ृ
    .replace(/(\u0944){2,}/g, '$1')  // ॄ
    .replace(/(\u0945){2,}/g, '$1')  // ॅ
    .replace(/(\u0946){2,}/g, '$1')  // ॆ
    .replace(/(\u0947){2,}/g, '$1')  // े
    .replace(/(\u0948){2,}/g, '$1')  // ै
    .replace(/(\u0949){2,}/g, '$1')  // ॉ
    .replace(/(\u094A){2,}/g, '$1')  // ॊ
    .replace(/(\u094B){2,}/g, '$1')  // ो
    .replace(/(\u094C){2,}/g, '$1')  // ौ
    
    // Step 6: Fix duplicate diacritical marks
    .replace(/(\u0902){2,}/g, '$1')  // ं anusvara
    .replace(/(\u0901){2,}/g, '$1')  // ँ chandrabindu
    .replace(/(\u0903){2,}/g, '$1')  // ः visarga
    
    // Step 7: Remove standalone newlines within Devanagari text
    .replace(/([\u0900-\u097F])\n(?=[\u0900-\u097F])/g, '$1')
    
    // Step 8: Fix misplaced matras (vowel before consonant)
    .replace(/([\u093E-\u094C])([\u0915-\u0939])/g, '$2$1')
    
    // Step 9: Remove extra spaces around Devanagari punctuation
    .replace(/\s+(।)/g, '$1')
    .replace(/(।)\s+/g, '$1 ')
    
    // Step 10: Clean excessive whitespace
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/\n{3}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    
    // Step 11: Fix common punctuation issues
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/([.,;:!?])\s*\n/g, '$1\n')
    
    // Step 12: Remove orphaned combining marks at start of line
    .replace(/\n[\u093E-\u094F\u0901-\u0903]/g, '\n')
    
    // Step 13: Final normalization
    .normalize("NFC")
    
    // Step 14: Trim each line
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)  // Remove empty lines
    .join('\n')
    
    // Step 15: Clean up paragraph breaks
    .replace(/\n{2,}/g, '\n\n')
    
    // Final trim
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

// --- PUBLIC APIs (No token required) ---
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