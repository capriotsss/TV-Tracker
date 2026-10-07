// Importiamo i moduli di Firebase direttamente via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// === CONFIGURAZIONE FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyBSeehxoYeixHfAtzeyfOq00Kd8ctI4_qc",
    authDomain: "tv-tracker-cap.firebaseapp.com",
    projectId: "tv-tracker-cap",
    storageBucket: "tv-tracker-cap.firebasestorage.app",
    messagingSenderId: "653208088048",
    appId: "1:653208088048:web:1dbf38238002355efa8135",
    measurementId: "G-FX6N6CS6ML"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// === ELEMENTI DEL DOM ===
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const authToggleText = document.getElementById('auth-toggle-text');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');

let isLoginMode = true; 

// === LOGICA UI AUTENTICAZIONE ===
toggleAuthModeBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authBtn.textContent = isLoginMode ? 'Accedi' : 'Registrati';
    authToggleText.textContent = isLoginMode ? 'Non hai un account?' : 'Hai già un account?';
    toggleAuthModeBtn.textContent = isLoginMode ? 'Registrati' : 'Accedi';
    authError.classList.add('hidden'); 
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    
    authError.classList.add('hidden');
    authBtn.disabled = true;
    authBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Attendere...';

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        let errorMessage = "Errore durante l'autenticazione.";
        if(error.code === 'auth/invalid-credential') errorMessage = "Email o password errati.";
        if(error.code === 'auth/email-already-in-use') errorMessage = "Questa email è già registrata.";
        if(error.code === 'auth/weak-password') errorMessage = "La password deve avere almeno 6 caratteri.";
        
        authError.textContent = errorMessage;
        authError.classList.remove('hidden');
    } finally {
        authBtn.disabled = false;
        authBtn.textContent = isLoginMode ? 'Accedi' : 'Registrati';
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// === OSSERVATORE DI STATO ===
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        appContainer.classList.add('flex'); 
        loadUserList(currentTab); 
    } else {
        currentUser = null;
        appContainer.classList.add('hidden');
        appContainer.classList.remove('flex');
        authContainer.classList.remove('hidden');
        authForm.reset();
        document.getElementById('user-lists').innerHTML = '';
    }
});

// === LOGICA DASHBOARD E TMDB ===
const TMDB_API_KEY = "5dbe3a3b1506a44a43ec0f40d513758b"; 

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const tabBtns = document.querySelectorAll('.tab-btn');

let searchTimeout;

searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if(query.length < 3) {
        searchResults.classList.add('hidden');
        searchResults.innerHTML = '';
        return;
    }

    searchTimeout = setTimeout(() => {
        searchTMDB(query);
    }, 500); 
});

