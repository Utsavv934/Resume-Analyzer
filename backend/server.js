import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import pdf from 'pdf-parse';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import Resume from './models/Resume.js';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());

// Set up multer for memory storage file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Limit 5MB
});

// Database connection & fallback
let isMongoConnected = false;
let resumesDbFallback = []; // In-memory database fallback
let usersDbFallback = [];   // In-memory users fallback for demo mode

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/resume-analyzer';
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    isMongoConnected = true;
    console.log('MongoDB connected successfully.');
  } catch (error) {
    isMongoConnected = false;
    console.warn('MongoDB connection failed. App will run in local-memory fallback mode.');
    console.warn('Error detail:', error.message);
  }
};

await connectDB();

const JWT_SECRET = process.env.JWT_SECRET || 'resume_analyzer_secret_key';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// SMTP Mail Configuration Setup
const hasSmtpConfig = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
let transporter = null;
let etherealAccount = null;

const initTransporter = async () => {
  if (hasSmtpConfig) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('Nodemailer SMTP transporter initialized.');
  } else {
    try {
      console.log('Generating temporary Ethereal SMTP test account...');
      etherealAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: etherealAccount.smtp.host,
        port: etherealAccount.smtp.port,
        secure: etherealAccount.smtp.secure,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass
        }
      });
      console.log('Nodemailer test SMTP transporter initialized (Ethereal Email).');
      console.log(`Test Mail Inbox: ${etherealAccount.web}`);
    } catch (err) {
      console.warn('Failed to create Ethereal testing account. Reset links will log to console log fallback. Error:', err.message);
    }
  }
};

await initTransporter();

// JWT authentication verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  try {
    // If running in in-memory fallback, handle mock JWT tokens
    if (!isMongoConnected && token.startsWith('mock-token-')) {
      const userId = token.substring(11);
      req.user = { id: userId };
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Session expired. Please log in again.' });
  }
};

// Initialize Google Gemini AI if API key is present
const hasGeminiKey = !!process.env.GEMINI_API_KEY;
let ai = null;
if (hasGeminiKey) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log('Google Gemini AI initialized.');
} else {
  console.warn('GEMINI_API_KEY is missing in .env. Server will run in Demo Mode with mock responses.');
}

// Prompt generator helper
const getAnalysisPrompt = (resumeText, jobDescription = '') => {
  return `
You are an expert ATS (Applicant Tracking System) software and professional resume writer.
Your job is to analyze the following resume text and provide a structured review.
If a Job Description is provided below, you must also compare the resume against the job description and calculate a matching score and key gap analysis.

RESUME TEXT:
"""
${resumeText}
"""

${jobDescription ? `TARGET JOB DESCRIPTION:\n"""\n${jobDescription}\n"""` : ''}

You MUST return a JSON object with the following structure. Do not output markdown other than the JSON block. Ensure it is valid JSON.

JSON Schema:
{
  "score": <number between 0 and 100 representing overall quality>,
  "summary": "<string: concise professional summary of the candidate's profile>",
  "strengths": [<array of strings: key strengths found in the resume>],
  "improvements": [<array of strings: key recommendations to improve the resume content or presentation>],
  "skills": [<array of strings: key technologies, frameworks, or soft skills identified>],
  "formattingFeedback": "<string: feedback on formatting, layout, structure, readability>",
  "jobMatch": {
    "score": <number between 0 and 100 if job description is provided, else null>,
    "gaps": [<array of strings: skills/requirements present in job description but missing/weak in resume, or empty array if no job description>],
    "recommendations": [<array of strings: specific suggestions to tailor the resume for this job, or empty array if no job desc>]
  },
  "actionPlan": [<array of strings: a prioritized checklist of next steps for the job seeker>]
}
`;
};

