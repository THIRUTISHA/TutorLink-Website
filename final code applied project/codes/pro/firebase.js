
//_________________________________home page________________________________


// Firebase v12 (modular)

// 1. Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc,getDoc,collection,addDoc,serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged, signOut,sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";



// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAv-L6gCZC6FaE22ZJfhJO0BI8RlekksCw",
  authDomain: "test-tutor-f9d3b.firebaseapp.com",
  projectId: "test-tutor-f9d3b",
  storageBucket: "gs://test-tutor-f9d3b.firebasestorage.app",
  messagingSenderId: "192403549834",
  appId: "1:192403549834:web:d981162f2d23459d834773"
};

  

  
// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);


// ------------------ AUTO REDIRECT ON HOME PAGE ---------------------
onAuthStateChanged(auth, async (user) => {
  // Only run on index page
  if (!window.location.pathname.includes("index.html") &&
      window.location.pathname !== "/" &&
      window.location.pathname !== "/index") {
    return;
  }

  if (!user) {
    console.log("User not logged in");
    return;
  }

  console.log("User logged in: ", user.uid);

  try {
    // 1️⃣ Check if user is a STUDENT
    const studentRef = doc(db, "students", user.uid);
    const studentSnap = await getDoc(studentRef);

    if (studentSnap.exists() && studentSnap.data().role === "student") {
      console.log("Redirecting student...");
      window.location.href = "studentdashboard.html";
      return;
    }

    // 2️⃣ Check if user is a TUTOR
    const tutorRef = doc(db, "tutors", user.uid);
    const tutorSnap = await getDoc(tutorRef);

    if (tutorSnap.exists() && tutorSnap.data().role === "tutor") {
      console.log("Redirecting tutor...");
      window.location.href = "tutordashboard.html";
      return;
    }

    console.log("User has no valid role in Firestore");

  } catch (error) {
    console.error("Auto redirect error:", error);
  }
});




// Home page button redirects
document.addEventListener("DOMContentLoaded", () => {
  const studentBtn = document.getElementById("student-btn");
  const tutorBtn = document.getElementById("tutor-btn");

  if (studentBtn) {
    studentBtn.addEventListener("click", () => {
      window.location.href = "studentloginpage.html";
    });
  }

  if (tutorBtn) {
    tutorBtn.addEventListener("click", () => {
      window.location.href = "tutorloginpage.html";
    });
  }
});


// ______________________loginpages___________________________

const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault(); // Prevent page reload

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          console.log("Logged in:", user.email);

          // Redirect based on page
          if (window.location.href.includes("studentloginpage")) {
            window.location.href = "studentdashboard.html";
          } else if (window.location.href.includes("tutorloginpage")) {
            window.location.href = "tutordashboard.html";
          }
        })
        .catch((error) => {
          const errorMessage = error.message;
          alert("Login Failed: " + errorMessage);
        });
    });
  }


//_______________Student Signup page____________________________

const signupForm = document.getElementById("student-signup-form");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get form values
    const fullName = document.getElementById("s-name").value;
    const index = document.getElementById("s-index").value;
    const email = document.getElementById("s-email").value;
    const course = document.getElementById("s-course").value;
    const password = document.getElementById("s-password").value;

    // Multiple language selection
    const langOptions = document.getElementById("s-lang");
    const languages = [...langOptions.selectedOptions].map(opt => opt.value);

    try {
      // 1. Create user in Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCred.user.uid;

      // 2. Save student details in Firestore
      await setDoc(doc(db, "students", userId), {
        fullName,
        index,
        email,
        course,
        languages,
        role: "student",
        createdAt: new Date()
      });

      alert("Student registered successfully!");
      window.location.href = "studentloginpage.html";

    } catch (err) {
      alert("Error: " + err.message);
    }
  });
}

export { auth, db };


//______________________tutor signup_____________________________________

const tutorSignupForm = document.getElementById("tutor-signup-form");

if (tutorSignupForm) {
  tutorSignupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get values from form
    const name = document.getElementById("t-name").value;
    const email = document.getElementById("t-email").value;
    const subjects = document.getElementById("t-subjects").value.split(",");
    const availability = document.getElementById("t-availability").value;
    const languages = Array.from(
      document.getElementById("t-lang").selectedOptions
    ).map(option => option.value);
    const password = document.getElementById("t-password").value;

    try {
      // Create account in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save tutor data in Firestore
      await setDoc(doc(db, "tutors", user.uid), {
        name: name,
        email: email,
        subjects: subjects,
        availability: availability,
        languages: languages,
        role: "tutor",
        createdAt: new Date()
      });

      alert("Tutor account created successfully!");
      window.location.href = "tutorloginpage.html";

    } catch (error) {
      console.error("Error during tutor signup:", error);
      alert(error.message);
    }
  });
}


//_______________________forgetpasswordpage________________________

const forgotForm = document.getElementById("forgot-password-form");

if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("reset-email").value;

    try {
      await sendPasswordResetEmail(auth, email);
      alert("✔ Reset link sent! Check your email inbox.");
    } catch (error) {
      console.error("Reset error:", error);
      alert("❌ " + error.message);
    }
  });
}



