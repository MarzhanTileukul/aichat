const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");

// Айнымалылар күйі
let userMessage = null;
let isResponseGenerating = false;

// API configuration
const API_KEY = "AIzaSyDc4fKR3MXjTxOr5t8POaTWm7FxN2luZmA"; // сіздің API кілтіңіз
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;
                 
// Тақырыпты және чат деректерін жергілікті жадтан бет жүктемесіне жүктеңіз
const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

  // Қараңғы және жарық фон тақырыптарын қолданыңыз
  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

  // Сақталған чаттарды қалпына келтіріңіз немесе чат контейнерін тазалаңыз
  chatContainer.innerHTML = savedChats || '';
  document.body.classList.toggle("hide-header", savedChats);

  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Төменгі жағына жылжыңыз
}

// Жаңа хабарлама элементін жасаңыз және оны қайтарыңыз
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
}

// Сөздерді бір-бірлеп көрсету арқылы теру әсерін көрсетіңіз
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(' ');
  let currentWordIndex = 0;

  const typingInterval = setInterval(() => {
    // Әрбір сөзді бос орынмен мәтін элементіне қосыңыз
    textElement.innerText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
    incomingMessageDiv.querySelector(".icon").classList.add("hide");

    // Егер барлық сөздер көрсетілсе
    if (currentWordIndex === words.length) {
      clearInterval(typingInterval);
      isResponseGenerating = false;
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");
      localStorage.setItem("saved-chats", chatContainer.innerHTML); // Чаттарды жергілікті жадқа сақтаңыз
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Төменгі жағына жылжыңыз
  }, 75);
}

// Пайдаланушы хабарламасы негізінде API-ден жауап алыңыз
const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text"); // Мәтін элементін алу

  try {
    // ПАЙДАЛАНУШЫНЫҢ хабарламасымен API-ГЕ POST сұрауын жіберіңіз
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: [{ 
          role: "user", 
          parts: [{ text: userMessage }] 
        }] 
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    // API жауап мәтінін алыңыз және одан жұлдызшаларды алып тастаңыз
    const apiResponse = data?.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
    showTypingEffect(apiResponse, textElement, incomingMessageDiv); // Теру әсерін көрсету
  } catch (error) { // Өңдеу қатесі
    isResponseGenerating = false;
    textElement.innerText = error.message;
    textElement.parentElement.closest(".message").classList.add("error");
  } finally {
    incomingMessageDiv.classList.remove("loading");
  }
}

// API жауабын күту кезінде жүктеу анимациясын көрсетіңіз
const showLoadingAnimation = () => {
  const html = `<div class="message-content">
                  <img class="avatar" src="images/gemini.svg" alt="Gemini avatar">
                  <p class="text"></p>
                  <div class="loading-indicator">
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                  </div>
                </div>
                <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>`;

  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatContainer.appendChild(incomingMessageDiv);

  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Төменгі жағына жылжыңыз
  generateAPIResponse(incomingMessageDiv);
}

// Хабарлама мәтінін алмасу буферіне көшіріңіз
const copyMessage = (copyButton) => {
  const messageText = copyButton.parentElement.querySelector(".text").innerText;

  navigator.clipboard.writeText(messageText);
  copyButton.innerText = "done"; // Растау белгішесін көрсету
  setTimeout(() => copyButton.innerText = "content_copy", 1000); // 1 секундтан кейін белгішені қайтару
}

// Шығыс чат хабарларын жіберуді басқарыңыз
const handleOutgoingChat = () => {
  userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
  if(!userMessage || isResponseGenerating) return; // Хабарлама болмаса немесе жауап тудырмаса, шығыңыз

  isResponseGenerating = true;

  const html = `<div class="message-content">
                  <img class="avatar" src="images/user.jpg" alt="User avatar">
                  <p class="text"></p>
                </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  outgoingMessageDiv.querySelector(".text").innerText = userMessage;
  chatContainer.appendChild(outgoingMessageDiv);
  
  typingForm.reset(); // Кіріс өрісін өшіру
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Төменгі жағына жылжыңыз
  setTimeout(showLoadingAnimation, 500); // Кідірістен кейін жүктеу анимациясын көрсету
}

// Ашық және қараңғы тақырыптар арасында ауысыңыз
toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// Түйме басылған кезде барлық чаттарды жергілікті жадтан жойыңыз
deleteChatButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all the chats?")) {
    localStorage.removeItem("saved-chats");
    loadDataFromLocalstorage();
  }
});

// SetuserMessage және ұсыныс басылған кезде шығыс чатты өңдеңіз
suggestions.forEach(suggestion => {
  suggestion.addEventListener("click", () => {
    userMessage = suggestion.querySelector(".text").innerText;
    handleOutgoingChat();
  });
});


typingForm.addEventListener("submit", (e) => {
  e.preventDefault(); 
  handleOutgoingChat();
});

loadDataFromLocalstorage();