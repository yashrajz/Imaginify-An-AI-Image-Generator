const themeToggle = document.querySelector(".theme-toggle");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const promptBtn = document.querySelector(".prompt-btn");
const modelSelect = document.getElementById("model-select");
const countSelect = document.getElementById("count-select");
const ratioSelect = document.getElementById("ratio-select");
const gridGallery = document.querySelector(".gallery-grid");

// Replace hardcoded API key with a prompt for the user to enter their own key
let API_KEY = localStorage.getItem("huggingface_api_key");
if (!API_KEY) {
  API_KEY = prompt("Please enter your Hugging Face API key:");
  if (API_KEY) {
    localStorage.setItem("huggingface_api_key", API_KEY);
  }
}

const baseSize = 512; // Base size for image calculations

const examplePrompts = [
    "A magic forest with glowing plants and fairy homes among giant mushrooms",
    "An old steampunk airship floating through golden clouds at sunset",
    "A future Mars colony with glass domes and gardens against red mountains",
    "A dragon sleeping on gold coins in a crystal cave",
    "An underwater kingdom with merpeople and glowing coral buildings",
    "A floating island with waterfalls pouring into clouds below",
    "A witch's cottage in fall with magic herbs in the garden",
    "A robot painting in a sunny studio with art supplies around it",
    "A magical library with floating glowing books and spiral staircases",
    "A Japanese shrine during cherry blossom season with lanterns and misty mountains",
];

// Set theme based on saved preference or system default
(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const isDarkTheme = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
    document.body.classList.toggle("dark-theme", isDarkTheme);
    themeToggle.querySelector("i").className = isDarkTheme ? "fa-solid fa-sun" : "fa-solid fa-moon";
})();

// Switch between light and dark themes
const toggleTheme = () => {
    const isDarkTheme = document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
    themeToggle.querySelector("i").className = isDarkTheme ? "fa-solid fa-sun" : "fa-solid fa-moon";
};

// Get image dimensions based on aspect ratio
const getImageDimensions = (aspectRatio) => {
    const [width, height] = aspectRatio.split("/").map(Number);
    const scaleFactor = baseSize / Math.sqrt(width * height);

    let calculatedWidth = Math.round(width * scaleFactor);
    let calculatedHeight = Math.round(height * scaleFactor);

    // Ensure the dimensions are multiple of 16
    calculatedWidth = Math.floor(calculatedWidth / 16) * 16;
    calculatedHeight = Math.floor(calculatedHeight / 16) * 16;

    return {width: calculatedWidth, height: calculatedHeight};
};

// Replace the loading spinner with the generated image
const updateImageCard = (imgIndex, imgUrl) => {
    const imgCard = document.getElementById(`img-card-${imgIndex}`);
    if(!imgCard) return;
    imgCard.classList.remove("loading");
    imgCard.innerHTML = `<img src="${imgUrl}" alt="" class="result-img" />
            <div class="image-overlay">
              <a href="${imgUrl}" class="img-download-btn" download="${Date.now()}.png">
                <i class="fa-solid fa-download"></i>
              </a>
            </div>`;
};

// Send a request to the API to generate images
const generateImages = async (selectedModel, imageCount, aspectRatio, promptText) => {
    const MODEL_URL = `https://api-inference.huggingface.co/models/${selectedModel}`;
    const {width, height} = getImageDimensions(aspectRatio);

    // Create a new array of promises for each image to be generated
    const imagePromises = Array.from({length: imageCount}, async (_, i) => {
        // Send request to the API model
        try {
            const response = await fetch(MODEL_URL, {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                    "x-use-cache": "false",
                },
                method: "POST",
                body: JSON.stringify({
                    inputs: promptText,
                    parameters: {width, height},
                    // options:{wait_for_model: true, user_cache: false},
                }),
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
            }

            // Convert image blob and update the image card
            const result = await response.blob();
            updateImageCard(i, URL.createObjectURL(result));
        } catch (error) {
            console.error(`Error generating image ${i+1}:`, error);
            // Update the card to show an error state
            const imgCard = document.getElementById(`img-card-${i}`);
            if(imgCard) {
                imgCard.classList.remove("loading");
                imgCard.classList.add("error");
                imgCard.innerHTML = `
                    <div class="status-container">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <p class="status-text">Error: ${error.message || "Failed to generate image"}</p>
                    </div>`;
            }
        }       
    });

    await Promise.allSettled(imagePromises);
    
    // Re-enable the generate button after all images are processed
    const generateBtn = document.querySelector(".generate-btn");
    const originalBtnText = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate';
    generateBtn.disabled = false;
    generateBtn.innerHTML = originalBtnText;
};

// Create placeholder cards in loading spinners
const createImageCards = (selectedModel, imageCount, aspectRatio, promptText) => {
    gridGallery.innerHTML = "";

    // Calculate aspect ratio for CSS
    const [width, height] = aspectRatio.split("/").map(Number);
    const cssAspectRatio = `${width}/${height}`;

    for (let i = 0; i < imageCount; i++) {
        gridGallery.innerHTML += `<div class="img-card loading" id="img-card-${i}" style="aspect-ratio: ${cssAspectRatio}">
            <div class="status-container">
              <div class="spinner"></div>
              <i class="fa-solid fa-triangle-exclamation"></i>
                <p class="status-text">Generating...</p>
            </div>
        </div>`;
    }

    generateImages(selectedModel, imageCount, aspectRatio, promptText);
};

// Handle form submission
const handleFormSubmit = (e) => {
    e.preventDefault();

    // Disable the generate button and show loading state
    const generateBtn = document.querySelector(".generate-btn");
    const originalBtnText = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

    //Get the values from the form elements
    const selectedModel = modelSelect.value;
    const imageCount = parseInt(countSelect.value) || 1;
    
    // Convert ratio select value to actual ratio string
    let aspectRatio = "1/1"; // Default to square
    if (ratioSelect.value === "2") {
        aspectRatio = "16/9"; // Landscape
    } else if (ratioSelect.value === "3") {
        aspectRatio = "9/16"; // Portrait
    }
    
    const promptText = promptInput.value.trim();

    createImageCards(selectedModel, imageCount, aspectRatio, promptText);
};

// Generate a random prompt from the list
promptBtn.addEventListener("click", () => {
    const prompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
    promptInput.value = prompt;
    promptInput.focus();
});

promptForm.addEventListener("submit", handleFormSubmit);
themeToggle.addEventListener("click", toggleTheme);