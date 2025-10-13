// index.js
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
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
  size: Number,
  extractionMethod: String,
  qualityMetrics: Object
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

// ============================================
// FINAL PDF UPLOAD FUNCTION FOR RENDER.COM
// ============================================
app.post("/upload/pdf", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { chapterId } = req.body;
    if (!chapterId || !req.file) {
      return res.status(400).json({ success: false, message: "chapterId & file required" });
    }

    console.log("🔄 Processing Hindi PDF on Render...");

    // Verify chapter exists
    const chapterExists = await ChapterModel.findById(chapterId);
    if (!chapterExists) {
      console.log("❌ Chapter not found:", chapterId);
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    let pdfData;
    try {
      pdfData = await pdfParse(req.file.buffer);
      console.log(`📊 PDF parsed: ${pdfData.numpages} pages`);
    } catch (parseError) {
      console.error("PDF parse error:", parseError);
      return res.status(400).json({ success: false, message: "Invalid PDF file" });
    }

    // Extract text using pdf-parse (pure JavaScript - works on Render)
    let extractedText = (pdfData.text || "").trim();
    console.log(`📝 Extracted: ${extractedText.length} chars`);

    let finalText = "";
    let extractionMethod = "direct";
    let warning = "";

    if (extractedText.length > 50) {
      // We have text - repair the corrupted Hindi
      console.log("🔧 Repairing corrupted Hindi text...");
     try {
  finalText = repairHindiTextForYourPDF(extractedText);
  extractionMethod = "hindi_repaired";
} catch (repairError) {
  console.error("Text repair failed, using original text:", repairError);
  finalText = cleanHindiText(extractedText);
  extractionMethod = "direct_clean_fallback";
  warning = "Text repair failed, using original text";
}
      extractionMethod = "hindi_repaired";
      
      // Check if repair was successful
      const hindiChars = (finalText.match(/[\u0900-\u097F]/g) || []).length;
      if (hindiChars === 0) {
        warning = "Text extracted but may be image-based PDF";
      }
    } else {
      // Very little text - likely scanned PDF
      finalText = "📄 This PDF appears to be image-based (scanned). Limited text extraction available.\n\n" + extractedText;
      extractionMethod = "scanned_pdf";
      warning = "Image-based PDF - limited text extraction";
    }

    // Calculate quality metrics
    const hindiCharCount = (finalText.match(/[\u0900-\u097F]/g) || []).length;
    const englishCharCount = (finalText.match(/[a-zA-Z]/g) || []).length;
    const totalChars = finalText.length;
    const hindiPercentage = totalChars > 0 ? Math.round((hindiCharCount / totalChars) * 100) : 0;

    console.log(`📈 Final metrics: Total=${totalChars}, Hindi=${hindiCharCount} (${hindiPercentage}%)`);

    // Save to DB with better error handling
    try {
      const contentData = {
        chapterId: chapterId,
        content: finalText,
        fileName: req.file.originalname,
        size: req.file.size,
        extractionMethod: extractionMethod,
        qualityMetrics: {
          totalChars: finalText.length,
          pages: pdfData.numpages,
          hindiChars: hindiCharCount,
          englishChars: englishCharCount,
          hindiPercentage: hindiPercentage,
          originalTextLength: extractedText.length,
          warning: warning
        }
      };

      console.log("💽 Saving to database...");

      const result = await ChapterContentModel.findOneAndUpdate(
        { chapterId: chapterId },
        contentData,
        { 
          upsert: true, 
          new: true,
          runValidators: true 
        }
      );

      console.log("✅ Content saved to database, ID:", result._id);

    } catch (dbError) {
      console.error("❌ Database save error:", dbError);
      return res.status(500).json({ 
        success: false, 
        message: `Database error: ${dbError.message}` 
      });
    }

    res.json({ 
      success: true, 
      message: "PDF text extracted and saved successfully" + (warning ? " - " + warning : ""),
      extractionMethod,
      stats: {
        totalLength: finalText.length,
        pages: pdfData.numpages,
        hindiChars: hindiCharCount,
        englishChars: englishCharCount,
        hindiPercentage: hindiPercentage,
        warning: warning || "None"
      }
    });
    
  } catch (err) {
    console.error("❌ PDF upload error:", err);
    res.status(500).json({ 
      success: false, 
      message: `Upload failed: ${err.message}` 
    });
  }
});

