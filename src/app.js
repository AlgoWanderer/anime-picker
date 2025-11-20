// AniList API Integration for Random Anime Generator

const ANILIST_API_URL = 'https://graphql.anilist.co';

// GraphQL Query to fetch anime by date range
const GET_ANIME_BY_DATE_RANGE_QUERY = `
query ($page: Int, $perPage: Int, $startDate: FuzzyDateInt, $endDate: FuzzyDateInt) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(
      type: ANIME,
      startDate_greater: $startDate,
      startDate_lesser: $endDate,
      sort: POPULARITY_DESC
    ) {
      id
      title {
        romaji
        english
      }
      description
      coverImage {
        large
        extraLarge
      }
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      episodes
      genres
      averageScore
      studios {
        nodes {
          name
        }
      }
      tags {
        name
        category
      }
      siteUrl
      format
      season
      seasonYear
    }
  }
}
`;

// Fetch random anime from AniList using date range filter
async function fetchRandomAnime(startYear, endYear, maxRetries = 5) {
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            // Fetch a batch of anime within the date range
            const perPage = 50;

            // First, get the total count to know how many pages exist
            // Convert years to FuzzyDateInt format (YYYYMMDD)
            const startDateFormatted = parseInt(`${startYear}0101`);  // January 1st of start year
            const endDateFormatted = parseInt(`${endYear}1231`);      // December 31st of end year

            const initialResponse = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: GET_ANIME_BY_DATE_RANGE_QUERY,
                    variables: {
                        startDate: startDateFormatted,
                        endDate: endDateFormatted,
                        page: 1,
                        perPage: perPage
                    }
                })
            });

            const initialData = await initialResponse.json();

            // Check for API errors
            if (initialData.errors) {
                console.error('AniList API errors:', initialData.errors);
                throw new Error(`API Error: ${initialData.errors[0].message}`);
            }

            if (initialData.data && initialData.data.Page) {
                const pageInfo = initialData.data.Page.pageInfo;
                const totalResults = pageInfo.total;

                if (totalResults === 0) {
                    throw new Error(`No anime found in the year range ${startYear}-${endYear}`);
                }

                // Calculate a random page to fetch from
                const totalPages = pageInfo.lastPage;
                const randomPage = Math.floor(Math.random() * totalPages) + 1;

                // Fetch the random page
                const response = await fetch(ANILIST_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        query: GET_ANIME_BY_DATE_RANGE_QUERY,
                        variables: {
                            startDate: startDateFormatted,
                            endDate: endDateFormatted,
                            page: randomPage,
                            perPage: perPage
                        }
                    })
                });

                const data = await response.json();

                // Check for API errors
                if (data.errors) {
                    console.error('AniList API errors:', data.errors);
                    throw new Error(`API Error: ${data.errors[0].message}`);
                }

                // Check if we got valid anime
                if (data.data && data.data.Page && data.data.Page.media && data.data.Page.media.length > 0) {
                    // Randomly select one anime from the results
                    const randomIndex = Math.floor(Math.random() * data.data.Page.media.length);
                    return data.data.Page.media[randomIndex];
                } else {
                    // Empty page, try again
                    attempts++;
                    console.log(`Empty results on page ${randomPage}, retrying... (${attempts}/${maxRetries})`);
                }
            } else {
                attempts++;
                console.log(`Invalid response, retrying... (${attempts}/${maxRetries})`);
            }
        } catch (error) {
            attempts++;
            console.error(`Error on attempt ${attempts}:`, error);

            // If we've exhausted retries, throw the error
            if (attempts >= maxRetries) {
                throw error;
            }
        }
    }

    throw new Error('Failed to fetch anime after multiple attempts');
}

// Extract themes from tags
function extractThemes(tags) {
    if (!tags || tags.length === 0) return 'N/A';

    const themes = tags
        .filter(tag => tag.category === 'Theme')
        .slice(0, 5)
        .map(tag => tag.name);

    return themes.length > 0 ? themes.join(', ') : 'N/A';
}

// Extract demographics from tags
function extractDemographics(tags) {
    if (!tags || tags.length === 0) return 'N/A';

    const demographics = tags
        .filter(tag => tag.category === 'Demographic')
        .map(tag => tag.name);

    return demographics.length > 0 ? demographics.join(', ') : 'N/A';
}

