import React, { useState, useEffect } from 'react';
import axios from 'axios';

const App = () => {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user profile and courses on component mount (after login)
    const token = localStorage.getItem('token'); // Get token from storage
    if (token) {
      axios.get('/api/profile', {
        headers: { Authorization: Bearer ${token} },
      })
      .then(response => {
        setUser(response.data);
      })
      .catch(error => {
        console.error("Error fetching profile:", error);
        localStorage.removeItem('token'); //remove invalid token
      });
    }

    axios.get('/api/courses')
      .then(response => {
        setCourses(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching courses:", error);
        setLoading(false);
      });
  }, []);

  // Example function to enroll in a course
  const enrollInCourse = async (courseId) => {
    const token = localStorage.getItem('token');
    try {
        await axios.put('/api/profile', { courseId: courseId }, {
            headers: { Authorization: Bearer ${token} }
        });

        // Optionally update local state to reflect enrollment
        setUser({...user, courses_completed: [...user.courses_completed, courseId]});
    } catch (error) {
        console.error("Error enrolling in course:", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Disha Shakti Platform</h1>
      {user ? (
        <div>
          <h2>Welcome, {user.name}</h2>
          <p>Email: {user.email}</p>
          <h3>Available Courses:</h3>
          <ul>
            {courses.map(course => (
              <li key={course._id}>
                {course.title} - {course.description} -
                <button onClick={() => enrollInCourse(course._id)}>Enroll</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          {/* Login/Registration form would go here */}
          <p>Please login or register to access the platform.</p>
        </div>
      )}
    </div>
  );
};

export default App;