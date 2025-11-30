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

// app.get("/chapter/list/:bookId", verifyToken, async (req, res) => {
//   const chapters = await ChapterModel.find({ bookId: req.params.bookId });
//   const result = await Promise.all(chapters.map(async chap => {
//     const pdfCount = await ChapterContentModel.countDocuments({ chapterId: chap._id });
//     return { ...chap.toObject(), pdfCount };
//   }));
//   res.json({ success: true, items: result });
// });

// --- PUBLIC: Get chapters + book name + enabled features ---
app.get("/public/chapter/list/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;

    // 1. Find the book
    const book = await BookModel.findById(bookId).lean();
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    // 2. Fetch enabled features from your external API (or DB if stored locally)
    let enabledFeatures = ["chat", "notes"]; // default fallback
    try {
      const featuresRes = await fetch(
        `https://education-c0c9.onrender.com/public/book/features/${bookId}`
      );
      if (featuresRes.ok) {
        const data = await featuresRes.json();
        if (data.views && Array.isArray(data.views) && data.views.length > 0) {
          enabledFeatures = data.views;
        }
      }
    } catch (err) {
      console.warn("Could not fetch features for book:", bookId, err.message);
      // Continue with defaults
    }

    // 3. Fetch chapters
    const chapters = await ChapterModel.find({ bookId }).lean();

    const result = await Promise.all(
      chapters.map(async (chap) => {
        const pdfCount = await ChapterContentModel.countDocuments({ chapterId: chap._id });
        return {
          ...chap,
          _id: chap._id.toString(),
          pdfCount,
          hasContent: pdfCount > 0,
        };
      })
    );

    // 4. Return enriched response
    res.json({
      success: true,
      book: {
        _id: book._id.toString(),
        name: book.name,
        features: enabledFeatures, // This is what you wanted!
      },
      chapters: result,
    });
  } catch (error) {
    console.error("Error in /public/chapter/list/:bookId:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
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
// ============================================
// DYNAMIC HINDI TEXT REPAIR SYSTEM
// ============================================

function repairHindiTextForYourPDF(text) {
  if (!text) return "";
  
  console.log("🔧 Applying dynamic Hindi text repair...");
  
  let repaired = text;

  // PHASE 1: Detect and map common dynamic patterns
  const dynamicPatterns = detectDynamicPatterns(text);
  
  // PHASE 2: Apply dynamic replacements
  Object.keys(dynamicPatterns).forEach(corrupted => {
    const safePattern = corrupted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safePattern, 'g');
    repaired = repaired.replace(regex, dynamicPatterns[corrupted]);
  });

  // PHASE 3: Apply known static patterns
  repaired = applyStaticPatterns(repaired);

  // PHASE 4: Character-level fixes
  repaired = applyCharacterLevelFixes(repaired);

  console.log(`🔧 Dynamic repair completed: ${text.length} → ${repaired.length} chars`);
  
  return repaired;
}

// ============================================
// DYNAMIC PATTERN DETECTION
// ============================================

function detectDynamicPatterns(text) {
  const patterns = {};
  
  // Common Hindi word endings that get corrupted
  const commonEndings = {
    'osQ': 'के',      // Possessive
    'dks': 'को',      // Object marker
    'ls': 'से',       // From/with
    'esa': 'में',     // In
    'dh': 'की',       // Feminine possessive
    'dk': 'का',       // Masculine possessive
    'gSa': 'हैं',     // Plural verb
    'gS': 'है',       // Singular verb
    'fd': 'कि',       // That
    'rks': 'तो',      // Then
    'us': 'ने',       // Subject marker (past)
    'vkSj': 'और',     // And
  };

  // Detect these patterns in the text
  Object.keys(commonEndings).forEach(pattern => {
    if (text.includes(pattern)) {
      patterns[pattern] = commonEndings[pattern];
    }
  });

  // Detect corrupted verb patterns
  const verbPatterns = [
    { test: /[a-z]krs/g, replace: 'करते' },  // Doing
    { test: /[a-z]krh/g, replace: 'करती' },  // Doing (fem)
    { test: /[a-z]k jgs/g, replace: 'क जा रहे' }, // Continuous tense
    { test: /[a-z]k fnk/g, replace: 'क दिया' },   // Gave
  ];

  verbPatterns.forEach(({ test, replace }) => {
    if (test.test(text)) {
      const matches = text.match(test);
      if (matches) {
        matches.forEach(match => {
          patterns[match] = replace;
        });
      }
    }
  });

  console.log(`🎯 Detected ${Object.keys(patterns).length} dynamic patterns`);
  return patterns;
}

// ============================================
// STATIC PATTERN REPLACEMENTS
// ============================================

function applyStaticPatterns(text) {
  let repaired = text;
  
  const staticPatterns = {
    // File headers and common corruptions
    'fganh&6': 'हिंदी',
    'tkno': 'जादव',
    'eksykbZ': 'पायेंगे',
    'eSu': 'मैन',
    'bafM': 'इंडिया',
    'iQkWjsLV': 'फॉरेस्ट',
    
    // Remove corruption markers
    '^': '',
    '~': '',
    '&': '',
    '`': '',
    ';': '',
  };

  Object.keys(staticPatterns).forEach(pattern => {
    const safePattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safePattern, 'g');
    repaired = repaired.replace(regex, staticPatterns[pattern]);
  });

  return repaired;
}

