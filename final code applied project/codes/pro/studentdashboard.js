// -------------------- FIREBASE IMPORTS --------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, updateDoc, collection, addDoc, query, where, onSnapshot, deleteDoc 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// -------------------- FIREBASE CONFIG --------------------
const firebaseConfig = {
  apiKey: "AIzaSyAv-L6gCZC6FaE22ZJfhJO0BI8RlekksCw",
  authDomain: "test-tutor-f9d3b.firebaseapp.com",
  projectId: "test-tutor-f9d3b",
  storageBucket: "gs://test-tutor-f9d3b.firebasestorage.app",
  messagingSenderId: "192403549834",
  appId: "1:192403549834:web:d981162f2d23459d834773"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// -------------------- SIDEBAR ACTIVE STATE --------------------
document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");
    });
});


function hideLoading() {
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("pageContent").style.display = "block";
}




// -------------------- AUTH CHECK --------------------
onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "studentloginpage.html";

    const studentSnap = await getDoc(doc(db, "students", user.uid));
    if (!studentSnap.exists()) return;

    const studentData = studentSnap.data();

    await loadStudentDetails(user.uid);
    loadMyRequests(user.uid);
    loadTutors();

    // Load upcoming meetings
    loadUpcomingMeetings(studentData.email);
    loadNotices();
    hideLoading();
});

// -------------------- LOAD STUDENT DETAILS --------------------
async function loadStudentDetails(uid) {
    try {
        const snap = await getDoc(doc(db, "students", uid));
        if (!snap.exists()) return;

        const data = snap.data();
        const fullName = data.fullName || "Student";
        const lastName = fullName.trim().split(" ").pop();
        document.getElementById("student-name").textContent = lastName;

        const profilePicURL = data.profilePic;
        document.getElementById("dashboard-profile-pic").src = profilePicURL || 
        'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg';
    } catch (err) {
        console.error("Error loading student details:", err);
    }
}


// -------------------- LOAD TUTORS --------------------
async function loadTutors() {
    const tutorsContainer = document.querySelector(".tutor-list");
    tutorsContainer.innerHTML = "";

    try {
        onSnapshot(collection(db, "tutors"), (snapshot) => {
            const tutorsByLang = { English: [], Tamil: [], Sinhala: [] };

            snapshot.forEach(docSnap => {
                const tutor = docSnap.data();
                let languages = tutor.languages || ["English"];
                if (typeof languages === "string") languages = [languages];

                languages.forEach(lang => {
                    if (!tutorsByLang[lang]) tutorsByLang[lang] = [];
                    tutorsByLang[lang].push(tutor);
                });
            });

            ["English", "Tamil", "Sinhala"].forEach(lang => {
                const tutors = tutorsByLang[lang];
                if (!tutors.length) return;

                const langHeader = document.createElement("h3");
                langHeader.textContent = `${lang} Tutors`;
                langHeader.style.color = "maroon";
                langHeader.style.marginTop = "20px";
                tutorsContainer.appendChild(langHeader);

                const grid = document.createElement("div");
                grid.classList.add("tutor-grid");
                grid.style.display = "grid";
                grid.style.gridTemplateColumns = "repeat(3, 1fr)";
                grid.style.gap = "20px";
                grid.style.marginBottom = "20px";

                tutors.forEach(tutor => {
                    const card = document.createElement("div");
                    card.classList.add("tutor-item");
                    card.innerHTML = `
                        <img src="${tutor.profilePic || 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg'}" class="tutor-photo" alt="${tutor.fullName}" />
                        <div class="tutor-info">
                            <p class="tutor-name">${tutor.fullName}</p>
                            <p class="tutor-email">${tutor.email}</p>
                            <p class="tutor-subject">Subject: ${tutor.subjects}</p>
                            <p class="tutor-lang">Language: ${Array.isArray(tutor.languages) ? tutor.languages.join(", ") : tutor.languages}</p>
                        </div>
                    `;
                    grid.appendChild(card);
                });

                tutorsContainer.appendChild(grid);
            });
        });
    } catch (err) {
        console.error("Error loading tutors:", err);
    }
}

// -------------------- STUDENT REQUEST FORM --------------------
const requestForm = document.getElementById("request-tutor-form");
requestForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const studentSnap = await getDoc(doc(db, "students", user.uid));
    if (!studentSnap.exists()) return alert("Student data not found!");
    const studentData = studentSnap.data();

    const subject = document.getElementById("req-subject").value;
    const lang = document.getElementById("req-lang").value;
    const type = document.getElementById("req-type").value;
    const tutor = document.getElementById("req-tutor").value;
    const desc = document.getElementById("req-desc").value;

    try {
        await addDoc(collection(db, "requests"), {
            studentId: user.uid,
            studentEmail: studentData.email || "N/A",  // <-- ensure email is saved
            subject,
            language: lang,
            meetingType: type,
            tutorEmail: tutor,
            description: desc,
            status: "Pending",
            timestamp: new Date()
        });

        alert("Request sent successfully!");
        requestForm.reset();
    } catch (err) {
        console.error("Error submitting request:", err);
        alert("Failed to submit request!");
    }
});