// Help helper for Mock / Demo mode responses
const getMockAnalysis = (fileName, jobDesc = '') => {
  return {
    score: 78,
    summary: "This is a demo analysis. Connect your Gemini API Key in backend/.env to get real AI analysis.",
    strengths: [
      "Well-organized contact information and sections",
      "Clear chronological list of work experience",
      "Mentions modern tech stack (React, Node.js, JavaScript)"
    ],
    improvements: [
      "Quantify your accomplishments (e.g. change 'Built a website' to 'Built responsive website improving page speed by 40%')",
      "Include a strong professional summary at the top",
      "Provide more details on specific projects and outcomes"
    ],
    skills: ["React", "Node.js", "JavaScript", "Express", "Git", "CSS", "HTML"],
    formattingFeedback: "Overall clean design. Ensure margins are consistent and use bullet points instead of paragraphs for experience.",
    jobMatch: jobDesc ? {
      score: 65,
      gaps: ["No explicit database optimization mentioned", "Lacks unit testing coverage"],
      recommendations: ["Incorporate terms like 'MongoDB', 'REST APIs', and 'Jest' if you have experience with them."]
    } : {
      score: null,
      gaps: [],
      recommendations: []
    },
    actionPlan: [
      "Get a Gemini API key from Google AI Studio",
      "Add 'GEMINI_API_KEY=...' to backend/.env and restart backend",
      "Re-upload your resume to get instant, accurate, customized AI analysis!"
    ]
  };
};

// Routes

// --- Authentication Routes ---

// 0. Config Route (Exposes public environment flags)
app.get('/api/auth/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null
  });
});

// 1. Register Route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (isMongoConnected) {
      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'A user with this email already exists.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create and save user
      const user = new User({ email: email.toLowerCase(), password: hashedPassword });
      await user.save();

      // Sign JWT token
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
      
      res.status(201).json({
        success: true,
        token,
        user: { id: user._id, email: user.email }
      });
    } else {
      // In-memory fallback mode
      const existingUser = usersDbFallback.find(u => u.email === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: 'A user with this email already exists.' });
      }

      const id = new mongoose.Types.ObjectId().toString();
      const newUser = {
        _id: id,
        email: email.toLowerCase(),
        password: password, // Store password for comparison
        createdAt: new Date()
      };
      usersDbFallback.push(newUser);

      const token = `mock-token-${id}`;
      res.status(201).json({
        success: true,
        token,
        user: { id, email: newUser.email }
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An error occurred during registration.' });
  }
});

// 2. Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (isMongoConnected) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({
        success: true,
        token,
        user: { id: user._id, email: user.email }
      });
    } else {
      // In-memory fallback
      const user = usersDbFallback.find(u => u.email === email.toLowerCase() && u.password === password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = `mock-token-${user._id}`;
      res.json({
        success: true,
        token,
        user: { id: user._id, email: user.email }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login.' });
  }
});

// 3. Profile Me Route
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    if (isMongoConnected) {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.json({ success: true, user: { id: user._id, email: user.email } });
    } else {
      const user = usersDbFallback.find(u => u._id === req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.json({ success: true, user: { id: user._id, email: user.email } });
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'An error occurred retrieving user profile.' });
  }
});

// 4. Google Auth Route
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, isMockGoogle } = req.body;
    
    let email = '';
    let googleId = '';
    
    // Real Google OAuth verification
    if (process.env.GOOGLE_CLIENT_ID && credential && !isMockGoogle) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      email = payload.email.toLowerCase();
      googleId = payload.sub;
    } else {
      // Fallback / Mock Google OAuth (e.g. for simple local testing)
      if (credential) {
        // If they sent a mock token
        email = credential.toLowerCase(); // Use credential as mock email
        googleId = `mock-google-id-${email}`;
      } else {
        return res.status(400).json({ error: 'Google credential token is required.' });
      }
    }
    
    let user = null;
    
    if (isMongoConnected) {
      // Find user by email or googleId
      user = await User.findOne({ $or: [{ email }, { googleId }] });
      
      if (!user) {
        // Create a new user (password-less)
        user = new User({
          email,
          googleId,
          createdAt: new Date()
        });
        await user.save();
      } else if (!user.googleId) {
        // If user existed with regular password, link their Google account
        user.googleId = googleId;
        await user.save();
      }
      
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({
        success: true,
        token,
        user: { id: user._id, email: user.email }
      });
    } else {
      // Fallback in-memory mode
      user = usersDbFallback.find(u => u.email === email || u.googleId === googleId);
      if (!user) {
        const id = new mongoose.Types.ObjectId().toString();
        user = {
          _id: id,
          email,
          googleId,
          createdAt: new Date()
        };
        usersDbFallback.push(user);
      }
      
      const token = `mock-token-${user._id}`;
      res.json({
        success: true,
        token,
        user: { id: user._id, email: user.email }
      });
    }
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Google.' });
  }
});

