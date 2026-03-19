// -------------------- IMPORTS --------------------
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// -------------------- INIT --------------------
const auth = getAuth();
const db = getFirestore();
document.body.style.display = "none"; // hide page until auth check completes


function hideLoading() {
    document.getElementById("loadingScreen").style.display = "none";
    document.getElementById("pageContent").style.display = "block";
}


// -------------------- AUTH CHECK --------------------
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "tutorloginpage.html";
        return;
    }

    document.body.style.display = "block";

    // Fetch tutor info
    const tutorRef = doc(db, "tutors", user.uid);
    const tutorSnap = await getDoc(tutorRef);
    if (tutorSnap.exists()) {
        const data = tutorSnap.data();
        const profilePic = document.getElementById("dashboard-profile-pic");
        if (data.profilePic) profilePic.src = data.profilePic;
        document.getElementById("tutor-name").textContent = data.fullName || "Tutor";
    }

    // Load student requests and upcoming sessions
    loadRequests(user.email);
    loadUpcomingSessions(user.email);
    loadFeedback(user.email);
    hideLoading();

});

// -------------------- LOGOUT --------------------
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        signOut(auth)
            .then(() => {
                alert("Logged out successfully!");
                window.location.href = "tutorloginpage.html";
            })
            .catch((error) => {
                console.error("Logout error:", error);
                alert("Error logging out. Try again.");
            });
    });
}

// -------------------- SIDEBAR ACTIVE LINK --------------------
const menuLinks = document.querySelectorAll(".sidebar a");
menuLinks.forEach(link => {
    link.addEventListener("click", () => {
        menuLinks.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
    });
});

// -------------------- LOAD STUDENT REQUESTS --------------------
const requestsContainer = document.getElementById("student-requests-section");

async function loadRequests(tutorEmail) {
    const q = query(
        collection(db, "requests"),
        where("tutorEmail", "==", tutorEmail),
        where("status", "==", "Pending")
    );
    const querySnapshot = await getDocs(q);

    requestsContainer.innerHTML = "<h3>Student Requests</h3>";

    querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const id = docSnap.id;

        const requestDiv = document.createElement("div");
        requestDiv.className = "request-item";
        requestDiv.dataset.id = id;
        requestDiv.innerHTML = `
            <div class="request-left">
                <p><b>Subject:</b> ${data.subject}</p>
                <p><b>Language:</b> ${data.language}</p>
                <p><b>Meeting Type:</b> ${data.meetingType}</p>
                <p><b>Student:</b> ${data.studentEmail}</p>
                <div class="request-buttons">
                    <button class="btn accept-btn">Accept</button>
                    <button class="btn reject-btn">Reject</button>
                </div>
            </div>
            <div class="request-right">
                <b>Description:</b><br>${data.description}
            </div>
        `;

        requestsContainer.appendChild(requestDiv);
    });
}

// -------------------- LOAD UPCOMING SESSIONS --------------------
const upcomingSessionsContainer = document.getElementById("upcoming-sessions-section");

async function loadUpcomingSessions(tutorEmail) {
    const q = query(
        collection(db, "sessions"),
        where("tutorEmail", "==", tutorEmail),
        where("status", "==", "Scheduled")
    );
    const querySnapshot = await getDocs(q);

    upcomingSessionsContainer.innerHTML = "<h3>Upcoming Sessions</h3>";

    if (querySnapshot.empty) {
        const noSessionDiv = document.createElement("div");
        noSessionDiv.className = "session-item";
        noSessionDiv.textContent = "No upcoming sessions.";
        upcomingSessionsContainer.appendChild(noSessionDiv);
        return;
    }

    querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const sessionDiv = document.createElement("div");
        sessionDiv.className = "session-item";

        sessionDiv.innerHTML = `
            <div class="session-left">
                <p><b>Subject:</b> ${data.subject}</p>
                <p><b>Student:</b> ${data.studentEmail}</p>
                <p><b>Language:</b> ${data.language}</p>
            </div>
            <div class="session-right">
                <p><b>Date:</b> ${data.date}</p>
                <p><b>Time:</b> ${data.time}</p>
                <p><b>Status:</b> ${data.status}</p>
            </div>
        `;

        upcomingSessionsContainer.appendChild(sessionDiv);
    });
}


// -------------------- LOAD STUDENT FEEDBACK --------------------
const feedbackContainer = document.getElementById("feedback-section");

