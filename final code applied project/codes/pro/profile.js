import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAv-L6gCZC6FaE22ZJfhJO0BI8RlekksCw",
  authDomain: "test-tutor-f9d3b.firebaseapp.com",
  projectId: "test-tutor-f9d3b",
  storageBucket: "gs://test-tutor-f9d3b.firebasestorage.app",
  messagingSenderId: "192403549834",
  appId: "1:192403549834:web:d981162f2d23459d834773"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);




function hideLoading() {
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("pageContent").style.display = "block";
}

// ========================
// AUTH CHECK AND LOAD PROFILE
// ========================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "studentloginpage.html";
        return;
    }
    await loadStudentDetails(user.uid);

    hideLoading();
});

// ========================
// LOAD STUDENT DETAILS
// ========================
async function loadStudentDetails(uid) {
    const snap = await getDoc(doc(db, "students", uid));
    if (snap.exists()) {
        const data = snap.data();
        document.getElementById("student-name").value = data.fullName || "";
        document.getElementById("student-email").value = data.email || "";
        document.getElementById("course").value = data.course || "";
        document.getElementById("student-year").value = data.year || "";
        document.getElementById("student-languages").value = (data.languages || []).join(", ");
        if (data.profilePic) document.getElementById("profile-pic").src = data.profilePic;
    }
}

// ========================
// PROFILE PICTURE UPLOAD
// ========================
window.previewProfilePic = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) {
        alert("User not logged in!");
        return;
    }

    try {
        // Get student index for unique filename
        const studentSnap = await getDoc(doc(db, "students", user.uid));
        if (!studentSnap.exists()) {
            alert("Student data not found!");
            return;
        }

        const studentData = studentSnap.data();
        const indexNumber = studentData.index || user.uid; // fallback UID

        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const fileName = `profile_${indexNumber}_${timestamp}.${ext}`;

        // Storage reference
        const storageRef = ref(storage, `profile_pics/${fileName}`);

        // Upload file
        await uploadBytes(storageRef, file);

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        // Save download URL in Firestore
        await updateDoc(doc(db, "students", user.uid), { profilePic: downloadURL });

        // Update profile preview
        document.getElementById("profile-pic").src = downloadURL;

        alert("Profile picture uploaded successfully!");

    } catch (err) {
        console.error("Error uploading profile picture:", err);
        alert("Failed to upload profile picture!");
    }
};

// ========================
// SAVE PROFILE CHANGES
// ========================
document.getElementById("profile-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const fullName = document.getElementById("student-name").value;
    const email = document.getElementById("student-email").value;
    const course = document.getElementById("course").value;
    const year = parseInt(document.getElementById("student-year").value);
    const languages = document.getElementById("student-languages").value.split(",").map(l => l.trim());

    await setDoc(doc(db, "students", user.uid), {
        fullName,
        email,
        course,
        year,
        languages
    }, { merge: true });

    alert("Profile updated successfully!");
});
