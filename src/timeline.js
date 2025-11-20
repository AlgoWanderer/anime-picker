// Anime Timeline JavaScript

const ANILIST_API_URL = 'https://graphql.anilist.co';

// GraphQL Query to fetch anime relations
const GET_ANIME_RELATIONS_QUERY = `
query ($id: Int) {
  Media(id: $id) {
    id
    title {
      romaji
      english
    }
    coverImage {
      large
      extraLarge
    }
    startDate {
      year
    }
    format
    relations {
      edges {
        relationType
        node {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
            extraLarge
          }
          startDate {
            year
          }
          format
        }
      }
    }
  }
}
`;

// Get anime ID from URL parameter
function getAnimeIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Fetch anime and its relations
async function fetchAnimeTimeline(animeId) {
    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: GET_ANIME_RELATIONS_QUERY,
                variables: { id: parseInt(animeId) }
            })
        });

        const data = await response.json();

        if (data.errors) {
            console.error('AniList API errors:', data.errors);
            throw new Error('Failed to fetch anime timeline');
        }

        return data.data.Media;
    } catch (error) {
        console.error('Error fetching timeline:', error);
        throw error;
    }
}

// Build timeline from anime data
function buildTimeline(anime) {
    const timelineContainer = document.getElementById('timelineContainer');
    const loadingElement = document.getElementById('loadingTimeline');

    // Remove loading
    if (loadingElement) {
        loadingElement.remove();
    }

    // Get all related anime
    const relations = anime.relations.edges;

    // Filter for sequels, prequels, and side stories
    const relevantRelations = relations.filter(edge =>
        ['SEQUEL', 'PREQUEL', 'SIDE_STORY', 'ALTERNATIVE', 'PARENT', 'SPIN_OFF'].includes(edge.relationType)
    );

    if (relevantRelations.length === 0) {
        displayNoRelations(anime);
        return;
    }

    // Create array of all anime including the current one
    const allAnime = [
        { ...anime, relationType: 'CURRENT', isCurrent: true },
        ...relevantRelations.map(edge => ({ ...edge.node, relationType: edge.relationType, isCurrent: false }))
    ];

    // Sort by year
    allAnime.sort((a, b) => {
        const yearA = a.startDate?.year || 9999;
        const yearB = b.startDate?.year || 9999;
        return yearA - yearB;
    });

    // Create timeline cards
    allAnime.forEach(item => {
        const card = createTimelineCard(item);
        timelineContainer.appendChild(card);
    });

    // Update info message
    const messageElement = document.getElementById('timelineMessage');
    messageElement.textContent = `Found ${relevantRelations.length} related anime in this series`;

    // Scroll to current anime
    setTimeout(() => {
        const currentCard = document.querySelector('.timeline-card.current');
        if (currentCard) {
            currentCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, 100);
}

// Create timeline card element
function createTimelineCard(anime) {
    const card = document.createElement('div');
    card.className = `timeline-card ${anime.isCurrent ? 'current' : ''}`;

    const title = anime.title.english || anime.title.romaji;
    const coverImage = anime.coverImage.extraLarge || anime.coverImage.large;
    const year = anime.startDate?.year || 'Unknown';
    const format = anime.format || 'Unknown';

    card.innerHTML = `
        <img src="${coverImage}" alt="${title}" class="anime-cover">
        <div class="card-info">
            <div class="anime-title">${title}</div>
            <div class="anime-meta">
                <span class="meta-item">${year}</span>
                <span class="meta-item">${format}</span>
            </div>
            ${anime.relationType !== 'CURRENT' ? `<div class="relation-badge">${formatRelationType(anime.relationType)}</div>` : ''}
        </div>
    `;

    // Click to open AniList page
    card.addEventListener('click', () => {
        window.open(`https://anilist.co/anime/${anime.id}`, '_blank');
    });

    return card;
}

// Format relation type for display
function formatRelationType(type) {
    const typeMap = {
        'SEQUEL': 'Sequel',
        'PREQUEL': 'Prequel',
        'SIDE_STORY': 'Side Story',
        'ALTERNATIVE': 'Alternative',
        'PARENT': 'Parent Story',
        'SPIN_OFF': 'Spin-off'
    };
    return typeMap[type] || type;
}

// Display message when no relations found
function displayNoRelations(anime) {
    const timelineContainer = document.getElementById('timelineContainer');
    const title = anime.title.english || anime.title.romaji;

    timelineContainer.innerHTML = `
        <div class="no-relations">
            <h2>No Related Anime Found</h2>
            <p>"${title}" appears to be a standalone series with no sequels, prequels, or related anime in the database.</p>
        </div>
    `;

    const messageElement = document.getElementById('timelineMessage');
    messageElement.textContent = 'This anime has no related series';
}

// Scroll navigation
function setupScrollNavigation() {
    const container = document.getElementById('timelineContainer');
    const leftArrow = document.getElementById('scrollLeft');
    const rightArrow = document.getElementById('scrollRight');

    leftArrow.addEventListener('click', () => {
        container.scrollBy({ left: -300, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', () => {
        container.scrollBy({ left: 300, behavior: 'smooth' });
    });
}

// Initialize timeline
async function initTimeline() {
    const animeId = getAnimeIdFromURL();

    if (!animeId) {
        document.getElementById('timelineContainer').innerHTML = `
            <div class="no-relations">
                <h2>No Anime Selected</h2>
                <p>Please generate an anime from the main page first.</p>
            </div>
        `;
        return;
    }

    try {
        const anime = await fetchAnimeTimeline(animeId);
        buildTimeline(anime);
        setupScrollNavigation();
    } catch (error) {
        document.getElementById('timelineContainer').innerHTML = `
            <div class="no-relations">
                <h2>Error Loading Timeline</h2>
                <p>Failed to fetch anime data. Please try again.</p>
            </div>
        `;
    }
}

// Start when page loads
document.addEventListener('DOMContentLoaded', initTimeline);