async function searchTMDB(query) {
    try {
        const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&language=it-IT&query=${encodeURIComponent(query)}&page=1`;
        const res = await fetch(url);
        const data = await res.json();
        
        displaySearchResults(data.results);
    } catch(err) {
        console.error("Errore ricerca TMDB", err);
    }
}

function displaySearchResults(results) {
    searchResults.innerHTML = '';
    searchResults.classList.remove('hidden');

    const validResults = results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');

    if(validResults.length === 0) {
        searchResults.innerHTML = '<p class="text-gray-400 col-span-full text-center py-4">Nessun risultato trovato.</p>';
        return;
    }

    validResults.forEach(item => {
        const title = item.title || item.name;
        const date = item.release_date || item.first_air_date || '';
        const year = date ? date.split('-')[0] : 'N/A';
        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Cover';
        
        const card = document.createElement('div');
        card.className = 'bg-cardbg rounded-lg overflow-hidden shadow-lg flex flex-col relative group cursor-pointer border border-gray-700 hover:border-brand transition duration-300';
        
        const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        card.innerHTML = `
            <img src="${poster}" alt="${title}" class="w-full h-48 sm:h-64 object-cover">
            <div class="p-3 flex-1 flex flex-col justify-between bg-cardbg">
                <h3 class="text-sm font-bold text-white truncate" title="${title}">${title}</h3>
                <p class="text-xs text-gray-400 mt-1">${year} • ${item.media_type === 'movie' ? '🎬 Film' : '📺 TV'}</p>
            </div>
            
            <div class="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 p-3 transition-opacity duration-300">
                <p class="text-xs text-gray-300 mb-1 text-center font-semibold">Aggiungi a:</p>
                <button class="bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 px-3 rounded w-full transition" onclick="addToList('${item.id}', 'film', '${safeTitle}', '${poster}')">🎬 Film</button>
                <button class="bg-green-600 hover:bg-green-500 text-white text-xs py-2 px-3 rounded w-full transition" onclick="addToList('${item.id}', 'serie', '${safeTitle}', '${poster}')">📺 Serie TV</button>
                <button class="bg-pink-600 hover:bg-pink-500 text-white text-xs py-2 px-3 rounded w-full transition" onclick="addToList('${item.id}', 'anime', '${safeTitle}', '${poster}')">🍥 Anime</button>
            </div>
        `;
        searchResults.appendChild(card);
    });
}

// === GESTIONE DATABASE FIRESTORE ===
let currentUser = null;
let currentTab = 'movies'; 
let cachedUserMedia = []; 
let lastRandomTitle = null; 

window.addToList = async function(tmdbId, category, title, poster) {
    if (!currentUser) return;

    let normalizedCategory = category;
    if (category === 'movies') normalizedCategory = 'film';
    if (category === 'tv') normalizedCategory = 'serie';

    try {
        await addDoc(collection(db, "user_media"), {
            userId: currentUser.uid,
            tmdbId: tmdbId,
            category: normalizedCategory, 
            title: title,
            poster: poster,
            rating: 0, 
            season: 1,
            episodesSeen: 0, 
            addedAt: new Date()
        });
        
        searchInput.value = '';
        searchResults.classList.add('hidden');
        
        const targetTabName = normalizedCategory === 'film' ? 'movies' : normalizedCategory === 'serie' ? 'tv' : 'anime';
        document.querySelector(`[data-tab="${targetTabName}"]`).click();
        
    } catch (error) {
        console.error("Errore nell'aggiunta al DB:", error);
        alert("Errore durante il salvataggio.");
    }
};

function loadUserList(tabCategory) {
    if (!currentUser) return;

    const dbCategory = tabCategory === 'movies' ? 'film' : tabCategory === 'tv' ? 'serie' : 'anime';

    const q = query(
        collection(db, "user_media"), 
        where("userId", "==", currentUser.uid),
        where("category", "==", dbCategory)
    );

    const listsContainer = document.getElementById('user-lists');

    onSnapshot(q, (snapshot) => {
        listsContainer.innerHTML = ''; 
        cachedUserMedia = []; 

        if (snapshot.empty) {
            listsContainer.innerHTML = '<p class="text-gray-500 col-span-full text-center py-10 w-full">La tua lista è vuota. Cerca un titolo per iniziare!</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            cachedUserMedia.push(data); 
            
            let starsHtml = '';
            for(let i=1; i<=10; i++) {
                const color = i <= data.rating ? 'text-yellow-400' : 'text-gray-600';
                starsHtml += `<i class="fa-solid fa-star text-xs cursor-pointer ${color} hover:text-yellow-300 transition" onclick="updateRating('${docId}', ${i})"></i>`;
            }

            let epCounterHtml = '';
            if(data.category === 'serie' || data.category === 'anime') {
                epCounterHtml = `
                    <div class="flex items-center justify-between mt-2 bg-gray-900 rounded p-1" onclick="event.stopPropagation()">
                        <button onclick="updateEpisodes('${docId}', ${data.episodesSeen - 1})" class="text-gray-400 hover:text-white px-2 rounded hover:bg-gray-700 transition">-</button>
                        <span class="text-xs font-mono text-gray-300">St. ${data.season || 1} • Ep: ${data.episodesSeen || 0}</span>
                        <button onclick="updateEpisodes('${docId}', ${data.episodesSeen + 1})" class="text-gray-400 hover:text-white px-2 rounded hover:bg-gray-700 transition">+</button>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = 'bg-cardbg rounded-lg overflow-hidden shadow-lg flex flex-col relative group border border-gray-700 transition duration-300';
            
            const safeTitle = data.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const currentSeason = data.season || 1;
            const currentEp = data.episodesSeen || 0;

            card.innerHTML = `
                <img src="${data.poster}" alt="${data.title}" class="w-full h-48 sm:h-64 object-cover cursor-pointer" onclick="openDetailModal('${docId}', '${safeTitle}', '${data.category}', '${data.poster}', ${currentSeason}, ${currentEp})">
                <button onclick="removeItem('${docId}')" class="absolute top-2 right-2 bg-red-600/90 hover:bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg z-10"><i class="fa-solid fa-trash text-xs"></i></button>
                <div class="p-3 flex-1 flex flex-col bg-cardbg cursor-pointer" onclick="openDetailModal('${docId}', '${safeTitle}', '${data.category}', '${data.poster}', ${currentSeason}, ${currentEp})">
                    <h3 class="text-sm font-bold text-white truncate" title="${data.title}">${data.title}</h3>
                    
                    <div class="flex justify-between items-center mt-2" onclick="event.stopPropagation()">
                        <div class="flex gap-[1px]">${starsHtml}</div>
                    </div>
                    
                    ${epCounterHtml}
                </div>
            `;
            listsContainer.appendChild(card);
        });
    });
}