// 5. Forgot Password Route (Prints reset URL to console log)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetExpires = Date.now() + 3600000; // 1 hour from now
    
    let userFound = false;
    
    if (isMongoConnected) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetExpires;
        await user.save();
        userFound = true;
      }
    } else {
      const idx = usersDbFallback.findIndex(u => u.email === email.toLowerCase());
      if (idx !== -1) {
        usersDbFallback[idx].resetPasswordToken = resetToken;
        usersDbFallback[idx].resetPasswordExpires = resetExpires;
        userFound = true;
      }
    }
    
    // Log the link to the terminal console
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    let emailSent = false;
    let transportError = '';
    let testMessageUrl = '';

    if ((hasSmtpConfig || etherealAccount) && transporter) {
      try {
        const mailOptions = {
          from: process.env.SMTP_FROM || (etherealAccount ? `"ResumeAI Pro" <${etherealAccount.user}>` : 'ResumeAI Pro <noreply@resumeai.com>'),
          to: email.toLowerCase(),
          subject: 'Password Reset Request - ResumeAI Pro',
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #6366f1; margin: 0; font-size: 1.8rem; font-weight: 800; letter-spacing: -0.5px;">ResumeAI Pro</h2>
                <p style="color: #64748b; font-size: 0.88rem; margin: 4px 0 0 0;">AI-Powered Resume Analysis & Optimization</p>
              </div>
              <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 24px;" />
              <p style="font-size: 1rem; line-height: 1.6; margin-top: 0;">Hello,</p>
              <p style="font-size: 1rem; line-height: 1.6;">We received a request to reset the password for your ResumeAI Pro account. Click the button below to set a new password:</p>
              <div style="text-align: center; margin: 36px 0;">
                <a href="${resetLink}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.95rem; display: inline-block; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);">Reset Password</a>
              </div>
              <p style="font-size: 0.9rem; line-height: 1.5; color: #64748b;">Or copy and paste this link directly into your browser:</p>
              <p style="font-size: 0.88rem; color: #6366f1; word-break: break-all; margin: 8px 0;"><a href="${resetLink}" style="color: #6366f1; text-decoration: underline;">${resetLink}</a></p>
              <p style="font-size: 0.85rem; color: #94a3b8; margin-top: 36px; border-top: 1px solid #f1f5f9; padding-top: 20px; line-height: 1.5;">
                This link is single-use and will automatically expire in 1 hour. If you did not make this request, you can safely ignore this message.
              </p>
            </div>
          `
        };
        const info = await transporter.sendMail(mailOptions);
        emailSent = true;
        console.log(`Password reset email successfully sent to ${email.toLowerCase()}`);
        if (etherealAccount) {
          testMessageUrl = nodemailer.getTestMessageUrl(info);
          console.log(`Ethereal Message Link: ${testMessageUrl}`);
        }
      } catch (sendError) {
        console.error('SMTP Send Error:', sendError);
        transportError = sendError.message;
      }
    }

    // Always log to console as a safe backup fallback developer utility
    console.log('\n================== PASSWORD RESET SIMULATION ==================');
    console.log(`For User: ${email.toLowerCase()}`);
    console.log(`Reset Link: ${resetLink}`);
    if (emailSent) {
      console.log(`Status: Email successfully delivered.${etherealAccount ? ' (Ethereal virtual inbox)' : ''}`);
    } else {
      console.log(`Status: SMTP offline / failed (${transportError || 'Transporter not initialized'}).`);
    }
    console.log('===============================================================\n');

    if (emailSent) {
      if (etherealAccount) {
        res.json({
          success: true,
          message: 'A password reset link was generated. Since real SMTP details are missing in .env, the email was sent to a virtual mailbox. Click the link below to view it.',
          testMessageUrl
        });
      } else {
        res.json({
          success: true,
          message: 'A password reset link has been successfully delivered to your email inbox.'
        });
      }
    } else {
      res.json({
        success: true,
        message: `If that email exists in our records, a reset link was generated. Note: SMTP email delivery is currently offline (${transportError || 'Credentials missing in .env'}). The link has been printed to the server terminal console log instead.`
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process forgot password request.' });
  }
});

// 6. Reset Password Route
app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    
    if (isMongoConnected) {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });
      
      if (!user) {
        return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
      }
      
      // Encrypt new password
      user.password = await bcrypt.hash(password, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      res.json({ success: true, message: 'Password has been reset successfully.' });
    } else {
      const user = usersDbFallback.find(u => 
        u.resetPasswordToken === token && u.resetPasswordExpires > Date.now()
      );
      
      if (!user) {
        return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
      }
      
      // In-memory update
      user.password = password; // plaintext for fallback
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      
      res.json({ success: true, message: 'Password has been reset successfully.' });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// --- Resume Analysis Routes ---

// 1. Get status of services
app.get('/api/status', (req, res) => {
  res.json({
    isMongoConnected,
    isDemoMode: !hasGeminiKey
  });
});

// 2. Upload and analyze resume
app.post('/api/analyze', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF resume file.' });
    }

    // Only allow PDFs for now
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are supported.' });
    }

    const { jobDescription } = req.body;
    const fileName = req.file.originalname;

    // Extract text from PDF buffer
    let resumeText = '';
    try {
      const parsedPdf = await pdf(req.file.buffer);
      resumeText = parsedPdf.text;
    } catch (parseError) {
      console.error('PDF parsing error:', parseError);
      return res.status(500).json({ error: 'Failed to extract text from the PDF file. Please ensure it is a valid, readable PDF.' });
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ error: 'The uploaded PDF appears to be empty or an image-only PDF. Please upload a text-based PDF.' });
    }

    let analysisResults = null;

    if (hasGeminiKey && ai) {
      try {
        const prompt = getAnalysisPrompt(resumeText, jobDescription);
        
        // Generate content using Gemini model
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            // Ask for JSON output
            responseMimeType: 'application/json'
          }
        });

        const textResponse = response.text;
        
        // Clean markdown code blocks if any
        let cleanJson = textResponse.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.substring(7);
        }
        if (cleanJson.endsWith('```')) {
          cleanJson = cleanJson.substring(0, cleanJson.length - 3);
        }
        
        analysisResults = JSON.parse(cleanJson);
      } catch (aiError) {
        console.error('Gemini API error, falling back to mock:', aiError);
        // If API fails (e.g. rate limit, invalid key), fallback to mock with warning in summary
        analysisResults = getMockAnalysis(fileName, jobDescription);
        analysisResults.summary = `[Gemini API Error: ${aiError.message}] Fallback to demo analysis: ` + analysisResults.summary;
      }
    } else {
      // Demo Mode
      analysisResults = getMockAnalysis(fileName, jobDescription);
    }

    // Save to Database or Memory Fallback
    const resumeData = {
      userId: req.user.id,
      fileName,
      targetJobDescription: jobDescription || '',
      extractedText: resumeText,
      analysis: analysisResults,
      chatHistory: []
    };

    let savedResume = null;
    if (isMongoConnected) {
      const newResume = new Resume(resumeData);
      savedResume = await newResume.save();
    } else {
      // Memory fallback
      const id = new mongoose.Types.ObjectId().toString();
      savedResume = {
        _id: id,
        ...resumeData,
        createdAt: new Date()
      };
      resumesDbFallback.unshift(savedResume);
    }

    res.status(201).json({
      success: true,
      data: savedResume,
      isMongoConnected,
      isDemoMode: !hasGeminiKey
    });

  } catch (error) {
    console.error('Server error in /api/analyze:', error);
    res.status(500).json({ error: 'An error occurred during resume analysis.' });
  }
});

