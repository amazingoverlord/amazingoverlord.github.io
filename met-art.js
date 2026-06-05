// met-art.js - Met Museum Random Artwork Display with Image Info

const artworkContainer = document.getElementById('artworkContainer');

// Store all object IDs
let allObjectIDs = [];
let isLoading = false;

// Fetch all object IDs from Met API
async function fetchAllObjectIDs() {
    if (allObjectIDs.length > 0) return allObjectIDs;
    
    try {
        const response = await fetch('https://collectionapi.metmuseum.org/public/collection/v1/objects');
        if (!response.ok) throw new Error('Failed to fetch object list');
        const data = await response.json();
        allObjectIDs = data.objectIDs || [];
        return allObjectIDs;
    } catch (error) {
        console.error('Error fetching object IDs:', error);
        return [];
    }
}

// Fetch specific artwork by ID
async function fetchArtworkByID(id) {
    try {
        const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
        if (!response.ok) return null;
        const data = await response.json();
        
        // Check if it has a public domain image
        if (data.primaryImage && data.isPublicDomain === true) {
            return data;
        }
        return null;
    } catch (error) {
        console.warn(`Error fetching artwork ${id}:`, error);
        return null;
    }
}

// Display artwork with info below
function displayArtwork(artwork) {
    // Clear the container
    artworkContainer.innerHTML = '';
    
    // Create wrapper for image
    const wrapper = document.createElement('div');
    wrapper.className = 'artwork-image-wrapper';
    
    // Create image element
    const img = document.createElement('img');
    img.src = artwork.primaryImage;
    img.alt = artwork.title || 'Artwork from The Met';
    img.className = 'artwork-image';
    
    // Handle image load errors
    img.onerror = function() {
        console.error('Failed to load image:', artwork.primaryImage);
        showError('Failed to load artwork image. Please refresh.');
    };
    
    wrapper.appendChild(img);
    artworkContainer.appendChild(wrapper);
    
    // Create info section below image (no styling)
    const infoDiv = document.createElement('div');
    infoDiv.className = 'image-info';
    
    const title = artwork.title || 'Untitled';
    const artist = artwork.artistDisplayName || 'Artist unknown';
    const date = artwork.objectDate || 'Date unknown';
    const medium = artwork.medium || 'Medium unknown';
    const objectUrl = artwork.objectURL || 'https://www.metmuseum.org';
    
    infoDiv.innerHTML = `
        <p>${escapeHtml(title)}</p>
        <p>${escapeHtml(artist)}</p>
        <p>${escapeHtml(date)}</p>
        <p>${escapeHtml(medium)}</p>
        <p><a href="${objectUrl}" target="_blank">The Metropolitan Museum of Art</a></p>
    `;
    
    artworkContainer.appendChild(infoDiv);
}

// Simple escape function to prevent XSS
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Show error message
function showError(message) {
    artworkContainer.innerHTML = `
        <div class="artwork-image-wrapper">
            <div class="loading">${escapeHtml(message)}</div>
        </div>
    `;
}

// Main function to load random artwork
async function loadRandomArtwork() {
    if (isLoading) return;
    isLoading = true;
    
    // Show loading state
    artworkContainer.innerHTML = `
        <div class="artwork-image-wrapper">
            <div class="loading">Searching for artwork...</div>
        </div>
    `;
    
    // Get all object IDs
    const ids = await fetchAllObjectIDs();
    if (!ids.length) {
        showError('Unable to load artwork. Please try again.');
        isLoading = false;
        return;
    }
    
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
        const randomIndex = Math.floor(Math.random() * ids.length);
        const randomID = ids[randomIndex];
        
        const artwork = await fetchArtworkByID(randomID);
        if (artwork) {
            displayArtwork(artwork);
            isLoading = false;
            return;
        }
        attempts++;
    }
    
    // If we get here, no artwork found
    showError('No public domain artwork found. Please refresh to try again.');
    isLoading = false;
}

// Load artwork when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadRandomArtwork();
    });
} else {
    loadRandomArtwork();
}