import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// Firebase config
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
// AUTH CHECK AND LOAD/CREATE TUTOR PROFILE
// ========================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "tutorloginpage.html";
        return;
    }

    // Load tutor details
    const tutorDocRef = doc(db, "tutors", user.uid);
    const snap = await getDoc(tutorDocRef);

    if (!snap.exists()) {
        // If tutor does not exist, create a new document with default values
        await setDoc(tutorDocRef, {
            fullName: "",
            email: user.email || "",
            subjects: [],
            availability: "",
            languages: [],
            profilePic: ""
        });
    }

    // Now load the details into the form
    await loadTutorDetails(user.uid);
    hideLoading();
});

// ========================
// LOAD TUTOR DETAILS
// ========================
async function loadTutorDetails(uid) {
    const snap = await getDoc(doc(db, "tutors", uid));
    if (snap.exists()) {
        const data = snap.data();
        document.getElementById("tutor-name").value = data.fullName || "";
        document.getElementById("tutor-email").value = data.email || "";
        document.getElementById("tutor-subjects").value = (data.subjects || []).join(", ");
        document.getElementById("tutor-availability").value = data.availability || "";
        if (data.languages) {
            const langSelect = document.getElementById("t-lang");
            Array.from(langSelect.options).forEach(option => {
                option.selected = data.languages.includes(option.value);
            });
        }
        if (data.profilePic) document.getElementById("tutor-profile-pic").src = data.profilePic;
    }
}

// ========================
// PROFILE PICTURE UPLOAD
// ========================
window.previewTutorProfilePic = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) {
        alert("User not logged in!");
        return;
    }

    try {
        const tutorSnap = await getDoc(doc(db, "tutors", user.uid));
        const tutorData = tutorSnap.exists() ? tutorSnap.data() : {};

        const indexNumber = tutorData.index || user.uid;
        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const fileName = `tutor_profile_${indexNumber}_${timestamp}.${ext}`;

        const storageRef = ref(storage, `tutor_profile_pics/${fileName}`);
        await uploadBytes(storageRef, file);

        const downloadURL = await getDownloadURL(storageRef);

        await updateDoc(doc(db, "tutors", user.uid), { profilePic: downloadURL });

        document.getElementById("tutor-profile-pic").src = downloadURL;

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

    const fullName = document.getElementById("tutor-name").value;
    const email = document.getElementById("tutor-email").value;
    const subjects = document.getElementById("tutor-subjects").value.split(",").map(s => s.trim());
    const availability = document.getElementById("tutor-availability").value;

    // Get selected languages from multi-select
    const langSelect = document.getElementById("t-lang");
    const languages = Array.from(langSelect.selectedOptions).map(option => option.value);

    await setDoc(doc(db, "tutors", user.uid), {
        fullName,
        email,
        subjects,
        availability,
        languages
    }, { merge: true });

    alert("Profile updated successfully!");
});