// -------------------- LOAD STUDENT REQUEST STATUS --------------------
function loadMyRequests(uid) {
    const q = query(collection(db, "requests"), where("studentId", "==", uid));
    onSnapshot(q, async (snapshot) => {
        const container = document.getElementById("my-requests-section");
        container.innerHTML = `<h3>My Pending Requests</h3>`;

        const pendingRequests = [];
        const acceptedRequests = [];

        snapshot.forEach(docSnap => {
            const req = docSnap.data();
            if (req.status?.toLowerCase() === "pending") pendingRequests.push({ id: docSnap.id, data: req });
            else if (req.status?.toLowerCase() === "accepted") acceptedRequests.push(docSnap.id);
        });

        pendingRequests.forEach(({ data: req }) => {
            const dateTime = req.timestamp?.toDate().toLocaleString() || "No date";
            container.innerHTML += `
                <div class="request-item">
                    <p><strong>Tutor Email:</strong> ${req.tutorEmail || "Not assigned yet"}</p>
                    <p><strong>Subject:</strong> ${req.subject}</p>
                    <p><strong>Preferred Language:</strong> ${req.language}</p>
                    <span class="request-status pending">Pending</span>
                    <p class="submission-date"><strong>Date:</strong> ${dateTime}</p>
                </div>
            `;
        });

        for (const id of acceptedRequests) {
            try { await deleteDoc(doc(db, "requests", id)); } 
            catch (err) { console.error("Delete error:", err); }
        }
    });
}

// -------------------- LOGOUT --------------------
document.getElementById("logout-btn")?.addEventListener("click", () => signOut(auth).then(() => window.location.href = "studentloginpage.html"));

// -------------------- SESSION FEEDBACK --------------------
const feedbackForm = document.getElementById("session-feedback-form");
feedbackForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in!");

    const tutor = document.getElementById("feedback-session-tutor").value.trim();
    const subject = document.getElementById("feedback-session-subject").value.trim();
    const date = document.getElementById("feedback-session-date").value;
    const comments = document.getElementById("feedback-comments").value.trim();

    if (!tutor || !subject || !date || !comments) return alert("Please fill in all required fields.");

    try {
        const studentSnap = await getDoc(doc(db, "students", user.uid));
        if (!studentSnap.exists()) return alert("Student details not found!");
        const studentData = studentSnap.data();

        await addDoc(collection(db, "feedbacks"), {
            uid: user.uid,
            studentName: studentData.fullName || "Unknown Student",
            studentIndex: studentData.index || "N/A",
            tutor,
            subject,
            sessionDate: date,
            comments,
            timestamp: new Date()
        });

        alert("Feedback submitted successfully!");
        feedbackForm.reset();
    } catch (err) {
        console.error("Error submitting feedback:", err);
        alert("Failed to submit feedback.");
    }
});


// -------------------- UPCOMING MEETINGS --------------------
async function loadUpcomingMeetings(studentEmail) {
    const upcomingContainer = document.querySelector(".upcoming-class");
    if (!upcomingContainer) return;

    const meetingsList = document.createElement("div");
    meetingsList.classList.add("meeting-list");
    upcomingContainer.innerHTML = `<h3>Upcoming Meetings</h3>`;
    upcomingContainer.appendChild(meetingsList);

    try {
        const q = query(collection(db, "sessions"), where("studentEmail", "==", studentEmail));
        onSnapshot(q, (snapshot) => {
            meetingsList.innerHTML = "";
            if (snapshot.empty) {
                meetingsList.innerHTML = "<p>No upcoming sessions.</p>";
                return;
            }

            snapshot.forEach(docSnap => {
                const session = docSnap.data();

                const meetingDiv = document.createElement("div");
                meetingDiv.classList.add("meeting-item");

                meetingDiv.innerHTML = `
                    <p><strong>Subject:</strong> ${session.subject || "N/A"}</p>
                    <p><strong>Tutor:</strong> ${session.tutorEmail || "N/A"}</p>
                    <p><strong>Language:</strong> ${session.language || "N/A"}</p>
                    <div class="meeting-extra">
                        <span class="session-type">${session.meetingType || "N/A"}</span>
                        <span class="date">${session.date || "N/A"}</span>
                        <span class="time">${session.time || "N/A"}</span>
                    </div>
                    <p><strong>Status:</strong> ${session.status || "Scheduled"}</p>
                    <hr>
                `;


                meetingsList.appendChild(meetingDiv);
            });
        });
    } catch (err) {
        console.error("Error loading upcoming meetings:", err);
        upcomingContainer.innerHTML += "<p>Failed to load sessions.</p>";
    }
}



// -------------------- LOAD COMMON NOTICES --------------------
async function loadNotices() {
    const noticeContainer = document.querySelector(".notice-list");
    if (!noticeContainer) return;

    try {
        const q = query(collection(db, "notices"), /* optional: add filters */);
        onSnapshot(q, (snapshot) => {
            noticeContainer.innerHTML = ""; // clear old

            if (snapshot.empty) {
                noticeContainer.innerHTML = "<p>No notices available.</p>";
                return;
            }

            snapshot.forEach(docSnap => {
                const notice = docSnap.data();
                const noticeDiv = document.createElement("div");
                noticeDiv.classList.add("notice-item");


                noticeDiv.innerHTML = `
                    <p><strong>Notice:</strong> ${notice.message || "No content"}</p>
                    <p><strong>Tutor:</strong> ${notice.tutorEmail || "Admin"}</p>
                `;

                noticeContainer.appendChild(noticeDiv);
            });
        });
    } catch (err) {
        console.error("Error loading notices:", err);
        noticeContainer.innerHTML = "<p>Failed to load notices.</p>";
    }
}

// Call it after auth check
loadNotices();