// 3. List all analyzed resumes
app.get('/api/resumes', verifyToken, async (req, res) => {
  try {
    if (isMongoConnected) {
      const resumes = await Resume.find({ userId: req.user.id, isDeleted: { $ne: true } }).select('fileName createdAt analysis.score targetJobDescription').sort({ createdAt: -1 });
      res.json({ success: true, data: resumes, isMongoConnected });
    } else {
      // Map memory fallback to return list
      const list = resumesDbFallback
        .filter(r => r.userId === req.user.id && !r.isDeleted)
        .map(r => ({
          _id: r._id,
          fileName: r.fileName,
          createdAt: r.createdAt,
          targetJobDescription: r.targetJobDescription,
          analysis: { score: r.analysis.score }
        }));
      res.json({ success: true, data: list, isMongoConnected });
    }
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ error: 'Failed to retrieve analysis history.' });
  }
});

// 4. Get a single resume by ID
app.get('/api/resumes/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      const resume = await Resume.findById(id);
      if (!resume || resume.userId.toString() !== req.user.id) {
        return res.status(404).json({ error: 'Resume analysis not found.' });
      }
      res.json({ success: true, data: resume, isMongoConnected });
    } else {
      const resume = resumesDbFallback.find(r => r._id === id && r.userId === req.user.id);
      if (!resume) {
        return res.status(404).json({ error: 'Resume analysis not found.' });
      }
      res.json({ success: true, data: resume, isMongoConnected });
    }
  } catch (error) {
    console.error('Error fetching single resume:', error);
    res.status(500).json({ error: 'Failed to retrieve resume details.' });
  }
});

