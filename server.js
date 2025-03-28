const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Enable Cross-Origin Resource Sharing
require('dotenv').config(); // Load environment variables

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // For parsing JSON request bodies

// MongoDB Connection (Replace with your actual connection string)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB")).catch(err => console.error("MongoDB connection error:", err));

// User Schema (Simplified)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['rural_woman', 'admin'], default: 'rural_woman' },
    phone: { type: String },
    address: { type: String },
    financial_literacy_level: { type: String, default: 'Beginner' },
    tech_skills: { type: [String], default: [] },  // Array of skills
    courses_completed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    job_preferences: { type: [String], default: [] }, // Preferred job categories
    progress: { type: Number, default: 0 }, // Overall progress percentage
});

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const User = mongoose.model('User', userSchema);

// Course Schema (Simplified)
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ['finance', 'tech'], required: true },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
  modules: [{
      title: { type: String, required: true },
      content_url: { type: String, required: true }, // Link to video or text
      type: { type: String, enum: ['video', 'text', 'quiz'], required: true }
  }]
});

const Course = mongoose.model('Course', courseSchema);


// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};


// --- ROUTES ---

// 1. User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    const user = new User({ name, email, password, phone, address });
    await user.save();
    res.status(201).send({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error registering user', error: error.message });
  }
});

// 2. User Login
app.post('/api/login', async (req, res) => {
  try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(400).send({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(400).send({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });  // Set JWT expiration
      res.send({ message: 'Logged in successfully', token: token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } }); //Include user details
  } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Error logging in', error: error.message });
  }
});


// 3. Get User Profile (Protected route)
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');  // Exclude password
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.send(user);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error fetching user profile', error: error.message });
  }
});


// 4.  List Courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find();
    res.send(courses);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error fetching courses', error: error.message });
  }
});

// 5. Get Single Course by ID
app.get('/api/courses/:id', async (req, res) => {
  try {
      const course = await Course.findById(req.params.id);
      if (!course) {
          return res.status(404).send({ message: 'Course not found' });
      }
      res.send(course);
  } catch (error) {
      console.error(error);
      res.status(500).send({ message: 'Error fetching course', error: error.message });
  }
});

// 6.  Update User Profile (Protected) - Example: Add a completed course.
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.body;  // Expect the courseId to be passed in the body

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Check if the course is already completed
    if (!user.courses_completed.includes(courseId)) {
        user.courses_completed.push(courseId);
        await user.save();
    }

    res.send({ message: 'Profile updated successfully', user: user });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error updating profile', error: error.message });
  }
});

// Example: Admin route to create a new course (requires authentication)
app.post('/api/courses', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).send({ message: 'Unauthorized' });
    }
    try {
        const { title, description, category, level, modules } = req.body;
        const course = new Course({ title, description, category, level, modules });
        await course.save();
        res.status(201).send({ message: 'Course created successfully', course: course });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Error creating course', error: error.message });
    }
});

// Start the server
app.listen(port, () => {
  console.log(Server listening on port ${port});
});