async function loadFeedback(tutorEmail) {
    const q = query(
        collection(db, "feedbacks"),
        where("tutor", "==", tutorEmail)
    );

    const querySnapshot = await getDocs(q);

    feedbackContainer.innerHTML = "<h3>Student Feedback</h3>";

    if (querySnapshot.empty) {
        const noFeedbackDiv = document.createElement("div");
        noFeedbackDiv.className = "feedback-item";
        noFeedbackDiv.textContent = "No feedback yet.";
        feedbackContainer.appendChild(noFeedbackDiv);
        return;
    }

    querySnapshot.forEach(docSnap => {
        const data = docSnap.data();

        const feedbackDiv = document.createElement("div");
        feedbackDiv.className = "feedback-item";

        feedbackDiv.innerHTML = `
            <div class="feedback-message">"${data.comments}"</div>
            <div class="feedback-details">
                <span class="student-name"><b>Student:</b> ${data.studentName} (${data.studentIndex})</span>
                <span class="subject"><b>Subject:</b> ${data.subject}</span>
            </div>
        `;


        feedbackContainer.appendChild(feedbackDiv);
    });
}


// -------------------- EVENT DELEGATION FOR REQUEST BUTTONS --------------------
requestsContainer.addEventListener("click", async (e) => {
    const requestDiv = e.target.closest(".request-item");
    if (!requestDiv) return;
    const id = requestDiv.dataset.id;

    if (e.target.classList.contains("accept-btn")) {
        openSessionPopup(id);
    }

    if (e.target.classList.contains("reject-btn")) {
        try {
            const requestRef = doc(db, "requests", id);
            await updateDoc(requestRef, { status: "Rejected" });
            requestDiv.remove();
            alert("Request rejected!");
        } catch (err) {
            console.error(err);
            alert("Error rejecting request.");
        }
    }
});

// -------------------- POPUP --------------------
function openSessionPopup(requestId) {
    document.getElementById("selected-request-id").value = requestId;
    const popup = document.getElementById("session-popup");
    popup.style.display = "flex";
}

function closePopup() {
    const popup = document.getElementById("session-popup");
    popup.style.display = "none";
}



// -------------------- SAVE NOTES TO FIRESTORE --------------------
async function saveNotes() {
    const noteTextarea = document.getElementById("notepad");
    const noteText = noteTextarea.value.trim();

    if (!noteText) {
        alert("Please write a note before saving.");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("User not authenticated!");
        return;
    }

    try {
        // Add note to 'notices' collection
        await setDoc(doc(db, "notices", `${user.uid}-${Date.now()}`), {
            tutorEmail: user.email,
            message: noteText,
            createdAt: new Date()
        });

        document.getElementById("save-status").style.display = "block";
        document.getElementById("save-status").textContent = "Updated!";
        noteTextarea.value = ""; // clear textarea after saving

        setTimeout(() => {
            document.getElementById("save-status").style.display = "none";
        }, 3000);

    } catch (err) {
        console.error("Error saving note:", err);
        alert("Error saving note. Check console.");
    }
}

// Make it global for onclick
window.saveNotes = saveNotes;


// -------------------- SAVE SESSION --------------------
async function saveSession() {
    const id = document.getElementById("selected-request-id").value;
    const date = document.getElementById("session-date").value;
    const time = document.getElementById("session-time").value;

    if (!date || !time) {
        alert("Please select date and time.");
        return;
    }

    try {
        const requestRef = doc(db, "requests", id);
        const requestSnap = await getDoc(requestRef);
        if (!requestSnap.exists()) {
            alert("Request not found!");
            return;
        }

        const data = requestSnap.data();

        const sessionId = `${id}-${Date.now()}`;
        await setDoc(doc(db, "sessions", sessionId), {
            tutorEmail: data.tutorEmail,
            studentEmail: data.studentEmail,
            subject: data.subject,
            language: data.language,
            meetingType: data.meetingType,
            date: date,
            time: time,
            status: "Scheduled",
            createdAt: new Date()
        });

        await updateDoc(requestRef, { status: "Accepted" });

        const requestDiv = document.querySelector(`.request-item[data-id="${id}"]`);
        if (requestDiv) requestDiv.remove();

        alert("Session scheduled!");
        closePopup();

        // Refresh upcoming sessions
        loadUpcomingSessions(data.tutorEmail);

    } catch (err) {
        console.error(err);
        alert("Error scheduling session. Check console.");
    }
}

// Make popup functions global
window.openSessionPopup = openSessionPopup;
window.closePopup = closePopup;
window.saveSession = saveSession;