// ============================================
// CHARACTER-LEVEL FIXES
// ============================================

function applyCharacterLevelFixes(text) {
  return text
    // Fix common character corruptions
    .replace(/kS/g, 'क्')
    .replace(/kZ/g, 'क्')
    .replace(/±/g, '्')
    .replace(/S/g, '्')
    .replace(/Z/g, '्')
    
    // Fix spacing issues
    .replace(/([\u0900-\u0963])\s+([\u093E-\u094F])/g, '$1$2')
    .replace(/([\u093E-\u094F])\s+([\u0900-\u0963])/g, '$1$2')
    
    // Clean up
    .replace(/Ã/g, '')
    .replace(/÷/g, '')
    .replace(/×/g, '');
}

// ============================================
// ENHANCED UPLOAD FUNCTION WITH SMART DETECTION
// ============================================

app.post("/upload/pdf", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { chapterId } = req.body;
    if (!chapterId || !req.file) {
      return res.status(400).json({ success: false, message: "chapterId & file required" });
    }

    console.log("🔄 Processing PDF with dynamic Hindi repair...");

    // Verify chapter exists
    const chapterExists = await ChapterModel.findById(chapterId);
    if (!chapterExists) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    let pdfData;
    try {
      pdfData = await pdfParse(req.file.buffer);
      console.log(`📊 PDF parsed: ${pdfData.numpages} pages`);
    } catch (parseError) {
      return res.status(400).json({ success: false, message: "Invalid PDF file" });
    }

    // Extract text
    let extractedText = (pdfData.text || "").trim();
    console.log(`📝 Extracted: ${extractedText.length} chars`);

    let finalText = "";
    let extractionMethod = "direct";
    let repairStats = {};

    if (extractedText.length > 50) {
      // Analyze the corruption level
      const corruptionAnalysis = analyzeCorruption(extractedText);
      console.log(`🔍 Corruption analysis:`, corruptionAnalysis);
      
      // Apply dynamic repair
      finalText = repairHindiTextForYourPDF(extractedText);
      extractionMethod = "dynamic_repair";
      repairStats = corruptionAnalysis;
    } else {
      finalText = extractedText;
      extractionMethod = "minimal_text";
    }

    // Calculate final metrics
    const hindiCharCount = (finalText.match(/[\u0900-\u097F]/g) || []).length;
    const totalChars = finalText.length;
    const hindiPercentage = totalChars > 0 ? Math.round((hindiCharCount / totalChars) * 100) : 0;

    console.log(`📈 Final: ${totalChars} chars, ${hindiPercentage}% Hindi`);

    // Save to database
    try {
      const contentData = {
        chapterId: chapterId,
        content: finalText,
        fileName: req.file.originalname,
        size: req.file.size,
        extractionMethod: extractionMethod,
        qualityMetrics: {
          totalChars,
          hindiChars: hindiCharCount,
          hindiPercentage,
          pages: pdfData.numpages,
          repairStats: repairStats
        }
      };

      await ChapterContentModel.findOneAndUpdate(
        { chapterId: chapterId },
        contentData,
        { upsert: true, new: true }
      );

      console.log("✅ Content saved to database");

    } catch (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to save to database" 
      });
    }

    res.json({ 
      success: true, 
      message: "PDF processed with dynamic Hindi repair",
      extractionMethod,
      stats: {
        totalLength: finalText.length,
        pages: pdfData.numpages,
        hindiChars: hindiCharCount,
        hindiPercentage: hindiPercentage,
        repairStats: repairStats
      }
    });
    
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ 
      success: false, 
      message: `Upload failed: ${err.message}` 
    });
  }
});

