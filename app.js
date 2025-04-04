// Pokemon Deblinger Web App
// Version: 1.0.7
// Last Updated: 2024-04-04

// Variable to store reprint data
let reprintData = [];

/**
 * Load reprint data from JSON file
 * @returns {Promise} - Promise that resolves when data is loaded
 */
async function loadReprintData() {
    try {
        console.log('Loading reprint data...');
        // Use relative path for GitHub Pages compatibility
        const response = await fetch('./reprint_groups_20250403_235345.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Loaded ${data.length} card groups`);
        
        // Validate the data structure
        if (!Array.isArray(data)) {
            throw new Error('Reprint data is not an array');
        }
        
        // Check if we have any data
        if (data.length === 0) {
            throw new Error('Reprint data is empty');
        }
        
        // Check the structure of the first item
        const firstItem = data[0];
        if (!firstItem.name || !firstItem.first_printing || !firstItem.reprints) {
            throw new Error('Reprint data has invalid structure');
        }
        
        reprintData = data;
        console.log('Reprint data loaded successfully');
        
        // Log a sample of the data for verification
        console.log('Sample data:', data.slice(0, 3));
        
    } catch (error) {
        console.error('Error loading reprint data:', error);
        document.getElementById('output').innerHTML = `Error loading reprint data: ${error.message}. Please check the console for details.`;
    }
}

/**
 * Parse a line from a decklist
 * @param {string} line - A line from the decklist
 * @param {Object} context - Context information about the current section
 * @returns {Object} - Parsed line data or {isCard: false, line} if not a card
 */
function parseDecklistLine(line, context) {
    // Skip empty lines
    if (!line.trim()) {
        return { isCard: false, line };
    }
    
    // Check for section headers and update context
    if (line.includes('Pokémon:')) {
        context.currentSection = 'pokemon';
        return { isCard: false, line };
    } else if (line.includes('Trainer:')) {
        context.currentSection = 'trainer';
        return { isCard: false, line };
    } else if (line.includes('Energy:')) {
        context.currentSection = 'energy';
        return { isCard: false, line };
    }

    // Match pattern: quantity name set number
    const match = line.match(/^(\d+)\s+(.+?)\s+([A-Z0-9-]+)\s+(\d+)$/);
    if (!match) {
        return { isCard: false, line };
    }

    const [, quantity, name, set, number] = match;
    return {
        isCard: true,
        quantity,
        name,
        set,
        number,
        cardType: context.currentSection,
        originalLine: line
    };
}

/**
 * Normalize set codes for comparison
 * @param {string} setCode - The set code to normalize
 * @returns {string} - Normalized set code
 */
function normalizeSetCode(setCode) {
    if (!setCode) return '';
    // Convert to lowercase and remove any special characters
    return setCode.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Normalize card numbers for comparison
 * @param {string|number} number - The card number to normalize
 * @returns {string} - Normalized card number
 */
function normalizeCardNumber(number) {
    if (!number) return '';
    return String(number).trim();
}

/**
 * Extract set code from ID
 * @param {string} id - The card ID (e.g., "SVI 81")
 * @returns {string} - Extracted set code
 */
function extractSetCodeFromId(id) {
    if (!id) return '';
    // Extract the set code from the ID (e.g., "SVI 81" -> "SVI")
    const parts = id.split(' ');
    return parts.length > 0 ? parts[0].toLowerCase() : '';
}

/**
 * Find the regular version of a card
 * @param {string} name - Card name
 * @param {string} set - Set code
 * @param {string} number - Card number
 * @param {string} cardType - Type of card (pokemon, trainer, energy)
 * @returns {Object} - First printing information
 */
function findRegularVersion(name, set, number, cardType) {
    console.log(`Finding regular version for: ${name} (${set} ${number}) - Type: ${cardType}`);
    
    // Hardcoded exceptions for energy cards
    const energyExceptions = {
        'Grass Energy': { set: 'SVE', number: '1' },
        'Fire Energy': { set: 'SVE', number: '2' },
        'Water Energy': { set: 'SVE', number: '3' },
        'Lightning Energy': { set: 'SVE', number: '4' },
        'Psychic Energy': { set: 'SVE', number: '5' },
        'Fighting Energy': { set: 'SVE', number: '6' },
        'Darkness Energy': { set: 'SVE', number: '7' },
        'Metal Energy': { set: 'SVE', number: '8' }
    };
    
    // Check if this is an energy card with a hardcoded exception
    if (energyExceptions[name]) {
        console.log(`Using hardcoded exception for ${name}: ${energyExceptions[name].set} ${energyExceptions[name].number}`);
        return energyExceptions[name];
    }
    
    // Create a card ID from the set and number
    const cardId = `${set} ${number}`;
    console.log(`Card ID: ${cardId}`);
    
    // For trainer cards, use name matching only
    if (cardType === 'trainer') {
        console.log(`Trainer card detected, using name matching only`);
        
        // Find all cards with the same name
        const nameMatches = reprintData.filter(group => {
            // Case-insensitive name matching
            return group.name.toLowerCase() === name.toLowerCase();
        });
        
        if (nameMatches.length > 0) {
            console.log(`Found ${nameMatches.length} cards with matching name`);
            
            // Use the first match's first printing
            const firstMatch = nameMatches[0];
            console.log(`Using first printing from: ${firstMatch.first_printing.id}`);
            
            // Extract set and number from the first printing ID
            const [firstPrintingSet, firstPrintingNumber] = firstMatch.first_printing.id.split(' ');
            return { set: firstPrintingSet, number: firstPrintingNumber };
        }
        
        // If no match found, return original card info
        console.log(`No match found for trainer card, returning original: ${set} ${number}`);
        return { set, number };
    }
    
    // For Pokemon and Energy cards, ONLY use exact ID matching
    // This prevents issues with cards that have the same name but are different cards
    for (const group of reprintData) {
        // First check if this card is in the reprints
        const isReprint = group.reprints.some(reprint => reprint.id === cardId);
        if (isReprint) {
            console.log(`Card is a reprint, converting to first printing: ${group.first_printing.id}`);
            // Extract set and number from the first printing ID
            const [firstPrintingSet, firstPrintingNumber] = group.first_printing.id.split(' ');
            return { set: firstPrintingSet, number: firstPrintingNumber };
        }
        
        // Then check if this is already the first printing
        if (group.first_printing.id === cardId) {
            console.log(`Card is already first printing: ${cardId}`);
            return { set, number };
        }
    }
    
    // If no match found, return original card info
    console.log(`No match found, returning original: ${set} ${number}`);
    return { set, number };
}

/**
 * Convert a decklist to use first printings
 * @param {string} decklist - The decklist to convert
 * @returns {string} - Converted decklist
 */
function convertDecklist(decklist) {
    if (!reprintData || reprintData.length === 0) {
        console.error('Reprint data not loaded or empty');
        return 'Error: Reprint data not loaded. Please refresh the page and try again.';
    }
    
    const lines = decklist.split('\n');
    const convertedLines = [];
    
    // Context object to track the current section
    const context = { currentSection: 'pokemon' };

    for (const line of lines) {
        const parsed = parseDecklistLine(line, context);
        
        if (!parsed.isCard) {
            convertedLines.push(line);
            continue;
        }

        try {
            const regularVersion = findRegularVersion(parsed.name, parsed.set, parsed.number, parsed.cardType);
            const convertedLine = `${parsed.quantity} ${parsed.name} ${regularVersion.set} ${regularVersion.number}`;
            convertedLines.push(convertedLine);
        } catch (error) {
            console.error(`Error converting card: ${parsed.name} ${parsed.set} ${parsed.number}`, error);
            // If there's an error, keep the original line
            convertedLines.push(parsed.originalLine);
        }
    }

    return convertedLines.join('\n');
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        const copyBtn = document.getElementById('copy-btn');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span class="material-symbols-outlined">check</span>Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    } catch (error) {
        console.error('Error copying to clipboard:', error);
    }
}

/**
 * Paste text from clipboard
 */
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        const inputTextarea = document.getElementById('decklist-input');
        inputTextarea.value = text;
        
        const pasteBtn = document.getElementById('paste-btn');
        const originalText = pasteBtn.innerHTML;
        pasteBtn.innerHTML = '<span class="material-symbols-outlined">check</span>Pasted!';
        setTimeout(() => {
            pasteBtn.innerHTML = originalText;
        }, 2000);
    } catch (error) {
        console.error('Error pasting from clipboard:', error);
    }
}

