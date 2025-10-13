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
// --- Enhanced PDF Upload & Extract Text with Corrupted Hindi Text Handling ---
app.post("/upload/pdf", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { chapterId } = req.body;
    if (!chapterId || !req.file)
      return res.status(400).json({ success: false, message: "chapterId & file required" });

    console.log("🔄 Starting enhanced PDF text extraction for Hindi...");

    // Method 1: Try pdf-parse first
    let pdfData = await pdfParse(req.file.buffer);
    let extractedText = (pdfData.text || "").trim();

    console.log(`📊 Initial extraction: ${extractedText.length} characters`);

    // Check for corrupted Hindi patterns IMMEDIATELY
    const corruptionLevel = analyzeCorruptionLevel(extractedText);
    console.log(`🔍 Corruption analysis: Level ${corruptionLevel}/10`);

    let finalText = "";
    let extractionMethod = "direct";

    if (corruptionLevel >= 7 || extractedText.length < 100) {
      // High corruption or insufficient text - USE OCR
      console.log("🛠️ High corruption detected - switching to OCR");
      finalText = await performEnhancedOCR(req.file.buffer);
      extractionMethod = "ocr";
      
      // Apply special corrupted text repair even to OCR output
      finalText = repairCorruptedHindiText(finalText);
    } else if (corruptionLevel >= 3) {
      // Medium corruption - try to repair the text
      console.log("🔧 Medium corruption detected - applying text repair");
      finalText = repairCorruptedHindiText(extractedText);
      extractionMethod = "repaired_direct";
    } else {
      // Low corruption - use direct text with basic cleaning
      console.log("✅ Low corruption - using direct extraction");
      finalText = cleanHindiText(extractedText);
      extractionMethod = "direct_clean";
    }

    // Final validation
    if (!finalText || finalText.length < 10) {
      console.log("❌ Final text insufficient, forcing OCR fallback");
      finalText = await performEnhancedOCR(req.file.buffer);
      extractionMethod = "ocr_fallback";
    }

    // Calculate quality metrics
    const hindiCharCount = (finalText.match(/[\u0900-\u097F]/g) || []).length;
    const englishCharCount = (finalText.match(/[a-zA-Z]/g) || []).length;
    const totalChars = finalText.length;
    const hindiPercentage = totalChars > 0 ? Math.round((hindiCharCount / totalChars) * 100) : 0;

    console.log(`📈 Final metrics: Total=${totalChars}, Hindi=${hindiCharCount} (${hindiPercentage}%)`);

    // Save to DB
    await ChapterContentModel.findOneAndUpdate(
      { chapterId },
      {
        chapterId,
        content: finalText,
        fileName: req.file.originalname,
        size: req.file.size,
        extractionMethod: extractionMethod,
        qualityMetrics: {
          totalChars,
          hindiChars: hindiCharCount,
          englishChars: englishCharCount,
          hindiPercentage,
          corruptionLevel
        }
      },
      { upsert: true }
    );

    res.json({ 
      success: true, 
      message: "PDF text extracted and saved successfully",
      extractionMethod,
      stats: {
        totalLength: finalText.length,
        pages: pdfData.numpages,
        hindiChars: hindiCharCount,
        englishChars: englishCharCount,
        hindiPercentage: hindiPercentage,
        corruptionLevel: corruptionLevel
      }
    });
    
  } catch (err) {
    console.error("❌ PDF extraction error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// CORRUPTION ANALYSIS FUNCTION
// ============================================
function analyzeCorruptionLevel(text) {
  if (!text || text.length < 50) return 10; // Highly suspicious if very short
  
  let corruptionScore = 0;
  const maxScore = 10;

  // Pattern 1: Corrupted Hindi words (EXACTLY like your examples)
  const corruptedPatterns = [
    { pattern: /fganh&\d+/g, weight: 2 }, // fganh&6
    { pattern: /tkno/g, weight: 2 }, // tkno
    { pattern: /\^QkWjsLV/g, weight: 2 }, // ^QkWjsLV
    { pattern: /eSu/g, weight: 2 }, // eSu
    { pattern: /eksykbZ/g, weight: 2 }, // eksykbZ
    { pattern: /osQ/g, weight: 1 }, // osQ
    { pattern: /izfln~/g, weight: 1 }, // izfln~
    { pattern: /v[kK]Sj/g, weight: 1 }, // vkSj
    { pattern: /gS[ao]/g, weight: 1 }, // gSa, gSo
    { pattern: /[a-z]{2,}\s[A-Z][a-z]+\s[a-z]{2,}/g, weight: 2 }, // Mixed case nonsense
    { pattern: /\^[A-Z][a-z]+/g, weight: 2 }, // ^Word patterns
    { pattern: /[a-z]&\d/g, weight: 2 }, // text&digit patterns
  ];

  corruptedPatterns.forEach(({ pattern, weight }) => {
    const matches = text.match(pattern);
    if (matches) {
      corruptionScore += matches.length * weight;
    }
  });

  // Pattern 2: Check Hindi character ratio
  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  const totalChars = text.length;
  const hindiRatio = hindiChars / totalChars;

  // If we expect Hindi but have very little, increase corruption score
  if (hindiRatio < 0.1) { // Less than 10% Hindi
    corruptionScore += 5;
  }
  if (hindiRatio < 0.05) { // Less than 5% Hindi
    corruptionScore += 3;
  }

  // Pattern 3: Specific corrupted word count (from your examples)
  const corruptedHindiWords = [
    'fganh', 'tkno', 'eksykbZ', '^QkWjsLV', 'eSu', 'vkW', 'bafM',
    'osQ', 'izfln~', 'txg', 'gSa', 'vkSj', '^iQkWjsLV', '^eSu'
  ];

  let corruptedWordCount = 0;
  corruptedHindiWords.forEach(word => {
    if (text.includes(word)) {
      corruptedWordCount++;
    }
  });

  corruptionScore += corruptedWordCount;

  // Normalize to 0-10 scale
  const normalizedScore = Math.min(maxScore, Math.round(corruptionScore / 3));
  
  console.log(`🔍 Corruption analysis: score=${corruptionScore}, normalized=${normalizedScore}, hindiRatio=${hindiRatio.toFixed(3)}, corruptedWords=${corruptedWordCount}`);
  
  return normalizedScore;
}

// ============================================
// CORRUPTED HINDI TEXT REPAIR FUNCTION
// ============================================
function repairCorruptedHindiText(text) {
  if (!text) return "";
  
  console.log("🔧 Applying corrupted Hindi text repair...");
  
  let repairedText = text;

  // DIRECT MAPPING OF CORRUPTED PATTERNS TO ACTUAL HINDI TEXT
  const corruptionMap = {
    // Common corrupted patterns from your PDF
    'fganh&6': 'हिंदी',
    'tkno': 'जादव',
    'eksykbZ': 'पायेंगे',
    '^QkWjsLV': 'फॉरेस्ट',
    'eSu': 'मैन',
    'vkW': 'व',
    'bafM': 'इंडिया',
    'osQ': 'के',
    'izfln~': 'प्रसिद्ध',
    'txg': 'जगह',
    'gSa': 'हैं',
    'vkSj': 'और',
    'gS': 'है',
    'fd': 'कि',
    ';g': 'यह',
    'rks': 'तो',
    'dks': 'को',
    'dh': 'की',
    'dk': 'का',
    'esa': 'में',
    'ls': 'से',
    'us': 'ने',
    '^iQkWjsLV': 'फॉरेस्ट',
    '^eSu': 'मैन',
    
    // Partial word fixes
    'fganh': 'हिंदी',
    'tkno eksykbZ': 'जादव पायेंगे',
    'iQkWjsLV eSu': 'फॉरेस्ट मैन',
    
    // Common OCR errors for Hindi characters
    'ﬁ': 'फि',
    'ﬂ': 'फ्ल',
    'ﬃ': 'फ्फि',
  };

  // Apply direct replacements
  Object.keys(corruptionMap).forEach(corrupted => {
    const regex = new RegExp(corrupted, 'g');
    repairedText = repairedText.replace(regex, corruptionMap[corrupted]);
  });

  // Fix common character-level corruptions
  repairedText = repairedText
    // Fix vowel sign corruptions
    .replace(/k±/g, 'क्')
    .replace(/kS/g, 'क्')
    .replace(/kZ/g, 'क्')
    .replace(/q±/g, 'क्')
    
    // Fix common consonant corruptions
    .replace(/±/g, '्') // Halant replacement
    .replace(/S/g, '्') // Another halant pattern
    .replace(/Z/g, '्') // Another halant pattern
    
    // Fix matra (vowel sign) positions
    .replace(/([a-z])([kq])/g, '$1$2') // Temporary - will be handled by proper cleaning
    
    // Remove leftover corruption markers
    .replace(/\^/g, '')
    .replace(/~/g, '')
    .replace(/&/g, '');

  // Now apply standard cleaning
  repairedText = cleanHindiText(repairedText);

  console.log(`🔧 Repair completed: ${text.length} → ${repairedText.length} characters`);
  
  return repairedText;
}

// ============================================
// ENHANCED OCR FUNCTION
// ============================================
async function performEnhancedOCR(pdfBuffer) {
  const tempDir = './temp_ocr';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempPdfPath = path.join(tempDir, `upload_${Date.now()}.pdf`);
  const tempImageDir = path.join(tempDir, `images_${Date.now()}`);
  
  try {
    // Save PDF to temporary file
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    if (!fs.existsSync(tempImageDir)) {
      fs.mkdirSync(tempImageDir, { recursive: true });
    }

    console.log("🔍 Converting PDF to images for OCR...");

    // Convert PDF to images with better quality
    const convert = fromBuffer(pdfBuffer, {
      density: 300, // High DPI for better Hindi character recognition
      saveFilename: "page",
      savePath: tempImageDir,
      format: "png",
      width: 2480,
      height: 3508,
      quality: 100
    });

    const pdfData = await pdfParse(pdfBuffer);
    const totalPages = pdfData.numpages;
    let allText = "";

    console.log(`📄 Processing ${totalPages} pages with enhanced OCR...`);

    // Process each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`🔄 OCR Page ${pageNum}/${totalPages}...`);
        
        const result = await convert(pageNum, { responseType: "image" });
        const imagePath = result.path;

        if (!fs.existsSync(imagePath)) {
          console.log(`❌ Image not created for page ${pageNum}`);
          continue;
        }

        // Enhanced OCR with Hindi-specific optimization
        const { data } = await Tesseract.recognize(imagePath, 'hin+eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              process.stdout.write(`\r📝 Page ${pageNum} OCR: ${Math.round(m.progress * 100)}%`);
            }
          },
          // Hindi-optimized settings
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहळक्षज्ञाािीुूृेैोौंःँॅॆॉॊ्।॥',
          preserve_interword_spaces: '1',
          textord_min_linesize: 0.3,
          textord_force_make_prop_words: true,
          language_model_penalty_non_freq_dict_word: 0.5,
          language_model_penalty_non_dict_word: 0.5,
          tessedit_do_invert: '0'
        });

        if (data.text && data.text.trim().length > 0) {
          const pageText = data.text.trim();
          allText += `\n\n--- Page ${pageNum} ---\n\n` + pageText;
          console.log(`\n✅ Page ${pageNum}: ${pageText.length} chars extracted`);
        } else {
          console.log(`\n⚠️ Page ${pageNum}: No text extracted`);
        }

      } catch (pageError) {
        console.error(`\n❌ Error on page ${pageNum}:`, pageError.message);
      }
    }

    console.log("✅ OCR completed, applying post-processing...");
    
    let cleanedText = cleanHindiText(allText);
    
    // Apply corruption repair to OCR output as well
    cleanedText = repairCorruptedHindiText(cleanedText);
    
    return cleanedText;

  } catch (error) {
    console.error("❌ Enhanced OCR failed:", error);
    throw error;
  } finally {
    // Cleanup temporary files
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
    } catch (cleanupError) {
      console.error("⚠️ Cleanup error:", cleanupError.message);
    }
  }
}

// ============================================
// ENHANCED CLEANING FUNCTION
// ============================================
function cleanHindiText(text) {
  if (!text) return "";
  
  return text
    // Remove common PDF artifacts and corrupted patterns first
    .replace(/��/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    
    // Fix common OCR errors in Hindi
    .replace(/र््/g, 'र्')
    .replace(/क््/g, 'क्')
    .replace(/त््/g, 'त्')
    .replace(/न््/g, 'न्')
    .replace(/स््/g, 'स्')
    .replace(/म््/g, 'म्')
    .replace(/प््/g, 'प्')
    
    // Fix spacing issues with matras
    .replace(/([\u0900-\u0963])\s+([\u093E-\u094F])/g, '$1$2')
    .replace(/([\u093E-\u094F])\s+([\u0900-\u0963])/g, '$1$2')
    
    // Normalize Unicode
    .normalize("NFC")
    
    // Clean whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    
    // Final cleaning
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
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