// ============================================
// CORRUPTION ANALYSIS FUNCTION
// ============================================

function analyzeCorruption(text) {
  const commonPatterns = [
    'osQ', 'dks', 'ls', 'esa', 'dh', 'dk', 'gSa', 'gS', 'fd', 'rks', 'us', 'vkSj'
  ];
  
  let detectedPatterns = [];
  let patternCount = 0;
  
  commonPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      detectedPatterns.push(pattern);
      patternCount += (text.match(new RegExp(pattern, 'g')) || []).length;
    }
  });

  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const totalChars = text.length;
  const hindiRatio = totalChars > 0 ? hindiChars / totalChars : 0;

  return {
    detectedPatterns,
    patternCount,
    totalPatterns: commonPatterns.length,
    hindiChars,
    totalChars,
    hindiRatio: Math.round(hindiRatio * 100),
    corruptionLevel: patternCount > 10 ? 'high' : patternCount > 5 ? 'medium' : 'low'
  };
}

// ============================================
// SPECIALIZED HINDI TEXT REPAIR FOR YOUR PDF
// ============================================
// ============================================
// SPECIALIZED HINDI TEXT REPAIR FOR YOUR PDF
// ============================================


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

// ADD THIS ENDPOINT TO YOUR index.js (after models, before app.listen)

// POST /chapter/content/direct
// Upload or update chapter content as plain text (NO PDF needed)
// fileName is completely optional now
app.post("/chapter/content/direct", verifyToken, async (req, res) => {
  try {
    const { chapterId, content, fileName } = req.body;

    // Required fields
    if (!chapterId || content === undefined) {
      return res.status(400).json({
        success: false,
        message: "chapterId and content are required",
      });
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "content must be a non-empty string",
      });
    }

    // Validate chapter exists
    const chapter = await ChapterModel.findById(chapterId);
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Chapter not found",
      });
    }

    const cleanContent = cleanHindiText(content.trim());

    // Auto-generate fileName if not provided
    const displayFileName = fileName?.trim()
      ? fileName.trim()
      : `Manual Text - ${new Date().toLocaleDateString("en-IN")}`;

    const hindiChars = (cleanContent.match(/[\u0900-\u097F]/g) || []).length;
    const totalChars = cleanContent.length;
    const hindiPercentage = totalChars > 0 ? Math.round((hindiChars / totalChars) * 100) : 0;

    const contentData = {
      chapterId,
      content: cleanContent,
      fileName: displayFileName,
      size: Buffer.byteLength(cleanContent, "utf8"),
      extractionMethod: "direct_text",
      qualityMetrics: {
        totalChars,
        hindiChars,
        hindiPercentage,
        pages: null,
        source: "manual_entry",
        uploadedAt: new Date(),
      },
    };

    await ChapterContentModel.findOneAndUpdate(
      { chapterId },
      contentData,
      { upsert: true, new: true }
    );

    console.log(`Direct text saved → Chapter: ${chapterId} | ${totalChars} chars | ${hindiPercentage}% Hindi`);

    res.json({
      success: true,
      message: "Chapter content saved successfully (direct text)",
      extractionMethod: "direct_text",
      fileName: displayFileName,
      stats: {
        totalLength: totalChars,
        hindiChars,
        hindiPercentage,
      },
    });
  } catch (error) {
    console.error("Direct text upload failed:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));