// ============================================
// SPECIALIZED HINDI TEXT REPAIR FOR YOUR PDF
// ============================================
// ============================================
// SPECIALIZED HINDI TEXT REPAIR FOR YOUR PDF
// ============================================
function repairHindiTextForYourPDF(text) {
  if (!text) return "";
  
  console.log("🔧 Applying specialized Hindi text repair...");
  
  let repaired = text;

  // COMPREHENSIVE CORRUPTION MAPPING FOR YOUR SPECIFIC PDF
  // Using only safe characters in the corruption map
  const corruptionMap = {
    // Header and title corruptions
    'fganh&6': 'हिंदी',
    
    // Name corruptions
    'tkno': 'जादव',
    'eksykbZ': 'पायेंगे',
    
    // English word corruptions
    '\\^QkWjsLV': 'फॉरेस्ट', // Escape the ^ character
    'iQkWjsLV': 'फॉरेस्ट',
    'eSu': 'मैन',
    'bafM': 'इंडिया',
    '\\^eSu': 'मैन', // Escape the ^ character
    
    // Common Hindi word corruptions (safe ones only)
    'osQ': 'के',
    'txg': 'जगह',
    'gSa': 'हैं',
    'vkSj': 'और',
    'gS': 'है',
    'fd': 'कि',
    'rks': 'तो',
    'dks': 'को',
    'dh': 'की',
    'dk': 'का',
    'esa': 'में',
    'ls': 'से',
    'us': 'ने',
    'vius': 'अपने',
    'clk': 'बसा',
    'gqvk': 'हुआ',
    'fy,': 'लिए',
    'fofHkUu': 'विभिन्न',
    'ns[kus': 'देखने',
    'feyrs': 'मिलते',
    'i;ZVd': 'पर्यटक',
    'vkrs': 'आते',
    'dj': 'कर',
    'nsrh': 'देती',
    'gekjh': 'हमारी',
    'ij': 'पर',
    'lHkh': 'सभी',
    'ilan': 'पसंद',
    'djrs': 'करते',
    'ysfdu': 'लेकिन',
    'buesa': 'इनमें',
    'oqQN': 'कुछ',
    'yksx': 'लोग',
    'tks': 'जो',
    'dke': 'काम',
    'ugha': 'नहीं',
    'lR;': 'सत्य',
    'vle': 'असम',
    'xk¡o': 'गाँव',
    'jgus': 'रहने',
    'okys': 'वाले',
    'eglwl': 'महसूस',
    'fd;k': 'किया',
    'vuwBk': 'अनूठा',
    'dne': 'कदम',
    'mBk;k': 'उठाया'
  };

  // Apply replacements safely
  Object.keys(corruptionMap).forEach(corrupted => {
    try {
      // Escape any special regex characters
      const escapedCorrupted = corrupted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedCorrupted, 'g');
      repaired = repaired.replace(regex, corruptionMap[corrupted]);
    } catch (error) {
      console.log(`⚠️ Skipping invalid pattern: ${corrupted}`, error.message);
    }
  });

  // Remove problematic patterns that might cause regex issues
  repaired = repaired
    .replace(/izfln~/g, 'प्रसिद्ध') // Handle separately
    .replace(/;/g, '') // Remove semicolons that might cause issues
    .replace(/`/g, '') // Remove backticks
    .replace(/~/g, '') // Remove tildes
    .replace(/\^/g, '') // Remove carets
    .replace(/&/g, '') // Remove ampersands
    .replace(/kS/g, 'क्')
    .replace(/kZ/g, 'क्')
    .replace(/±/g, '्')
    .replace(/S/g, '्')
    .replace(/Z/g, '्')
    .replace(/Ã/g, '')
    .replace(/÷/g, '')
    .replace(/×/g, '');

  // Clean up the text
  repaired = cleanHindiText(repaired);

  console.log(`🔧 Repair completed: ${text.length} → ${repaired.length} characters`);
  
  return repaired;
}

// ============================================
// CLEANING FUNCTION
// ============================================
function cleanHindiText(text) {
  if (!text) return "";
  
  return text
    // Remove common PDF artifacts
    .replace(/��/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\u0000/g, '')
    
    // Clean whitespace
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    
    // Fix common spacing issues
    .replace(/([\u0900-\u0963])\s+([\u093E-\u094F])/g, '$1$2')
    .replace(/([\u093E-\u094F])\s+([\u0900-\u0963])/g, '$1$2')
    
    // Normalize Unicode
    .normalize("NFC")
    
    // Final cleaning
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();
}

// ============================================
// DEBUG ENDPOINTS
// ============================================
app.get("/debug/db-check", async (req, res) => {
  try {
    const totalChapters = await ChapterModel.countDocuments();
    const totalContent = await ChapterContentModel.countDocuments();
    const allContent = await ChapterContentModel.find().select('chapterId fileName content extractionMethod createdAt');
    
    const contentSummary = allContent.map(item => ({
      chapterId: item.chapterId,
      fileName: item.fileName,
      contentLength: item.content?.length || 0,
      extractionMethod: item.extractionMethod,
      createdAt: item.createdAt
    }));

    res.json({
      success: true,
      database: {
        totalChapters,
        totalContent,
        contentSummary
      }
    });
  } catch (error) {
    console.error("Debug DB check error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/debug/content/:chapterId", async (req, res) => {
  try {
    const content = await ChapterContentModel.findOne({ chapterId: req.params.chapterId });
    
    if (!content) {
      return res.json({
        success: true,
        content: null,
        message: "No content found for this chapter"
      });
    }
    
    res.json({
      success: true,
      content: {
        chapterId: content.chapterId,
        content: content.content,
        fileName: content.fileName,
        extractionMethod: content.extractionMethod,
        contentLength: content.content.length,
        first200Chars: content.content.substring(0, 200)
      }
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// CONTENT RETRIEVAL ENDPOINTS
// ============================================
app.get("/public/content/:chapterId", async (req, res) => {
  try {
    const content = await ChapterContentModel.findOne({ chapterId: req.params.chapterId });
    
    if (!content) {
      return res.json({ 
        success: true, 
        content: null,
        message: "No content available for this chapter" 
      });
    }
    
    res.json({ 
      success: true, 
      content: {
        chapterId: content.chapterId,
        content: content.content,
        fileName: content.fileName,
        size: content.size,
        extractionMethod: content.extractionMethod,
        qualityMetrics: content.qualityMetrics,
        createdAt: content.createdAt
      }
    });
  } catch (error) {
    console.error("Error fetching content:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/public/content/multiple", async (req, res) => {
  try {
    const { chapterIds } = req.body;
    if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
      return res.status(400).json({ success: false, message: "chapterIds array required" });
    }

    const items = await ChapterContentModel.find({ chapterId: { $in: chapterIds } });
    
    const formattedItems = items.map(item => ({
      chapterId: item.chapterId,
      content: item.content,
      fileName: item.fileName,
      size: item.size,
      extractionMethod: item.extractionMethod,
      qualityMetrics: item.qualityMetrics
    }));
    
    const combinedText = items.map(i => i.content).join("\n\n");

    res.json({ 
      success: true, 
      combinedText,
      items: formattedItems,
      count: items.length,
      message: items.length > 0 ? 
        `Found content for ${items.length} chapters` : 
        "No content found for the specified chapters"
    });
  } catch (error) {
    console.error("Error fetching multiple contents:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --- Get multiple chapters content (with auth) ---
app.post("/content/multiple", verifyToken, async (req, res) => {
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

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));