/**
 * Process the decklist and copy to clipboard
 */
function processAndCopy() {
    const inputTextarea = document.getElementById('decklist-input');
    const outputTextarea = document.getElementById('decklist-output');
    
    if (!reprintData || reprintData.length === 0) {
        outputTextarea.value = 'Error: Reprint data not loaded. Please refresh the page and try again.';
        return;
    }
    
    const input = inputTextarea.value;
    const converted = convertDecklist(input);
    outputTextarea.value = converted;
    
    // Copy to clipboard
    copyToClipboard(converted);
    
    // Show success message
    const convertBtn = document.getElementById('convert-btn');
    const originalText = convertBtn.innerHTML;
    convertBtn.innerHTML = '<span class="material-symbols-outlined">check</span>Processed & Copied!';
    setTimeout(() => {
        convertBtn.innerHTML = originalText;
    }, 2000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Application initializing...');
    
    // Get DOM elements
    const inputTextarea = document.getElementById('decklist-input');
    const outputTextarea = document.getElementById('decklist-output');
    const convertBtn = document.getElementById('convert-btn');
    const copyBtn = document.getElementById('copy-btn');
    const pasteBtn = document.getElementById('paste-btn');
    const versionElement = document.getElementById('app-version');

    // Display version information
    if (versionElement) {
        versionElement.textContent = 'v1.0.7';
    }

    // Load reprint data
    try {
        await loadReprintData();
        console.log('Reprint data loaded successfully');
    } catch (error) {
        console.error('Failed to load reprint data:', error);
        outputTextarea.value = 'Error: Could not load reprint data. Please check the console for details.';
    }

    // Add event listeners
    convertBtn.addEventListener('click', processAndCopy);
    copyBtn.addEventListener('click', () => copyToClipboard(outputTextarea.value));
    pasteBtn.addEventListener('click', pasteFromClipboard);

    // Add example decklist
    inputTextarea.value = `Paste your deck here`;
}); 