// 4.5 Generate custom cover letter
app.post('/api/resumes/:id/cover-letter', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    let resume = null;

    if (isMongoConnected) {
      resume = await Resume.findOne({ _id: id, userId: req.user.id });
    } else {
      resume = resumesDbFallback.find(r => r._id === id && r.userId === req.user.id);
    }

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found.' });
    }

    if (!resume.targetJobDescription) {
      return res.status(400).json({ error: 'A Target Job Description is required to generate a tailored cover letter. Please re-upload with a job description.' });
    }

    // Call Gemini to generate a Cover Letter
    let coverLetterText = '';
    if (hasGeminiKey && ai) {
      const prompt = `
You are an expert career coach and professional copywriter.
Your task is to write a highly professional, tailored, and persuasive Cover Letter for a job application.

Use the candidate's resume content below to highlight their matching skills, projects, and experiences:

RESUME CONTENT:
"""
${resume.extractedText}
"""

Tailor the cover letter to match the requirements in this Target Job Description:

TARGET JOB DESCRIPTION:
"""
${resume.targetJobDescription}
"""

Requirements for the Cover Letter:
- Keep it to 3 to 4 paragraphs.
- Start with a polite professional greeting (e.g. "Dear Hiring Team," or "Dear Hiring Manager,").
- Maintain a confident, enthusiastic, and professional tone.
- Highlight 2-3 specific accomplishments or matching skills from the resume that align with the job description.
- Focus on how the candidate can add value to the organization.
- Use placeholders like "[Company Name]" if the company name is not clearly specified in the job description.
- End with a polite request for an interview and a professional sign-off (e.g. "Sincerely, [Candidate Name]").

Do not return any introductory comments or conversational text outside of the Cover Letter body.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      coverLetterText = response.text;
    } else {
      // Fallback Cover Letter for Demo mode
      coverLetterText = `Dear Hiring Manager,

I am writing to express my enthusiastic interest in the position aligned with my profile. With my extensive hands-on experience in modern technology stacks including React, Node.js, and JavaScript, I am confident in my ability to deliver immediate value to your engineering organization.

Throughout my career, I have successfully designed, built, and optimized scalable web applications. I pride myself on bridge-building, problem-solving, and collaborating with cross-functional teams to translate product requirements into stable, high-performance features.

I am particularly excited about this opportunity because your team's mission directly aligns with my passion for creating intuitive user experiences and writing robust, maintainable code. 

Thank you for your time and consideration. I welcome the opportunity to discuss how my qualifications align with your engineering needs in an interview.

Sincerely,
[Candidate Name]`;
    }

    // Save to DB
    if (isMongoConnected) {
      await Resume.updateOne({ _id: id }, { $set: { coverLetter: coverLetterText } });
      resume.coverLetter = coverLetterText;
    } else {
      resume.coverLetter = coverLetterText;
    }

    res.json({
      success: true,
      data: resume
    });

  } catch (error) {
    console.error('Cover letter generation error:', error);
    res.status(500).json({ error: 'Failed to generate cover letter.' });
  }
});

// 5. Chat with the resume
app.post('/api/resumes/:id/chat', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    let resume = null;
    if (isMongoConnected) {
      resume = await Resume.findOne({ _id: id, userId: req.user.id });
    } else {
      resume = resumesDbFallback.find(r => r._id === id && r.userId === req.user.id);
    }

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found.' });
    }

    // Prepare response
    let aiResponseText = '';

    if (hasGeminiKey && ai) {
      try {
        // Construct the conversation history for Gemini
        const historyContext = resume.chatHistory.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.message }]
        }));

        // System prompt and context
        const systemPrompt = `
You are an expert career coach and resume consultant.
Here is the context about the user's resume:
RESUME TEXT:
"""
${resume.extractedText}
"""

PREVIOUS SUMMARY ANALYSIS:
- Score: ${resume.analysis.score}/100
- Summary: ${resume.analysis.summary}
- Target Job Description (if any): ${resume.targetJobDescription || 'None'}

Please answer the user's questions about their resume. Be specific, actionable, encouraging, and highly professional.
`;

        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] }
        ];

        // Append historical interactions
        contents.push(...historyContext);
        
        // Append current message
        contents.push({ role: 'user', parts: [{ text: message }] });

        const geminiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contents
        });

        aiResponseText = geminiResponse.text;

      } catch (aiChatError) {
        console.error('Gemini chat error:', aiChatError);
        aiResponseText = `[AI Chat Error: ${aiChatError.message}] I encountered an error while processing your request. Please check your API key connection.`;
      }
    } else {
      // Mock Response for Chat in Demo Mode
      aiResponseText = `This is a mock response. In Demo Mode (no GEMINI_API_KEY in .env), the chat feature responds with pre-recorded answers.\n\nTo talk about your specific resume text ("${resume.fileName}"), you asked: "${message}". Please configure the GEMINI_API_KEY in the backend .env to enable interactive AI conversations!`;
    }

    // Save chat history
    const userMessage = { role: 'user', message };
    const modelMessage = { role: 'model', message: aiResponseText };

    if (isMongoConnected) {
      resume.chatHistory.push(userMessage);
      resume.chatHistory.push(modelMessage);
      await resume.save();
    } else {
      resume.chatHistory.push({ ...userMessage, timestamp: new Date() });
      resume.chatHistory.push({ ...modelMessage, timestamp: new Date() });
      
      // Update memory array
      const idx = resumesDbFallback.findIndex(r => r._id === id);
      if (idx !== -1) {
        resumesDbFallback[idx] = resume;
      }
    }

    res.json({
      success: true,
      userMessage,
      modelMessage
    });

  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).json({ error: 'Failed to process chat message.' });
  }
});

// 6. Delete a resume analysis
app.delete('/api/resumes/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      const deleted = await Resume.findOneAndUpdate({ _id: id, userId: req.user.id }, { isDeleted: true });
      if (!deleted) {
        return res.status(404).json({ error: 'Resume analysis not found.' });
      }
      res.json({ success: true, message: 'Analysis deleted successfully.' });
    } else {
      const idx = resumesDbFallback.findIndex(r => r._id === id && r.userId === req.user.id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Resume analysis not found.' });
      }
      resumesDbFallback[idx].isDeleted = true;
      res.json({ success: true, message: 'Analysis deleted successfully.' });
    }
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Failed to delete resume analysis.' });
  }
});

// Default status response
app.get('/', (req, res) => {
  res.send('AI Resume Analyzer API is running.');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