// Display anime information
function displayAnime(anime) {
    // Title
    const title = anime.title.english || anime.title.romaji;
    document.getElementById('animeTitle').textContent = title;

    // Cover Image
    const coverImage = anime.coverImage.extraLarge || anime.coverImage.large;
    document.getElementById('animeImage').src = coverImage;
    document.getElementById('animeImage').alt = title;

    // Episodes
    document.getElementById('episodes').textContent = anime.episodes || 'Unknown';

    // Genres
    document.getElementById('genres').textContent = anime.genres.length > 0
        ? anime.genres.join(', ')
        : 'N/A';

    // Score (AniList uses a 0-100 scale)
    const score = anime.averageScore ? `${anime.averageScore}/100` : 'Not Rated';
    document.getElementById('score').textContent = score;

    // Studio
    const studio = anime.studios.nodes.length > 0
        ? anime.studios.nodes[0].name
        : 'Unknown';
    document.getElementById('studio').textContent = studio;

    // Rating (Format)
    document.getElementById('rating').textContent = anime.format || 'N/A';

    // Themes
    document.getElementById('themes').textContent = extractThemes(anime.tags);

    // Demographics
    document.getElementById('demographics').textContent = extractDemographics(anime.tags);

    // Air Dates (Year Range)
    const startYear = anime.startDate?.year || '?';
    const endYear = anime.endDate?.year || 'Present';
    const airDates = startYear === endYear ? startYear : `${startYear}-${endYear}`;
    document.getElementById('airDates').textContent = airDates;

    // Plot/Description (remove HTML tags)
    const description = anime.description
        ? anime.description.replace(/<[^>]*>/g, '')
        : 'No description available.';
    document.getElementById('plot').textContent = description;

    // More Info Link
    document.getElementById('moreInfoLink').href = anime.siteUrl;

    // Show timeline button and set up click handler
    const timelineBtn = document.getElementById('viewTimelineBtn');
    timelineBtn.style.display = 'inline-block';
    timelineBtn.onclick = () => {
        window.location.href = `timeline.html?id=${anime.id}`;
    };

    // Show the anime display
    document.getElementById('animeDisplay').style.display = 'block';
}

// Handle button click
async function generateRandomAnime() {
    const button = document.getElementById('generateBtn');
    const loading = document.getElementById('loadingText');
    const display = document.getElementById('animeDisplay');

    // Get year range from inputs
    const startYear = parseInt(document.getElementById('startYear').value);
    const endYear = parseInt(document.getElementById('endYear').value);

    // Validate year range
    if (startYear > endYear) {
        alert('Start year must be less than or equal to end year!');
        return;
    }

    if (startYear < 1960 || endYear > 2025) {
        alert('Please select years between 1960 and 2025!');
        return;
    }

    // Disable button and show loading
    button.disabled = true;
    loading.style.display = 'block';
    display.style.display = 'none';

    // Clear old image to prevent flash of previous anime
    document.getElementById('animeImage').src = '';

    // Hide timeline button until new anime loads
    document.getElementById('viewTimelineBtn').style.display = 'none';

    try {
        const anime = await fetchRandomAnime(startYear, endYear);
        displayAnime(anime);
    } catch (error) {
        alert(`Failed to fetch anime. ${error.message}`);
        console.error(error);
    } finally {
        // Re-enable button and hide loading
        button.disabled = false;
        loading.style.display = 'none';
    }
}

// Update range display
function updateRangeDisplay() {
    const startYear = document.getElementById('startYear').value;
    const endYear = document.getElementById('endYear').value;
    document.getElementById('rangeDisplay').textContent = `${startYear} - ${endYear}`;
}

// Sync sliders with inputs
function syncControls() {
    const startYear = parseInt(document.getElementById('startYear').value);
    const endYear = parseInt(document.getElementById('endYear').value);

    // Ensure start year doesn't exceed end year
    if (startYear > endYear) {
        document.getElementById('startYear').value = endYear;
    }

    // Ensure end year isn't less than start year
    if (endYear < startYear) {
        document.getElementById('endYear').value = startYear;
    }

    // Update sliders
    document.getElementById('startSlider').value = document.getElementById('startYear').value;
    document.getElementById('endSlider').value = document.getElementById('endYear').value;

    updateRangeDisplay();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const startYearInput = document.getElementById('startYear');
    const endYearInput = document.getElementById('endYear');
    const startSlider = document.getElementById('startSlider');
    const endSlider = document.getElementById('endSlider');

    // Generate button
    generateBtn.addEventListener('click', generateRandomAnime);

    // Input fields
    startYearInput.addEventListener('input', () => {
        syncControls();
    });

    endYearInput.addEventListener('input', () => {
        syncControls();
    });

    // Sliders
    startSlider.addEventListener('input', (e) => {
        startYearInput.value = e.target.value;
        syncControls();
    });

    endSlider.addEventListener('input', (e) => {
        endYearInput.value = e.target.value;
        syncControls();
    });

    // Initialize display
    updateRangeDisplay();
});