// === FUNZIONI DI AGGIORNAMENTO DATI ===
window.updateRating = async function(docId, newRating) {
    await updateDoc(doc(db, "user_media", docId), { rating: newRating });
};

window.updateEpisodes = async function(docId, newCount) {
    if(newCount < 0) return; 
    await updateDoc(doc(db, "user_media", docId), { episodesSeen: newCount });
};

window.removeItem = async function(docId) {
    if(confirm("Sei sicuro di voler rimuovere questo titolo dalla tua lista?")) {
        await deleteDoc(doc(db, "user_media", docId));
    }
};

// === GESTIONE MODALE DETTAGLI E STAGIONI ===
let activeDocId = null;

const modal = document.getElementById('media-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalPoster = document.getElementById('modal-poster');
const modalTitle = document.getElementById('modal-title');
const modalCategory = document.getElementById('modal-category');
const modalSeasonsSection = document.getElementById('modal-seasons-section');

const modalSeasonVal = document.getElementById('modal-season-val');
const modalEpVal = document.getElementById('modal-ep-val');

document.getElementById('modal-season-plus').addEventListener('click', () => updateModalSeason(1));
document.getElementById('modal-season-minus').addEventListener('click', () => updateModalSeason(-1));
document.getElementById('modal-ep-plus').addEventListener('click', () => updateModalEpisode(1));
document.getElementById('modal-ep-minus').addEventListener('click', () => updateModalEpisode(-1));

closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    activeDocId = null;
});

window.openDetailModal = function(docId, title, category, poster, season, episodes) {
    activeDocId = docId;
    modalTitle.textContent = title;
    modalPoster.src = poster;
    modalCategory.textContent = category === 'film' ? '🎬 Film' : category === 'serie' ? '📺 Serie TV' : '🍥 Anime';
    
    if(category === 'film') {
        modalSeasonsSection.classList.add('hidden'); 
    } else {
        modalSeasonsSection.classList.remove('hidden');
        modalSeasonVal.textContent = season || 1;
        modalEpVal.textContent = episodes || 0;
    }

    modal.classList.remove('hidden');
};

async function updateModalSeason(change) {
    if(!activeDocId) return;
    let current = parseInt(modalSeasonVal.textContent) + change;
    if(current < 1) current = 1;
    modalSeasonVal.textContent = current;
    await updateDoc(doc(db, "user_media", activeDocId), { season: current });
}

async function updateModalEpisode(change) {
    if(!activeDocId) return;
    let current = parseInt(modalEpVal.textContent) + change;
    if(current < 0) current = 0;
    modalEpVal.textContent = current;
    await updateDoc(doc(db, "user_media", activeDocId), { episodesSeen: current });
}

// === PULSANTE JOLLY OTTIMIZZATO (ISTANTANEO) ===
document.getElementById('jolly-btn').addEventListener('click', () => {
    if (!cachedUserMedia || cachedUserMedia.length === 0) {
        alert("La tua lista è vuota o si sta ancora sincronizzando! Aggiungi qualche titolo prima di usare il Jolly.");
        return;
    }
    
    if (cachedUserMedia.length === 1) {
        const item = cachedUserMedia[0];
        const type = item.category === 'film' ? '🎬 Film' : item.category === 'serie' ? '📺 Serie TV' : '🍥 Anime';
        alert(`🎲 La sorte ha scelto per te:\n\n${item.title} (${type})\n\nBuona visione!`);
        return;
    }

    let availableItems = cachedUserMedia.filter(item => item.title !== lastRandomTitle);
    if (availableItems.length === 0) {
        availableItems = cachedUserMedia;
    }
    
    const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
    lastRandomTitle = randomItem.title; 
    
    const type = randomItem.category === 'film' ? '🎬 Film' : randomItem.category === 'serie' ? '📺 Serie TV' : '🍥 Anime';
    
    alert(`🎲 La sorte ha scelto per te:\n\n${randomItem.title} (${type})\n\nBuona visione!`);
});

// === NAVIGAZIONE TAB ===
tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => {
            b.classList.remove('text-brand', 'border-b-2', 'border-brand', 'font-semibold');
            b.classList.add('text-gray-400');
        });
        const target = e.currentTarget;
        target.classList.remove('text-gray-400');
        target.classList.add('text-brand', 'border-b-2', 'border-brand', 'font-semibold');
        
        currentTab = target.getAttribute('data-tab');
        loadUserList(currentTab); 
    });
});

// === REGISTRAZIONE PWA ===
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrato con successo.', reg))
            .catch(err => console.warn('Errore registrazione Service Worker:', err));
    });
}
